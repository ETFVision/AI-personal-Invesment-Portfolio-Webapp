import test from "node:test";
import assert from "node:assert/strict";
import { NewsDeduplicationService } from "../src/application/services/news/NewsDeduplicationService";
import { WeeklyNewsReconciliationJob } from "../src/application/jobs/WeeklyNewsReconciliationJob";
import { NewsInstrumentLinkingService } from "../src/application/services/news/NewsInstrumentLinkingService";
import { NewsClassificationService, validateNewsClassificationOutput } from "../src/application/services/news/NewsClassificationService";
import { NewsDashboardService } from "../src/application/services/news/NewsDashboardService";
import { NewsIngestionService } from "../src/application/services/news/NewsIngestionService";
import { ThemeIntelligenceService } from "../src/application/services/news/ThemeIntelligenceService";
import { WeeklyNewsReconciliationService } from "../src/application/services/news/WeeklyNewsReconciliationService";
import { GdeltRelevanceService } from "../src/application/services/news/GdeltRelevanceService";
import { GdeltThemeMappingService } from "../src/application/services/news/GdeltThemeMappingService";
import { GlobalNewsIngestionService } from "../src/application/services/news/GlobalNewsIngestionService";
import { SourceQualityService, sourceQualityInternals } from "../src/application/services/news/SourceQualityService";
import { isCronSecretValid } from "../src/application/services/news/cronSecret";
import { GdeltNormalizationService, gdeltNormalizationInternals } from "../src/infrastructure/providers/news/GdeltNormalizationService";
import { gdeltProviderInternals } from "../src/infrastructure/providers/news/GdeltNewsProvider";
import { isJwtIssuedAtFutureError } from "../src/infrastructure/repositories/supabase/supabaseErrors";
import type { GdeltArticleMetadata, GdeltIngestionLog, GdeltQueryGroup, NewsClassification, NewsIngestionLog, NewsItem, NormalizedNewsArticle, WeeklyNewsReconciliation } from "../src/domain/news/types";
import type { GdeltNewsProvider, GdeltProviderArticle } from "../src/application/ports/providers/GdeltNewsProvider";
import type { NewsProvider } from "../src/application/ports/providers/NewsProvider";
import type { GdeltRepository, InsertGdeltIngestionLogInput, UpsertGdeltArticleMetadataInput } from "../src/application/ports/repositories/GdeltRepository";
import type { NewsRepository, UpsertNewsClassificationInput, UpsertNewsItemInput, UpsertWeeklyNewsReconciliationInput } from "../src/application/ports/repositories/NewsRepository";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";
import type { Instrument } from "../src/domain/universe/types";

function newsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: overrides.id ?? "news-1",
    sourceProvider: "test",
    sourceId: overrides.sourceId ?? "source-1",
    url: overrides.url ?? "https://example.com/a",
    title: overrides.title ?? "AI infrastructure spending rises",
    summary: overrides.summary ?? "Large cloud providers continue investing in AI infrastructure.",
    contentSnippet: overrides.contentSnippet ?? null,
    publishedAt: overrides.publishedAt ?? "2026-06-01T00:00:00.000Z",
    fetchedAt: "2026-06-01T00:00:00.000Z",
    tickers: overrides.tickers ?? ["NVDA"],
    relatedInstrumentIds: overrides.relatedInstrumentIds ?? ["inst-1"],
    rawSymbols: overrides.rawSymbols ?? ["NVDA"],
    sourceName: null,
    sourceQualityScore: overrides.sourceQualityScore ?? 45,
    sourceQualityTier: overrides.sourceQualityTier ?? "tier_3",
    author: null,
    imageUrl: null,
    language: "en",
    country: null,
    providerMetadata: {},
    contentHash: overrides.contentHash ?? "content",
    canonicalHash: overrides.canonicalHash ?? "canonical",
    isDuplicate: overrides.isDuplicate ?? false,
    duplicateOfId: overrides.duplicateOfId ?? null,
    createdAt: "",
    updatedAt: ""
  };
}

function classification(overrides: Partial<NewsClassification> = {}): NewsClassification {
  return {
    id: overrides.id ?? "classification-1",
    newsItemId: overrides.newsItemId ?? "news-1",
    classificationModel: overrides.classificationModel ?? "test",
    sentiment: overrides.sentiment ?? "neutral",
    eventType: overrides.eventType ?? "theme_update",
    classification: overrides.classification ?? "medium_term_theme",
    severityScore: overrides.severityScore ?? 50,
    persistenceScore: overrides.persistenceScore ?? 60,
    confidenceScore: overrides.confidenceScore ?? 70,
    affectedAssetClasses: overrides.affectedAssetClasses ?? ["equities"],
    affectedSectors: overrides.affectedSectors ?? [],
    affectedThemes: overrides.affectedThemes ?? ["AI / Automation"],
    primaryTheme: overrides.primaryTheme ?? "AI",
    secondaryThemes: overrides.secondaryThemes ?? [],
    themeConfidence: overrides.themeConfidence ?? 70,
    affectedInstruments: overrides.affectedInstruments ?? ["NVDA"],
    affectedMacroCategories: overrides.affectedMacroCategories ?? [],
    reasoningSummary: overrides.reasoningSummary ?? "Theme update.",
    createdAt: "",
    updatedAt: ""
  };
}

class FakeNewsRepository implements NewsRepository {
  items: NewsItem[] = [];
  classifications: NewsClassification[] = [];
  weekly: WeeklyNewsReconciliation[] = [];
  logs: NewsIngestionLog[] = [];

