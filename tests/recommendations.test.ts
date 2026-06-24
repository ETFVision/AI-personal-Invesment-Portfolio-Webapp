import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationRulesService } from "../src/application/services/recommendations/RecommendationRulesService";
import { StockRecommendationService } from "../src/application/services/recommendations/StockRecommendationService";
import { benchmarkKeyForEtf, EtfRecommendationService, scoreBenchmarkRelative } from "../src/application/services/recommendations/EtfRecommendationService";
import { BondEtfRecommendationService } from "../src/application/services/recommendations/BondEtfRecommendationService";
import { GoldRecommendationService } from "../src/application/services/recommendations/GoldRecommendationService";
import { CryptoRecommendationService } from "../src/application/services/recommendations/CryptoRecommendationService";
import { PortfolioFitService } from "../src/application/services/recommendations/portfolioFitService";
import { emptyMarketVisionMetadata } from "../src/application/services/marketVision/MarketVisionGenerationService";
import { scoreBusinessQuality, scoreMomentum, type RecommendationInput } from "../src/application/services/recommendations/recommendationScoring";
import type { Instrument, InstrumentMarketMetric, InstrumentRiskMetric } from "../src/domain/universe/types";
import type { FundamentalScore, FundamentalsSummaryRow } from "../src/domain/fundamentals/types";
import type { MarketVisionReport } from "../src/domain/marketVision/types";

const rules = new RecommendationRulesService();

function withStockPhase2Flag<T>(enabled: boolean, callback: () => T): T {
  const previous = process.env.ENABLE_STOCK_PHASE2_SCORES;
  if (enabled) {
    process.env.ENABLE_STOCK_PHASE2_SCORES = "true";
  } else {
    delete process.env.ENABLE_STOCK_PHASE2_SCORES;
  }
  try {
    return callback();
  } finally {
    if (previous == null) {
      delete process.env.ENABLE_STOCK_PHASE2_SCORES;
    } else {
      process.env.ENABLE_STOCK_PHASE2_SCORES = previous;
    }
  }
}

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
  tenYearReturn: null,
  fifteenYearReturn: null,
  twentyYearReturn: null,
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
  volatility10y: null,
  volatility15y: null,
  volatility20y: null,
  volatilityTrend: "stable",
  downsideVolatility: 0.14,
  currentDrawdown1y: -0.03,
  maxDrawdown1y: -0.12,
  currentDrawdown3y: null,
  maxDrawdown3y: null,
  currentDrawdown5y: null,
  maxDrawdown5y: null,
  maxDrawdown10y: null,
  maxDrawdown15y: null,
  maxDrawdown20y: null,
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

function highQualityExpensiveFundamentals(): FundamentalsSummaryRow {
  const row = fundamentals(95, 10);
  return {
    ...row,
    latestScore: row.latestScore ? {
      ...row.latestScore,
      growthScore: 92,
      profitabilityScore: 96,
      balanceSheetScore: 88,
      cashFlowScore: 94,
      qualityScore: 95,
      overallFundamentalScore: 95,
      valuationScore: 10
    } : null,
    latestTrendSummary: row.latestTrendSummary ? {
      ...row.latestTrendSummary,
      overallTrendScore: 95,
      overallConfidenceScore: 90,
      overallTrendDirection: "improving"
    } : null
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
    marketVisionMetadata: emptyMarketVisionMetadata(),
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
    ...overrides
  };
}

function phase2QualityFundamentals(overrides: Partial<FundamentalScore> = {}): FundamentalsSummaryRow {
  const row = fundamentals(62, 20);
  return {
    ...row,
    latestScore: row.latestScore ? {
      ...row.latestScore,
      growthScore: 90,
      profitabilityScore: 92,
      balanceSheetScore: 86,
      cashFlowScore: 88,
      qualityScore: 90,
      overallFundamentalScore: 62,
      valuationScore: 20,
      ...overrides
    } : null,
    latestTrendSummary: row.latestTrendSummary ? {
      ...row.latestTrendSummary,
      overallTrendScore: 90,
      overallConfidenceScore: 90,
      overallTrendDirection: "improving"
    } : null
  };
}

