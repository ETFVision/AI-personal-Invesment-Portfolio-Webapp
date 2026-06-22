import test from "node:test";
import assert from "node:assert/strict";
import { RefreshPortfolioPricesJob } from "../src/application/jobs/RefreshPortfolioPricesJob";
import { InstrumentMarketService } from "../src/application/services/InstrumentMarketService";
import type { MarketDataService } from "../src/application/services/MarketDataService";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";
import type { MarketDataProvider } from "../src/application/ports/providers/MarketDataProvider";
import type { Instrument } from "../src/domain/universe/types";

function testDaysBeforeIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function testLatestExpectedEodDate() {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 8);
  date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

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

function riskPriceRows(instrumentId: string, count = 80) {
  const start = new Date("2026-01-01T00:00:00.000Z");
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      id: `${instrumentId}-${index}`,
      instrumentId,
      symbol: instrumentId.replace("inst-", ""),
      priceDate: date.toISOString().slice(0, 10),
      openPrice: 100 + index,
      highPrice: 101 + index,
      lowPrice: 99 + index,
      closePrice: 100 + index,
      adjustedClosePrice: 100 + index,
      volume: 1000,
      currency: "USD",
      provider: "test",
      rawPayload: {},
      createdAt: date.toISOString()
    };
  });
}

test("instrument price refresh maps BRK.B to the FMP provider symbol BRK-B", async () => {
  const requestedBatches: string[][] = [];
  const storedRows: Array<{ instrumentId: string; symbol: string }> = [];
  const dailyReturnRefreshes: string[][] = [];
  const returnAnchorRefreshes: string[][] = [];
  const marketMetricRefreshes: string[][] = [];
  const riskMetricRefreshes: string[][] = [];
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
    async refreshInstrumentDailyReturns(ids: string[]) {
      dailyReturnRefreshes.push(ids);
    },
    async refreshInstrumentReturnAnchors(ids: string[]) {
      returnAnchorRefreshes.push(ids);
    },
    async refreshInstrumentMarketMetrics(ids: string[]) {
      marketMetricRefreshes.push(ids);
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      riskMetricRefreshes.push(ids);
    }
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
  assert.deepEqual(dailyReturnRefreshes, [["inst-BRK.B"]]);
  assert.deepEqual(returnAnchorRefreshes, [["inst-BRK.B"]]);
  assert.deepEqual(marketMetricRefreshes, [["inst-BRK.B"]]);
  assert.deepEqual(riskMetricRefreshes, []);
});