  async listNewsItems() { return this.items; }
  async listNewsWithClassifications() { return this.items.map((item) => ({ ...item, classification: this.classifications.find((row) => row.newsItemId === item.id) ?? null })); }
  async findCanonicalArticle(input: { sourceId: string | null; url: string | null; canonicalHash: string; contentHash: string }) {
    return this.items.find((item) =>
      (!item.isDuplicate && input.sourceId && item.sourceId === input.sourceId) ||
      (!item.isDuplicate && input.url && item.url === input.url) ||
      (!item.isDuplicate && item.canonicalHash === input.canonicalHash) ||
      (!item.isDuplicate && item.contentHash === input.contentHash)
    ) ?? null;
  }
  async upsertNewsItems(input: UpsertNewsItemInput[]) {
    const rows = input.map((item, index) => ({ ...newsItem({ id: item.id ?? `news-${index + 1}` }), ...item, createdAt: "", updatedAt: "" }));
    this.items = rows;
    return rows;
  }
  async markDuplicate(newsItemId: string, duplicateOfId: string | null) {
    this.items = this.items.map((item) => item.id === newsItemId ? { ...item, isDuplicate: Boolean(duplicateOfId), duplicateOfId } : item);
  }
  async listUnclassifiedNews(limit: number) {
    return this.items.filter((item) => !this.classifications.some((classification) => classification.newsItemId === item.id)).slice(0, limit);
  }
  async listDeterministicallyClassifiedNews(limit: number) {
    return this.items
      .map((item) => ({
        ...item,
        classification: this.classifications.find((row) => row.newsItemId === item.id && row.classificationModel === "deterministic_fallback")
      }))
      .filter((item): item is NewsItem & { classification: NewsClassification } => Boolean(item.classification))
      .slice(0, limit);
  }
  async listDeterministicallyClassifiedNewsForPeriod(periodStart: string, periodEnd: string) {
    const start = new Date(`${periodStart}T00:00:00.000Z`);
    const end = new Date(`${periodEnd}T23:59:59.999Z`);
    return this.items
      .filter((item) => {
        const published = item.publishedAt ? new Date(item.publishedAt) : null;
        return !item.isDuplicate && published && published >= start && published <= end;
      })
      .map((item) => ({
        ...item,
        classification: this.classifications.find((row) => row.newsItemId === item.id && row.classificationModel === "deterministic_fallback")
      }))
      .filter((item): item is NewsItem & { classification: NewsClassification } => Boolean(item.classification));
  }
  async getClassification(newsItemId: string) { return this.classifications.find((row) => row.newsItemId === newsItemId) ?? null; }
  async upsertClassifications(input: UpsertNewsClassificationInput[]) {
    for (const item of input) {
      const next = { ...item, id: item.id ?? `classification-${this.classifications.length + 1}`, createdAt: "", updatedAt: "" };
      const existingIndex = this.classifications.findIndex((row) => row.newsItemId === item.newsItemId && row.classificationModel === item.classificationModel);
      if (existingIndex >= 0) this.classifications[existingIndex] = next;
      else this.classifications.push(next);
    }
  }
  async listClassifiedNewsForPeriod(_periodStart = "", _periodEnd = "") {
    return this.items
      .filter((item) => !item.isDuplicate)
      .map((item) => ({ ...item, classification: this.classifications.find((row) => row.newsItemId === item.id) }))
      .filter((item): item is NewsItem & { classification: NewsClassification } => Boolean(item.classification));
  }
  async upsertGroups() {}
  async listGroups() { return []; }
  async upsertWeeklyReconciliation(input: UpsertWeeklyNewsReconciliationInput) {
    const row = { ...input, coverageMetadata: input.coverageMetadata ?? {}, id: input.id ?? "weekly-1", createdAt: "", updatedAt: "" };
    this.weekly = [row];
    return row;
  }
  async listWeeklyReconciliations() { return this.weekly; }
  async getLatestWeeklyReconciliation() { return this.weekly[0] ?? null; }
  async insertIngestionLog(input: Omit<NewsIngestionLog, "id" | "createdAt">) {
    this.logs.push({ ...input, id: `log-${this.logs.length + 1}`, createdAt: "" });
  }
  async listIngestionLogs() { return this.logs; }
}

class UpsertingFakeNewsRepository extends FakeNewsRepository {
  async upsertNewsItems(input: UpsertNewsItemInput[]) {
    const rows = input.map((item, index) => ({
      ...newsItem({ id: item.id ?? `news-${this.items.length + index + 1}` }),
      ...item,
      sourceId: item.sourceId ?? null,
      createdAt: "",
      updatedAt: ""
    }));
    for (const row of rows) {
      const existingIndex = this.items.findIndex((item) => item.sourceProvider === row.sourceProvider && item.sourceId === row.sourceId);
      if (existingIndex >= 0) this.items[existingIndex] = { ...this.items[existingIndex], ...row, id: this.items[existingIndex].id };
      else this.items.push(row);
    }
    return rows.map((row) => this.items.find((item) => item.sourceProvider === row.sourceProvider && item.sourceId === row.sourceId) ?? row);
  }
}

class FakeNewsProvider implements NewsProvider {
  readonly name = "test_provider";
  constructor(private readonly articles: NormalizedNewsArticle[]) {}
  async fetchNews() {
    return this.articles;
  }
}

function gdeltQueryGroup(overrides: Partial<GdeltQueryGroup> = {}): GdeltQueryGroup {
  return {
    id: overrides.id ?? "gdelt-group-1",
    queryKey: overrides.queryKey ?? "trade_supply_chain",
    queryName: overrides.queryName ?? "Trade / supply chain",
    queryText: overrides.queryText ?? "tariffs OR supply chain",
    canonicalTheme: overrides.canonicalTheme ?? "Trade / Supply Chain",
    category: overrides.category ?? "trade_supply_chain",
    isActive: overrides.isActive ?? true,
    maxArticlesPerRun: overrides.maxArticlesPerRun ?? 8,
    createdAt: "",
    updatedAt: ""
  };
}