test("recommendation thresholds map scores deterministically", () => {
  assert.equal(rules.labelFromScore(90), "Strong Buy");
  assert.equal(rules.labelFromScore(74), "Buy");
  assert.equal(rules.labelFromScore(51), "Hold");
  assert.equal(rules.labelFromScore(40), "Watch");
  assert.equal(rules.labelFromScore(25), "Reduce");
  assert.equal(rules.labelFromScore(10), "Sell");
  assert.equal(rules.labelFromScore(80), "Strong Buy");
  assert.equal(rules.labelFromScore(79), "Buy");
  assert.equal(rules.labelFromScore(65), "Buy");
  assert.equal(rules.labelFromScore(64), "Hold");
  assert.equal(rules.labelFromScore(48), "Hold");
  assert.equal(rules.labelFromScore(47), "Watch");
});

test("guardrails cap weak fundamentals and low confidence", () => {
  assert.equal(rules.applyGuardrails({ label: "Buy", confidenceScore: 45 }).label, "Insufficient Data");
  assert.equal(rules.applyGuardrails({ label: "Buy", confidenceScore: 80, fundamentalScore: 25 }).label, "Watch");
  assert.equal(rules.applyGuardrails({ label: "Strong Buy", confidenceScore: 80, concentrationPercent: 0.3 }).label, "Hold");
});

test("excessive instrument risk cap scales with business quality", () => {
  const exceptional = rules.applyGuardrails({
    label: "Strong Buy",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: 80
  });
  const strong = rules.applyGuardrails({
    label: "Buy",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: 65
  });
  const solid = rules.applyGuardrails({
    label: "Strong Buy",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: 64
  });
  const alreadySell = rules.applyGuardrails({
    label: "Sell",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: 90
  });
  const alreadyReduce = rules.applyGuardrails({
    label: "Reduce",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: 90
  });
  const etf = rules.applyGuardrails({
    label: "Buy",
    confidenceScore: 80,
    riskScore: 82,
    businessQualityScore: null,
    instrumentType: "ETF"
  });

  assert.equal(exceptional.label, "Hold");
  assert.equal(strong.label, "Hold");
  assert.equal(solid.label, "Watch");
  assert.equal(alreadySell.label, "Sell");
  assert.equal(alreadyReduce.label, "Reduce");
  assert.equal(etf.label, "Watch");
  assert.deepEqual(exceptional.guardrails, ["Excessive instrument risk cap"]);
});

test("confidence score reflects completeness and signal conflict", () => {
  const aligned = rules.confidenceScore([
    { key: "a", label: "A", score: 72, weight: 0.5, reason: "Aligned" },
    { key: "b", label: "B", score: 70, weight: 0.3, reason: "Aligned" },
    { key: "c", label: "C", score: 68, weight: 0.2, reason: "Aligned" }
  ], 70);
  const conflicted = rules.confidenceScore([
    { key: "a", label: "A", score: 82, weight: 0.5, reason: "Strong" },
    { key: "b", label: "B", score: 35, weight: 0.3, reason: "Weak" },
    { key: "c", label: "C", score: null, weight: 0.2, reason: "Missing" }
  ], 70);

  assert.ok(aligned > conflicted);
  assert.ok(aligned > 75);
  assert.ok(conflicted < 60);
});

