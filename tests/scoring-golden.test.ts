import test from "node:test";
import assert from "node:assert/strict";
import { FundamentalScoringService, fundamentalScoringInternals } from "../src/application/services/fundamentals/FundamentalScoringService";
import { RecommendationRulesService } from "../src/application/services/recommendations/RecommendationRulesService";
import { StockRecommendationService } from "../src/application/services/recommendations/StockRecommendationService";
import { EtfRecommendationService, scoreBenchmarkRelative } from "../src/application/services/recommendations/EtfRecommendationService";
import { BondEtfRecommendationService } from "../src/application/services/recommendations/BondEtfRecommendationService";
import { GoldRecommendationService } from "../src/application/services/recommendations/GoldRecommendationService";
import { CryptoRecommendationService } from "../src/application/services/recommendations/CryptoRecommendationService";
import { emptyMarketVisionMetadata } from "../src/application/services/marketVision/MarketVisionGenerationService";
import { scoreBusinessQuality, scoreMomentum, scoreRisk, type RecommendationEvaluation, type RecommendationInput } from "../src/application/services/recommendations/recommendationScoring";
import type { CompanyProfile, FinancialRatio, FinancialStatement, FundamentalScore, FundamentalsSummaryRow, FundamentalTrendSummary } from "../src/domain/fundamentals/types";
import type { MacroRegimeSnapshot } from "../src/domain/macro/types";
import type { MarketVisionReport } from "../src/domain/marketVision/types";
import type { BondProfile, Instrument, InstrumentMarketMetric, InstrumentRiskMetric } from "../src/domain/universe/types";

const rules = new RecommendationRulesService();
const scoringService = new FundamentalScoringService();

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

function roundScore(value: number | null | undefined) {
  return value == null ? null : Number(value.toFixed(6));
}

function normalized(result: RecommendationEvaluation) {
  return {
    overallScore: roundScore(result.overallScore),
    recommendationLabel: result.recommendationLabel,
    confidenceScore: roundScore(result.confidenceScore),
    guardrailsApplied: result.guardrailsApplied,
    components: (result.scoringBreakdown.components as Array<{ key: string; score: number | null }>).map((component) => ({
      key: component.key,
      score: roundScore(component.score)
    }))
  };
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

function marketMetric(overrides: Partial<InstrumentMarketMetric> = {}): InstrumentMarketMetric {
  return {
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
    updatedAt: "2026-06-01",
    ...overrides
  };
}

function riskMetric(overrides: Partial<InstrumentRiskMetric> = {}): InstrumentRiskMetric {
  return {
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
    calculatedAt: "2026-06-01",
    ...overrides
  };
}

function profile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    instrumentId: "instrument-1",
    symbol: "TEST",
    companyName: "Test Company",
    sector: "Technology",
    industry: "Software",
    country: "US",
    exchange: "NASDAQ",
    currency: "USD",
    marketCap: 100_000_000_000,
    beta: 1.1,
    description: null,
    website: null,
    ceo: null,
    ipoDate: null,
    employees: null,
    lastRefreshedAt: "2026-06-01",
    provider: "fixture",
    providerMetadata: {},
    ...overrides
  };
}

function ratio(year: number, overrides: Partial<FinancialRatio> = {}): FinancialRatio {
  return {
    instrumentId: "instrument-1",
    symbol: "TEST",
    period: "annual",
    fiscalYear: year,
    fiscalQuarter: 0,
    reportDate: `${year}-12-31`,
    peRatio: 24,
    forwardPe: 22,
    priceToSales: 6,
    priceToBook: 5,
    evToEbitda: 18,
    evToSales: null,
    grossMargin: 0.58,
    operatingMargin: 0.28,
    netMargin: 0.21,
    roe: 0.22,
    roic: 0.18,
    roa: 0.1,
    debtToEquity: 0.4,
    netDebtToEbitda: 1.1,
    currentRatio: 1.7,
    quickRatio: 1.2,
    freeCashFlowYield: 0.04,
    revenueGrowth: 0.12,
    epsGrowth: 0.14,
    netIncomeGrowth: 0.13,
    freeCashFlowGrowth: 0.15,
    provider: "fixture",
    providerMetadata: {},
    ...overrides
  };
}

