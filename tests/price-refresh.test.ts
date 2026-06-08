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

function instrument(symbol: string): Instrument {
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
    isActive: true
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