class FakeGdeltRepository implements GdeltRepository {
  groups: GdeltQueryGroup[] = [gdeltQueryGroup()];
  logs: GdeltIngestionLog[] = [];
  metadata: GdeltArticleMetadata[] = [];

  async listActiveQueryGroups() {
    return this.groups.filter((group) => group.isActive);
  }

  async upsertArticleMetadata(input: UpsertGdeltArticleMetadataInput[]) {
    for (const item of input) {
      const row = { ...item, id: `gdelt-meta-${this.metadata.length + 1}`, createdAt: "", updatedAt: "" };
      const existingIndex = this.metadata.findIndex((entry) => entry.newsItemId === item.newsItemId);
      if (existingIndex >= 0) this.metadata[existingIndex] = { ...this.metadata[existingIndex], ...row, id: this.metadata[existingIndex].id };
      else this.metadata.push(row);
    }
  }

  async insertIngestionLog(input: InsertGdeltIngestionLogInput) {
    this.logs.unshift({ ...input, id: `gdelt-log-${this.logs.length + 1}`, createdAt: "" });
  }

  async listIngestionLogs(limit = 20) {
    return this.logs.slice(0, limit);
  }
}

class FakeGdeltProvider implements GdeltNewsProvider {
  readonly name = "gdelt" as const;
  constructor(private readonly articles: GdeltProviderArticle[]) {}
  async fetchQueryGroup() {
    return this.articles;
  }
}

function fakeUniverseRepository(instruments: Instrument[]) {
  return {
    listInstruments: async () => instruments
  } as Partial<UniverseRepository> as UniverseRepository;
}

test("news deduplication uses canonical title and date hash", () => {
  const service = new NewsDeduplicationService();
  const first = service.prepare({
    sourceProvider: "test",
    sourceId: "1",
    url: "https://example.com/1",
    title: "Markets Rally After Fed Decision!",
    summary: null,
    contentSnippet: null,
    publishedAt: "2026-06-01T10:00:00.000Z",
    fetchedAt: "2026-06-01T10:01:00.000Z",
    tickers: [],
    rawSymbols: [],
    sourceName: null,
    author: null,
    imageUrl: null,
    language: "en",
    country: null,
    providerMetadata: {}
  });
  const second = service.prepare({ ...first, sourceId: "2", url: "https://example.com/2", title: "Markets rally after Fed decision" });
  assert.equal(first.canonicalHash, second.canonicalHash);
});

test("source quality service assigns deterministic publisher tiers", () => {
  const service = new SourceQualityService();
  assert.deepEqual(service.assess({ sourceName: "Reuters", url: "https://www.reuters.com/markets/" }), {
    sourceQualityScore: 95,
    sourceQualityTier: "tier_1"
  });
  assert.deepEqual(service.assess({ sourceName: "CNBC", url: "https://www.cnbc.com/markets/" }), {
    sourceQualityScore: 80,
    sourceQualityTier: "tier_2"
  });
  assert.deepEqual(service.assess({ sourceName: "Unknown blog", url: "https://example-blog.test/article" }), {
    sourceQualityScore: 45,
    sourceQualityTier: "tier_3"
  });
  assert.equal(sourceQualityInternals.domainFromUrl("https://www.wsj.com/markets"), "wsj.com");
});

test("daily ingestion updates repeated canonical articles without marking them duplicate", async () => {
  const repository = new UpsertingFakeNewsRepository();
  const article: NormalizedNewsArticle = {
    sourceProvider: "test_provider",
    sourceId: "article-1",
    url: "https://example.com/article-1",
    title: "AAPL earnings update",
    summary: "Apple reports earnings.",
    contentSnippet: "Apple reports earnings.",
    publishedAt: "2026-06-01T00:00:00.000Z",
    fetchedAt: "2026-06-01T00:00:00.000Z",
    tickers: ["AAPL"],
    rawSymbols: ["AAPL"],
    sourceName: "Example",
    author: null,
    imageUrl: null,
    language: "en",
    country: null,
    providerMetadata: {}
  };
  const service = new NewsIngestionService(
    repository,
    fakeUniverseRepository([{ id: "inst-aapl", symbol: "AAPL", isActive: true, assetClass: "stock" } as Instrument]),
    new FakeNewsProvider([article]),
    undefined,
    undefined,
    { maxArticlesPerDay: 10, maxArticlesPerInstrument: 3 }
  );

  const first = await service.ingestDailyNews();
  const second = await service.ingestDailyNews();

  assert.equal(first.duplicatesDetected, 0);
  assert.equal(second.duplicatesDetected, 0);
  assert.equal(repository.items.length, 1);
  assert.equal(repository.items[0]?.isDuplicate, false);
  assert.equal(repository.logs[1]?.metadata.articlesUpdated, 1);
});

test("daily ingestion removes duplicate articles inside the same provider batch", async () => {
  const repository = new UpsertingFakeNewsRepository();
  const article: NormalizedNewsArticle = {
    sourceProvider: "test_provider",
    sourceId: "article-1",
    url: "https://example.com/article-1",
    title: "AAPL earnings update",
    summary: null,
    contentSnippet: null,
    publishedAt: "2026-06-01T00:00:00.000Z",
    fetchedAt: "2026-06-01T00:00:00.000Z",
    tickers: ["AAPL"],
    rawSymbols: ["AAPL"],
    sourceName: null,
    author: null,
    imageUrl: null,
    language: "en",
    country: null,
    providerMetadata: {}
  };
  const service = new NewsIngestionService(
    repository,
    fakeUniverseRepository([{ id: "inst-aapl", symbol: "AAPL", isActive: true, assetClass: "stock" } as Instrument]),
    new FakeNewsProvider([article, article]),
    undefined,
    undefined,
    { maxArticlesPerDay: 10, maxArticlesPerInstrument: 3 }
  );

  const result = await service.ingestDailyNews();

  assert.equal(result.articlesFetched, 2);
  assert.equal(result.articlesInserted, 1);
  assert.equal(result.duplicatesDetected, 1);
  assert.equal(repository.logs[0]?.metadata.inBatchDuplicatesRemoved, 1);
});

