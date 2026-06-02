import test from "node:test";
import assert from "node:assert/strict";
import { fredProviderInternals } from "../src/infrastructure/providers/macro/FredMacroDataProvider";
import { MacroTrendService, macroTrendInternals } from "../src/application/services/macro/MacroTrendService";
import { MacroIndicatorIngestionService } from "../src/application/services/macro/MacroIndicatorIngestionService";
import { isCronSecretValid } from "../src/application/services/news/cronSecret";
import type { MacroDataProvider, MacroProviderObservation } from "../src/application/ports/providers/MacroDataProvider";
import type { MacroIndicatorRepository, InsertMacroIngestionLogInput, UpsertMacroObservationInput, UpsertMacroRegimeSnapshotInput, UpsertMacroTrendInput } from "../src/application/ports/repositories/MacroIndicatorRepository";
import type { MacroIndicatorDefinition, MacroIngestionLog, MacroObservation, MacroRegimeSnapshot, MacroTrend } from "../src/domain/macro/types";

function indicator(overrides: Partial<MacroIndicatorDefinition> = {}): MacroIndicatorDefinition {
  return {
    id: overrides.id ?? "ind-1",
    indicatorCode: overrides.indicatorCode ?? "DGS10",
    indicatorName: overrides.indicatorName ?? "10-Year Treasury Yield",
    sourceProvider: overrides.sourceProvider ?? "fred",
    category: overrides.category ?? "yields",
    unit: overrides.unit ?? "percent",
    frequency: overrides.frequency ?? "daily",
    description: overrides.description ?? null,
    isActive: overrides.isActive ?? true,
    metadata: overrides.metadata ?? {},
    createdAt: "",
    updatedAt: ""
  };
}

function observation(indicatorId: string, observationDate: string, value: number | null): MacroObservation {
  return {
    id: `${indicatorId}-${observationDate}`,
    indicatorId,
    observationDate,
    value,
    sourceProvider: "fred",
    providerMetadata: {},
    createdAt: "",
    updatedAt: ""
  };
}

class FakeMacroRepository implements MacroIndicatorRepository {
  indicators: MacroIndicatorDefinition[] = [];
  observations: MacroObservation[] = [];
  trends: MacroTrend[] = [];
  regimes: MacroRegimeSnapshot[] = [];
  logs: MacroIngestionLog[] = [];

  async listIndicators() { return this.indicators.filter((item) => item.isActive); }
  async listObservations(indicatorId: string, limit = 260) {
    return this.observations.filter((item) => item.indicatorId === indicatorId).sort((a, b) => a.observationDate.localeCompare(b.observationDate)).slice(-limit);
  }
  async listObservationsForIndicators(indicatorIds: string[], limitPerIndicator = 260) {
    const map = new Map<string, MacroObservation[]>();
    for (const id of indicatorIds) map.set(id, await this.listObservations(id, limitPerIndicator));
    return map;
  }
  async upsertObservations(input: UpsertMacroObservationInput[]) {
    let inserted = 0;
    let updated = 0;
    for (const row of input) {
      const existingIndex = this.observations.findIndex((item) => item.indicatorId === row.indicatorId && item.observationDate === row.observationDate);
      const next = { ...row, id: `${row.indicatorId}-${row.observationDate}`, createdAt: "", updatedAt: "" };
      if (existingIndex >= 0) {
        this.observations[existingIndex] = next;
        updated += 1;
      } else {
        this.observations.push(next);
        inserted += 1;
      }
    }
    return { inserted, updated };
  }
  async upsertTrend(input: UpsertMacroTrendInput) {
    const next = { ...input, id: `trend-${input.indicatorId}-${input.asOfDate}`, createdAt: "", updatedAt: "" };
    this.trends = this.trends.filter((trend) => !(trend.indicatorId === input.indicatorId && trend.asOfDate === input.asOfDate));
    this.trends.push(next);
    return next;
  }
  async listLatestTrends() { return this.trends; }
  async upsertRegimeSnapshot(input: UpsertMacroRegimeSnapshotInput) {
    const next = { ...input, id: `regime-${input.snapshotDate}`, createdAt: "", updatedAt: "" };
    this.regimes = [next];
    return next;
  }
  async getLatestRegimeSnapshot() { return this.regimes[0] ?? null; }
  async insertIngestionLog(input: InsertMacroIngestionLogInput) {
    this.logs.push({ ...input, id: `log-${this.logs.length + 1}`, createdAt: "" });
  }
  async listIngestionLogs() { return this.logs; }
  async getDashboard() {
    return { indicators: [], latestRegime: null, ingestionLogs: this.logs };
  }
}

class FakeMacroProvider implements MacroDataProvider {
  readonly name = "fred";
  constructor(private readonly rowsByCode: Record<string, MacroProviderObservation[]>, private readonly failedCodes = new Set<string>()) {}
  async fetchObservations(input: { indicatorCode: string }) {
    if (this.failedCodes.has(input.indicatorCode)) throw new Error("Provider failure");
    return this.rowsByCode[input.indicatorCode] ?? [];
  }
}

test("FRED parser treats missing dot values as null", () => {
  assert.equal(fredProviderInternals.parseFredValue("."), null);
  assert.equal(fredProviderInternals.parseFredValue(""), null);
  assert.equal(fredProviderInternals.parseFredValue("4.25"), 4.25);
});