test("confidence score rewards strategic agreement across fundamentals, Market Vision and themes", () => {
  const generic = rules.confidenceScore([
    { key: "a", label: "A", score: 78, weight: 0.3, reason: "Aligned" },
    { key: "b", label: "B", score: 74, weight: 0.1, reason: "Aligned" },
    { key: "c", label: "C", score: 80, weight: 0.1, reason: "Aligned" },
    { key: "risk_analytics", label: "Risk", score: 58, weight: 0.1, reason: "Moderate risk" }
  ], 70);
  const strategic = rules.confidenceScore([
    { key: "fundamentals", label: "Fundamentals", score: 78, weight: 0.3, reason: "Aligned" },
    { key: "market_vision_alignment", label: "Market Vision", score: 74, weight: 0.1, reason: "Aligned" },
    { key: "theme_alignment", label: "Theme", score: 80, weight: 0.1, reason: "Aligned" },
    { key: "risk_analytics", label: "Risk", score: 58, weight: 0.1, reason: "Moderate risk" }
  ], 70);

  assert.ok(strategic > generic);
});

test("guardrails are only recorded when they change the label", () => {
  const result = rules.applyGuardrails({
    label: "Watch",
    confidenceScore: 80,
    duplicateExposure: true,
    concentrationPercent: 0.02
  });

  assert.equal(result.label, "Watch");
  assert.deepEqual(result.guardrails, []);
});

test("portfolio fit uses issuer-level look-through exposure for duplicate exposure", () => {
  const result = new PortfolioFitService().assess(
    instrument({ symbol: "GOOGL", name: "Alphabet" }),
    {
      totalValueEstimate: 100,
      holdingValuations: []
    } as any,
    {
      assetAllocation: [],
      sectorAllocation: [],
      geographyAllocation: [],
      sectorSource: "lookthrough",
      geographySource: "lookthrough",
      coverage: null,
      diagnostics: [],
      issuerExposures: [{
        issuerId: "issuer-alphabet",
        issuerName: "Alphabet Inc",
        symbols: ["GOOG", "GOOGL"],
        totalWeight: 0.18,
        directWeight: 0,
        indirectWeight: 0.18
      }]
    }
  );

  assert.equal(result.duplicateExposure, true);
  assert.equal(result.concentrationPercent, 0.18);
  assert.ok(result.negativeDrivers.some((driver) => /issuer-level exposure/i.test(driver)));
});

test("scoreBusinessQuality returns weighted average of non-valuation fundamentals", () => {
  const score: FundamentalScore = {
    instrumentId: "instrument-1",
    symbol: "TEST",
    asOfDate: "2026-06-01",
    growthScore: 80,
    profitabilityScore: 75,
    valuationScore: 20,
    balanceSheetScore: 65,
    cashFlowScore: 70,
    qualityScore: 72,
    overallFundamentalScore: 62,
    scoreConfidence: 88,
    explanation: "Test score.",
    inputsSnapshot: {}
  };

  const businessQuality = scoreBusinessQuality(score);
  assert.ok(businessQuality != null);
  assert.ok(Math.abs(businessQuality - 73.3) < 0.0001);
  assert.notEqual(businessQuality, score.overallFundamentalScore);
  assert.equal(scoreBusinessQuality({
    ...score,
    growthScore: null,
    profitabilityScore: null,
    balanceSheetScore: null,
    cashFlowScore: null,
    qualityScore: null,
    valuationScore: 95
  }), null);
});

test("stock recommendation uses fundamentals, trends, risk and market signals", () => {
  const result = new StockRecommendationService(rules).evaluate(input());
  assert.ok((result.overallScore ?? 0) >= 70);
  assert.match(result.recommendationReasoningSummary, /deterministic score/i);
  assert.match(result.recommendationReasoningSummary, /characteristics assessment/i);
  assert.doesNotMatch(result.recommendationReasoningSummary, /\brated\s+(Strong Buy|Buy|Hold|Watch|Reduce|Sell)\b/i);
  assert.ok(result.positiveDrivers.includes("Strong profitability"));
  assert.ok(result.recommendationChangeTriggers.upgrade.length > 0);
  assert.ok(result.recommendationChangeTriggers.downgrade.length > 0);
  assert.ok((result.scoringBreakdown.components as Array<{ key: string }>).some((component) => component.key === "market_vision_alignment"));
  assert.equal((result.scoringBreakdown as { businessQualityScore?: number | null }).businessQualityScore != null, true);
});

