import test from "node:test";
import assert from "node:assert/strict";
import { NewsDeduplicationService } from "../src/application/services/news/NewsDeduplicationService";
import { NewsInstrumentLinkingService } from "../src/application/services/news/NewsInstrumentLinkingService";
import { NewsClassificationService, validateNewsClassificationOutput } from "../src/application/services/news/NewsClassificationService";
import { WeeklyNewsReconciliationService } from "../src/application/services/news/WeeklyNewsReconciliationService";
import { isCronSecretValid } from "../src/application/services/news/cronSecret";
import type { NewsClassification, NewsIngestionLog, NewsItem, WeeklyNewsReconciliation } from "../src/domain/news/types";
import type { NewsRepository, UpsertNewsClassificationInput, UpsertNewsItemInput, UpsertWeeklyNewsReconciliationInput } from "../src/application/ports/repositories/NewsRepository";
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
  async getClassification(newsItemId: string) { return this.classifications.find((row) => row.newsItemId === newsItemId) ?? null; }
  async upsertClassifications(input: UpsertNewsClassificationInput[]) {
    this.classifications.push(...input.map((item, index) => ({ ...item, id: item.id ?? `classification-${index}`, createdAt: "", updatedAt: "" })));
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
    const row = { ...input, id: input.id ?? "weekly-1", createdAt: "", updatedAt: "" };
    this.weekly = [row];
    return row;
  }
  async listWeeklyReconciliations() { return this.weekly; }
  async getLatestWeeklyReconciliation() { return this.weekly[0] ?? null; }
  async insertIngestionLog() {}
  async listIngestionLogs() { return this.logs; }
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
  assert.ok(output.affectedThemes.includes("Semiconductors"));
  assert.deepEqual(output.affectedInstruments, ["NVDA", "INTC"]);
});

test("weekly reconciliation groups classified news and creates draft summary", async () => {
  const repository = new FakeNewsRepository();
  repository.items = [newsItem({ id: "eq" }), newsItem({ id: "rate", title: "Fed rate outlook changes" })];
  repository.classifications = [
    classification({ newsItemId: "eq", affectedAssetClasses: ["equities"], sentiment: "positive" }),
    classification({ newsItemId: "rate", affectedAssetClasses: ["macro"], affectedMacroCategories: ["rates"], sentiment: "negative" })
  ];
  const service = new WeeklyNewsReconciliationService(repository);
  const weekly = await service.reconcileWeek("2026-06-01", "2026-06-07");
  assert.equal(weekly.status, "draft");
  assert.match(weekly.equitiesSummary ?? "", /equities/);
  assert.match(weekly.ratesSummary ?? "", /rates/);
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

test("cron protection rejects missing or invalid secret", () => {
  assert.equal(isCronSecretValid(undefined, "secret"), false);
  assert.equal(isCronSecretValid("secret", "bad"), false);
  assert.equal(isCronSecretValid("secret", "secret"), true);
});