test("instrument linker matches provider symbols to active instruments", () => {
  const service = new NewsInstrumentLinkingService();
  const instruments = [{ id: "inst-1", symbol: "NVDA", isActive: true } as Instrument];
  const linked = service.link({
    sourceProvider: "test",
    sourceId: null,
    url: null,
    title: "Nvidia update",
    summary: null,
    contentSnippet: null,
    publishedAt: null,
    fetchedAt: "",
    tickers: ["nvda"],
    rawSymbols: [],
    sourceName: null,
    author: null,
    imageUrl: null,
    language: "en",
    country: null,
    providerMetadata: {}
  }, instruments);
  assert.deepEqual(linked.relatedInstrumentIds, ["inst-1"]);
  assert.equal(linked.linkConfidence, "high");
});

test("classification JSON validation clamps invalid model output", () => {
  const output = validateNewsClassificationOutput({
    sentiment: "very happy",
    classification: "buy_now",
    severityScore: 120,
    persistenceScore: -5,
    confidenceScore: 50.2,
    affectedAssetClasses: ["equities", 1]
  });
  assert.equal(output.sentiment, "neutral");
  assert.equal(output.classification, "short_term_noise");
  assert.equal(output.severityScore, 100);
  assert.equal(output.persistenceScore, 0);
  assert.equal(output.confidenceScore, 50);
  assert.deepEqual(output.affectedAssetClasses, ["equities"]);
});

test("classification skips duplicates and does not reclassify existing rows", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [newsItem({ id: "a" }), newsItem({ id: "b", isDuplicate: true }), newsItem({ id: "c" })];
  repository.classifications = [classification({ newsItemId: "c" })];
  const service = new NewsClassificationService(repository);
  const result = await service.classifyPending(10);
  assert.equal(result.requested, 2);
  assert.equal(result.classified, 1);
  assert.equal(repository.classifications.length, 2);
});

test("classification payloads generated by service omit explicit ids", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [newsItem({ id: "fresh" })];
  const service = new NewsClassificationService(repository);
  await service.classifyPending(10);
  assert.ok(repository.classifications[0]?.id);
  assert.equal(repository.classifications[0]?.newsItemId, "fresh");
});

test("deterministic classifier routes obvious stock news to equities", () => {
  const repository = new FakeNewsRepository();
  const service = new NewsClassificationService(repository);
  const output = service.deterministicFallback(newsItem({
    title: "Top 5 Stocks That Will Profit From Nvidia's PC Market Invasion of Intel Territory",
    tickers: ["NVDA", "INTC"],
    summary: "Semiconductor stocks are in focus."
  }));
  assert.deepEqual(output.affectedAssetClasses, ["equities"]);
  assert.equal(output.primaryTheme, "AI");
  assert.ok(output.secondaryThemes.includes("Technology"));
  assert.ok(output.affectedThemes.includes("Semiconductors"));
  assert.deepEqual(output.affectedInstruments, ["NVDA", "INTC"]);
});

test("deterministic classifier assigns canonical macro themes", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const output = service.deterministicFallback(newsItem({
    title: "Fed rate cut hopes rise after inflation and jobs data cool",
    tickers: []
  }));
  assert.deepEqual(output.affectedAssetClasses, ["macro"]);
  assert.equal(output.primaryTheme, "Rates");
  assert.ok(output.secondaryThemes.includes("Inflation"));
  assert.ok(output.secondaryThemes.includes("Employment"));
  assert.ok(output.themeConfidence > 0);
});

test("deterministic classifier avoids loose Credit theme mappings", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const aiOutput = service.deterministicFallback(newsItem({
    title: "What Exactly Is Agentic AI, and Why Are Some Stocks Blowing Up Because of It?",
    tickers: []
  }));
  assert.equal(aiOutput.primaryTheme, "AI");
  assert.equal(aiOutput.secondaryThemes.includes("Credit"), false);

  const fundOutput = service.deterministicFallback(newsItem({
    title: "ETFs Aren't Always Cheaper Than Mutual Funds. Here's What to Compare Instead.",
    tickers: []
  }));
  assert.notEqual(fundOutput.primaryTheme, "Credit");
});

test("deterministic classifier maps hardware product articles to Technology", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const output = service.deterministicFallback(newsItem({
    title: "Dell Just Unveiled a New Weapon Against Apple",
    summary: "",
    contentSnippet: "",
    tickers: ["DELL", "AAPL"]
  }));
  assert.equal(output.primaryTheme, "Technology");
});

test("deterministic classifier does not map macro PMI gold headlines to Industrials", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const output = service.deterministicFallback(newsItem({
    title: "Spot gold trades near $4,460/oz after ISM Manufacturing PMI rises to 54",
    summary: "",
    contentSnippet: "",
    tickers: []
  }));
  assert.equal(output.primaryTheme, "Inflation");
  assert.equal(output.secondaryThemes.includes("Industrials"), false);
  assert.deepEqual(output.affectedAssetClasses, ["gold/commodities"]);
});

test("theme intelligence removes stale Industrials from macro manufacturing indicator headlines", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "spot-gold-pmi",
      title: "Spot gold trades near $4,460/oz after ISM Manufacturing PMI rises to 54",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "spot-gold-pmi",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["gold/commodities"],
      primaryTheme: "Inflation",
      secondaryThemes: ["Industrials"],
      themeConfidence: 65
    })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  assert.equal(intelligence.topThemesThisWeek.some((item) => item.theme === "Industrials"), false);
  assert.equal(intelligence.topThemesThisWeek.find((item) => item.theme === "Inflation")?.count, 1);
});