function statement(
  statementType: FinancialStatement["statementType"],
  year: number,
  overrides: Partial<FinancialStatement> = {}
): FinancialStatement {
  return {
    instrumentId: "instrument-1",
    symbol: "TEST",
    statementType,
    period: "annual",
    fiscalYear: year,
    fiscalQuarter: 0,
    reportDate: `${year}-12-31`,
    filingDate: `${year + 1}-02-15`,
    revenue: statementType === "income_statement" ? 1000 : null,
    grossProfit: statementType === "income_statement" ? 580 : null,
    operatingIncome: statementType === "income_statement" ? 280 : null,
    ebitda: statementType === "income_statement" ? 320 : null,
    netIncome: statementType === "income_statement" ? 210 : null,
    eps: statementType === "income_statement" ? 5 : null,
    dilutedEps: statementType === "income_statement" ? 4.9 : null,
    totalAssets: statementType === "balance_sheet" ? 1800 : null,
    totalLiabilities: statementType === "balance_sheet" ? 700 : null,
    shareholdersEquity: statementType === "balance_sheet" ? 1100 : null,
    cashAndEquivalents: statementType === "balance_sheet" ? 260 : null,
    totalDebt: statementType === "balance_sheet" ? 420 : null,
    operatingCashFlow: statementType === "cash_flow" ? 260 : null,
    capitalExpenditure: statementType === "cash_flow" ? -60 : null,
    freeCashFlow: statementType === "cash_flow" ? 200 : null,
    sharesOutstanding: 100,
    provider: "fixture",
    providerMetadata: {},
    ...overrides
  };
}

function statementsForYears(years: number[], overridesByType: Partial<Record<FinancialStatement["statementType"], Partial<FinancialStatement>>> = {}) {
  return years.flatMap((year) => [
    statement("income_statement", year, overridesByType.income_statement ?? {}),
    statement("balance_sheet", year, overridesByType.balance_sheet ?? {}),
    statement("cash_flow", year, overridesByType.cash_flow ?? {})
  ]);
}

