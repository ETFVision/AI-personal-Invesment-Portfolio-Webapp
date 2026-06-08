import test from "node:test";
import assert from "node:assert/strict";
import { RefreshPortfolioPricesJob } from "../src/application/jobs/RefreshPortfolioPricesJob";
import { InstrumentMarketService } from "../src/application/services/InstrumentMarketService";
import type { MarketDataService } from "../src/application/services/MarketDataService";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";
import type { MarketDataProvider } from "../src/application/ports/providers/MarketDataProvider";
import type { Instrument } from "../src/domain/universe/types";

test("portfolio price refresh is driven by the master instrument price refresh", async () => {
  const calls: string[] = [];
  const instrumentMarketService = {
    async refreshInstrumentPricesInBatches() {
      calls.push("instrument-refresh");
      return {
        requestedSymbols: ["VOO", "MSFT"],
        updatedCount: 2,
        missingSymbols: [],
        errors: [],
        message: "Stored 2 instrument price rows."
      };
    }
  } as unknown as InstrumentMarketService;
  const marketDataService = {
    async syncPortfolioPricesFromInstrumentPrices() {
      calls.push("portfolio-sync");
      return {
        requestedSymbols: ["VOO"],
        fetchedCount: 0,
        skippedCount: 0,
        storedCount: 1,
        errors: [],
        message: "Synced 1 portfolio asset price from instrument prices."
      };
    }
  } as unknown as MarketDataService;

  const job = new RefreshPortfolioPricesJob(marketDataService, instrumentMarketService);
  const result = await job.run({ userId: "user-id", portfolioId: "portfolio-id" });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["instrument-refresh", "portfolio-sync"]);
  assert.ok(result.metadata);
  assert.equal(result.metadata.masterInstrumentRefresh.updatedCount, 2);
  assert.equal(result.metadata.portfolioPriceSync.storedCount, 1);
});

function instrument(symbol: string, overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: `inst-${symbol}`,
    symbol,
    name: symbol,
    assetClass: "stock",
    assetCategory: "EQUITY",
    etfCategory: null,
    instrumentType: "stock",
    sector: "Financials",
    industry: null,
    canonicalSector: "Financials",
    canonicalThemes: [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "mapped",
    geography: "United States",
    currency: "USD",
    exchange: "NYSE",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: "equity",
    volatilityBucket: "medium",
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: null,
    creditQuality: null,
    geoExposure: "United States",
    rateSensitivity: null,
    inflationSensitivity: null,
    recessionSensitivity: null,
    liquidityRole: null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "seeded",
    isActive: true,
    ...overrides
  };
}

