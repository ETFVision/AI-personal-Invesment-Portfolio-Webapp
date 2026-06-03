import type { NewsProvider } from "@/application/ports/providers/NewsProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { NewsDeduplicationService } from "./NewsDeduplicationService";
import { NewsInstrumentLinkingService } from "./NewsInstrumentLinkingService";
import { SourceQualityService } from "./SourceQualityService";
import { hashText } from "./newsText";

function sourceKey(input: { sourceProvider: string; sourceId: string | null; url: string | null; title: string; publishedAt: string | null; contentHash: string }) {
  const sourceId = input.sourceId?.trim() || input.url?.trim() || hashText(`${input.title}|${input.publishedAt ?? ""}|${input.contentHash}`);
  return `${input.sourceProvider}|${sourceId}`;
}

function fmpNewsGroup(input: { providerMetadata?: Record<string, unknown> | null; rawSymbols?: string[]; tickers?: string[] }) {
  if (input.providerMetadata?.newsEndpoint === "general-latest") return "general";
  if (input.providerMetadata?.newsEndpoint === "stock") return "instrument";
  return (input.rawSymbols?.length ?? input.tickers?.length ?? 0) > 0 ? "instrument" : "general";
}

export class NewsIngestionService {
  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly provider: NewsProvider,
    private readonly deduplicationService = new NewsDeduplicationService(),
    private readonly linkingService = new NewsInstrumentLinkingService(),
    private readonly config = {
      maxArticlesPerDay: 80,
      maxArticlesPerInstrument: 3
    },
    private readonly sourceQualityService = new SourceQualityService()
  ) {}

  async ingestDailyNews() {
    const startedAt = new Date().toISOString();
    let articlesFetched = 0;
    let articlesInserted = 0;
    let duplicatesDetected = 0;
    let articlesNormalized = 0;
    let articlesUpdated = 0;
    let inBatchDuplicatesRemoved = 0;
    let failedItems = 0;
    let instrumentsRequested = 0;

    try {
      const instruments = await this.universeRepository.listInstruments({ isActive: true, limit: 500 });
      const newsTracked = instruments.filter((instrument) => instrument.symbol && instrument.assetClass !== "other");
      instrumentsRequested = newsTracked.length;
      const symbols = newsTracked.map((instrument) => instrument.symbol as string);
      const fetched = await this.provider.fetchNews({
        symbols,
        maxArticlesPerInstrument: this.config.maxArticlesPerInstrument,
        maxArticlesTotal: this.config.maxArticlesPerDay,
        includeGeneralMarketNews: true
      });
      articlesFetched = fetched.length;
      const instrumentArticlesFetched = fetched.filter((article) => fmpNewsGroup(article) === "instrument").length;
      const generalArticlesFetched = fetched.length - instrumentArticlesFetched;

      const rows = [];
      const batchKeys = new Set<string>();
      for (const article of fetched) {
        try {
          const prepared = this.deduplicationService.prepare(article);
          articlesNormalized += 1;
          const key = sourceKey(prepared);
          if (batchKeys.has(key)) {
            duplicatesDetected += 1;
            inBatchDuplicatesRemoved += 1;
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
          const linked = this.linkingService.link(article, newsTracked);
          const sourceQuality = this.sourceQualityService.assess({
            sourceName: deduped.sourceName,
            url: deduped.url
          });
          if (isSameCanonicalArticle) articlesUpdated += 1;
          if (deduped.isDuplicate) duplicatesDetected += 1;
          rows.push({
            sourceProvider: deduped.sourceProvider,
            sourceId: deduped.sourceId,
            url: deduped.url,
            title: deduped.title,
            summary: deduped.summary,
            contentSnippet: deduped.contentSnippet,
            publishedAt: deduped.publishedAt,
            fetchedAt: deduped.fetchedAt,
            tickers: linked.linkedSymbols.length > 0 ? linked.linkedSymbols : deduped.tickers,
            relatedInstrumentIds: linked.relatedInstrumentIds,
            rawSymbols: deduped.rawSymbols,
            sourceName: deduped.sourceName,
            sourceQualityScore: sourceQuality.sourceQualityScore,
            sourceQualityTier: sourceQuality.sourceQualityTier,
            author: deduped.author,
            imageUrl: deduped.imageUrl,
            language: deduped.language,
            country: deduped.country,
            providerMetadata: { ...deduped.providerMetadata, linkConfidence: linked.linkConfidence },
            contentHash: deduped.contentHash,
            canonicalHash: deduped.canonicalHash,
            isDuplicate: deduped.isDuplicate,
            duplicateOfId: deduped.duplicateOfId
          });
        } catch {
          failedItems += 1;
        }
      }

      const inserted = await this.newsRepository.upsertNewsItems(rows);
      articlesInserted = inserted.length;
      const instrumentArticlesSaved = rows.filter((row) => fmpNewsGroup(row) === "instrument").length;
      const generalArticlesSaved = rows.length - instrumentArticlesSaved;
      const status = duplicatesDetected > 0 || failedItems > 0 ? "partial_success" as const : "success" as const;
      await this.newsRepository.insertIngestionLog({
        jobName: "daily-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status,
        instrumentsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: null,
        metadata: {
          symbols: symbols.slice(0, 100),
          articlesNormalized,
          articlesUpdated,
          inBatchDuplicatesRemoved,
          failedItems,
          requestedSymbolsCount: symbols.length,
          maxArticlesPerInstrument: this.config.maxArticlesPerInstrument,
          instrumentArticlesFetched,
          generalArticlesFetched,
          instrumentArticlesSaved,
          generalArticlesSaved,
          articlesSaved: articlesInserted
        }
      });

      return { status, instrumentsRequested, articlesFetched, articlesInserted, duplicatesDetected };
    } catch (error) {
      await this.newsRepository.insertIngestionLog({
        jobName: "daily-news-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "failed",
        instrumentsRequested,
        articlesFetched,
        articlesInserted,
        duplicatesDetected,
        errorMessage: error instanceof Error ? error.message : "Unknown news ingestion error.",
        metadata: { articlesNormalized, articlesUpdated, inBatchDuplicatesRemoved, failedItems }
      });
      throw error;
    }
  }
}