test("deterministic classifier avoids false positives for gold rush and stock forecasts", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const goldRush = service.deterministicFallback(newsItem({
    title: "Fleeing for their futures, a California exodus unleashes a Florida gold rush",
    tickers: []
  }));
  assert.deepEqual(goldRush.affectedAssetClasses, []);

  const chipForecast = service.deterministicFallback(newsItem({
    title: "AMD, INTC and NVDA Forecasts - Chips Mixed Early on Monday",
    tickers: ["AMD", "INTC", "NVDA"]
  }));
  assert.deepEqual(chipForecast.affectedAssetClasses, ["equities"]);
  assert.deepEqual(chipForecast.affectedMacroCategories, []);
});

test("latest deterministic reclassification updates stale fallback rows only", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "gold-rush",
      title: "Fleeing for their futures, a California exodus unleashes a Florida gold rush",
      tickers: []
    }),
    newsItem({
      id: "manual-gold",
      title: "Gold price rises as investors seek bullion",
      tickers: ["GLD"]
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "gold-rush",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["gold/commodities"],
      affectedThemes: ["Inflation Hedge"]
    }),
    classification({
      newsItemId: "manual-gold",
      classificationModel: "manual_review",
      affectedAssetClasses: ["gold/commodities"]
    })
  ];
  const service = new NewsClassificationService(repository);
  const result = await service.reclassifyLatestDeterministic(10);
  assert.equal(result.requested, 1);
  assert.equal(result.reclassified, 1);
  assert.deepEqual(repository.classifications.find((row) => row.newsItemId === "gold-rush")?.affectedAssetClasses, []);
  assert.deepEqual(repository.classifications.find((row) => row.newsItemId === "manual-gold")?.affectedAssetClasses, ["gold/commodities"]);
});

test("weekly deterministic reclassification updates current period stale theme rows", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "fund-fees",
      title: "ETFs Aren't Always Cheaper Than Mutual Funds. Here's What to Compare Instead.",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    }),
    newsItem({
      id: "dell",
      title: "Dell Just Unveiled a New Weapon Against Apple",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-03T00:00:00.000Z",
      tickers: ["DELL", "AAPL"]
    })
  ];
  repository.classifications = [
    classification({ newsItemId: "fund-fees", classificationModel: "deterministic_fallback", primaryTheme: "Credit", secondaryThemes: [], themeConfidence: 65 }),
    classification({ newsItemId: "dell", classificationModel: "deterministic_fallback", primaryTheme: "Consumer", secondaryThemes: [], themeConfidence: 65 })
  ];
  const service = new NewsClassificationService(repository);
  const result = await service.reclassifyDeterministicForPeriod("2026-06-01", "2026-06-07");
  assert.equal(result.reclassified, 2);
  assert.notEqual(repository.classifications.find((row) => row.newsItemId === "fund-fees")?.primaryTheme, "Credit");
  assert.equal(repository.classifications.find((row) => row.newsItemId === "dell")?.primaryTheme, "Technology");
});

test("weekly reconciliation job reclassifies deterministic rows before summarizing", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "fund-fees",
      title: "ETFs Aren't Always Cheaper Than Mutual Funds. Here's What to Compare Instead.",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "fund-fees",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["bonds"],
      primaryTheme: "Credit",
      secondaryThemes: [],
      themeConfidence: 65
    })
  ];
  const classificationService = new NewsClassificationService(repository);
  const reconciliationService = new WeeklyNewsReconciliationService(repository);
  await new WeeklyNewsReconciliationJob(reconciliationService, classificationService).run(new Date("2026-06-02T00:00:00.000Z"));
  assert.notEqual(repository.classifications.find((row) => row.newsItemId === "fund-fees")?.primaryTheme, "Credit");
  assert.doesNotMatch(repository.weekly[0]?.bondsSummary ?? "", /ETFs Aren't Always Cheaper/);
});

test("weekly reconciliation blocks stale fund-structure bond buckets at summary time", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "fund-fees",
      title: "ETFs Aren't Always Cheaper Than Mutual Funds. Here's What to Compare Instead.",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: ["BND"]
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "fund-fees",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["bonds"],
      primaryTheme: "Credit",
      secondaryThemes: [],
      themeConfidence: 65
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("bonds")?.length, 0);
  assert.equal(grouped.get("equities")?.length, 1);
});

test("theme intelligence corrects stale Credit and Consumer theme rows at summary time", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "fund-fees",
      title: "ETFs Aren't Always Cheaper Than Mutual Funds. Here's What to Compare Instead.",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    }),
    newsItem({
      id: "dell",
      title: "Dell Just Unveiled a New Weapon Against Apple",
      summary: "",
      contentSnippet: "",
      publishedAt: "2026-06-03T00:00:00.000Z",
      tickers: ["DELL", "AAPL"]
    })
  ];
  repository.classifications = [
    classification({ newsItemId: "fund-fees", classificationModel: "deterministic_fallback", primaryTheme: "Credit", secondaryThemes: [], themeConfidence: 65 }),
    classification({ newsItemId: "dell", classificationModel: "deterministic_fallback", primaryTheme: "Consumer", secondaryThemes: [], themeConfidence: 65 })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  assert.equal(intelligence.topThemesThisWeek.some((item) => item.theme === "Credit"), false);
  assert.equal(intelligence.topThemesThisWeek.some((item) => item.theme === "Consumer"), false);
  assert.equal(intelligence.topThemesThisWeek.find((item) => item.theme === "Technology")?.topHeadlines.includes("Dell Just Unveiled a New Weapon Against Apple"), true);
  assert.equal(intelligence.reviewQueue.some((item) => item.title.includes("ETFs Aren't Always Cheaper")), false);
});

