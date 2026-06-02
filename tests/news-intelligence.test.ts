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
import type { MacroIndicatorRepository } from "../src/application/ports/repositories/MacroIndicatorRepository";
import type { MacroThemeSignal } from "../src/domain/macro/types";
import type { GdeltNewsProvider, GdeltProviderArticle } from "../src/application/ports/providers/GdeltNewsProvider";
import type { NewsProvider } from "../src/application/ports/providers/NewsProvider";
import type { GdeltRepository, InsertGdeltIngestionLogInput, UpsertGdeltArticleMetadataInput } from "../src/application/ports/repositories/GdeltRepository";
import type { NewsRepository, UpsertNewsClassificationInput, UpsertNewsItemInput, UpsertWeeklyNewsReconciliationInput } from "../src/application/ports/repositories/NewsRepository";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";
import type { Instrument } from "../src/domain/universe/types";

function newsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: overrides.id ?? "news-1",
    sourceProvider: overrides.sourceProvider ?? "test",
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
    language: overrides.language ?? "en",
    country: null,
    providerMetadata: overrides.providerMetadata ?? {},
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
    lastAttemptedAt: overrides.lastAttemptedAt ?? null,
    lastSuccessAt: overrides.lastSuccessAt ?? null,
    nextRunAt: overrides.nextRunAt ?? null,
    failureCount: overrides.failureCount ?? 0,
    lastError: overrides.lastError ?? null,
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

  async listDueQueryGroups(input: { now: string; limit: number }) {
    const now = new Date(input.now).getTime();
    return this.groups
      .filter((group) => group.isActive && (!group.nextRunAt || new Date(group.nextRunAt).getTime() <= now))
      .sort((a, b) => (a.nextRunAt ?? "").localeCompare(b.nextRunAt ?? "") || (a.lastAttemptedAt ?? "").localeCompare(b.lastAttemptedAt ?? "") || a.queryKey.localeCompare(b.queryKey))
      .slice(0, input.limit);
  }

  async updateQueryGroupSchedule(input: {
    id: string;
    lastAttemptedAt: string;
    lastSuccessAt?: string | null;
    nextRunAt: string;
    failureCount: number;
    lastError: string | null;
  }) {
    this.groups = this.groups.map((group) => group.id === input.id
      ? {
          ...group,
          lastAttemptedAt: input.lastAttemptedAt,
          lastSuccessAt: input.lastSuccessAt ?? null,
          nextRunAt: input.nextRunAt,
          failureCount: input.failureCount,
          lastError: input.lastError
        }
      : group);
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

class FakeMacroSignalRepository implements Partial<MacroIndicatorRepository> {
  constructor(private readonly signals: MacroThemeSignal[]) {}
  async listMacroThemeSignalsForPeriod(periodStart: string, periodEnd: string) {
    return this.signals.filter((signal) => signal.signalDate >= periodStart && signal.signalDate <= periodEnd);
  }
  async listLatestMacroThemeSignals(asOfDate: string) {
    const latest = new Map<string, MacroThemeSignal>();
    for (const signal of this.signals.filter((signal) => signal.signalDate <= asOfDate).sort((a, b) => b.signalDate.localeCompare(a.signalDate))) {
      const key = `${signal.sourceProvider}|${signal.sourceIndicatorCode}|${signal.theme}`;
      if (!latest.has(key)) latest.set(key, signal);
    }
    return Array.from(latest.values());
  }
}

function macroSignal(overrides: Partial<MacroThemeSignal> = {}): MacroThemeSignal {
  return {
    id: overrides.id ?? "macro-signal-1",
    signalDate: overrides.signalDate ?? "2026-06-01",
    sourceProvider: overrides.sourceProvider ?? "fred",
    sourceIndicatorCode: overrides.sourceIndicatorCode ?? "FEDFUNDS",
    theme: overrides.theme ?? "Rates",
    themeCategory: overrides.themeCategory ?? "Macro",
    direction: overrides.direction ?? "rising",
    regimeLabel: overrides.regimeLabel ?? "restrictive",
    severityScore: overrides.severityScore ?? 42,
    persistenceScore: overrides.persistenceScore ?? 70,
    confidenceScore: overrides.confidenceScore ?? 85,
    explanation: overrides.explanation ?? "FEDFUNDS is restrictive and rising.",
    createdAt: "",
    updatedAt: ""
  };
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

test("deterministic classifier maps geopolitical examples", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const examples = [
    "Oil rises as Iran and Middle East peace talks stall",
    "Sanctions hit shipping after new conflict escalation",
    "Election risk and political instability weigh on markets",
    "Trade restrictions and export controls pressure chip supply chains"
  ];
  for (const [index, title] of examples.entries()) {
    const output = service.deterministicFallback(newsItem({ id: `geo-${index}`, title, summary: "", tickers: [] }));
    assert.equal(output.primaryTheme, "Geopolitical");
    assert.ok(output.affectedMacroCategories.includes("geopolitical"));
  }
});

test("deterministic classifier allows geopolitical oil headlines to carry Energy", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const output = service.deterministicFallback(newsItem({
    id: "geo-oil",
    title: "Oil jumps as Iran conflict raises maritime disruption risk",
    summary: "",
    tickers: []
  }));
  assert.equal(output.primaryTheme, "Geopolitical");
  assert.ok(output.secondaryThemes.includes("Energy"));
  assert.ok(output.affectedMacroCategories.includes("geopolitical"));
  assert.ok(output.affectedMacroCategories.includes("energy"));
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

test("deterministic classifier maps broad market articles to Growth instead of Technology", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const output = service.deterministicFallback(newsItem({
    title: "5 Things to Know Before the Stock Market Opens",
    summary: "S&P 500 futures are steady before jobs data.",
    tickers: []
  }));
  assert.deepEqual(output.affectedAssetClasses, ["equities", "macro"]);
  assert.equal(output.primaryTheme, "Growth");
  assert.equal(output.secondaryThemes.includes("Technology"), false);
});

test("deterministic classifier uses ticker themes for sector-specific articles", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const financials = service.deterministicFallback(newsItem({
    title: "Why Goldman Sachs is a top stock for the long term",
    summary: "",
    contentSnippet: "",
    tickers: ["GS"]
  }));
  assert.equal(financials.primaryTheme, "Financials");

  const healthcare = service.deterministicFallback(newsItem({
    title: "Eli Lilly shares rise after drug trial update",
    summary: "",
    contentSnippet: "",
    tickers: ["LLY"]
  }));
  assert.equal(healthcare.primaryTheme, "Healthcare");
});

