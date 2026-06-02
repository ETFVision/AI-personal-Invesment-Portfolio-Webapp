import test from "node:test";
import assert from "node:assert/strict";
import { resolveInstrumentType } from "../src/application/services/instruments/InstrumentTypeResolver";
import type { Instrument } from "../src/domain/universe/types";

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