test("instrument price refresh maps BRK.B to the FMP provider symbol BRK-B", async () => {
  const requestedBatches: string[][] = [];
  const storedRows: Array<{ instrumentId: string; symbol: string }> = [];
  const repository = {
    async listInstruments() {
      return [instrument("BRK.B")];
    },
    async listInstrumentPriceStats() {
      return [];
    },
    async upsertInstrumentPrices(input: Array<{ instrumentId: string; symbol: string }>) {
      storedRows.push(...input);
    },
    async refreshInstrumentMarketMetrics() {},
    async refreshInstrumentRiskMetrics() {}
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getLatestPrices(symbols: string[]) {
      requestedBatches.push(symbols);
      return [{ symbol: "BRK-B", price: 500, currency: "USD", asOfDate: "2026-06-08", raw: {} }];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPrices({ lookbackDays: 30, maxSymbols: 10, includeBackfill: false });

  assert.deepEqual(requestedBatches, [["BRK-B"]]);
  assert.equal(result.updatedCount, 1);
  assert.equal(storedRows[0]?.instrumentId, "inst-BRK.B");
  assert.equal(storedRows[0]?.symbol, "BRK-B");
});

test("history coverage tracks crypto against a shorter 2Y target", async () => {
  const stock = instrument("VOO", { assetClass: "etf", instrumentType: "etf", assetCategory: "EQUITY" });
  const completeCryptoEtf = instrument("IBIT", { assetClass: "etf", instrumentType: "crypto_etf", assetCategory: "CRYPTO" });
  const incompleteRawCrypto = instrument("BTC", { assetClass: "crypto", instrumentType: "crypto", assetCategory: "CRYPTO" });
  const repository = {
    async listInstrumentMarketMetrics() {
      return [
        { instrumentId: stock.id, historyStartDate: "2020-01-01", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" },
        { instrumentId: completeCryptoEtf.id, historyStartDate: "2024-01-01", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" },
        { instrumentId: incompleteRawCrypto.id, historyStartDate: "2025-01-01", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" }
      ];
    },
    async listInstrumentPriceStats() {
      return [];
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const coverage = await service.getHistoryCoverageSummary([stock, completeCryptoEtf, incompleteRawCrypto], 12);

  assert.equal(coverage.totalEligible, 1);
  assert.equal(coverage.completeFiveYear, 1);
  assert.equal(coverage.cryptoEligible, 2);
  assert.equal(coverage.completeTwoYearCrypto, 1);
  assert.equal(coverage.missingTwoYearCrypto, 1);
  assert.equal(coverage.staleHistory, 0);
  assert.equal(coverage.staleCryptoHistory, 0);
  assert.equal(coverage.estimatedBackfillClicks, 1);
});

test("history coverage treats stale end dates as incomplete", async () => {
  const complete = instrument("VOO", { assetClass: "etf", instrumentType: "etf", assetCategory: "EQUITY" });
  const stale = instrument("RYT", { assetClass: "etf", instrumentType: "etf", assetCategory: "EQUITY" });
  const staleCrypto = instrument("ETHA", { assetClass: "etf", instrumentType: "crypto_etf", assetCategory: "CRYPTO" });
  const repository = {
    async listInstrumentMarketMetrics() {
      return [
        { instrumentId: complete.id, historyStartDate: "2020-01-01", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" },
        { instrumentId: stale.id, historyStartDate: "2020-01-01", historyEndDate: "2025-01-01", latestPriceDate: "2025-01-01" },
        { instrumentId: staleCrypto.id, historyStartDate: "2024-01-01", historyEndDate: "2025-01-01", latestPriceDate: "2025-01-01" }
      ];
    },
    async listInstrumentPriceStats() {
      return [];
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const coverage = await service.getHistoryCoverageSummary([complete, stale, staleCrypto], 10);

  assert.equal(coverage.totalEligible, 2);
  assert.equal(coverage.completeFiveYear, 1);
  assert.equal(coverage.missingFiveYear, 1);
  assert.equal(coverage.staleHistory, 1);
  assert.equal(coverage.cryptoEligible, 1);
  assert.equal(coverage.completeTwoYearCrypto, 0);
  assert.equal(coverage.missingTwoYearCrypto, 1);
  assert.equal(coverage.staleCryptoHistory, 1);
  assert.equal(coverage.estimatedBackfillClicks, 1);
});

test("history backfill refreshes coverage metrics without running heavy risk metrics", async () => {
  const marketMetricRefreshes: string[][] = [];
  const riskMetricRefreshes: string[][] = [];
  const repository = {
    async listInstruments() {
      return [instrument("VOO", { assetClass: "etf", instrumentType: "etf" }), instrument("MSFT")];
    },
    async listInstrumentPriceStats() {
      return [];
    },
    async upsertInstrumentPrices() {},
    async refreshInstrumentMarketMetrics(ids: string[]) {
      marketMetricRefreshes.push(ids);
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      riskMetricRefreshes.push(ids);
    }
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices(symbol: string) {
      return [
        { symbol, price: 100, currency: "USD", asOfDate: "2021-01-01", raw: {} },
        { symbol, price: 110, currency: "USD", asOfDate: "2026-01-01", raw: {} }
      ];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPrices({ lookbackDays: 1825, maxSymbols: 2, includeBackfill: true });

  assert.equal(result.updatedCount, 4);
  assert.deepEqual(marketMetricRefreshes, [["inst-MSFT"], ["inst-VOO"]]);
  assert.deepEqual(riskMetricRefreshes, []);
});

test("history backfill selects stale end dates for recent catch-up", async () => {
  const complete = instrument("VOO", { assetClass: "etf", instrumentType: "etf" });
  const stale = instrument("RYT", { assetClass: "etf", instrumentType: "etf" });
  const requested: Array<{ symbol: string; from: string; to: string }> = [];
  const repository = {
    async listInstruments() {
      return [complete, stale];
    },
    async listInstrumentPriceStats() {
      return [
        { instrumentId: complete.id, earliestPriceDate: "2020-01-01", latestPriceDate: "2999-01-01", observationCount: 1200 },
        { instrumentId: stale.id, earliestPriceDate: "2020-01-01", latestPriceDate: "2025-07-10", observationCount: 600 }
      ];
    },
    async upsertInstrumentPrices() {},
    async refreshInstrumentMarketMetrics() {},
    async refreshInstrumentRiskMetrics() {}
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices(symbol: string, from: string, to: string) {
      requested.push({ symbol, from, to });
      return [{ symbol, price: 110, currency: "USD", asOfDate: "2026-01-01", raw: {} }];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPrices({ lookbackDays: 1825, maxSymbols: 10, includeBackfill: true });

  assert.deepEqual(result.requestedSymbols, ["RYT"]);
  assert.equal(result.updatedCount, 1);
  assert.equal(requested.length, 1);
  assert.equal(requested[0]?.symbol, "RYT");
  assert.equal(requested[0]?.from, "2025-07-03");
});

test("instrument risk refresh batches missing and oldest risk metrics only", async () => {
  const refreshedIds: string[][] = [];
  const fresh = instrument("FRESH");
  const missing = instrument("MISS");
  const old = instrument("OLD");
  const sparse = instrument("SPARSE");
  const repository = {
    async listInstruments() {
      return [fresh, missing, old, sparse];
    },
    async listInstrumentPriceStats() {
      return [
        { instrumentId: fresh.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2026-01-01", observationCount: 500 },
        { instrumentId: missing.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2026-01-01", observationCount: 500 },
        { instrumentId: old.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2026-01-01", observationCount: 500 },
        { instrumentId: sparse.id, earliestPriceDate: "2026-01-01", latestPriceDate: "2026-01-15", observationCount: 10 }
      ];
    },
    async listInstrumentRiskMetrics() {
      return [
        { instrumentId: fresh.id, calculatedAt: "2026-06-08T00:00:00.000Z" },
        { instrumentId: old.id, calculatedAt: "2026-01-01T00:00:00.000Z" }
      ];
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      refreshedIds.push(ids);
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentRiskMetricsInBatches({ batchSize: 2, minObservations: 30 });

  assert.equal(result.updatedCount, 2);
  assert.deepEqual(result.requestedSymbols, ["MISS", "OLD"]);
  assert.deepEqual(refreshedIds, [["inst-MISS"], ["inst-OLD"]]);
});