function scoreFundamentals(kind: "strong" | "weak" | "financial") {
  if (kind === "weak") {
    return scoringService.calculateScore({
      instrumentId: "instrument-1",
      symbol: "WEAK",
      profile: profile({ symbol: "WEAK", marketCap: 8_000_000_000 }),
      ratios: [
        ratio(2022, { revenueGrowth: -0.04, epsGrowth: -0.08, netIncomeGrowth: -0.1, freeCashFlowGrowth: -0.12, grossMargin: 0.22, operatingMargin: 0.04, netMargin: 0.02, roe: 0.04, roic: 0.03, roa: 0.015, debtToEquity: 2.2, netDebtToEbitda: 4.2, currentRatio: 0.85, quickRatio: 0.55, peRatio: 45, forwardPe: 42, priceToSales: 10, priceToBook: 9, evToEbitda: 28, freeCashFlowYield: 0.01 }),
        ratio(2023, { revenueGrowth: -0.08, epsGrowth: -0.11, netIncomeGrowth: -0.13, freeCashFlowGrowth: -0.16, grossMargin: 0.2, operatingMargin: 0.03, netMargin: 0.01, roe: 0.03, roic: 0.025, roa: 0.01, debtToEquity: 2.6, netDebtToEbitda: 4.8, currentRatio: 0.8, quickRatio: 0.5, peRatio: 52, forwardPe: 48, priceToSales: 12, priceToBook: 11, evToEbitda: 31, freeCashFlowYield: 0.005 }),
        ratio(2024, { revenueGrowth: -0.12, epsGrowth: -0.14, netIncomeGrowth: -0.2, freeCashFlowGrowth: -0.22, grossMargin: 0.18, operatingMargin: 0.02, netMargin: -0.02, roe: 0.01, roic: 0.015, roa: 0.005, debtToEquity: 3.2, netDebtToEbitda: 5.5, currentRatio: 0.65, quickRatio: 0.42, peRatio: 65, forwardPe: 60, priceToSales: 16, priceToBook: 14, evToEbitda: 38, freeCashFlowYield: -0.01 })
      ],
      statements: statementsForYears([2022, 2023, 2024], {
        income_statement: { revenue: 900, netIncome: -18, sharesOutstanding: 120 },
        balance_sheet: { cashAndEquivalents: 50, totalDebt: 400, totalAssets: 1200 },
        cash_flow: { operatingCashFlow: 20, freeCashFlow: -20 }
      }),
      asOfDate: "2026-06-01"
    });
  }
  if (kind === "financial") {
    return scoringService.calculateScore({
      instrumentId: "instrument-1",
      symbol: "BANK",
      profile: profile({ symbol: "BANK", sector: "Financial Services", industry: "Banks", marketCap: 120_000_000_000 }),
      ratios: [
        ratio(2020, { grossMargin: null, operatingMargin: 0.34, netMargin: 0.24, roe: 0.13, roic: 0.09, roa: 0.011, priceToBook: 1.4, debtToEquity: 4.5, netDebtToEbitda: null, currentRatio: null, quickRatio: null, freeCashFlowGrowth: null }),
        ratio(2021, { grossMargin: null, operatingMargin: 0.33, netMargin: 0.23, roe: 0.14, roic: 0.1, roa: 0.012, priceToBook: 1.5, debtToEquity: 4.8, netDebtToEbitda: null, currentRatio: null, quickRatio: null, freeCashFlowGrowth: null }),
        ratio(2022, { grossMargin: null, operatingMargin: 0.32, netMargin: 0.22, roe: 0.15, roic: 0.11, roa: 0.013, priceToBook: 1.6, debtToEquity: 5.1, netDebtToEbitda: null, currentRatio: null, quickRatio: null, freeCashFlowGrowth: null }),
        ratio(2023, { grossMargin: null, operatingMargin: 0.31, netMargin: 0.21, roe: 0.145, roic: 0.105, roa: 0.0125, priceToBook: 1.55, debtToEquity: 5.0, netDebtToEbitda: null, currentRatio: null, quickRatio: null, freeCashFlowGrowth: null }),
        ratio(2024, { grossMargin: null, operatingMargin: 0.3, netMargin: 0.2, roe: 0.14, roic: 0.1, roa: 0.012, priceToBook: 1.5, debtToEquity: 5.2, netDebtToEbitda: null, currentRatio: null, quickRatio: null, freeCashFlowGrowth: null })
      ],
      statements: statementsForYears([2020, 2021, 2022, 2023, 2024], {
        income_statement: { revenue: 1000, netIncome: 200, sharesOutstanding: 100 },
        balance_sheet: { cashAndEquivalents: 200, totalDebt: 800, totalAssets: 2000 },
        cash_flow: { operatingCashFlow: 180, freeCashFlow: 120 }
      }),
      asOfDate: "2026-06-01"
    });
  }
  return scoringService.calculateScore({
    instrumentId: "instrument-1",
    symbol: "STRONG",
    profile: profile({ symbol: "STRONG", marketCap: 150_000_000_000 }),
    ratios: [
      ratio(2020, { revenueGrowth: 0.1, epsGrowth: 0.11, netIncomeGrowth: 0.1, freeCashFlowGrowth: 0.1, grossMargin: 0.55, operatingMargin: 0.25, netMargin: 0.19, roe: 0.2, roic: 0.17, roa: 0.09 }),
      ratio(2021, { revenueGrowth: 0.12, epsGrowth: 0.13, netIncomeGrowth: 0.12, freeCashFlowGrowth: 0.13, grossMargin: 0.56, operatingMargin: 0.26, netMargin: 0.2, roe: 0.21, roic: 0.18, roa: 0.095 }),
      ratio(2022, { revenueGrowth: 0.14, epsGrowth: 0.15, netIncomeGrowth: 0.14, freeCashFlowGrowth: 0.15, grossMargin: 0.57, operatingMargin: 0.27, netMargin: 0.21, roe: 0.22, roic: 0.19, roa: 0.1 }),
      ratio(2023, { revenueGrowth: 0.16, epsGrowth: 0.17, netIncomeGrowth: 0.16, freeCashFlowGrowth: 0.17, grossMargin: 0.58, operatingMargin: 0.28, netMargin: 0.22, roe: 0.23, roic: 0.2, roa: 0.105 }),
      ratio(2024, { revenueGrowth: 0.18, epsGrowth: 0.19, netIncomeGrowth: 0.18, freeCashFlowGrowth: 0.19, grossMargin: 0.59, operatingMargin: 0.29, netMargin: 0.23, roe: 0.24, roic: 0.21, roa: 0.11 })
    ],
    statements: statementsForYears([2020, 2021, 2022, 2023, 2024]),
    asOfDate: "2026-06-01"
  });
}

