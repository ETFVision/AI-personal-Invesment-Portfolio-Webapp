import test from "node:test";
import assert from "node:assert/strict";
import { InstrumentRiskService } from "../src/application/services/InstrumentRiskService";
import { resolveInstrumentType } from "../src/application/services/instruments/InstrumentTypeResolver";
import type { Instrument, InstrumentPrice } from "../src/domain/universe/types";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";

function instrument(overrides: Partial<Instrument>): Instrument {
  return {
    id: "instrument-id",
    symbol: "SPY",
    name: "Instrument",
    assetClass: "etf",
    instrumentType: "etf",
    sector: null,
    industry: null,
    canonicalSector: null,
    canonicalThemes: [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "approved",
    geography: null,
    currency: "USD",
    exchange: "NYSE Arca",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: null,
    creditQuality: null,
    geoExposure: null,
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

test("keeps benchmark-tagged ETFs in the ETF detail shell", () => {
  assert.equal(resolveInstrumentType(instrument({ benchmarkTags: ["sp500"] })), "etf");
});

test("routes fixed income, gold, crypto and explicit benchmarks to their shells", () => {
  assert.equal(resolveInstrumentType(instrument({ assetClass: "bond_etf", instrumentType: "bond_etf" })), "bond_etf");
  assert.equal(resolveInstrumentType(instrument({ assetClass: "gold_etf", instrumentType: "gold_etf" })), "gold_etf");
  assert.equal(resolveInstrumentType(instrument({ assetClass: "crypto", instrumentType: "crypto" })), "crypto");
  assert.equal(resolveInstrumentType(instrument({ assetClass: "benchmark", instrumentType: "benchmark" })), "benchmark");
});

function priceSeries(values: number[]): InstrumentPrice[] {
  return values.map((closePrice, index) => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      id: `price-${index}`,
      instrumentId: "instrument-id",
      provider: "test",
      symbol: "TEST",
      priceDate: date.toISOString().slice(0, 10),
      closePrice,
      currency: "USD",
      rawPayload: {}
    };
  });
}

test("instrument risk service calculates volatility and drawdown without return metrics", () => {
  const service = new InstrumentRiskService({} as UniverseRepository);
  const values = Array.from({ length: 90 }, (_, index) => 100 + index * 0.4 + Math.sin(index / 2) * 4);
  const metric = service.calculate(
    instrument({ id: "instrument-id", symbol: "TEST" }),
    priceSeries(values)
  );

  assert.equal(metric.instrumentId, "instrument-id");
  assert.equal(metric.metricDate, "2026-03-31");
  assert.ok(metric.volatility30d !== null && metric.volatility30d > 0);
  assert.ok(metric.maxDrawdown !== null && metric.maxDrawdown < 0);
  assert.ok(metric.currentDrawdown !== null);
  assert.ok(metric.worstDailyReturn !== null && metric.worstDailyReturn < 0);
  assert.equal(metric.observationCount, 90);
  assert.equal(metric.riskBucket !== "insufficient_data", true);
});

test("instrument risk service marks sparse history as low confidence", () => {
  const service = new InstrumentRiskService({} as UniverseRepository);
  const metric = service.calculate(instrument({ id: "instrument-id", symbol: "TEST" }), priceSeries([100, 101, 99]));

  assert.equal(metric.confidenceScore, 20);
  assert.equal(metric.volatilityTrend, "insufficient_data");
  assert.equal(metric.volatility1y, null);
});
