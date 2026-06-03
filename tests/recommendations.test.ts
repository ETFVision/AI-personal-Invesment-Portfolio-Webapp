import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationRulesService } from "../src/application/services/recommendations/RecommendationRulesService";
import { StockRecommendationService } from "../src/application/services/recommendations/StockRecommendationService";
import { EtfRecommendationService } from "../src/application/services/recommendations/EtfRecommendationService";
import { BondEtfRecommendationService } from "../src/application/services/recommendations/BondEtfRecommendationService";
import { GoldRecommendationService } from "../src/application/services/recommendations/GoldRecommendationService";
import { CryptoRecommendationService } from "../src/application/services/recommendations/CryptoRecommendationService";
import type { RecommendationInput } from "../src/application/services/recommendations/recommendationScoring";
import type { Instrument, InstrumentMarketMetric, InstrumentRiskMetric } from "../src/domain/universe/types";
import type { FundamentalsSummaryRow } from "../src/domain/fundamentals/types";
import type { MarketVisionReport } from "../src/domain/marketVision/types";

const rules = new RecommendationRulesService();

function instrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: "instrument-1",
    symbol: "TEST",
    name: "Test Instrument",
    assetClass: "stock",
    instrumentType: "stock",
    sector: "Technology",
    industry: "Software",
    canonicalSector: "Technology",
    canonicalThemes: ["Quality", "AI / Automation"],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "mapped",
    geography: "US",
    currency: "USD",
    exchange: "NASDAQ",
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

const marketMetric: InstrumentMarketMetric = {
  instrumentId: "instrument-1",
  latestPrice: 100,
  latestPriceDate: "2026-06-01",
  previousClosePrice: 99,
  previousPriceDate: "2026-05-29",
  dailyReturn: 0.01,
  ytdReturn: 0.12,
  oneYearReturn: 0.22,
  threeYearReturn: null,
  fiveYearReturn: null,
  fiftyTwoWeekLow: 80,
  fiftyTwoWeekHigh: 105,
  observationCount: 260,
  historyStartDate: "2025-06-01",
  historyEndDate: "2026-06-01",
  updatedAt: "2026-06-01"
};

const riskMetric: InstrumentRiskMetric = {
  instrumentId: "instrument-1",
  metricDate: "2026-06-01",
  volatility30d: 0.18,
  volatility90d: 0.2,
  volatility1y: 0.22,
  volatilityTrend: "stable",
  downsideVolatility: 0.14,
  currentDrawdown1y: -0.03,
  maxDrawdown1y: -0.12,
  currentDrawdown3y: null,
  maxDrawdown3y: null,
  currentDrawdown5y: null,
  maxDrawdown5y: null,
  currentDrawdown: -0.03,
  maxDrawdown: -0.12,
  drawdownDurationDays: 12,
  drawdownBucket: "moderate",
  negativeReturnFrequency: 0.44,
  worstDailyReturn: -0.04,
  worstWeeklyReturn: -0.07,
  riskScore: 32,
  riskBucket: "medium",
  volatilityBucket: "medium",
  confidenceScore: 90,
  observationCount: 260,
  historyStartDate: "2025-06-01",
  historyEndDate: "2026-06-01",
  calculatedAt: "2026-06-01"
};

function fundamentals(score = 82, valuation = 64): FundamentalsSummaryRow {
  const inst = instrument();
  return {
    instrument: inst,
    profile: null,
    latestRatio: null,
    latestScore: {
      instrumentId: inst.id,
      symbol: "TEST",
      asOfDate: "2026-06-01",
      growthScore: 78,
      profitabilityScore: 88,
      valuationScore: valuation,
      balanceSheetScore: 76,
      cashFlowScore: 84,
      qualityScore: 82,
      overallFundamentalScore: score,
      scoreConfidence: 88,
      explanation: "Strong fundamentals.",
      inputsSnapshot: {}
    },
    latestTrendSummary: {
      instrumentId: inst.id,
      symbol: "TEST",
      asOfDate: "2026-06-01",
      overallTrendScore: 76,
      overallConfidenceScore: 80,
      overallTrendDirection: "improving",
      improvingMetricsCount: 5,
      deterioratingMetricsCount: 1,
      stableMetricsCount: 2,
      volatileMetricsCount: 0,
      insufficientDataMetricsCount: 0,
      growthTrendScore: 75,
      marginTrendScore: 72,
      profitabilityTrendScore: 78,
      balanceSheetTrendScore: 70,
      qualityTrendScore: 80,
      warnings: [],
      explanation: "Improving trend.",
      inputsSnapshot: {}
    },
    statementCount: 9,
    missingDataWarnings: []
  };
}