test("deterministic classifier supports expanded canonical theme taxonomy", () => {
  const service = new NewsClassificationService(new FakeNewsRepository());
  const realEstate = service.deterministicFallback(newsItem({
    title: "Real estate REITs rally as property demand improves",
    summary: "",
    contentSnippet: "",
    tickers: ["VNQ"]
  }));
  assert.equal(realEstate.primaryTheme, "Real Estate");

  const longDuration = service.deterministicFallback(newsItem({
    title: "Long duration Treasury ETFs face renewed duration risk",
    summary: "",
    contentSnippet: "",
    tickers: ["TLT"]
  }));
  assert.equal(longDuration.primaryTheme, "Long Duration");
  assert.ok(longDuration.affectedMacroCategories.includes("rates"));

  const inflationHedge = service.deterministicFallback(newsItem({
    title: "Gold and TIPS regain attention as inflation hedge demand rises",
    summary: "",
    contentSnippet: "",
    tickers: ["GLD", "TIP"]
  }));
  assert.ok([inflationHedge.primaryTheme, ...inflationHedge.secondaryThemes].includes("Inflation Hedge"));
});

test("classification validator accepts expanded canonical themes", () => {
  const output = validateNewsClassificationOutput({
    sentiment: "neutral",
    classification: "medium_term_theme",
    primaryTheme: "Utilities",
    secondaryThemes: ["Materials", "Value", "High Beta", "Recession Hedge"],
    themeConfidence: 72
  });
  assert.equal(output.primaryTheme, "Utilities");
  assert.deepEqual(output.secondaryThemes, ["Materials", "Value", "High Beta", "Recession Hedge"]);
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
  repository.items = [
    newsItem({ id: "eq", summary: "", contentSnippet: "" }),
    newsItem({ id: "rate", title: "Fed rate outlook changes", summary: "", contentSnippet: "", tickers: [] })
  ];
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
  assert.equal((weekly.coverageMetadata.themeSummaries as Array<{ theme: string; count: number }>).some((item) => item.theme === "AI"), true);
  assert.equal(weekly.coverageMetadata.classifiedInPeriod, 2);
});