test("weekly reconciliation groups classified news and creates draft summary", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [newsItem({ id: "eq" }), newsItem({ id: "rate", title: "Fed rate outlook changes", tickers: [] })];
  repository.classifications = [
    classification({ newsItemId: "eq", affectedAssetClasses: ["equities"], sentiment: "positive" }),
    classification({ newsItemId: "rate", affectedAssetClasses: ["macro"], affectedMacroCategories: ["rates"], sentiment: "negative" })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const weekly = await service.reconcileWeek("2026-06-01", "2026-06-07");
  assert.equal(weekly.status, "draft");
  assert.match(weekly.equitiesSummary ?? "", /equities/);
  assert.match(weekly.ratesSummary ?? "", /rates/);
  assert.equal((weekly.coverageMetadata.bucketCounts as Record<string, number>).equities, 1);
  assert.equal((weekly.coverageMetadata.themeSummaries as Array<{ theme: string; count: number }>)[0]?.theme, "AI");
  assert.equal(weekly.coverageMetadata.classifiedInPeriod, 2);
});

test("weekly reconciliation summarizes canonical themes", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({ id: "ai", title: "AI infrastructure spending rises", tickers: ["NVDA"] }),
    newsItem({ id: "rates", title: "Fed rate cut odds rise", tickers: [] })
  ];
  repository.classifications = [
    classification({ newsItemId: "ai", primaryTheme: "AI", secondaryThemes: ["Technology"], themeConfidence: 80 }),
    classification({ newsItemId: "rates", affectedAssetClasses: ["macro"], primaryTheme: "Rates", secondaryThemes: ["Inflation"], themeConfidence: 65 })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const summaries = service.summarizeThemes(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(summaries.find((item) => item.theme === "AI")?.count, 1);
  assert.equal(summaries.find((item) => item.theme === "Technology")?.count, 1);
  assert.equal(summaries.find((item) => item.theme === "Rates")?.averageConfidence, 65);
});

test("theme intelligence calculates hierarchy, trend, and review queue", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({ id: "old-ai", title: "AI spending rises", publishedAt: "2026-05-19T00:00:00.000Z", tickers: ["NVDA"] }),
    newsItem({ id: "ai-1", title: "AI infrastructure spending rises", publishedAt: "2026-06-01T00:00:00.000Z", tickers: ["NVDA"] }),
    newsItem({ id: "ai-2", title: "Nvidia AI demand expands", publishedAt: "2026-06-02T00:00:00.000Z", tickers: ["NVDA"] }),
    newsItem({ id: "bad", title: "AI chip demand accelerates", publishedAt: "2026-06-03T00:00:00.000Z", tickers: ["NVDA"] })
  ];
  repository.classifications = [
    classification({ newsItemId: "old-ai", primaryTheme: "AI", secondaryThemes: ["Technology"], themeConfidence: 80 }),
    classification({ newsItemId: "ai-1", primaryTheme: "AI", secondaryThemes: ["Technology"], themeConfidence: 80 }),
    classification({ newsItemId: "ai-2", primaryTheme: "AI", secondaryThemes: ["Technology"], themeConfidence: 70, persistenceScore: 70 }),
    classification({ newsItemId: "bad", primaryTheme: "Credit", secondaryThemes: [], themeConfidence: 90 })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  const ai = intelligence.topThemesThisWeek.find((item) => item.theme === "AI");
  assert.equal(ai?.categories?.includes("Investment"), true);
  assert.equal(ai?.trend, "Low confidence trend");
  assert.ok(intelligence.reviewQueue.some((item) => item.reason.includes("AI/technology")));
});

test("theme intelligence marks one-week trend as insufficient history", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({ id: "ai-1", title: "AI infrastructure spending rises", publishedAt: "2026-06-01T00:00:00.000Z", tickers: ["NVDA"] })
  ];
  repository.classifications = [
    classification({ newsItemId: "ai-1", primaryTheme: "AI", secondaryThemes: ["Technology"], themeConfidence: 80 })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  assert.equal(intelligence.topThemesThisWeek.find((item) => item.theme === "AI")?.trend, "Insufficient history");
  assert.equal(intelligence.emergingThemes.length, 0);
});

test("weekly reconciliation does not dump ticker-linked market news into macro", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "spy",
      title: "Stock Market Live June 1, 2026: S&P 500 (SPY) Could See Higher Highs",
      tickers: ["SPY"]
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "spy",
      affectedAssetClasses: [],
      affectedMacroCategories: []
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("equities")?.length, 1);
  assert.equal(grouped.get("macro")?.length, 0);
});

test("weekly reconciliation avoids gold and geopolitical false positives for equity-like titles", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "gold-rush",
      title: "Fleeing for their futures, a California exodus unleashes a Florida gold rush",
      tickers: []
    }),
    newsItem({
      id: "defense-stocks",
      title: "The Pentagon Has $50 Billion in War Damage to Repair. These Defense Stocks Stand to Win.",
      tickers: ["LMT"]
    })
  ];
  repository.classifications = [
    classification({ newsItemId: "gold-rush", affectedAssetClasses: [], affectedMacroCategories: [] }),
    classification({ newsItemId: "defense-stocks", affectedAssetClasses: [], affectedMacroCategories: [] })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("gold")?.length, 0);
  assert.equal(grouped.get("geopolitical")?.length, 0);
  assert.equal(grouped.get("equities")?.length, 1);
  assert.equal(grouped.get("macro")?.length, 1);
});

test("weekly reconciliation ignores stale gold classification for gold rush headlines", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "gold-rush",
      title: "Fleeing for their futures, a California exodus unleashes a Florida gold rush",
      tickers: ["GLD"]
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "gold-rush",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["gold/commodities"],
      affectedMacroCategories: []
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("gold")?.length, 0);
  assert.equal(
    Array.from(grouped.entries()).filter(([bucket]) => bucket !== "gold").reduce((sum, [, items]) => sum + items.length, 0),
    1
  );
});