function marketVisionReport(overrides: Partial<MarketVisionReport> = {}): MarketVisionReport {
  return {
    id: "mv-1",
    reportDate: "2026-06-01",
    reportPeriodStart: "2026-05-25",
    reportPeriodEnd: "2026-06-01",
    title: "Weekly Market Vision",
    executiveSummary: "Technology and AI / Automation remain constructive but valuation risk remains relevant.",
    globalMarketSummary: "Growth is stable.",
    equityView: "Equity opportunity is selective.",
    bondView: "Rates remain stable.",
    goldView: "Gold remains a hedge.",
    cryptoView: "Crypto risk appetite is mixed.",
    ratesView: "Rates are stable.",
    inflationView: "Inflation is elevated.",
    growthView: "Growth is stable.",
    employmentView: "Employment is stable.",
    currencyView: "USD is stable.",
    geopoliticalRiskView: "Geopolitical risk is moderate.",
    opportunities: ["AI / Automation tailwind"],
    risks: ["Valuation risk"],
    portfolioImplications: {
      equityAllocationImplication: "Technology exposure is supported but should be sized carefully.",
      bondAllocationImplication: "Duration should remain balanced.",
      goldImplication: "Gold hedge remains useful.",
      cryptoImplication: "Crypto should remain conservative.",
      cashImplication: "Cash remains optionality.",
      riskImplication: "Concentration controls remain important.",
      watchlistImplication: "Watch quality growth."
    },
    classificationSummary: {
      shortTermNoise: 1,
      mediumTermThemes: 2,
      structuralLongTermShifts: 1
    },
    sourceType: "generated",
    status: "published",
    confidenceScore: 80,
    modelUsed: "test",
    promptVersion: "test",
    tokenUsage: {},
    costEstimate: null,
    sourceSnapshot: {},
    generationDurationMs: null,
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...overrides
  };
}

function input(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    instrument: instrument(),
    marketMetric,
    riskMetric,
    fundamentals: fundamentals(),
    bondProfile: null,
    macroRegime: {
      id: "regime-1",
      snapshotDate: "2026-06-01",
      ratesRegime: "stable",
      inflationRegime: "elevated",
      growthRegime: "stable",
      employmentRegime: "stable",
      yieldCurveRegime: "normal",
      liquidityRegime: "normal",
      dollarRegime: "stable",
      commoditiesRegime: "firm",
      overallMacroSummary: "Stable",
      createdAt: "",
      updatedAt: ""
    },
    marketVisionReport: marketVisionReport(),
    portfolioFit: {
      score: 70,
      concentrationPercent: 0.02,
      duplicateExposure: false,
      positiveDrivers: ["Adds a new sleeve"],
      negativeDrivers: [],
      dataLimitations: []
    },
    ...overrides
  };
}

test("recommendation thresholds map scores deterministically", () => {
  assert.equal(rules.labelFromScore(90), "Strong Buy");
  assert.equal(rules.labelFromScore(74), "Buy");
  assert.equal(rules.labelFromScore(51), "Hold");
  assert.equal(rules.labelFromScore(40), "Watch");
  assert.equal(rules.labelFromScore(25), "Reduce");
  assert.equal(rules.labelFromScore(10), "Sell");
});

test("guardrails cap weak fundamentals and low confidence", () => {
  assert.equal(rules.applyGuardrails({ label: "Buy", confidenceScore: 45 }).label, "Insufficient Data");
  assert.equal(rules.applyGuardrails({ label: "Buy", confidenceScore: 80, fundamentalScore: 25 }).label, "Watch");
  assert.equal(rules.applyGuardrails({ label: "Strong Buy", confidenceScore: 80, concentrationPercent: 0.3 }).label, "Hold");
});

test("stock recommendation uses fundamentals, trends, risk and portfolio fit", () => {
  const result = new StockRecommendationService(rules).evaluate(input());
  assert.ok((result.overallScore ?? 0) >= 70);
  assert.match(result.recommendationReasoningSummary, /deterministic score/i);
  assert.ok(result.positiveDrivers.includes("Strong profitability"));
  assert.ok(result.recommendationChangeTriggers.upgrade.length > 0);
  assert.ok(result.recommendationChangeTriggers.downgrade.length > 0);
  assert.ok((result.scoringBreakdown.components as Array<{ key: string }>).some((component) => component.key === "market_vision_alignment"));
});

test("stock recommendation caps poor valuation", () => {
  const result = new StockRecommendationService(rules).evaluate(input({ fundamentals: fundamentals(80, 10) }));
  assert.equal(result.recommendationLabel, "Watch");
  assert.ok(result.guardrailsApplied.includes("Poor valuation cap"));
});

