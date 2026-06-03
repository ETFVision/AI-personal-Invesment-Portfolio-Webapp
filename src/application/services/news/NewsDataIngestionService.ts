import type { NewsDataNewsProvider, NewsDataProviderArticle } from "@/application/ports/providers/NewsDataNewsProvider";
import type { NewsDataRepository } from "@/application/ports/repositories/NewsDataRepository";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsClassification } from "@/domain/news/types";
import { GdeltRelevanceService } from "./GdeltRelevanceService";
import { GdeltThemeMappingService } from "./GdeltThemeMappingService";
import { NewsDeduplicationService } from "./NewsDeduplicationService";
import { SourceQualityService } from "./SourceQualityService";
import { hashText } from "./newsText";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function minutesFromNow(minutes: number, now = new Date()) {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

function daysFromNow(days: number, now = new Date()) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function sourceKey(input: { sourceProvider: string; sourceId: string | null; url: string | null; title: string; publishedAt: string | null; contentHash: string }) {
  const sourceId = input.sourceId?.trim() || input.url?.trim() || hashText(`${input.title}|${input.publishedAt ?? ""}|${input.contentHash}`);
  return `${input.sourceProvider}|${sourceId}`;
}

export class NewsDataIngestionService {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly newsDataRepository: NewsDataRepository,
    private readonly provider: NewsDataNewsProvider,
    private readonly deduplicationService = new NewsDeduplicationService(),
    private readonly relevanceService = new GdeltRelevanceService(),
    private readonly themeMappingService = new GdeltThemeMappingService(),
    private readonly config = {
      enabled: false,
      maxQueryGroups: 8,
      maxArticlesPerQuery: 10,
      maxArticlesPerDay: 80,
      runFrequencyDays: 3,
      minSecondsBetweenRequests: 5,
      rateLimitBackoffMinutes: 24 * 60,
      failureBackoffMinutes: 120
    },
    private readonly sourceQualityService = new SourceQualityService()
  ) {}

  async ingestNewsData(_input: { force?: boolean } = {}) {
    const startedAt = new Date().toISOString();
    let queryGroupsRequested = 0;
    let articlesFetched = 0;
    let articlesInserted = 0;
    let duplicatesDetected = 0;
    let articlesFiltered = 0;
    let failedQueryGroups = 0;
    let rateLimitHit = false;

    if (!this.config.enabled) {
      await this.newsRepository.insertIngestionLog({
        jobName: "newsdata-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "success",
        instrumentsRequested: 0,
        articlesFetched: 0,
        articlesInserted: 0,
        duplicatesDetected: 0,
        errorMessage: null,
        metadata: { skipped: true, reason: "ENABLE_NEWSDATA_INGESTION is false." }
      });
      return { status: "success" as const, queryGroupsRequested: 0, articlesFetched: 0, articlesInserted: 0, duplicatesDetected: 0, articlesFiltered: 0, failedQueryGroups: 0, rateLimitHit: false, skipped: true, skippedReason: "disabled" };
    }

    try {
      const groups = await this.newsDataRepository.listDueQueryGroups({
        now: startedAt,
        limit: this.config.maxQueryGroups
      });
      queryGroupsRequested = groups.length;
      if (groups.length === 0) {
        await this.newsRepository.insertIngestionLog({
          jobName: "newsdata-news-ingestion",
          sourceProvider: this.provider.name,
          startedAt,
          completedAt: new Date().toISOString(),
          status: "success",
          instrumentsRequested: 0,
          articlesFetched: 0,
          articlesInserted: 0,
          duplicatesDetected: 0,
          errorMessage: null,
          metadata: { skipped: true, reason: "No NewsData query groups are due yet." }
        });
        return { status: "success" as const, queryGroupsRequested: 0, articlesFetched: 0, articlesInserted: 0, duplicatesDetected: 0, articlesFiltered: 0, failedQueryGroups: 0, rateLimitHit: false, skipped: true, skippedReason: "not_due" };
      }

      const rows = [];
      const metadataByKey = new Map<string, NewsDataProviderArticle["newsDataMetadata"]>();
      const classificationByKey = new Map<string, Omit<NewsClassification, "id" | "newsItemId" | "createdAt" | "updatedAt">>();
      const batchKeys = new Set<string>();

      for (const [groupIndex, group] of groups.entries()) {
        if (articlesFetched >= this.config.maxArticlesPerDay) break;
        if (groupIndex > 0 && this.config.minSecondsBetweenRequests > 0) await sleep(this.config.minSecondsBetweenRequests * 1000);
        const groupStartedAt = new Date().toISOString();
        let groupFetched = 0;
        let groupInserted = 0;
        let groupDuplicates = 0;
        let groupFiltered = 0;
        try {
          const fetched = await this.provider.fetchQueryGroup({
            queryGroup: group,
            maxArticles: Math.min(group.maxArticlesPerRun, this.config.maxArticlesPerQuery, this.config.maxArticlesPerDay - articlesFetched)
          });
          const rowsBeforeGroup = rows.length;
          groupFetched = fetched.length;
          articlesFetched += fetched.length;

          for (const article of fetched) {
            if (!this.relevanceService.isRelevant(article as any)) {
              articlesFiltered += 1;
              groupFiltered += 1;
              continue;
            }
            const prepared = this.deduplicationService.prepare(article);
            const key = sourceKey(prepared);
            if (batchKeys.has(key)) {
              duplicatesDetected += 1;
              groupDuplicates += 1;
              continue;
            }
            batchKeys.add(key);
            const canonical = await this.newsRepository.findCanonicalArticle(prepared);
            const canonicalKey = canonical ? sourceKey({
              sourceProvider: canonical.sourceProvider,
              sourceId: canonical.sourceId,
              url: canonical.url,
              title: canonical.title,
              publishedAt: canonical.publishedAt,
              contentHash: canonical.contentHash
            }) : null;
            const isSameCanonicalArticle = Boolean(canonical && canonicalKey === key);
            const deduped = isSameCanonicalArticle
              ? { ...prepared, isDuplicate: false, duplicateOfId: null }
              : this.deduplicationService.markAgainstCanonical(article, canonical);
            if (deduped.isDuplicate) {
              duplicatesDetected += 1;
              groupDuplicates += 1;
            }
            const sourceQuality = this.sourceQualityService.assess({
              sourceName: deduped.sourceName,
              url: deduped.url
            });
            const mapping = this.themeMappingService.map({
              title: article.title,
              summary: article.summary,
              primaryTheme: group.canonicalTheme,
              category: group.category
            });
            const secondaryThemes = Array.from(new Set([
              mapping.primaryTheme,
              ...mapping.secondaryThemes
            ].filter((theme) => theme !== group.canonicalTheme)));
            const affectedMacroCategories = Array.from(new Set([
              group.category,
              ...mapping.affectedMacroCategories
            ]));
            rows.push({
              sourceProvider: deduped.sourceProvider,
              sourceId: deduped.sourceId,
              url: deduped.url,
              title: deduped.title,
              summary: deduped.summary,
              contentSnippet: deduped.contentSnippet,
              publishedAt: deduped.publishedAt,
              fetchedAt: deduped.fetchedAt,
              tickers: [],
              relatedInstrumentIds: [],
              rawSymbols: [],
              sourceName: deduped.sourceName,
              sourceQualityScore: sourceQuality.sourceQualityScore,
              sourceQualityTier: sourceQuality.sourceQualityTier,
              author: deduped.author,
              imageUrl: deduped.imageUrl,
              language: deduped.language,
              country: deduped.country,
              providerMetadata: deduped.providerMetadata,
              contentHash: deduped.contentHash,
              canonicalHash: deduped.canonicalHash,
              isDuplicate: deduped.isDuplicate,
              duplicateOfId: deduped.duplicateOfId
            });
            metadataByKey.set(key, article.newsDataMetadata);
            classificationByKey.set(key, {
              classificationModel: "deterministic_fallback",
              sentiment: mapping.sentiment,
              eventType: "global_macro_news",
              classification: mapping.classification,
              severityScore: mapping.severityScore,
              persistenceScore: mapping.persistenceScore,
              confidenceScore: mapping.confidenceScore,
              affectedAssetClasses: mapping.affectedAssetClasses,
              affectedSectors: [],
              affectedThemes: [group.canonicalTheme, ...secondaryThemes],
              primaryTheme: group.canonicalTheme,
              secondaryThemes,
              themeConfidence: mapping.confidenceScore,
              affectedInstruments: [],
              affectedMacroCategories,
              reasoningSummary: `Deterministic NewsData query-group mapping used for ${group.canonicalTheme}.`
            });
          }
          groupInserted = rows.length - rowsBeforeGroup;
          await this.newsDataRepository.insertIngestionLog({
            jobName: "newsdata-query-group-ingestion",
            queryGroupId: group.id,
            startedAt: groupStartedAt,
            completedAt: new Date().toISOString(),
            status: groupDuplicates > 0 || groupFiltered > 0 ? "partial_success" : "success",
            articlesFetched: groupFetched,
            articlesInserted: groupInserted,
            duplicatesDetected: groupDuplicates,
            errorMessage: null,
            metadata: { queryKey: group.queryKey, canonicalTheme: group.canonicalTheme, category: group.category, articlesFiltered: groupFiltered }
          });
          await this.newsDataRepository.updateQueryGroupSchedule({
            id: group.id,
            lastAttemptedAt: groupStartedAt,
            lastSuccessAt: new Date().toISOString(),
            nextRunAt: daysFromNow(this.config.runFrequencyDays, new Date(groupStartedAt)),
            failureCount: 0,
            lastError: null
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown NewsData query group error.";
          failedQueryGroups += 1;
          rateLimitHit = errorMessage.includes("status 429") || errorMessage.toLowerCase().includes("quota");
          const failureCount = group.failureCount + 1;
          const nextRunAt = minutesFromNow(rateLimitHit ? this.config.rateLimitBackoffMinutes : this.config.failureBackoffMinutes * Math.min(failureCount, 6));
          await this.newsDataRepository.insertIngestionLog({
            jobName: "newsdata-query-group-ingestion",
            queryGroupId: group.id,
            startedAt: groupStartedAt,
            completedAt: new Date().toISOString(),
            status: "failed",
            articlesFetched: groupFetched,
            articlesInserted: 0,
            duplicatesDetected: groupDuplicates,
            errorMessage,
            metadata: { queryKey: group.queryKey, canonicalTheme: group.canonicalTheme, category: group.category, articlesFiltered: groupFiltered, rateLimitHit }
          });
          await this.newsDataRepository.updateQueryGroupSchedule({
            id: group.id,
            lastAttemptedAt: groupStartedAt,
            lastSuccessAt: group.lastSuccessAt,
            nextRunAt,
            failureCount,
            lastError: errorMessage
          });
          if (rateLimitHit) break;
        }
      }

      const inserted = await this.newsRepository.upsertNewsItems(rows);
      articlesInserted = inserted.length;
      const classifications = [];
      const metadataRows = [];
      for (const item of inserted) {
        if (item.isDuplicate) continue;
        const key = sourceKey(item);
        const classification = classificationByKey.get(key);
        const metadata = metadataByKey.get(key);
        if (classification) classifications.push({ newsItemId: item.id, ...classification });
        if (metadata) {
          metadataRows.push({
            newsItemId: item.id,
            sourceId: metadata.sourceId,
            sourceName: metadata.sourceName,
            sourceUrl: metadata.sourceUrl,
            country: metadata.country,
            language: metadata.language,
            category: metadata.category,
            creator: metadata.creator,
            keywords: metadata.keywords,
            providerMetadata: metadata.providerMetadata
          });
        }
      }
      await this.newsRepository.upsertClassifications(classifications);
      await this.newsDataRepository.upsertArticleMetadata(metadataRows);

      const status = failedQueryGroups > 0 || duplicatesDetected > 0 || articlesFiltered > 0 ? "partial_success" as const : "success" as const;
      await this.newsRepository.insertIngestionLog({
        jobName: "newsdata-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status,
        instrumentsRequested: queryGroupsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: rateLimitHit ? "NewsData rate limit or quota hit; remaining query groups were skipped for this refresh." : null,
        metadata: {
          queryGroupsRequested,
          failedQueryGroups,
          articlesFiltered,
          rateLimitHit,
          maxQueryGroupsPerRun: this.config.maxQueryGroups,
          runFrequencyDays: this.config.runFrequencyDays,
          queueMode: true
        }
      });

      return { status, queryGroupsRequested, articlesFetched, articlesInserted, duplicatesDetected, articlesFiltered, failedQueryGroups, rateLimitHit, skipped: false, skippedReason: null };
    } catch (error) {
      await this.newsRepository.insertIngestionLog({
        jobName: "newsdata-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "failed",
        instrumentsRequested: queryGroupsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: error instanceof Error ? error.message : "Unknown NewsData ingestion error.",
        metadata: { queryGroupsRequested, failedQueryGroups, articlesFiltered, rateLimitHit }
      });
      throw error;
    }
  }
}

export const newsDataIngestionInternals = { daysFromNow, minutesFromNow };