test("weekly reconciliation keeps explicit financial gold headlines in gold bucket", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "spot-gold",
      title: "Spot gold trades near $4,460/oz after ISM Manufacturing PMI rises to 54",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "spot-gold",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["gold/commodities"],
      affectedMacroCategories: []
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("gold")?.length, 1);
});

test("GDELT normalizer parses compact dates and stores provider metadata", () => {
  const group = gdeltQueryGroup();
  const service = new GdeltNormalizationService();
  const parsed = gdeltNormalizationInternals.parseDate("20260601T123456Z");
  const article = service.normalize({
    url: "https://www.example.com/global-trade",
    title: "Tariffs raise global supply chain risks",
    seendate: "20260601T123456Z",
    domain: "www.example.com",
    language: "English",
    sourcecountry: "United States",
    tone: "-2.5",
    themes: ["ECON_TRADE"],
    persons: ["Jane Doe"],
    organizations: ["World Trade Organization"]
  }, group);

  assert.equal(parsed, "2026-06-01T12:34:56.000Z");
  assert.equal(article?.sourceProvider, "gdelt");
  assert.equal(article?.sourceName, "www.example.com");
  assert.equal(article?.publishedAt, "2026-06-01T12:34:56.000Z");
  assert.equal(article?.providerMetadata.gdeltQueryGroupKey, "trade_supply_chain");
  assert.deepEqual(article?.gdeltMetadata.gdeltThemes, ["ECON_TRADE"]);
  assert.equal(article?.gdeltMetadata.tone, -2.5);
});

test("GDELT provider wraps OR query groups and formats day-based timespans", () => {
  assert.equal(
    gdeltProviderInternals.normalizeQuery('"Federal Reserve" OR "interest rates"'),
    '("Federal Reserve" OR "interest rates")'
  );
  assert.equal(
    gdeltProviderInternals.normalizeQuery('("Federal Reserve" OR "interest rates")'),
    '("Federal Reserve" OR "interest rates")'
  );
  assert.equal(gdeltProviderInternals.formatTimespan(72), "3d");
  assert.equal(gdeltProviderInternals.formatTimespan(25), "25h");
});

test("GDELT provider extracts bounded fallback terms from OR query groups", () => {
  assert.deepEqual(
    gdeltProviderInternals.extractFallbackTerms('("Federal Reserve" OR "interest rates" OR "Treasury yields" OR "rate cuts" OR "rate hikes")'),
    ['"Federal Reserve"', '"interest rates"', '"Treasury yields"', '"rate cuts"']
  );
  assert.deepEqual(gdeltProviderInternals.extractFallbackTerms('"Federal Reserve"'), ['"Federal Reserve"']);
});

test("GDELT relevance filter drops local noise but keeps macro/world news", () => {
  const group = gdeltQueryGroup();
  const normalizer = new GdeltNormalizationService();
  const service = new GdeltRelevanceService();
  const macro = normalizer.normalize({
    url: "https://example.com/fed",
    title: "Central bank policy shift moves global currency markets",
    seendate: "20260601T000000Z"
  }, group);
  const localNoise = normalizer.normalize({
    url: "https://example.com/local",
    title: "Local crime update after sports event traffic accident",
    seendate: "20260601T000000Z"
  }, group);

  assert.equal(service.isRelevant(macro as GdeltProviderArticle), true);
  assert.equal(service.isRelevant(localNoise as GdeltProviderArticle), false);
});

test("GDELT theme mapping assigns macro trade classifications without recommendations", () => {
  const service = new GdeltThemeMappingService();
  const mapping = service.map({
    title: "New export controls raise semiconductor supply chain risks",
    summary: null,
    primaryTheme: "Trade / Supply Chain",
    category: "trade_supply_chain"
  });
  assert.equal(mapping.primaryTheme, "Trade / Supply Chain");
  assert.deepEqual(mapping.affectedMacroCategories, ["trade_supply_chain"]);
  assert.ok(mapping.affectedAssetClasses.includes("macro"));
  assert.equal(mapping.reasoningSummary.includes("buy"), false);
  assert.equal(mapping.reasoningSummary.includes("sell"), false);
});

test("weekly reconciliation buckets non-equity trade supply-chain news as macro", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "trade",
      title: "Export controls raise supply chain risks across Asia",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "trade",
      affectedAssetClasses: ["macro", "equities"],
      affectedMacroCategories: ["trade_supply_chain"],
      primaryTheme: "Trade / Supply Chain",
      secondaryThemes: [],
      themeConfidence: 70
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("macro")?.length, 1);
  assert.equal(grouped.get("equities")?.length, 0);
});

test("theme intelligence includes Trade / Supply Chain in macro hierarchy", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "trade",
      title: "Tariff shock raises supply chain risk",
      publishedAt: "2026-06-02T00:00:00.000Z",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "trade",
      primaryTheme: "Trade / Supply Chain",
      secondaryThemes: [],
      themeConfidence: 70
    })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  const trade = intelligence.topThemesThisWeek.find((item) => item.theme === "Trade / Supply Chain");
  assert.deepEqual(trade?.categories, ["Macro"]);
});