test("stock Phase 2 scoring uses business quality not overall fundamentals", () => {
  const testInput = input({
    fundamentals: phase2QualityFundamentals(),
    riskMetric: { ...riskMetric, riskScore: 12 },
    marketMetric: { ...marketMetric, dailyReturn: 0.02, ytdReturn: 0.2, oneYearReturn: 0.3 },
    marketVisionReport: marketVisionReport({
      executiveSummary: "Technology and AI / Automation have supportive tailwind and constructive opportunity."
    })
  });

  const phase1 = withStockPhase2Flag(false, () => new StockRecommendationService(rules).evaluate(testInput));
  const phase2 = withStockPhase2Flag(true, () => new StockRecommendationService(rules).evaluate(testInput));
  const components = phase2.scoringBreakdown.components as Array<{ key: string }>;

  assert.ok(components.some((component) => component.key === "business_quality"));
  assert.ok(!components.some((component) => component.key === "fundamentals"));
  assert.ok((phase2.overallScore ?? 0) > (phase1.overallScore ?? 0));
  assert.equal((phase2.scoringBreakdown as { businessQualityScore?: number | null }).businessQualityScore != null, true);
});

test("stock Phase 2 valuation guardrail only caps at valuation below 15", () => {
  const result = withStockPhase2Flag(true, () => new StockRecommendationService(rules).evaluate(input({
    fundamentals: phase2QualityFundamentals({ valuationScore: 22, overallFundamentalScore: 62 }),
    riskMetric: { ...riskMetric, riskScore: 12 },
    marketMetric: { ...marketMetric, dailyReturn: 0.02, ytdReturn: 0.2, oneYearReturn: 0.3 },
    marketVisionReport: marketVisionReport({
      executiveSummary: "Technology and AI / Automation have supportive tailwind and constructive opportunity."
    })
  })));

  assert.notEqual(result.recommendationLabel, "Watch");
  assert.ok(!result.guardrailsApplied.includes("Poor valuation cap"));
  assert.ok(!result.guardrailsApplied.includes("Poor valuation quality-aware cap"));
});

test("stock Phase 2 valuation below 15 caps at Hold", () => {
  const result = withStockPhase2Flag(true, () => new StockRecommendationService(rules).evaluate(input({
    fundamentals: phase2QualityFundamentals({ valuationScore: 10, overallFundamentalScore: 95 }),
    riskMetric: { ...riskMetric, riskScore: 5 },
    marketMetric: { ...marketMetric, dailyReturn: 0.04, ytdReturn: 0.5, oneYearReturn: 0.8 },
    marketVisionReport: marketVisionReport({
      executiveSummary: "Technology and AI / Automation have supportive tailwind and constructive opportunity."
    })
  })));

  assert.equal(result.recommendationLabel, "Hold");
  assert.ok(result.guardrailsApplied.includes("Severely stretched valuation characteristics cap"));
});

test("stock recommendation caps poor valuation", () => {
  const result = new StockRecommendationService(rules).evaluate(input({
    fundamentals: highQualityExpensiveFundamentals(),
    riskMetric: { ...riskMetric, riskScore: 5 },
    marketMetric: { ...marketMetric, dailyReturn: 0.04, ytdReturn: 0.5, oneYearReturn: 0.8 }
  }));
  assert.equal(result.recommendationLabel, "Hold");
  assert.ok(result.guardrailsApplied.includes("Poor valuation quality-aware cap"));
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
    fundamentals: highQualityExpensiveFundamentals(),
    riskMetric: { ...riskMetric, riskScore: 5 },
    marketMetric: { ...marketMetric, dailyReturn: 0.04, ytdReturn: 0.5, oneYearReturn: 0.8 },
    marketVisionReport: marketVisionReport({
      executiveSummary: "Technology and AI / Automation have a powerful opportunity and supportive tailwind."
    })
  }));
  assert.equal(result.recommendationLabel, "Hold");
  assert.ok(result.guardrailsApplied.includes("Poor valuation quality-aware cap"));
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