test("weak component scores do not use positive driver wording", () => {
  const result = new StockRecommendationService(rules).evaluate(input({ fundamentals: fundamentals(40, 64) }));
  const components = result.scoringBreakdown.components as Array<{ key: string; reason: string }>;
  assert.equal(components.find((component) => component.key === "fundamentals")?.reason, "Fundamentals score is weak");
  assert.ok(result.negativeDrivers.includes("Fundamentals score is weak"));
  assert.ok(!result.negativeDrivers.includes("Strong overall fundamentals"));
});

test("risk analytics wording reflects moderate risk scores", () => {
  const result = new StockRecommendationService(rules).evaluate(input({
    riskMetric: { ...riskMetric, riskScore: 52 }
  }));
  const components = result.scoringBreakdown.components as Array<{ key: string; reason: string; score: number }>;
  const riskComponent = components.find((component) => component.key === "risk_analytics");
  assert.equal(Math.round(riskComponent?.score ?? 0), 48);
  assert.equal(riskComponent?.reason, "Instrument risk is moderate");
});

test("Market Vision cannot override hard guardrails", () => {
  const result = new StockRecommendationService(rules).evaluate(input({
    fundamentals: fundamentals(80, 10),
    marketVisionReport: marketVisionReport({
      executiveSummary: "Technology and AI / Automation have a powerful opportunity and supportive tailwind."
    })
  }));
  assert.equal(result.recommendationLabel, "Watch");
  assert.ok(result.guardrailsApplied.includes("Poor valuation cap"));
});

test("ETF, bond, gold and crypto services return deterministic labels", () => {
  assert.notEqual(new EtfRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "etf", instrumentType: "etf" }), fundamentals: null })).recommendationLabel, "Not Applicable");
  assert.notEqual(new BondEtfRecommendationService(rules).evaluate(input({
    instrument: instrument({ assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income" }),
    fundamentals: null,
    bondProfile: {
      instrumentId: "instrument-1",
      symbol: "BND",
      durationCategory: "intermediate",
      treasuryClassification: "aggregate",
      inflationLinked: false,
      creditQuality: "mixed",
      geoExposure: "US",
      rateSensitivity: "medium",
      inflationSensitivity: "moderate",
      recessionSensitivity: "mixed",
      liquidityRole: "stability",
      currency: "USD",
      secYield: null,
      distributionYield: null,
      yieldToMaturity: null,
      yieldAsOfDate: null,
      effectiveDuration: null,
      averageMaturity: null,
      spreadDuration: null,
      optionAdjustedSpread: null,
      expenseRatio: null,
      isManualOverride: true,
      updatedAt: null,
      providerMetadata: {}
    }
  })).recommendationLabel, "Not Applicable");
  assert.notEqual(new GoldRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "gold_etf", instrumentType: "gold_etf", canonicalSector: "Commodities / Gold" }), fundamentals: null })).recommendationLabel, "Not Applicable");
  assert.notEqual(new CryptoRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "crypto", instrumentType: "crypto", canonicalSector: "Crypto" }), fundamentals: null })).recommendationLabel, "Not Applicable");
});

test("Market Vision alignment is included for every supported recommendation type", () => {
  const cases = [
    new StockRecommendationService(rules).evaluate(input()),
    new EtfRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "etf", instrumentType: "etf" }), fundamentals: null })),
    new BondEtfRecommendationService(rules).evaluate(input({
      instrument: instrument({ assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income" }),
      fundamentals: null,
      bondProfile: {
        instrumentId: "instrument-1",
        symbol: "BND",
        durationCategory: "intermediate",
        treasuryClassification: "aggregate",
        inflationLinked: false,
        creditQuality: "mixed",
        geoExposure: "US",
        rateSensitivity: "medium",
        inflationSensitivity: "moderate",
        recessionSensitivity: "mixed",
        liquidityRole: "stability",
        currency: "USD",
        secYield: null,
        distributionYield: null,
        yieldToMaturity: null,
        yieldAsOfDate: null,
        effectiveDuration: null,
        averageMaturity: null,
        spreadDuration: null,
        optionAdjustedSpread: null,
        expenseRatio: null,
        isManualOverride: true,
        updatedAt: null,
        providerMetadata: {}
      }
    })),
    new GoldRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "gold_etf", instrumentType: "gold_etf", canonicalSector: "Commodities / Gold" }), fundamentals: null })),
    new CryptoRecommendationService(rules).evaluate(input({ instrument: instrument({ assetClass: "crypto", instrumentType: "crypto", canonicalSector: "Crypto" }), fundamentals: null }))
  ];

  for (const result of cases) {
    assert.ok((result.scoringBreakdown.components as Array<{ key: string }>).some((component) => component.key === "market_vision_alignment"));
  }
});