test("GDELT ingestion stores normalized news, classifications, metadata, and logs", async () => {
  const newsRepository = new UpsertingFakeNewsRepository();
  const gdeltRepository = new FakeGdeltRepository();
  const group = gdeltRepository.groups[0] as GdeltQueryGroup;
  const article = new GdeltNormalizationService().normalize({
    url: "https://example.com/trade-risk",
    title: "Export controls raise semiconductor supply chain risks",
    seendate: "20260601T120000Z",
    domain: "example.com",
    language: "English",
    sourcecountry: "United States",
    themes: ["ECON_TRADE"]
  }, group);
  const service = new GlobalNewsIngestionService(
    newsRepository,
    gdeltRepository,
    new FakeGdeltProvider([article as GdeltProviderArticle]),
    undefined,
    undefined,
    undefined,
    { enabled: true, maxArticlesPerQuery: 8, maxArticlesPerDay: 10, recentWindowHours: 24, queryDelayMs: 0, minRefreshMinutes: 30 }
  );

  const result = await service.ingestGlobalNews({ force: true });

  assert.equal(result.articlesFetched, 1);
  assert.equal(result.articlesInserted, 1);
  assert.equal(newsRepository.items[0]?.sourceProvider, "gdelt");
  assert.deepEqual(newsRepository.items[0]?.tickers, []);
  assert.equal(newsRepository.classifications[0]?.primaryTheme, "Trade / Supply Chain");
  assert.deepEqual(newsRepository.classifications[0]?.affectedMacroCategories, ["trade_supply_chain"]);
  assert.equal(gdeltRepository.metadata.length, 1);
  assert.equal(gdeltRepository.logs.some((log) => log.jobName === "gdelt-query-group-ingestion"), true);
  assert.equal(newsRepository.logs.some((log) => log.jobName === "gdelt-news-ingestion"), true);
});

test("GDELT ingestion records failed query groups without breaking successful groups", async () => {
  const newsRepository = new UpsertingFakeNewsRepository();
  const gdeltRepository = new FakeGdeltRepository();
  gdeltRepository.groups = [
    gdeltQueryGroup({ id: "success", queryKey: "macro_rates_policy", canonicalTheme: "Rates" }),
    gdeltQueryGroup({ id: "failed", queryKey: "energy_commodities", canonicalTheme: "Energy" }),
    gdeltQueryGroup({ id: "skipped", queryKey: "currency_usd", canonicalTheme: "Currency" })
  ];
  const article = new GdeltNormalizationService().normalize({
    url: "https://example.com/rates",
    title: "Federal Reserve policy keeps interest rates in focus",
    seendate: "20260601T120000Z"
  }, gdeltRepository.groups[0] as GdeltQueryGroup);
  class MixedGdeltProvider implements GdeltNewsProvider {
    readonly name = "gdelt" as const;
    async fetchQueryGroup(input: { queryGroup: GdeltQueryGroup }) {
      if (input.queryGroup.id === "failed") throw new Error("GDELT request failed with status 429.");
      return [article as GdeltProviderArticle];
    }
  }
  const service = new GlobalNewsIngestionService(
    newsRepository,
    gdeltRepository,
    new MixedGdeltProvider(),
    undefined,
    undefined,
    undefined,
    { enabled: true, maxArticlesPerQuery: 8, maxArticlesPerDay: 10, recentWindowHours: 24, queryDelayMs: 0, minRefreshMinutes: 30 }
  );

  const result = await service.ingestGlobalNews({ force: true });

  assert.equal(result.failedQueryGroups, 1);
  assert.equal(result.rateLimitHit, true);
  assert.equal(result.articlesInserted, 1);
  assert.equal(gdeltRepository.logs.find((log) => log.queryGroupId === "failed")?.status, "failed");
  assert.equal(gdeltRepository.logs.find((log) => log.queryGroupId === "success")?.status, "success");
  assert.equal(gdeltRepository.logs.find((log) => log.queryGroupId === "skipped"), undefined);
  assert.match(newsRepository.logs[0]?.errorMessage ?? "", /rate limit/i);
});

test("news dashboard exposes latest status for each active GDELT query group", async () => {
  const newsRepository = new FakeNewsRepository();
  const gdeltRepository = new FakeGdeltRepository();
  gdeltRepository.groups = [
    gdeltQueryGroup({ id: "rates", queryKey: "macro_rates_policy", queryName: "Rates", canonicalTheme: "Rates" }),
    gdeltQueryGroup({ id: "geo", queryKey: "geopolitical_risk", queryName: "Geopolitical", canonicalTheme: "Geopolitical" })
  ];
  gdeltRepository.logs = [
    {
      id: "log-rates",
      jobName: "gdelt-query-group-ingestion",
      queryGroupId: "rates",
      startedAt: "2026-06-02T00:00:00.000Z",
      completedAt: "2026-06-02T00:00:01.000Z",
      status: "success",
      articlesFetched: 8,
      articlesInserted: 8,
      duplicatesDetected: 0,
      errorMessage: null,
      metadata: {},
      createdAt: ""
    }
  ];
  const dashboard = await new NewsDashboardService(
    newsRepository,
    new ThemeIntelligenceService(newsRepository),
    gdeltRepository
  ).getDashboard();

  assert.equal(dashboard.gdeltQueryStatuses.length, 2);
  assert.equal(dashboard.gdeltQueryStatuses.find((row) => row.queryGroup.id === "rates")?.latestLog?.status, "success");
  assert.equal(dashboard.gdeltQueryStatuses.find((row) => row.queryGroup.id === "geo")?.latestLog, null);
});

test("cron protection rejects missing or invalid secret", () => {
  assert.equal(isCronSecretValid(undefined, "secret"), false);
  assert.equal(isCronSecretValid("secret", "bad"), false);
  assert.equal(isCronSecretValid("secret", "secret"), true);
});

test("Supabase JWT clock-skew helper detects issued-at-future errors", () => {
  assert.equal(isJwtIssuedAtFutureError({ message: "JWT issued at future" }), true);
  assert.equal(isJwtIssuedAtFutureError({ message: "duplicate key value violates unique constraint" }), false);
  assert.equal(isJwtIssuedAtFutureError(null), false);
});
