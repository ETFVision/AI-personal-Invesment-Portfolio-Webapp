import type { GdeltNewsProvider, GdeltProviderArticle } from "@/application/ports/providers/GdeltNewsProvider";
import type { GdeltRepository } from "@/application/ports/repositories/GdeltRepository";
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

function sourceKey(input: { sourceProvider: string; sourceId: string | null; url: string | null; title: string; publishedAt: string | null; contentHash: string }) {
  const sourceId = input.sourceId?.trim() || input.url?.trim() || hashText(`${input.title}|${input.publishedAt ?? ""}|${input.contentHash}`);
  return `${input.sourceProvider}|${sourceId}`;
}

export class GlobalNewsIngestionService {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly gdeltRepository: GdeltRepository,
    private readonly provider: GdeltNewsProvider,
    private readonly deduplicationService = new NewsDeduplicationService(),
    private readonly relevanceService = new GdeltRelevanceService(),
    private readonly themeMappingService = new GdeltThemeMappingService(),
    private readonly config = {
      enabled: false,
      maxArticlesPerQuery: 8,
      maxArticlesPerDay: 80,
      recentWindowHours: 24,
      queryDelayMs: 1200,
      minRefreshMinutes: 30
    },
    private readonly sourceQualityService = new SourceQualityService()
  ) {}

  async ingestGlobalNews(input: { force?: boolean } = {}) {
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
        jobName: "gdelt-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "success",
        instrumentsRequested: 0,
        articlesFetched: 0,
        articlesInserted: 0,
        duplicatesDetected: 0,
        errorMessage: null,
        metadata: { skipped: true, reason: "ENABLE_GDELT_INGESTION is false." }
      });
      return { status: "success" as const, queryGroupsRequested: 0, articlesFetched: 0, articlesInserted: 0, duplicatesDetected: 0, articlesFiltered: 0, failedQueryGroups: 0, rateLimitHit: false, skipped: true };
    }

    try {
      const logs = await this.gdeltRepository.listIngestionLogs(1);
      const latestCompleted = logs[0]?.completedAt ? new Date(logs[0].completedAt).getTime() : 0;
      const minRefreshMs = this.config.minRefreshMinutes * 60 * 1000;
      if (!input.force && latestCompleted && Date.now() - latestCompleted < minRefreshMs) {
        await this.newsRepository.insertIngestionLog({
          jobName: "gdelt-news-ingestion",
          sourceProvider: this.provider.name,
          startedAt,
          completedAt: new Date().toISOString(),
          status: "success",
          instrumentsRequested: 0,
          articlesFetched: 0,
          articlesInserted: 0,
          duplicatesDetected: 0,
          errorMessage: null,
          metadata: { skipped: true, reason: "Recent GDELT ingestion already completed.", latestCompletedAt: logs[0]?.completedAt }
        });
        return { status: "success" as const, queryGroupsRequested: 0, articlesFetched: 0, articlesInserted: 0, duplicatesDetected: 0, articlesFiltered: 0, failedQueryGroups: 0, rateLimitHit: false, skipped: true };
      }

      const groups = await this.gdeltRepository.listActiveQueryGroups();
      queryGroupsRequested = groups.length;
      const rows = [];
      const metadataByKey = new Map<string, GdeltProviderArticle["gdeltMetadata"]>();
      const classificationByKey = new Map<string, Omit<NewsClassification, "id" | "newsItemId" | "createdAt" | "updatedAt">>();
      const batchKeys = new Set<string>();

      for (const [groupIndex, group] of groups.entries()) {
        if (articlesFetched >= this.config.maxArticlesPerDay) break;
        if (groupIndex > 0 && this.config.queryDelayMs > 0) await sleep(this.config.queryDelayMs);
        const groupStartedAt = new Date().toISOString();
        let groupFetched = 0;
        let groupInserted = 0;
        let groupDuplicates = 0;
        try {
          const fetched = await this.provider.fetchQueryGroup({
            queryGroup: group,
            maxArticles: Math.min(group.maxArticlesPerRun, this.config.maxArticlesPerQuery, this.config.maxArticlesPerDay - articlesFetched),
            recentWindowHours: this.config.recentWindowHours
          });
          const rowsBeforeGroup = rows.length;
          groupFetched = fetched.length;
          articlesFetched += fetched.length;

          for (const article of fetched) {
            if (!this.relevanceService.isRelevant(article)) {
              articlesFiltered += 1;
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
            metadataByKey.set(key, article.gdeltMetadata);
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
              affectedThemes: [group.canonicalTheme, ...mapping.secondaryThemes],
              primaryTheme: mapping.primaryTheme,
              secondaryThemes: mapping.secondaryThemes,
              themeConfidence: mapping.confidenceScore,
              affectedInstruments: [],
              affectedMacroCategories: mapping.affectedMacroCategories,
              reasoningSummary: mapping.reasoningSummary
            });
          }
          groupInserted = rows.length - rowsBeforeGroup;
          await this.gdeltRepository.insertIngestionLog({
            jobName: "gdelt-query-group-ingestion",
            queryGroupId: group.id,
            startedAt: groupStartedAt,
            completedAt: new Date().toISOString(),
            status: groupDuplicates > 0 ? "partial_success" : "success",
            articlesFetched: groupFetched,
            articlesInserted: groupInserted,
            duplicatesDetected: groupDuplicates,
            errorMessage: null,
            metadata: { queryKey: group.queryKey, canonicalTheme: group.canonicalTheme, category: group.category }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown GDELT query group error.";
          failedQueryGroups += 1;
          rateLimitHit = errorMessage.includes("status 429");
          await this.gdeltRepository.insertIngestionLog({
            jobName: "gdelt-query-group-ingestion",
            queryGroupId: group.id,
            startedAt: groupStartedAt,
            completedAt: new Date().toISOString(),
            status: "failed",
            articlesFetched: groupFetched,
            articlesInserted: 0,
            duplicatesDetected: groupDuplicates,
            errorMessage,
            metadata: { queryKey: group.queryKey, canonicalTheme: group.canonicalTheme, category: group.category, rateLimitHit }
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
            domain: metadata.domain,
            sourceCountry: metadata.sourceCountry,
            sourceLanguage: metadata.sourceLanguage,
            tone: metadata.tone,
            gdeltThemes: metadata.gdeltThemes,
            locations: metadata.locations,
            persons: metadata.persons,
            organizations: metadata.organizations,
            providerMetadata: metadata.providerMetadata
          });
        }
      }
      await this.newsRepository.upsertClassifications(classifications);
      await this.gdeltRepository.upsertArticleMetadata(metadataRows);

      const status = failedQueryGroups > 0 || duplicatesDetected > 0 || articlesFiltered > 0 ? "partial_success" as const : "success" as const;
      await this.newsRepository.insertIngestionLog({
        jobName: "gdelt-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status,
        instrumentsRequested: queryGroupsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: rateLimitHit
          ? "GDELT rate limit hit; remaining query groups were skipped for this refresh."
          : failedQueryGroups === queryGroupsRequested && queryGroupsRequested > 0
            ? "All GDELT query groups failed."
            : null,
        metadata: { queryGroupsRequested, failedQueryGroups, articlesFiltered, recentWindowHours: this.config.recentWindowHours, rateLimitHit }
      });

      return { status, queryGroupsRequested, articlesFetched, articlesInserted, duplicatesDetected, articlesFiltered, failedQueryGroups, rateLimitHit, skipped: false };
    } catch (error) {
      await this.newsRepository.insertIngestionLog({
        jobName: "gdelt-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "failed",
        instrumentsRequested: queryGroupsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: error instanceof Error ? error.message : "Unknown GDELT ingestion error.",
        metadata: { queryGroupsRequested, failedQueryGroups, articlesFiltered, rateLimitHit }
      });
      throw error;
    }
  }
}