test("weekly reconciliation excludes noisy stored GDELT rows without deleting them", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "clean",
      title: "Central bank policy shift moves global currency markets",
      sourceProvider: "gdelt",
      language: "English",
      tickers: [],
      providerMetadata: { macroCategory: "currency" }
    }),
    newsItem({
      id: "noise",
      title: "O yapılarda elektrik, su ve doğalgaz tamamen kesiliyor",
      sourceProvider: "gdelt",
      language: "Turkish",
      tickers: [],
      providerMetadata: { macroCategory: "geopolitical" }
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "clean",
      affectedAssetClasses: ["macro"],
      affectedMacroCategories: ["currency"],
      primaryTheme: "Currency",
      secondaryThemes: [],
      themeConfidence: 65
    }),
    classification({
      newsItemId: "noise",
      affectedAssetClasses: ["macro"],
      affectedMacroCategories: ["geopolitical"],
      primaryTheme: null,
      secondaryThemes: [],
      themeConfidence: 30
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const weekly = await service.reconcileWeek("2026-06-01", "2026-06-07");
  assert.equal(weekly.coverageMetadata.classifiedInPeriod, 2);
  assert.equal(weekly.coverageMetadata.includedInReconciliation, 1);
  assert.equal(weekly.coverageMetadata.excludedByEligibility, 1);
  assert.equal((weekly.coverageMetadata.bucketCounts as Record<string, number>).currency, 1);
});

test("weekly reconciliation summarizes canonical themes", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({ id: "ai", title: "AI infrastructure spending rises", summary: "", contentSnippet: "", tickers: ["NVDA"] }),
    newsItem({ id: "rates", title: "Fed rate cut odds rise", summary: "", contentSnippet: "", tickers: [] })
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

test("weekly reconciliation includes FRED macro signals with zero news items", async () => {
  const repository = new FakeNewsRepository();
  const macroRepository = new FakeMacroSignalRepository([
    macroSignal({ id: "rates", signalDate: "2026-05-01", theme: "Rates", sourceIndicatorCode: "FEDFUNDS", explanation: "FEDFUNDS is restrictive." }),
    macroSignal({ id: "inflation", signalDate: "2026-05-01", theme: "Inflation", sourceIndicatorCode: "CPIAUCSL", explanation: "CPI is moderating." })
  ]);
  const service = new WeeklyNewsReconciliationService(
    repository,
    undefined,
    undefined,
    undefined,
    undefined,
    macroRepository as unknown as MacroIndicatorRepository
  );
  await service.reconcileWeek("2026-06-01", "2026-06-07");
  const summaries = repository.weekly[0]?.coverageMetadata.themeSummaries as Array<{ theme: string; newsItemCount: number; macroSignalCount: number }> | undefined;
  assert.equal(repository.items.length, 0);
  assert.equal(summaries?.find((item) => item.theme === "Rates")?.newsItemCount, 0);
  assert.equal(summaries?.find((item) => item.theme === "Rates")?.macroSignalCount, 1);
});

test("weekly theme summaries rank by impact instead of raw count alone", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({ id: "tech-1", title: "Technology stock update", tickers: ["AAPL"] }),
    newsItem({ id: "tech-2", title: "Software stock update", tickers: ["MSFT"] }),
    newsItem({ id: "tech-3", title: "Cloud stock update", tickers: ["ORCL"] })
  ];
  repository.classifications = [
    classification({ newsItemId: "tech-1", primaryTheme: "Technology", severityScore: 5, persistenceScore: 5, themeConfidence: 40 }),
    classification({ newsItemId: "tech-2", primaryTheme: "Technology", severityScore: 5, persistenceScore: 5, themeConfidence: 40 }),
    classification({ newsItemId: "tech-3", primaryTheme: "Technology", severityScore: 5, persistenceScore: 5, themeConfidence: 40 })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const summaries = service.summarizeThemes(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"), [
    macroSignal({ theme: "Rates", severityScore: 90, persistenceScore: 90, confidenceScore: 90 })
  ]);
  assert.equal(summaries[0]?.theme, "Rates");
  assert.ok((summaries[0]?.impactScore ?? 0) > (summaries.find((item) => item.theme === "Technology")?.impactScore ?? 0));
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

test("theme intelligence includes FRED macro signals separately from news counts", async () => {
  const repository = new FakeNewsRepository();
  const macroRepository = new FakeMacroSignalRepository([
    macroSignal({ id: "curve", signalDate: "2026-05-30", theme: "Yield Curve", sourceIndicatorCode: "T10Y2Y", explanation: "T10Y2Y remains inverted." })
  ]);
  const service = new ThemeIntelligenceService(repository, macroRepository as unknown as MacroIndicatorRepository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  const curve = intelligence.topThemesThisWeek.find((theme) => theme.theme === "Yield Curve");
  assert.equal(curve?.newsItemCount, 0);
  assert.equal(curve?.macroSignalCount, 1);
  assert.equal(curve?.sources?.includes("FRED"), true);
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

test("theme intelligence excludes noisy stored GDELT rows from summaries and review queue", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "noise",
      title: "تراجع أسعار النفط في آسيا وسط استمرار الغموض",
      sourceProvider: "gdelt",
      language: "Arabic",
      tickers: [],
      providerMetadata: { macroCategory: "energy_commodities" }
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "noise",
      affectedAssetClasses: ["macro"],
      affectedMacroCategories: ["energy"],
      primaryTheme: null,
      secondaryThemes: [],
      themeConfidence: 30
    })
  ];
  const service = new ThemeIntelligenceService(repository);
  const intelligence = await service.getThemeIntelligence("2026-06-01", "2026-06-07");
  assert.equal(intelligence.topThemesThisWeek.length, 0);
  assert.equal(intelligence.reviewQueue.length, 0);
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

test("weekly reconciliation keeps gold yield headlines out of bonds", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "gold-yields",
      title: "Gold gains on easing Treasury yields amid Mideast uncertainty",
      tickers: []
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "gold-yields",
      classificationModel: "deterministic_fallback",
      affectedAssetClasses: ["bonds"],
      affectedMacroCategories: ["rates"],
      primaryTheme: "Rates",
      secondaryThemes: [],
      themeConfidence: 65
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("gold")?.length, 1);
  assert.equal(grouped.get("bonds")?.length, 0);
});