test("bulk EOD price refresh stores EOD date, falls back for omitted symbols, and avoids price stats scan", async () => {
  const storedRows: Array<{
    instrumentId: string;
    provider: string;
    symbol: string;
    priceDate: string;
    closePrice: number;
    currency: string | null;
    rawPayload: unknown;
  }> = [];
  const dailyReturnRefreshes: string[][] = [];
  const returnAnchorRefreshes: string[][] = [];
  const marketMetricRefreshes: string[][] = [];
  const riskMetricRefreshes: string[][] = [];
  const repository = {
    async listInstruments() {
      return [
        instrument("VOO", { assetClass: "etf", instrumentType: "etf" }),
        instrument("BTC", { assetClass: "crypto", instrumentType: "crypto" })
      ];
    },
    async listInstrumentPriceStats() {
      throw new Error("bulk EOD refresh should not scan price stats");
    },
    async upsertInstrumentPrices(input: typeof storedRows) {
      storedRows.push(...input);
    },
    async refreshInstrumentDailyReturns(ids: string[]) {
      dailyReturnRefreshes.push(ids);
    },
    async refreshInstrumentReturnAnchors(ids: string[]) {
      returnAnchorRefreshes.push(ids);
    },
    async refreshInstrumentMarketMetrics(ids: string[]) {
      marketMetricRefreshes.push(ids);
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      riskMetricRefreshes.push(ids);
    }
  } as unknown as UniverseRepository;
  const requestedBulkDates: string[] = [];
  const requestedFallbackBatches: string[][] = [];
  const provider = {
    name: "financial_modeling_prep",
    async getBulkEodPrices(date: string) {
      requestedBulkDates.push(date);
      return [{ symbol: "VOO", price: 510, currency: "USD", asOfDate: date, raw: { adjClose: 510 } }];
    },
    async getLatestPrices(symbols: string[]) {
      requestedFallbackBatches.push(symbols);
      return [{ symbol: "BTCUSD", price: 65000, currency: "USD", asOfDate: "2026-06-22", raw: {} }];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPricesFromBulkEod({ date: "2026-06-19", skipRiskMetrics: true });

  assert.deepEqual(requestedBulkDates, ["2026-06-19"]);
  assert.deepEqual(requestedFallbackBatches, [["BTCUSD"]]);
  assert.deepEqual(
    storedRows.map(({ instrumentId, symbol, priceDate, closePrice }) => ({ instrumentId, symbol, priceDate, closePrice })),
    [
    { instrumentId: "inst-VOO", symbol: "VOO", priceDate: "2026-06-19", closePrice: 510 },
    { instrumentId: "inst-BTC", symbol: "BTCUSD", priceDate: "2026-06-22", closePrice: 65000 }
    ]
  );
  assert.deepEqual(
    storedRows.map(({ provider, currency }) => ({ provider, currency })),
    [
      { provider: "financial_modeling_prep", currency: "USD" },
      { provider: "financial_modeling_prep", currency: "USD" }
    ]
  );
  assert.deepEqual(result.requestedSymbols, ["VOO", "BTCUSD"]);
  assert.equal(result.updatedCount, 2);
  assert.deepEqual(result.missingSymbols, []);
  assert.deepEqual(dailyReturnRefreshes, [["inst-VOO", "inst-BTC"]]);
  assert.deepEqual(returnAnchorRefreshes, [["inst-VOO", "inst-BTC"]]);
  assert.deepEqual(marketMetricRefreshes, [["inst-VOO", "inst-BTC"]]);
  assert.deepEqual(riskMetricRefreshes, []);
});

test("bulk EOD price refresh does not fall back when the requested date has no bulk rows", async () => {
  const repository = {
    async listInstruments() {
      return [instrument("VOO", { assetClass: "etf", instrumentType: "etf" })];
    },
    async listInstrumentPriceStats() {
      throw new Error("bulk EOD refresh should not scan price stats");
    },
    async upsertInstrumentPrices() {
      throw new Error("empty bulk EOD response should not upsert");
    }
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getBulkEodPrices() {
      return [];
    },
    async getLatestPrices() {
      throw new Error("empty bulk EOD response should not fall back to latest prices");
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPricesFromBulkEod({ date: "2026-06-20", skipDerivedMetrics: true });

  assert.deepEqual(result.requestedSymbols, ["VOO"]);
  assert.equal(result.updatedCount, 0);
  assert.deepEqual(result.missingSymbols, ["VOO"]);
  assert.match(result.message, /No bulk EOD prices were returned for 2026-06-20/);
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
        { instrumentId: incompleteRawCrypto.id, historyStartDate: "2025-01-01", historyEndDate: "2025-01-01", latestPriceDate: "2025-01-01" }
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
  assert.equal(coverage.availableHistoryComplete, 1);
  assert.equal(coverage.cryptoEligible, 2);
  assert.equal(coverage.completeTwoYearCrypto, 1);
  assert.equal(coverage.availableCryptoHistoryComplete, 1);
  assert.equal(coverage.missingTwoYearCrypto, 1);
  assert.equal(coverage.staleHistory, 0);
  assert.equal(coverage.staleCryptoHistory, 1);
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
  assert.equal(coverage.availableHistoryComplete, 1);
  assert.equal(coverage.missingFiveYear, 1);
  assert.equal(coverage.staleHistory, 1);
  assert.equal(coverage.cryptoEligible, 1);
  assert.equal(coverage.completeTwoYearCrypto, 0);
  assert.equal(coverage.availableCryptoHistoryComplete, 0);
  assert.equal(coverage.missingTwoYearCrypto, 1);
  assert.equal(coverage.staleCryptoHistory, 1);
  assert.equal(coverage.estimatedBackfillClicks, 1);
});

test("history coverage treats current shorter-lived instruments as available-history complete", async () => {
  const newerEtf = instrument("CLIP", { assetClass: "etf", instrumentType: "etf", assetCategory: "BOND" });
  const newerCryptoEtf = instrument("ETHA", { assetClass: "etf", instrumentType: "crypto_etf", assetCategory: "CRYPTO" });
  const repository = {
    async listInstrumentMarketMetrics() {
      return [
        { instrumentId: newerEtf.id, historyStartDate: "2023-06-21", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" },
        { instrumentId: newerCryptoEtf.id, historyStartDate: "2024-07-23", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" }
      ];
    },
    async listInstrumentPriceStats() {
      return [];
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const coverage = await service.getHistoryCoverageSummary([newerEtf, newerCryptoEtf], 10);

  assert.equal(coverage.totalEligible, 1);
  assert.equal(coverage.completeFiveYear, 0);
  assert.equal(coverage.availableHistoryComplete, 1);
  assert.equal(coverage.missingFiveYear, 0);
  assert.equal(coverage.cryptoEligible, 1);
  assert.equal(coverage.completeTwoYearCrypto, 0);
  assert.equal(coverage.availableCryptoHistoryComplete, 1);
  assert.equal(coverage.missingTwoYearCrypto, 0);
  assert.equal(coverage.estimatedBackfillClicks, 0);
});

test("history coverage uses derived market metrics instead of raw price stats when available", async () => {
  const missingMetric = instrument("SYK", { assetClass: "stock", instrumentType: "stock", assetCategory: "EQUITY" });
  const repository = {
    async listInstrumentMarketMetrics() {
      return [];
    },
    async listInstrumentPriceStats() {
      return [{ instrumentId: missingMetric.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2999-01-01", observationCount: 1200 }];
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const fallbackCoverage = await service.getHistoryCoverageSummary([missingMetric], 10);

  assert.equal(fallbackCoverage.availableHistoryComplete, 1);

  const derivedOnlyRepository = {
    async listInstrumentMarketMetrics() {
      return [{ instrumentId: "another-instrument", historyStartDate: "2020-01-01", historyEndDate: "2999-01-01", latestPriceDate: "2999-01-01" }];
    },
    async listInstrumentPriceStats() {
      throw new Error("raw stats should not be loaded when derived metrics exist");
    }
  } as unknown as UniverseRepository;
  const derivedCoverage = await new InstrumentMarketService(derivedOnlyRepository, provider).getHistoryCoverageSummary([missingMetric], 10);

  assert.equal(derivedCoverage.availableHistoryComplete, 0);
  assert.equal(derivedCoverage.missingFiveYear, 1);
});

test("history backfill repairs missing derived metrics when raw prices are already fresh", async () => {
  const staleInstrument = instrument("SYK", { assetClass: "stock", instrumentType: "stock", assetCategory: "EQUITY" });
  const repairedIds: string[][] = [];
  const repairedRiskIds: string[][] = [];
  const repository = {
    async listInstruments() {
      return [staleInstrument];
    },
    async listInstrumentPriceStats() {
      return [{ instrumentId: staleInstrument.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2999-01-01", observationCount: 1200 }];
    },
    async listInstrumentMarketMetrics() {
      return [];
    },
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
    async refreshInstrumentMarketMetrics(ids: string[]) {
      repairedIds.push(ids);
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      repairedRiskIds.push(ids);
    }
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices() {
      throw new Error("fresh raw prices should not be fetched again");
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPricesInBatches({ includeBackfill: true, batchSize: 8, maxBatches: 1 });

  assert.deepEqual(result.requestedSymbols, []);
  assert.equal(result.derivedMetricsRefreshed, 1);
  assert.deepEqual(repairedIds, [[staleInstrument.id]]);
  assert.deepEqual(repairedRiskIds, [[staleInstrument.id]]);
  assert.match(result.message, /Rebuilt derived market and risk metrics for 1 instrument/);
});

test("price refresh can repair stale market metrics without risk when risk is skipped", async () => {
  const staleInstrument = instrument("SYK", { assetClass: "stock", instrumentType: "stock", assetCategory: "EQUITY" });
  const repairedIds: string[][] = [];
  const repairedRiskIds: string[][] = [];
  const repository = {
    async listInstruments() {
      return [staleInstrument];
    },
    async listInstrumentPriceStats() {
      return [{ instrumentId: staleInstrument.id, earliestPriceDate: "2021-01-01", latestPriceDate: "2999-01-01", observationCount: 1200 }];
    },
    async listInstrumentMarketMetrics() {
      return [];
    },
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
    async refreshInstrumentMarketMetrics(ids: string[]) {
      repairedIds.push(ids);
    },
    async refreshInstrumentRiskMetrics(ids: string[]) {
      repairedRiskIds.push(ids);
    }
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices() {
      throw new Error("fresh raw prices should not be fetched again");
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPricesInBatches({ batchSize: 8, maxBatches: 1, skipRiskMetrics: true });

  assert.deepEqual(result.requestedSymbols, []);
  assert.equal(result.derivedMetricsRefreshed, 1);
  assert.deepEqual(repairedIds, [[staleInstrument.id]]);
  assert.deepEqual(repairedRiskIds, []);
  assert.match(result.message, /Rebuilt derived market metrics for 1 instrument/);
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
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
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
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
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

test("history backfill skips current shorter-lived instruments with available history", async () => {
  const newerEtf = instrument("CLIP", { assetClass: "etf", instrumentType: "etf" });
  const empty = instrument("SYK");
  const requested: string[] = [];
  const repository = {
    async listInstruments() {
      return [newerEtf, empty];
    },
    async listInstrumentPriceStats() {
      return [
        { instrumentId: newerEtf.id, earliestPriceDate: "2023-06-21", latestPriceDate: "2999-01-01", observationCount: 700 }
      ];
    },
    async upsertInstrumentPrices() {},
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
    async refreshInstrumentMarketMetrics() {},
    async refreshInstrumentRiskMetrics() {}
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices(symbol: string) {
      requested.push(symbol);
      return [{ symbol, price: 110, currency: "USD", asOfDate: "2026-01-01", raw: {} }];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPrices({ lookbackDays: 1825, maxSymbols: 10, includeBackfill: true });

  assert.deepEqual(result.requestedSymbols, ["SYK"]);
  assert.deepEqual(requested, ["SYK"]);
});

test("history backfill tolerates one-day historical EOD lag and fills the batch with empty instruments", async () => {
  const oneDayLag = instrument("SPLG", { assetClass: "etf", instrumentType: "etf" });
  const emptySymbols = ["STIP", "SYK", "TJX", "TMO", "TMUS", "TSLA", "UNP", "UPS", "USB", "USRT"];
  const emptyInstruments = emptySymbols.map((symbol) => instrument(symbol, { assetClass: symbol === "STIP" || symbol === "USRT" ? "etf" : "stock", instrumentType: symbol === "STIP" || symbol === "USRT" ? "etf" : "stock" }));
  const requested: string[] = [];
  const toleratedLatestDate = testDaysBeforeIso(testLatestExpectedEodDate(), 1);
  const repository = {
    async listInstruments() {
      return [oneDayLag, ...emptyInstruments];
    },
    async listInstrumentPriceStats() {
      return [
        { instrumentId: oneDayLag.id, earliestPriceDate: "2021-01-01", latestPriceDate: toleratedLatestDate, observationCount: 1200 },
        ...emptyInstruments.map((empty) => ({ instrumentId: empty.id, earliestPriceDate: null, latestPriceDate: null, observationCount: 0 }))
      ];
    },
    async upsertInstrumentPrices() {},
    async refreshInstrumentDailyReturns() {},
    async refreshInstrumentReturnAnchors() {},
    async refreshInstrumentMarketMetrics() {},
    async refreshInstrumentRiskMetrics() {}
  } as unknown as UniverseRepository;
  const provider = {
    name: "financial_modeling_prep",
    async getHistoricalPrices(symbol: string) {
      requested.push(symbol);
      return [{ symbol, price: 110, currency: "USD", asOfDate: "2026-01-01", raw: {} }];
    }
  } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentPrices({ lookbackDays: 1825, maxSymbols: 10, includeBackfill: true });

  assert.deepEqual(result.requestedSymbols, emptySymbols);
  assert.deepEqual(requested, emptySymbols);
});

test("instrument risk refresh batches missing and stale risk metrics only", async () => {
  const refreshedIds: string[][] = [];
  const fresh = instrument("FRESH");
  const missing = instrument("MISS");
  const stale = instrument("STALE");
  const sparse = instrument("SPARSE");
  const repository = {
    async listInstruments() {
      return [fresh, missing, stale, sparse];
    },
    async listInstrumentReturnAnchors() {
      return [
        { instrumentId: fresh.id, asOfDate: "2026-01-01", observationCount: 500 },
        { instrumentId: missing.id, asOfDate: "2026-01-01", observationCount: 500 },
        { instrumentId: stale.id, asOfDate: "2026-01-01", observationCount: 500 },
        { instrumentId: sparse.id, asOfDate: "2026-01-15", observationCount: 10 }
      ];
    },
    async listInstrumentRiskMetrics() {
      return [
        { instrumentId: fresh.id, metricDate: "2026-01-01", calculatedAt: "2026-06-08T00:00:00.000Z" },
        { instrumentId: stale.id, metricDate: "2025-12-31", calculatedAt: "2026-01-01T00:00:00.000Z" }
      ];
    },
    async refreshInstrumentRiskMetricsOnly(ids: string[]) {
      refreshedIds.push(ids);
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentRiskMetricsInBatches({ batchSize: 2, minObservations: 30 });

  assert.equal(result.updatedCount, 2);
  assert.deepEqual(result.requestedSymbols, ["MISS", "STALE"]);
  assert.deepEqual(refreshedIds, [["inst-MISS"], ["inst-STALE"]]);
});

test("instrument risk refresh skips when all eligible metrics are current", async () => {
  const fresh = instrument("FRESH");
  const repository = {
    async listInstruments() {
      return [fresh];
    },
    async listInstrumentReturnAnchors() {
      return [{ instrumentId: fresh.id, asOfDate: "2026-01-01", observationCount: 500 }];
    },
    async listInstrumentRiskMetrics() {
      return [{ instrumentId: fresh.id, metricDate: "2026-01-01", calculatedAt: "2026-06-08T00:00:00.000Z" }];
    },
    async refreshInstrumentRiskMetricsOnly() {
      throw new Error("current risk metrics should not be refreshed");
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentRiskMetricsInBatches({ batchSize: 2, minObservations: 30 });

  assert.equal(result.updatedCount, 0);
  assert.deepEqual(result.requestedSymbols, []);
  assert.equal(result.message, "All eligible instrument risk metrics are current.");
});

test("instrument risk refresh falls back to stored prices when database risk RPC times out", async () => {
  const timeoutInstrument = instrument("STIP", { assetClass: "etf", instrumentType: "etf", assetCategory: "BOND" });
  const refreshedIds: string[][] = [];
  const fallbackMetrics: Array<{ instrumentId: string; observationCount?: number | null }> = [];
  const repository = {
    async listInstruments() {
      return [timeoutInstrument];
    },
    async listInstrumentReturnAnchors() {
      return [{ instrumentId: timeoutInstrument.id, asOfDate: "2026-04-01", observationCount: 80 }];
    },
    async listInstrumentRiskMetrics() {
      return [];
    },
    async refreshInstrumentRiskMetricsOnly(ids: string[]) {
      refreshedIds.push(ids);
      throw new Error("canceling statement due to statement timeout");
    },
    async listInstrumentPrices(ids: string[]) {
      assert.deepEqual(ids, [timeoutInstrument.id]);
      return riskPriceRows(timeoutInstrument.id, 80);
    },
    async upsertInstrumentRiskMetrics(input: Array<{ instrumentId: string; observationCount?: number | null }>) {
      fallbackMetrics.push(...input);
    }
  } as unknown as UniverseRepository;
  const provider = { name: "financial_modeling_prep" } as unknown as MarketDataProvider;

  const service = new InstrumentMarketService(repository, provider);
  const result = await service.refreshInstrumentRiskMetricsInBatches({ batchSize: 1, minObservations: 30 });

  assert.equal(result.updatedCount, 1);
  assert.deepEqual(result.requestedSymbols, ["STIP"]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(refreshedIds, [[timeoutInstrument.id]]);
  assert.equal(fallbackMetrics.length, 1);
  assert.equal(fallbackMetrics[0]?.instrumentId, timeoutInstrument.id);
  assert.equal(fallbackMetrics[0]?.observationCount, 80);
});