test("macro trend calculation handles daily windows and direction", () => {
  const service = new MacroTrendService();
  const ind = indicator({ id: "dgs10", indicatorCode: "DGS10", frequency: "daily" });
  const rows = [
    observation("dgs10", "2025-06-01", 3.8),
    observation("dgs10", "2025-12-01", 4.0),
    observation("dgs10", "2026-05-01", 4.3),
    observation("dgs10", "2026-06-01", 4.5)
  ];
  const trend = service.calculateTrend(ind, rows);
  assert.equal(trend?.latestValue, 4.5);
  assert.equal(trend?.direction, "rising");
  assert.ok(Math.abs((trend?.oneMonthChange ?? 0) - 0.2) < 0.000001);
  assert.ok((trend?.confidenceScore ?? 0) > 0);
});

test("macro trend reports insufficient data with one observation", () => {
  const service = new MacroTrendService();
  const trend = service.calculateTrend(indicator(), [observation("ind-1", "2026-06-01", 4.5)]);
  assert.equal(trend?.direction, "insufficient_data");
  assert.equal(trend?.acceleration, "insufficient_data");
});

test("macro regime classifies inverted yield curve and restrictive rates", () => {
  const service = new MacroTrendService();
  const indicators = [
    indicator({ id: "fed", indicatorCode: "FEDFUNDS", category: "interest_rates" }),
    indicator({ id: "curve", indicatorCode: "T10Y2Y", category: "yields" }),
    indicator({ id: "unrate", indicatorCode: "UNRATE", category: "employment" })
  ];
  const trends: MacroTrend[] = [
    { ...service.calculateTrend(indicators[0], [observation("fed", "2026-05-01", 4.5), observation("fed", "2026-06-01", 4.75)])!, id: "t1", createdAt: "", updatedAt: "" },
    { ...service.calculateTrend(indicators[1], [observation("curve", "2026-05-01", -0.2), observation("curve", "2026-06-01", -0.1)])!, id: "t2", createdAt: "", updatedAt: "" },
    { ...service.calculateTrend(indicators[2], [observation("unrate", "2026-05-01", 4.1), observation("unrate", "2026-06-01", 4.2)])!, id: "t3", createdAt: "", updatedAt: "" }
  ];
  const regime = service.classifyRegime(indicators, trends);
  assert.equal(regime.ratesRegime, "restrictive");
  assert.equal(regime.yieldCurveRegime, "inverted");
  assert.equal(regime.employmentRegime, "weakening");
});

test("macro ingestion inserts observations and updates repeated refreshes", async () => {
  const repo = new FakeMacroRepository();
  repo.indicators = [indicator({ id: "dgs10", indicatorCode: "DGS10" })];
  const provider = new FakeMacroProvider({
    DGS10: [
      { indicatorCode: "DGS10", observationDate: "2026-05-01", value: 4.3, providerMetadata: {} },
      { indicatorCode: "DGS10", observationDate: "2026-06-01", value: 4.5, providerMetadata: {} }
    ]
  });
  const service = new MacroIndicatorIngestionService(repo, provider);
  const first = await service.ingest({ backfill: true });
  const second = await service.ingest();
  assert.equal(first.observationsInserted, 2);
  assert.equal(second.observationsUpdated, 2);
  assert.equal(repo.trends.length, 1);
  assert.equal(repo.regimes.length, 1);
});

test("macro ingestion logs partial failure", async () => {
  const repo = new FakeMacroRepository();
  repo.indicators = [indicator({ id: "dgs10", indicatorCode: "DGS10" }), indicator({ id: "cpi", indicatorCode: "CPIAUCSL", category: "inflation" })];
  const provider = new FakeMacroProvider({
    DGS10: [{ indicatorCode: "DGS10", observationDate: "2026-06-01", value: 4.5, providerMetadata: {} }]
  }, new Set(["CPIAUCSL"]));
  const service = new MacroIndicatorIngestionService(repo, provider);
  const result = await service.ingest();
  assert.equal(result.status, "partial_success");
  assert.equal(result.indicatorsFailed, 1);
  assert.equal(repo.logs[0]?.status, "partial_success");
});

test("macro ingestion logs failed when all indicators fail", async () => {
  const repo = new FakeMacroRepository();
  repo.indicators = [indicator({ id: "dgs10", indicatorCode: "DGS10" })];
  const provider = new FakeMacroProvider({}, new Set(["DGS10"]));
  const service = new MacroIndicatorIngestionService(repo, provider);
  const result = await service.ingest();
  assert.equal(result.status, "failed");
  assert.equal(repo.logs[0]?.status, "failed");
  assert.match(repo.logs[0]?.errorMessage ?? "", /All 1 FRED indicators failed/);
  assert.deepEqual((repo.logs[0]?.metadata.failedItems as Array<{ indicatorCode: string }>)[0]?.indicatorCode, "DGS10");
});

test("macro utility functions classify direction and percent change", () => {
  assert.equal(macroTrendInternals.direction(1), "rising");
  assert.equal(macroTrendInternals.direction(-1), "falling");
  assert.equal(macroTrendInternals.direction(null), "insufficient_data");
  assert.ok(Math.abs((macroTrendInternals.percentChange(110, 100) ?? 0) - 0.1) < 0.000001);
});

test("FRED cron protection uses the shared CRON_SECRET validator", () => {
  assert.equal(isCronSecretValid("secret", "secret"), true);
  assert.equal(isCronSecretValid("secret", "wrong"), false);
});