test("weekly reconciliation corrects stale bucket errors before summaries", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "gold-oil",
      title: "Gold falls as oil jumps on U.S.-Iran deadlock - Kitco PM Report",
      tickers: [],
      sourceProvider: "financial_modeling_prep"
    }),
    newsItem({
      id: "ai-stock",
      title: "3 Trillion-Dollar AI Stocks to Buy Now, According to Wall Street",
      tickers: [],
      sourceProvider: "financial_modeling_prep"
    })
  ];
  repository.classifications = [
    classification({
      newsItemId: "gold-oil",
      affectedAssetClasses: ["bonds"],
      affectedMacroCategories: [],
      primaryTheme: "Credit",
      secondaryThemes: [],
      themeConfidence: 65
    }),
    classification({
      newsItemId: "ai-stock",
      affectedAssetClasses: ["macro"],
      affectedMacroCategories: ["currency"],
      primaryTheme: "Currency",
      secondaryThemes: [],
      themeConfidence: 65
    })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const grouped = service.groupByBucket(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(grouped.get("gold")?.length, 1);
  assert.equal(grouped.get("bonds")?.length, 0);
  assert.equal(grouped.get("equities")?.length, 1);
  assert.equal(grouped.get("currency")?.length, 0);
});

test("theme summaries correct stale theme errors before rollups", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [
    newsItem({
      id: "healthcare",
      title: "AbbVie vs. Pfizer: Which Healthcare Stock Is a Better Buy in 2026?",
      summary: "",
      contentSnippet: "",
      tickers: ["ABBV"],
      sourceProvider: "financial_modeling_prep"
    }),
    newsItem({
      id: "ai-buildout",
      title: "Alphabet plans to raise $80 billion to pay for AI buildout",
      summary: "",
      contentSnippet: "",
      tickers: ["GOOGL"],
      sourceProvider: "financial_modeling_prep"
    })
  ];
  repository.classifications = [
    classification({ newsItemId: "healthcare", primaryTheme: "Financials", secondaryThemes: [], themeConfidence: 65 }),
    classification({ newsItemId: "ai-buildout", primaryTheme: "Industrials", secondaryThemes: [], themeConfidence: 65 })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const summaries = service.summarizeThemes(await repository.listClassifiedNewsForPeriod("2026-06-01", "2026-06-07"));
  assert.equal(summaries.find((item) => item.theme === "Healthcare")?.count, 1);
  assert.equal(summaries.find((item) => item.theme === "Financials"), undefined);
  assert.equal(summaries.find((item) => item.theme === "AI")?.count, 1);
  assert.equal(summaries.find((item) => item.theme === "Technology")?.count, 1);
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
  const group = gdeltQueryGroup({ category: "currency", canonicalTheme: "Currency" });
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

test("GDELT relevance filter drops non-English and loose query matches", () => {
  const normalizer = new GdeltNormalizationService();
  const service = new GdeltRelevanceService();
  const geopolitical = gdeltQueryGroup({ category: "geopolitical", canonicalTheme: "Geopolitical" });
  const currency = gdeltQueryGroup({ category: "currency", canonicalTheme: "Currency" });
  const rates = gdeltQueryGroup({ category: "macro_rates", canonicalTheme: "Rates" });

  const nonEnglish = normalizer.normalize({
    url: "https://example.com/turkish",
    title: "O yapılarda elektrik, su ve doğalgaz tamamen kesiliyor",
    seendate: "20260601T000000Z",
    language: "Turkish"
  }, geopolitical);
  const looseCorporate = normalizer.normalize({
    url: "https://example.com/alphabet",
    title: "Alphabet plans to raise $80 billion to pay for AI buildout",
    seendate: "20260601T000000Z",
    language: "English"
  }, currency);
  const unrelatedRates = normalizer.normalize({
    url: "https://example.com/asus",
    title: "ASUS Brings Enterprise to Edge AI to Life at Computex 2026",
    seendate: "20260601T000000Z",
    language: "English"
  }, rates);

  assert.equal(service.isRelevant(nonEnglish as GdeltProviderArticle), false);
  assert.equal(service.isRelevant(looseCorporate as GdeltProviderArticle), false);
  assert.equal(service.isRelevant(unrelatedRates as GdeltProviderArticle), false);
});

test("GDELT theme mapping assigns export-control stories to geopolitical without recommendations", () => {
  const service = new GdeltThemeMappingService();
  const mapping = service.map({
    title: "New export controls raise semiconductor supply chain risks",
    summary: null,
    primaryTheme: "Trade / Supply Chain",
    category: "trade_supply_chain"
  });
  assert.equal(mapping.primaryTheme, "Geopolitical");
  assert.ok(mapping.affectedMacroCategories.includes("geopolitical"));
  assert.ok(mapping.affectedAssetClasses.includes("macro"));
  assert.equal(mapping.reasoningSummary.includes("buy"), false);
  assert.equal(mapping.reasoningSummary.includes("sell"), false);
});

test("weekly reconciliation buckets export-control stories as geopolitical", async () => {
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
  assert.equal(grouped.get("geopolitical")?.length, 1);
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
    {
      enabled: true,
      maxArticlesPerQuery: 8,
      maxArticlesPerDay: 10,
      recentWindowHours: 24,
      queryDelayMs: 0,
      minRefreshMinutes: 30,
      maxQueryGroupsPerRun: 1,
      querySuccessCooldownMinutes: 240,
      queryFailureBackoffMinutes: 30,
      queryRateLimitBackoffMinutes: 60
    }
  );

  const result = await service.ingestGlobalNews();

  assert.equal(result.articlesFetched, 1);
  assert.equal(result.articlesInserted, 1);
  assert.equal(newsRepository.items[0]?.sourceProvider, "gdelt");
  assert.deepEqual(newsRepository.items[0]?.tickers, []);
  assert.equal(newsRepository.classifications[0]?.primaryTheme, "Geopolitical");
  assert.ok(newsRepository.classifications[0]?.affectedMacroCategories.includes("geopolitical"));
  assert.equal(gdeltRepository.metadata.length, 1);
  assert.equal(gdeltRepository.groups[0]?.failureCount, 0);
  assert.notEqual(gdeltRepository.groups[0]?.nextRunAt, null);
  assert.equal(gdeltRepository.logs.some((log) => log.jobName === "gdelt-query-group-ingestion"), true);
  assert.equal(newsRepository.logs.some((log) => log.jobName === "gdelt-news-ingestion"), true);
});

test("GDELT ingestion processes only the next due query group batch", async () => {
  const newsRepository = new UpsertingFakeNewsRepository();
  const gdeltRepository = new FakeGdeltRepository();
  gdeltRepository.groups = [
    gdeltQueryGroup({ id: "success", queryKey: "macro_rates_policy", canonicalTheme: "Rates", category: "macro_rates", nextRunAt: "2026-05-31T00:00:00.000Z" }),
    gdeltQueryGroup({ id: "queued", queryKey: "energy_commodities", canonicalTheme: "Energy", nextRunAt: "2026-06-01T00:00:00.000Z" })
  ];
  const article = new GdeltNormalizationService().normalize({
    url: "https://example.com/rates",
    title: "Federal Reserve policy keeps interest rates in focus",
    seendate: "20260601T120000Z"
  }, gdeltRepository.groups[0] as GdeltQueryGroup);
  class BatchGdeltProvider implements GdeltNewsProvider {
    readonly name = "gdelt" as const;
    calls: string[] = [];
    async fetchQueryGroup(input: { queryGroup: GdeltQueryGroup }) {
      this.calls.push(input.queryGroup.id);
      return [article as GdeltProviderArticle];
    }
  }
  const provider = new BatchGdeltProvider();
  const service = new GlobalNewsIngestionService(
    newsRepository,
    gdeltRepository,
    provider,
    undefined,
    undefined,
    undefined,
    {
      enabled: true,
      maxArticlesPerQuery: 8,
      maxArticlesPerDay: 10,
      recentWindowHours: 24,
      queryDelayMs: 0,
      minRefreshMinutes: 30,
      maxQueryGroupsPerRun: 1,
      querySuccessCooldownMinutes: 240,
      queryFailureBackoffMinutes: 30,
      queryRateLimitBackoffMinutes: 60
    }
  );

  const result = await service.ingestGlobalNews();

  assert.equal(result.queryGroupsRequested, 1);
  assert.deepEqual(provider.calls, ["success"]);
  assert.equal(result.articlesInserted, 1);
  assert.equal(gdeltRepository.logs.find((log) => log.queryGroupId === "success")?.status, "success");
  assert.equal(gdeltRepository.logs.find((log) => log.queryGroupId === "queued"), undefined);
});

test("GDELT ingestion backs off failed due groups", async () => {
  const newsRepository = new UpsertingFakeNewsRepository();
  const gdeltRepository = new FakeGdeltRepository();
  gdeltRepository.groups = [
    gdeltQueryGroup({ id: "failed", queryKey: "energy_commodities", canonicalTheme: "Energy", failureCount: 1 })
  ];
  class FailingGdeltProvider implements GdeltNewsProvider {
    readonly name = "gdelt" as const;
    async fetchQueryGroup(): Promise<GdeltProviderArticle[]> {
      throw new Error("GDELT request failed with status 429.");
    }
  }
  const service = new GlobalNewsIngestionService(
    newsRepository,
    gdeltRepository,
    new FailingGdeltProvider(),
    undefined,
    undefined,
    undefined,
    {
      enabled: true,
      maxArticlesPerQuery: 8,
      maxArticlesPerDay: 10,
      recentWindowHours: 24,
      queryDelayMs: 0,
      minRefreshMinutes: 30,
      maxQueryGroupsPerRun: 1,
      querySuccessCooldownMinutes: 240,
      queryFailureBackoffMinutes: 30,
      queryRateLimitBackoffMinutes: 60
    }
  );

  const result = await service.ingestGlobalNews();

  assert.equal(result.failedQueryGroups, 1);
  assert.equal(result.rateLimitHit, true);
  assert.equal(gdeltRepository.groups[0]?.failureCount, 2);
  assert.match(gdeltRepository.groups[0]?.lastError ?? "", /429/);
  assert.notEqual(gdeltRepository.groups[0]?.nextRunAt, null);
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