function fundamentalSnapshot(score: FundamentalScore) {
  return {
    growthScore: roundScore(score.growthScore),
    profitabilityScore: roundScore(score.profitabilityScore),
    valuationScore: roundScore(score.valuationScore),
    balanceSheetScore: roundScore(score.balanceSheetScore),
    cashFlowScore: roundScore(score.cashFlowScore),
    qualityScore: roundScore(score.qualityScore)
  };
}

function trend(overrides: Partial<FundamentalTrendSummary> = {}): FundamentalTrendSummary {
  return {
    instrumentId: "instrument-1",
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
    inputsSnapshot: {},
    ...overrides
  };
}

function fundamentals(score: FundamentalScore, overrides: Partial<FundamentalsSummaryRow> = {}): FundamentalsSummaryRow {
  return {
    instrument: instrument({ symbol: score.symbol }),
    profile: null,
    latestRatio: null,
    latestScore: score,
    latestTrendSummary: trend({ symbol: score.symbol }),
    statementCount: 9,
    missingDataWarnings: [],
    ...overrides
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
    bondView: "Rates and duration remain stable.",
    goldView: "Gold remains an inflation and geopolitical hedge.",
    cryptoView: "Crypto liquidity and risk appetite are mixed.",
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
      cryptoImplication: "Crypto liquidity should remain monitored.",
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

function macroRegime(overrides: Partial<MacroRegimeSnapshot> = {}): MacroRegimeSnapshot {
  return {
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
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...overrides
  };
}

function bondProfile(overrides: Partial<BondProfile> = {}): BondProfile {
  return {
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
    updatedAt: "2026-06-01",
    providerMetadata: {},
    ...overrides
  };
}

function input(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    instrument: instrument(),
    marketMetric: marketMetric(),
    benchmarkRelative: null,
    riskMetric: riskMetric(),
    fundamentals: fundamentals(scoreFundamentals("strong")),
    bondProfile: null,
    macroRegime: macroRegime(),
    marketVisionReport: marketVisionReport(),
    ...overrides
  };
}

test("golden anchors pin scoring helper outputs", () => {
  assert.equal(scoreBusinessQuality({
    instrumentId: "instrument-1",
    symbol: "ANCHOR",
    asOfDate: "2026-06-01",
    growthScore: 80,
    profitabilityScore: 75,
    valuationScore: 20,
    balanceSheetScore: 65,
    cashFlowScore: 70,
    qualityScore: 60,
    overallFundamentalScore: 0,
    scoreConfidence: 100,
    explanation: "anchor",
    inputsSnapshot: {}
  }), 71.5);
  assert.ok(Math.abs((scoreBenchmarkRelative(0.30, 0.20) ?? 0) - 60) < 1e-12);
  assert.ok(Math.abs((scoreBenchmarkRelative(0.10, 0.55) ?? 0) - 5) < 1e-12);
  assert.ok(Math.abs((scoreMomentum(marketMetric({ ytdReturn: 0.12, dailyReturn: 0.01 })) ?? 0) - 55.6) < 1e-12);
  assert.equal(scoreRisk(riskMetric({ riskScore: 40 })), 60);
  assert.ok(Math.abs((fundamentalScoringInternals.scoreMargin(0.20, 0.05, 0.35) ?? 0) - 60) < 1e-12);
  assert.ok(Math.abs((fundamentalScoringInternals.scoreLowerBetter(20, 12, 60) ?? 0) - 86.66666666666667) < 1e-12);
  assert.equal(fundamentalScoringInternals.scoreHigherBetter(0.04, 0, 0.08), 50);
  assert.equal(fundamentalScoringInternals.scorePositivePercent(0.05), 50);
});

test("golden fundamental sub-score outputs are pinned", () => {
  const strong = scoreFundamentals("strong");
  const weak = scoreFundamentals("weak");
  const financial = scoreFundamentals("financial");

  assert.deepEqual(fundamentalSnapshot(strong), {
    growthScore: 77,
    profitabilityScore: 83.518998,
    valuationScore: 73.874533,
    balanceSheetScore: 68.663325,
    cashFlowScore: 87.640909,
    qualityScore: 98
  });
  assert.deepEqual(fundamentalSnapshot(weak), {
    growthScore: 10,
    profitabilityScore: 15.950874,
    valuationScore: 16.196526,
    balanceSheetScore: 11.044745,
    cashFlowScore: 11.75,
    qualityScore: 26.22
  });
  assert.deepEqual(fundamentalSnapshot(financial), {
    growthScore: 66,
    profitabilityScore: 63.757576,
    valuationScore: 77.331324,
    balanceSheetScore: 76.181818,
    cashFlowScore: null,
    qualityScore: 95.555556
  });
  assert.equal(financial.cashFlowScore, null);
  const qualitySignals = financial.inputsSnapshot.qualitySignals as {
    cashConversion: { score: number | null };
    roicDurability: { score: number | null };
  };
  assert.equal(qualitySignals.cashConversion.score, null);
  assert.equal(qualitySignals.roicDurability.score, null);
});

test("golden recommendation outputs are pinned across instrument types", () => {
  const strong = scoreFundamentals("strong");
  const weak = scoreFundamentals("weak");
  const financial = scoreFundamentals("financial");
  const stockService = new StockRecommendationService(rules);
  const etfService = new EtfRecommendationService(rules);
  const bondService = new BondEtfRecommendationService(rules);
  const goldService = new GoldRecommendationService(rules);
  const cryptoService = new CryptoRecommendationService(rules);

  const cases = {
    strongStock: withStockPhase2Flag(true, () => normalized(stockService.evaluate(input({
      instrument: instrument({ symbol: "STRONG", canonicalThemes: ["Quality", "AI / Automation"] }),
      fundamentals: fundamentals(strong),
      riskMetric: riskMetric({ riskScore: 18 }),
      marketMetric: marketMetric({ ytdReturn: 0.18, dailyReturn: 0.015, oneYearReturn: 0.3 })
    })))),
    weakStock: withStockPhase2Flag(true, () => normalized(stockService.evaluate(input({
      instrument: instrument({ symbol: "WEAK", canonicalThemes: ["High Beta"] }),
      fundamentals: fundamentals(weak),
      riskMetric: riskMetric({ riskScore: 76, riskBucket: "very_high" }),
      marketMetric: marketMetric({ ytdReturn: -0.18, dailyReturn: -0.02, oneYearReturn: -0.2 })
    })))),
    financialStock: withStockPhase2Flag(true, () => normalized(stockService.evaluate(input({
      instrument: instrument({ symbol: "BANK", sector: "Financial Services", industry: "Banks", canonicalSector: "Financials", canonicalThemes: ["Quality"] }),
      fundamentals: fundamentals(financial),
      riskMetric: riskMetric({ riskScore: 35 }),
      marketMetric: marketMetric({ ytdReturn: 0.08, dailyReturn: 0.004, oneYearReturn: 0.11 })
    })))),
    usBroadEtf: normalized(etfService.evaluate(input({
      instrument: instrument({ symbol: "VOO", assetClass: "etf", instrumentType: "etf", etfCategory: "US_BROAD_MARKET", canonicalSector: "US Broad Market", canonicalThemes: ["Quality"] }),
      fundamentals: null,
      benchmarkRelative: { benchmarkKey: "sp500", benchmarkReturn1y: 0.2 },
      marketMetric: marketMetric({ oneYearReturn: 0.2 })
    }))),
    emergingMarketEtf: normalized(etfService.evaluate(input({
      instrument: instrument({ symbol: "EEM", assetClass: "etf", instrumentType: "etf", etfCategory: "EMERGING_MARKETS", canonicalSector: "International Equity", canonicalThemes: ["Global Diversification"] }),
      fundamentals: null,
      benchmarkRelative: { benchmarkKey: "emerging_markets", benchmarkReturn1y: 0.3 },
      marketMetric: marketMetric({ oneYearReturn: 0.05, ytdReturn: -0.06, dailyReturn: -0.005 })
    }))),
    bondEtf: normalized(bondService.evaluate(input({
      instrument: instrument({ symbol: "BND", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: [] }),
      fundamentals: null,
      bondProfile: bondProfile(),
      marketMetric: marketMetric({ ytdReturn: 0.03, dailyReturn: 0.001, oneYearReturn: 0.04 })
    }))),
    goldEtf: normalized(goldService.evaluate(input({
      instrument: instrument({ symbol: "GLD", assetClass: "gold_etf", instrumentType: "gold_etf", canonicalSector: "Commodities / Gold", canonicalThemes: ["Inflation Hedge"] }),
      fundamentals: null,
      marketMetric: marketMetric({ ytdReturn: 0.11, dailyReturn: 0.003, oneYearReturn: 0.18 })
    }))),
    crypto: normalized(cryptoService.evaluate(input({
      instrument: instrument({ symbol: "BTC", assetClass: "crypto", instrumentType: "crypto", canonicalSector: "Crypto", canonicalThemes: ["Digital Assets", "High Beta"] }),
      fundamentals: null,
      riskMetric: riskMetric({ riskScore: 82, riskBucket: "very_high" }),
      marketMetric: marketMetric({ ytdReturn: 0.32, dailyReturn: 0.025, oneYearReturn: 0.55 })
    })))
  };

  assert.deepEqual(cases, {
    strongStock: {
      overallScore: 77.659879,
      recommendationLabel: "Buy",
      confidenceScore: 88.089123,
      guardrailsApplied: [],
      components: [
        { key: "business_quality", score: 82.65743 },
        { key: "valuation", score: 73.874533 },
        { key: "fundamental_trends", score: 76 },
        { key: "risk_analytics", score: 82 },
        { key: "market_vision_alignment", score: 71 },
        { key: "theme_alignment", score: 70 },
        { key: "momentum", score: 58.4 }
      ]
    },
    weakStock: {
      overallScore: 31.206277,
      recommendationLabel: "Reduce",
      confidenceScore: 66.39849,
      guardrailsApplied: [],
      components: [
        { key: "business_quality", score: 14.42743 },
        { key: "valuation", score: 16.196526 },
        { key: "fundamental_trends", score: 76 },
        { key: "risk_analytics", score: 24 },
        { key: "market_vision_alignment", score: 63 },
        { key: "theme_alignment", score: 55 },
        { key: "momentum", score: 41.2 }
      ]
    },
    financialStock: {
      overallScore: 71.171865,
      recommendationLabel: "Buy",
      confidenceScore: 82.780474,
      guardrailsApplied: [],
      components: [
        { key: "business_quality", score: 72.75 },
        { key: "valuation", score: 77.331324 },
        { key: "fundamental_trends", score: 76 },
        { key: "risk_analytics", score: 65 },
        { key: "market_vision_alignment", score: 55 },
        { key: "theme_alignment", score: 65 },
        { key: "momentum", score: 53.52 }
      ]
    },
    usBroadEtf: {
      overallScore: 58.62,
      recommendationLabel: "Hold",
      confidenceScore: 83.429769,
      guardrailsApplied: [],
      components: [
        { key: "risk_analytics", score: 68 },
        { key: "momentum", score: 55.6 },
        { key: "macro_fit", score: 55 },
        { key: "benchmark_relative", score: 50 },
        { key: "market_vision_alignment", score: 55 },
        { key: "theme_fit", score: 65 }
      ]
    },
    emergingMarketEtf: {
      overallScore: 52.44,
      recommendationLabel: "Hold",
      confidenceScore: 76.474301,
      guardrailsApplied: [],
      components: [
        { key: "risk_analytics", score: 68 },
        { key: "momentum", score: 47.2 },
        { key: "macro_fit", score: 55 },
        { key: "benchmark_relative", score: 25 },
        { key: "market_vision_alignment", score: 55 },
        { key: "theme_fit", score: 65 }
      ]
    },
    bondEtf: {
      overallScore: 58.93,
      recommendationLabel: "Hold",
      confidenceScore: 84.15787,
      guardrailsApplied: [],
      components: [
        { key: "duration_fit", score: 62 },
        { key: "rate_regime", score: 58 },
        { key: "inflation_regime", score: 58 },
        { key: "yield_curve", score: 55 },
        { key: "credit_risk", score: 65 },
        { key: "portfolio_stability", score: 55 },
        { key: "market_vision_alignment", score: 58 }
      ]
    },
    goldEtf: {
      overallScore: 66.3796,
      recommendationLabel: "Buy",
      confidenceScore: 82.499461,
      guardrailsApplied: [],
      components: [
        { key: "inflation_hedge", score: 78 },
        { key: "geopolitical_hedge", score: 55 },
        { key: "rates_context", score: 75 },
        { key: "momentum", score: 54.64 },
        { key: "market_vision_alignment", score: 60 }
      ]
    },
    crypto: {
      overallScore: 43.55,
      recommendationLabel: "Watch",
      confidenceScore: 65.906263,
      guardrailsApplied: [],
      components: [
        { key: "risk", score: 18 },
        { key: "momentum", score: 64.8 },
        { key: "liquidity_regime", score: 58 },
        { key: "macro_risk_appetite", score: 55 },
        { key: "theme_score", score: 60 },
        { key: "market_vision_alignment", score: 66 }
      ]
    }
  });
});