test("ETF benchmark relative scores excess return against mapped external benchmark", () => {
  assert.equal(scoreBenchmarkRelative(0.20, 0.20), 50);
  assert.equal(scoreBenchmarkRelative(0.45, 0.20), 75);
  assert.equal(scoreBenchmarkRelative(-0.05, 0.20), 25);
  assert.equal(scoreBenchmarkRelative(0.50, 0.00), 100);
  assert.equal(scoreBenchmarkRelative(-0.50, 0.00), 0);
  assert.equal(scoreBenchmarkRelative(0.20, null), null);

  const service = new EtfRecommendationService(rules);
  const beat = service.evaluate(input({
    instrument: instrument({ assetClass: "etf", instrumentType: "etf", etfCategory: "US_BROAD_MARKET" }),
    marketMetric: { ...marketMetric, oneYearReturn: 0.30 },
    benchmarkRelative: { benchmarkKey: "sp500", benchmarkReturn1y: 0.20 },
    fundamentals: null
  }));
  const lag = service.evaluate(input({
    instrument: instrument({ assetClass: "etf", instrumentType: "etf", etfCategory: "US_BROAD_MARKET" }),
    marketMetric: { ...marketMetric, oneYearReturn: 0.10 },
    benchmarkRelative: { benchmarkKey: "sp500", benchmarkReturn1y: 0.20 },
    fundamentals: null
  }));
  const missing = service.evaluate(input({
    instrument: instrument({ assetClass: "etf", instrumentType: "etf", etfCategory: "US_BROAD_MARKET" }),
    marketMetric: { ...marketMetric, oneYearReturn: 0.30 },
    benchmarkRelative: null,
    fundamentals: null
  }));

  const beatComponent = beat.scoringBreakdown.components as Array<{ key: string; score: number | null }>;
  const lagComponent = lag.scoringBreakdown.components as Array<{ key: string; score: number | null }>;
  const missingComponent = missing.scoringBreakdown.components as Array<{ key: string; score: number | null }>;
  assert.equal(beatComponent.find((component) => component.key === "benchmark_relative")?.score, 60);
  assert.equal(lagComponent.find((component) => component.key === "benchmark_relative")?.score, 40);
  assert.equal(missingComponent.find((component) => component.key === "benchmark_relative")?.score, null);
});

test("ETF benchmark map uses emerging markets benchmark for EM ETFs", () => {
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EEM", assetClass: "etf", instrumentType: "etf", etfCategory: "EMERGING_MARKETS" })), "emerging_markets");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "INDA", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "emerging_markets");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EWZ", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "emerging_markets");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EWY", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "emerging_markets");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EWT", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "emerging_markets");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EFA", assetClass: "etf", instrumentType: "etf", etfCategory: "DEVELOPED_MARKETS" })), "developed_ex_us");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EWJ", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "developed_ex_us");
  assert.equal(benchmarkKeyForEtf(instrument({ symbol: "EWG", assetClass: "etf", instrumentType: "etf", etfCategory: "COUNTRY" })), "developed_ex_us");
  assert.notEqual(benchmarkKeyForEtf(instrument({ symbol: "EEM", assetClass: "etf", instrumentType: "etf", etfCategory: "EMERGING_MARKETS" })), "sp500");
});

test("ETF momentum excludes trailing one-year return", () => {
  const highOneYear = scoreMomentum({ ...marketMetric, oneYearReturn: 0.80, ytdReturn: 0.10, dailyReturn: 0.01 });
  const lowOneYear = scoreMomentum({ ...marketMetric, oneYearReturn: -0.80, ytdReturn: 0.10, dailyReturn: 0.01 });
  assert.equal(highOneYear, lowOneYear);
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
