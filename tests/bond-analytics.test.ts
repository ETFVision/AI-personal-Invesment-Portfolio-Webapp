import test from "node:test";
import assert from "node:assert/strict";
import { BondAnalyticsService } from "../src/application/services/bonds/BondAnalyticsService";
import { BondProfileService } from "../src/application/services/bonds/BondProfileService";
import type { HoldingValuation } from "../src/domain/portfolio/types";
import type { BondProfile, Instrument } from "../src/domain/universe/types";

function instrument(input: Partial<Instrument> & { id: string; symbol: string; assetClass?: Instrument["assetClass"] }): Instrument {
  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name ?? input.symbol,
    assetClass: input.assetClass ?? "bond_etf",
    instrumentType: input.instrumentType ?? "etf",
    sector: null,
    industry: null,
    canonicalSector: input.canonicalSector ?? "Bonds / Fixed Income",
    canonicalThemes: input.canonicalThemes ?? [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "mapped",
    geography: input.geography ?? "US",
    currency: input.currency ?? "USD",
    exchange: null,
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: "fixed_income",
    volatilityBucket: null,
    durationCategory: input.durationCategory ?? null,
    treasuryClassification: input.treasuryClassification ?? null,
    inflationLinked: input.inflationLinked ?? null,
    creditQuality: input.creditQuality ?? null,
    geoExposure: input.geoExposure ?? null,
    rateSensitivity: input.rateSensitivity ?? null,
    inflationSensitivity: input.inflationSensitivity ?? null,
    recessionSensitivity: input.recessionSensitivity ?? null,
    liquidityRole: input.liquidityRole ?? null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "seeded",
    isActive: true
  };
}

function bondProfile(input: Partial<BondProfile> & { instrumentId: string; symbol: string }): BondProfile {
  return {
    instrumentId: input.instrumentId,
    symbol: input.symbol,
    durationCategory: input.durationCategory ?? null,
    treasuryClassification: input.treasuryClassification ?? null,
    inflationLinked: input.inflationLinked ?? null,
    creditQuality: input.creditQuality ?? null,
    geoExposure: input.geoExposure ?? null,
    rateSensitivity: input.rateSensitivity ?? null,
    inflationSensitivity: input.inflationSensitivity ?? null,
    recessionSensitivity: input.recessionSensitivity ?? null,
    liquidityRole: input.liquidityRole ?? null,
    currency: input.currency ?? "USD",
    providerMetadata: {}
  };
}

function valuation(input: {
  holdingId: string;
  assetId: string;
  ticker: string;
  assetType?: HoldingValuation["holding"]["assetType"];
  value: number;
}): HoldingValuation {
  return {
    holding: {
      id: input.holdingId,
      portfolioId: "portfolio",
      assetId: input.assetId,
      assetType: input.assetType ?? "bond_etf",
      ticker: input.ticker,
      assetName: input.ticker,
      accountName: null,
      brokerName: null,
      quantity: 1,
      averageCost: input.value,
      costCurrency: "USD",
      firstPurchaseDate: null,
      notes: null
    },
    unitPrice: input.value,
    value: input.value,
    valueCurrency: "USD",
    priceDate: "2026-01-01",
    priceProvider: "test",
    valuationSource: "market_price"
  };
}

test("normalizes seeded bond ETF classifications deterministically", () => {
  const service = new BondProfileService();
  const profile = service.normalizeProfile(instrument({ id: "tlt", symbol: "TLT" }));

  assert.equal(profile?.durationCategory, "long");
  assert.equal(profile?.bondType, "treasury");
  assert.equal(profile?.creditQuality, "government");
  assert.equal(profile?.rateSensitivity, "high");
  assert.equal(profile?.recessionSensitivity, "positive");
});

test("calculates duration, credit, inflation-linked, treasury, corporate, and cash-like exposure", () => {
  const service = new BondAnalyticsService();
  const report = service.calculateBondAnalytics({
    totalPortfolioValue: 1000,
    holdingValuations: [
      valuation({ holdingId: "sgov-h", assetId: "sgov", ticker: "SGOV", value: 100 }),
      valuation({ holdingId: "tlt-h", assetId: "tlt", ticker: "TLT", value: 200 }),
      valuation({ holdingId: "tip-h", assetId: "tip", ticker: "TIP", value: 100 }),
      valuation({ holdingId: "hyg-h", assetId: "hyg", ticker: "HYG", value: 100 }),
      valuation({ holdingId: "stock-h", assetId: "stock", ticker: "AAPL", assetType: "stock", value: 500 })
    ],
    instruments: [
      instrument({ id: "sgov", symbol: "SGOV" }),
      instrument({ id: "tlt", symbol: "TLT" }),
      instrument({ id: "tip", symbol: "TIP" }),
      instrument({ id: "hyg", symbol: "HYG" }),
      instrument({ id: "stock", symbol: "AAPL", assetClass: "stock", canonicalSector: "Technology" })
    ],
    bondProfiles: [
      bondProfile({ instrumentId: "sgov", symbol: "SGOV" }),
      bondProfile({ instrumentId: "tlt", symbol: "TLT" }),
      bondProfile({ instrumentId: "tip", symbol: "TIP" }),
      bondProfile({ instrumentId: "hyg", symbol: "HYG" })
    ]
  });

  assert.equal(report.bondHoldings.length, 4);
  assert.equal(report.totalBondAllocation, 0.5);
  assert.equal(report.cashLikeExposure, 0.1);
  assert.equal(report.longDurationExposure, 0.2);
  assert.equal(report.inflationLinkedExposure, 0.1);
  assert.equal(report.highYieldExposure, 0.1);
  assert.equal(report.treasuryExposure, 0.4);
  assert.equal(report.corporateExposure, 0.1);
});

test("handles no-bond portfolio case without warnings", () => {
  const service = new BondAnalyticsService();
  const report = service.calculateBondAnalytics({
    totalPortfolioValue: 1000,
    holdingValuations: [valuation({ holdingId: "stock-h", assetId: "stock", ticker: "AAPL", assetType: "stock", value: 1000 })],
    instruments: [instrument({ id: "stock", symbol: "AAPL", assetClass: "stock", canonicalSector: "Technology" })],
    bondProfiles: []
  });

  assert.equal(report.bondHoldings.length, 0);
  assert.equal(report.totalBondAllocation, 0);
  assert.deepEqual(report.warnings, []);
});

test("flags bond-heavy portfolios with long-duration and high-yield risk", () => {
  const service = new BondAnalyticsService();
  const report = service.calculateBondAnalytics({
    totalPortfolioValue: 1000,
    holdingValuations: [
      valuation({ holdingId: "tlt-h", assetId: "tlt", ticker: "TLT", value: 300 }),
      valuation({ holdingId: "hyg-h", assetId: "hyg", ticker: "HYG", value: 200 }),
      valuation({ holdingId: "bnd-h", assetId: "bnd", ticker: "BND", value: 500 })
    ],
    instruments: [
      instrument({ id: "tlt", symbol: "TLT" }),
      instrument({ id: "hyg", symbol: "HYG" }),
      instrument({ id: "bnd", symbol: "BND" })
    ],
    bondProfiles: []
  });

  assert.ok(report.warnings.some((warning) => warning.includes("Long-duration")));
  assert.ok(report.warnings.some((warning) => warning.includes("High-yield")));
});
