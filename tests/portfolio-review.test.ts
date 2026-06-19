import test from "node:test";
import assert from "node:assert/strict";
import { PortfolioImprovementSuggestionService } from "../src/application/services/portfolioReview/PortfolioImprovementSuggestionService";
import { PortfolioActionSuggestionService } from "../src/application/services/portfolioReview/PortfolioActionSuggestionService";
import { AllocationReviewService } from "../src/application/services/portfolioReview/AllocationReviewService";
import { ConcentrationReviewService } from "../src/application/services/portfolioReview/ConcentrationReviewService";
import { PortfolioRiskReviewService } from "../src/application/services/portfolioReview/PortfolioRiskReviewService";
import { MacroFitReviewService } from "../src/application/services/portfolioReview/MacroFitReviewService";
import { RecommendationAlignmentReviewService } from "../src/application/services/portfolioReview/RecommendationAlignmentReviewService";
import { portfolioReviewConfidenceScore } from "../src/application/services/portfolioReview/PortfolioReviewService";
import { weightedPortfolioScore } from "../src/application/services/portfolioReview/portfolioReviewScoring";
import type { PortfolioReviewInputContext } from "../src/application/services/portfolioReview/portfolioReviewScoring";
import { PortfolioLookthroughExposureService } from "../src/application/services/etfLookthrough/PortfolioLookthroughExposureService";
import type { EtfExposureRepository } from "../src/application/ports/repositories/EtfExposureRepository";
import type { Instrument } from "../src/domain/universe/types";

function context(overrides: Partial<PortfolioReviewInputContext> = {}): PortfolioReviewInputContext {
  return {
    dashboard: {
      portfolio: { id: "portfolio-1", userId: "user-1", name: "Test", baseCurrency: "USD", isDefault: true },
      cashBalances: [],
      holdings: [
        { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "MSFT", assetName: "Microsoft", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }
      ],
      holdingValuations: [
        { holding: { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "MSFT", assetName: "Microsoft", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }, unitPrice: 100, value: 100, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" }
      ],
      totalCash: 0,
      totalHoldingsCost: 100,
      totalHoldingsMarketValue: 100,
      totalValueEstimate: 100,
      investedAmount: 100,
      unrealizedGainLoss: 0,
      unrealizedGainLossPercent: 0,
      realizedGainLoss: 0,
      allocationByType: [
        { label: "stock", value: 90, percent: 0.9 },
        { label: "bond_etf", value: 0, percent: 0 }
      ],
      allocationBySector: [{ label: "Technology", value: 90, percent: 0.9 }],
      allocationByGeography: [{ label: "US", value: 90, percent: 0.9 }],
      currencyExposure: [{ label: "USD", currency: "USD", value: 100, percent: 1 }],
      topWinners: [],
      topLosers: [],
      performance: [],
      productPerformance: [],
      cashPerformance: [],
      benchmarkComparisons: [],
      cashPercent: 0,
      investedPercent: 1,
      latestPriceDate: "2026-06-01"
    },
    riskReport: {
      concentration: {
        topHoldingConcentration: 0.35,
        topFiveConcentration: 0.75,
        byAssetClass: [],
        bySector: [{ label: "Technology", value: 90, percent: 0.9 }],
        byGeography: [],
        byCurrency: []
      },
      diversification: { score: 42 },
      correlations: { averageCorrelation: 0.5, highCorrelationPairs: [] },
      volatility: { metrics: [{ label: "1Y", value: 0.2, observations: 252 }], trend: [] },
      drawdown: { currentDrawdown: -0.05, maxDrawdown: -0.2, drawdownDurationDays: 12, points: [] },
      riskContributors: [],
      riskContributionMethod: "proxy",
      riskContributionObservationCount: 0
    } as any,
    bondReport: {
      totalBondAllocation: 0,
      longDurationExposure: 0,
      highYieldExposure: 0,
      cashLikeExposure: 0,
      recessionHedgeExposure: 0,
      profileCoverage: 0,
      byDuration: [],
      byCreditQuality: [],
      treasuryExposure: 0,
      corporateExposure: 0
    } as any,
    recommendations: [
      { id: "r1", recommendationRunId: "run-1", instrumentId: "bond-1", symbol: "BND", instrumentType: "Bond ETF", recommendationLabel: "Buy", overallScore: 73, confidenceScore: 80, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r2", recommendationRunId: "run-1", instrumentId: "bond-2", symbol: "HYG", instrumentType: "Bond ETF", recommendationLabel: "Reduce", overallScore: 28, confidenceScore: 80, riskLevel: "high", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" }
    ],
    instruments: [
      { id: "bond-1", symbol: "BND", name: "Vanguard Total Bond Market ETF", assetClass: "bond_etf", instrumentType: "bond_etf", sector: null, industry: null, canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Treasury Bonds"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: "intermediate", treasuryClassification: "aggregate", inflationLinked: false, creditQuality: "mixed", geoExposure: "US", rateSensitivity: "medium", inflationSensitivity: "moderate", recessionSensitivity: "mixed", liquidityRole: "stability", cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true },
      { id: "bond-2", symbol: "HYG", name: "High Yield Bond ETF", assetClass: "bond_etf", instrumentType: "bond_etf", sector: null, industry: null, canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["High Yield Credit"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: "short", treasuryClassification: "corporate", inflationLinked: false, creditQuality: "high yield", geoExposure: "US", rateSensitivity: "low", inflationSensitivity: "low", recessionSensitivity: "negative", liquidityRole: "income", cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true }
    ],
    marketVisionReport: null,
    macroRegime: { id: "macro-1", snapshotDate: "2026-06-01", ratesRegime: "stable", inflationRegime: "elevated", growthRegime: "stable", employmentRegime: "stable", yieldCurveRegime: "normal", liquidityRegime: "normal", dollarRegime: "stable", commoditiesRegime: "firm", overallMacroSummary: "", createdAt: "", updatedAt: "" },
    themeIntelligence: null,
    lookthroughReport: null,
    etfTopHoldings: [],
    ...overrides
  };
}

function instrument(input: Partial<Instrument> & Pick<Instrument, "id" | "symbol" | "name" | "assetClass" | "instrumentType">): Instrument {
  return {
    sector: null,
    industry: null,
    canonicalSector: null,
    canonicalThemes: [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "mapped",
    geography: "US",
    currency: "USD",
    exchange: "NYSE",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
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
    ...input
  };
}

function lookthroughReport(holdingExposures: NonNullable<PortfolioReviewInputContext["lookthroughReport"]>["holdingExposures"], sectorWeight = 0.3): NonNullable<PortfolioReviewInputContext["lookthroughReport"]> {
  return {
    asOfDate: "2026-06-01",
    coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 },
    sectorExposures: [
      { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Technology", exposureWeight: sectorWeight, directWeight: sectorWeight, etfLookthroughWeight: 0, asOfDate: "2026-06-01" }
    ],
    countryExposures: [],
    topHoldingExposures: [],
    holdingExposures,
    currencyExposures: [],
    themeExposures: [],
    diagnostics: []
  };
}

function insightAlignmentContext(input: { holdingCount: number; constructiveCount: number; weakCount: number }) {
  const holdings = Array.from({ length: input.holdingCount }, (_, index) => {
    const symbol = `H${index + 1}`;
    return {
      id: `holding-${index + 1}`,
      portfolioId: "portfolio-1",
      assetId: `asset-${index + 1}`,
      assetType: "stock" as const,
      ticker: symbol,
      assetName: symbol,
      accountName: null,
      brokerName: null,
      quantity: 1,
      averageCost: 100,
      costCurrency: "USD",
      firstPurchaseDate: "2026-01-01",
      notes: null,
      sector: "Technology"
    };
  });
  const recommendationFor = (index: number, recommendationLabel: "Buy" | "Reduce") => ({
    id: `rec-${index + 1}`,
    recommendationRunId: "run-1",
    instrumentId: `instrument-${index + 1}`,
    symbol: `H${index + 1}`,
    instrumentType: "Stock",
    recommendationLabel,
    overallScore: recommendationLabel === "Buy" ? 76 : 32,
    confidenceScore: 80,
    riskLevel: "medium",
    timeHorizon: "medium_term",
    recommendationReasoningSummary: "",
    positiveDrivers: [],
    negativeDrivers: [],
    guardrailsApplied: [],
    dataLimitations: [],
    recommendationChangeTriggers: { upgrade: [], downgrade: [] },
    inputsSnapshot: {},
    scoringBreakdown: {},
    createdAt: "",
    updatedAt: ""
  });
  const recommendations = [
    ...Array.from({ length: input.constructiveCount }, (_, index) => recommendationFor(index, "Buy")),
    ...Array.from({ length: input.weakCount }, (_, index) => recommendationFor(input.constructiveCount + index, "Reduce"))
  ];

  return context({
    dashboard: {
      ...context().dashboard,
      holdings
    },
    recommendations
  });
}

test("portfolio review weights calculate a deterministic overall score", () => {
  const score = weightedPortfolioScore([
    { key: "allocation", label: "Allocation", score: 80, weight: 0.5, reason: "" },
    { key: "risk", label: "Risk", score: 60, weight: 0.5, reason: "" }
  ]);
  assert.equal(score, 70);
});

test("insight alignment score is capped at 94 when weak holdings are present", () => {
  const review = new RecommendationAlignmentReviewService().review(insightAlignmentContext({
    holdingCount: 15,
    constructiveCount: 13,
    weakCount: 2
  }));

  assert.equal(review.score, 94);
  assert.ok(review.findings.some((finding) => finding.title === "Some holdings need review"));
  assert.equal(review.metrics?.weakHeldCount, 2);
});

test("insight alignment score is capped at 94 when coverage is incomplete", () => {
  const review = new RecommendationAlignmentReviewService().review(insightAlignmentContext({
    holdingCount: 20,
    constructiveCount: 13,
    weakCount: 0
  }));

  assert.equal(review.score, 94);
  assert.ok(review.findings.some((finding) => finding.title === "Insights coverage is incomplete"));
  assert.equal(review.metrics?.recommendationCoverage, 0.65);
});

test("insight alignment score can reach 100 without non-info findings", () => {
  const review = new RecommendationAlignmentReviewService().review(insightAlignmentContext({
    holdingCount: 10,
    constructiveCount: 10,
    weakCount: 0
  }));

  assert.equal(review.score, 100);
  assert.equal(review.findings.length, 0);
  assert.equal(review.metrics?.recommendationCoverage, 1);
});

test("allocation review flags equity-heavy and low fixed-income portfolios", () => {
  const review = new AllocationReviewService().review(context());
  assert.ok(review.findings.some((finding) => finding.title === "Equity-heavy allocation"));
  assert.ok(review.findings.some((finding) => finding.title === "Limited fixed-income ballast"));
});

test("allocation and macro reviews do not treat bond and gold ETFs as equity ETFs", () => {
  const reviewContext = context({
    dashboard: {
      ...context().dashboard,
      allocationByType: [
        { label: "bond_etf", value: 60, percent: 0.6 },
        { label: "gold_etf", value: 30, percent: 0.3 },
        { label: "stock", value: 10, percent: 0.1 }
      ],
      cashPercent: 0
    },
    macroRegime: {
      id: "macro-1",
      snapshotDate: "2026-06-01",
      ratesRegime: "restrictive",
      inflationRegime: "stable",
      growthRegime: "stable",
      employmentRegime: "stable",
      yieldCurveRegime: "normal",
      liquidityRegime: "normal",
      dollarRegime: "stable",
      commoditiesRegime: "stable",
      overallMacroSummary: "",
      createdAt: "",
      updatedAt: ""
    }
  });
  const allocationReview = new AllocationReviewService().review(reviewContext);
  const macroReview = new MacroFitReviewService().review(reviewContext);

  assert.equal(allocationReview.metrics.equityAllocation, 0.1);
  assert.ok(!allocationReview.findings.some((finding) => finding.title === "Equity-heavy allocation"));
  assert.ok(!macroReview.findings.some((finding) => finding.title === "Equity exposure in restrictive rates"));
});

test("concentration review surfaces named direct and indirect top holdings", () => {
  const review = new ConcentrationReviewService().review(context({
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 0.5, fallbackWeight: 0 },
      sectorExposures: [],
      countryExposures: [],
      currencyExposures: [],
      themeExposures: [],
      topHoldingExposures: [
        { portfolioId: "portfolio-1", exposureType: "top_holding", exposureName: "MSFT", exposureWeight: 0.42, directWeight: 0.35, etfLookthroughWeight: 0.07, asOfDate: "2026-06-01" }
      ],
      holdingExposures: [
        { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "VOO", holdingName: "Vanguard S&P 500 ETF", directWeight: 0.35, indirectWeight: 0, totalWeight: 0.35, sourceEtfs: [], inputsSnapshot: {} },
        { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "MSFT", holdingName: "Microsoft", directWeight: 0.35, indirectWeight: 0.07, totalWeight: 0.42, sourceEtfs: [{ symbol: "VOO", weight: 0.07 }], inputsSnapshot: {} }
      ],
      diagnostics: []
    }
  }));
  const largestDirect = review.metrics.largestDirectHolding as { holdingSymbol?: string; totalWeight?: number };
  const largestIndirect = review.metrics.largestIndirectHolding as { holdingSymbol?: string; indirectWeight?: number };
  assert.equal(largestDirect.holdingSymbol, "VOO");
  assert.equal(largestIndirect.holdingSymbol, "MSFT");
  assert.ok(Number(largestIndirect.indirectWeight) > 0);
});

test("concentration review measures top holding at issuer level when ETF wrapper is largest direct position", () => {
  const review = new ConcentrationReviewService().review(context({
    lookthroughReport: lookthroughReport([
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "VOO", holdingName: "Vanguard S&P 500 ETF", directWeight: 0.3, indirectWeight: 0, totalWeight: 0.3, sourceEtfs: [], inputsSnapshot: { instrumentAssetClass: "etf", exposureRole: "direct_position" } },
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "NVDA", holdingName: "NVIDIA", directWeight: 0, indirectWeight: 0.07, totalWeight: 0.07, sourceEtfs: [{ symbol: "VOO", weight: 0.07 }], inputsSnapshot: { instrumentAssetClass: "stock", exposureRole: "underlying_security" } }
    ])
  }));
  const largestDirect = review.metrics.largestDirectHolding as { holdingSymbol?: string; totalWeight?: number };

  assert.equal(Math.round(Number(review.metrics.topHoldingConcentration) * 100), 7);
  assert.equal(largestDirect.holdingSymbol, "VOO");
  assert.equal(review.findings.some((finding) => finding.title === "Single-company concentration"), false);
  assert.ok(review.score >= 89);
});

test("concentration review emits watch when a single issuer exceeds 10 percent", () => {
  const review = new ConcentrationReviewService().review(context({
    lookthroughReport: lookthroughReport([
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "NVDA", holdingName: "NVIDIA", directWeight: 0, indirectWeight: 0.12, totalWeight: 0.12, sourceEtfs: [{ symbol: "VOO", weight: 0.12 }], inputsSnapshot: { instrumentAssetClass: "stock", exposureRole: "underlying_security" } }
    ])
  }));
  const finding = review.findings.find((item) => item.title === "Single-company concentration");

  assert.equal(finding?.severity, "watch");
  assert.match(finding?.detail ?? "", /exceeds 10%/);
});

test("concentration review emits attention when a single issuer exceeds 20 percent", () => {
  const review = new ConcentrationReviewService().review(context({
    lookthroughReport: lookthroughReport([
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "NVDA", holdingName: "NVIDIA", directWeight: 0, indirectWeight: 0.22, totalWeight: 0.22, sourceEtfs: [{ symbol: "VOO", weight: 0.22 }], inputsSnapshot: { instrumentAssetClass: "stock", exposureRole: "underlying_security" } }
    ])
  }));
  const finding = review.findings.find((item) => item.title === "Single-company concentration");

  assert.equal(finding?.severity, "attention");
  assert.match(finding?.detail ?? "", /exceeds 20%/);
});

test("concentration review includes direct single-stock exposure in issuer top holding", () => {
  const review = new ConcentrationReviewService().review(context({
    lookthroughReport: lookthroughReport([
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "MSFT", holdingName: "Microsoft", directWeight: 0.3, indirectWeight: 0, totalWeight: 0.3, sourceEtfs: [], inputsSnapshot: { instrumentAssetClass: "stock", exposureRole: "direct_position" } }
    ])
  }));
  const finding = review.findings.find((item) => item.title === "Single-company concentration");

  assert.equal(Number(review.metrics.topHoldingConcentration), 0.3);
  assert.equal(finding?.severity, "attention");
});

test("concentration review falls back to direct concentration when look-through has no issuer rows", () => {
  const review = new ConcentrationReviewService().review(context({
    riskReport: {
      ...context().riskReport,
      concentration: { ...context().riskReport.concentration, topHoldingConcentration: 0.3, topFiveConcentration: 0.4 }
    } as any,
    lookthroughReport: lookthroughReport([])
  }));
  const finding = review.findings.find((item) => item.title === "Single-company concentration");

  assert.equal(Number(review.metrics.topHoldingConcentration), 0.3);
  assert.equal(finding?.severity, "attention");
});

test("portfolio review data coverage falls when ETF top-holding look-through is missing", () => {
  const fullCoverage = portfolioReviewConfidenceScore(context({
    riskReport: { ...context().riskReport, riskContributionObservationCount: 60 } as any,
    marketVisionReport: { id: "mv-1", reportDate: "2026-06-01" } as any,
    themeIntelligence: { topThemesThisWeek: [{ theme: "AI" }] } as any,
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 2, etfsWithSectorExposure: 2, etfsWithCountryExposure: 2, etfsWithTopHoldings: 2, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [],
      countryExposures: [],
      currencyExposures: [],
      themeExposures: [],
      topHoldingExposures: [],
      holdingExposures: [],
      diagnostics: []
    }
  }));
  const missingTopHoldings = portfolioReviewConfidenceScore(context({
    riskReport: { ...context().riskReport, riskContributionObservationCount: 60 } as any,
    marketVisionReport: { id: "mv-1", reportDate: "2026-06-01" } as any,
    themeIntelligence: { topThemesThisWeek: [{ theme: "AI" }] } as any,
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 2, etfsWithSectorExposure: 2, etfsWithCountryExposure: 2, etfsWithTopHoldings: 0, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [],
      countryExposures: [],
      currencyExposures: [],
      themeExposures: [],
      topHoldingExposures: [],
      holdingExposures: [],
      diagnostics: []
    }
  }));

  assert.equal(fullCoverage, 100);
  assert.ok(missingTopHoldings < fullCoverage);
});

test("improvement suggestions only include approved non-reduce candidates", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context());
  const candidates = suggestions.flatMap((suggestion) => suggestion.candidateInstruments);
  assert.ok(candidates.some((candidate) => candidate.symbol === "BND"));
  assert.ok(!candidates.some((candidate) => candidate.symbol === "HYG"));
  const fixedIncomeSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_fixed_income");
  assert.match(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BND")?.primaryReason ?? "", /provides exposure to fixed income where bond allocation is 0\.0%/);
});

test("improvement suggestions map concentration issues to diversifying candidates", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationBySector: [
        { label: "Technology", value: 30.58, percent: 0.3058 },
        { label: "Healthcare", value: 5.87, percent: 0.0587 }
      ],
      allocationByGeography: [
        { label: "United States", value: 72.93, percent: 0.7293 },
        { label: "International", value: 27.07, percent: 0.2707 }
      ],
      allocationByType: [
        { label: "stock", value: 90, percent: 0.9 },
        { label: "bond_etf", value: 0, percent: 0 },
        { label: "gold_etf", value: 0, percent: 0 }
      ]
    },
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 2, etfsWithSectorExposure: 2, etfsWithCountryExposure: 2, etfsWithTopHoldings: 2, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Technology", exposureWeight: 0.3058, directWeight: 0.2, etfLookthroughWeight: 0.1058, asOfDate: "2026-06-01" },
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Healthcare", exposureWeight: 0.0587, directWeight: 0, etfLookthroughWeight: 0.0587, asOfDate: "2026-06-01" }
      ],
      countryExposures: [
        { portfolioId: "portfolio-1", exposureType: "country", exposureName: "United States", exposureWeight: 0.7293, directWeight: 0.6, etfLookthroughWeight: 0.1293, asOfDate: "2026-06-01" },
        { portfolioId: "portfolio-1", exposureType: "country", exposureName: "International", exposureWeight: 0.2707, directWeight: 0, etfLookthroughWeight: 0.2707, asOfDate: "2026-06-01" }
      ],
      topHoldingExposures: [],
      holdingExposures: [],
      currencyExposures: [],
      themeExposures: [],
      diagnostics: []
    },
    instruments: [
      instrument({ id: "xlk", symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Technology", canonicalThemes: ["Cloud / Software"] }),
      instrument({ id: "vgt", symbol: "VGT", name: "Vanguard Information Technology ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Technology", canonicalThemes: ["Cloud / Software"] }),
      instrument({ id: "vxus", symbol: "VXUS", name: "Vanguard Total International Stock ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], geography: "International", geoExposure: "International" }),
      instrument({ id: "xlv", symbol: "XLV", name: "Health Care Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Healthcare", canonicalThemes: ["Healthcare Innovation", "Quality"] }),
      instrument({ id: "xlu", symbol: "XLU", name: "Utilities Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Utilities", canonicalThemes: ["Defensive"] }),
      instrument({ id: "xlp", symbol: "XLP", name: "Consumer Staples Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Consumer Staples", canonicalThemes: ["Defensive Consumer"] }),
      instrument({ id: "bndx", symbol: "BNDX", name: "Vanguard Total International Bond ETF", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Global Diversification", "Interest Rate Sensitive"], geography: "Global", geoExposure: "Global" }),
      instrument({ id: "bnd", symbol: "BND", name: "Vanguard Total Bond Market ETF", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Treasury Bonds"] }),
      instrument({ id: "gld", symbol: "GLD", name: "SPDR Gold Shares", assetClass: "gold_etf", instrumentType: "etf", canonicalSector: "Commodities / Gold", canonicalThemes: ["Inflation Hedge"] })
    ],
    recommendations: [
      { id: "r-xlk", recommendationRunId: "run-1", instrumentId: "xlk", symbol: "XLK", instrumentType: "ETF", recommendationLabel: "Buy", overallScore: 80, confidenceScore: 80, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-vgt", recommendationRunId: "run-1", instrumentId: "vgt", symbol: "VGT", instrumentType: "ETF", recommendationLabel: "Buy", overallScore: 80, confidenceScore: 80, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-vxus", recommendationRunId: "run-1", instrumentId: "vxus", symbol: "VXUS", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 62, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-xlv", recommendationRunId: "run-1", instrumentId: "xlv", symbol: "XLV", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 61, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-xlu", recommendationRunId: "run-1", instrumentId: "xlu", symbol: "XLU", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 61, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-xlp", recommendationRunId: "run-1", instrumentId: "xlp", symbol: "XLP", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 61, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-bndx", recommendationRunId: "run-1", instrumentId: "bndx", symbol: "BNDX", instrumentType: "Bond ETF", recommendationLabel: "Hold", overallScore: 60, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-bnd", recommendationRunId: "run-1", instrumentId: "bnd", symbol: "BND", instrumentType: "Bond ETF", recommendationLabel: "Hold", overallScore: 60, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-gld", recommendationRunId: "run-1", instrumentId: "gld", symbol: "GLD", instrumentType: "Gold ETF", recommendationLabel: "Hold", overallScore: 60, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" }
    ]
  }));

  const sectorSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "sector_concentration");
  const internationalSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_international_exposure");
  const defensiveSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_defensive_exposure");
  const fixedIncomeSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_fixed_income");
  const inflationHedgeSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_inflation_hedge");

  assert.equal(sectorSuggestion, undefined);
  assert.ok(internationalSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "VXUS"));
  assert.ok(defensiveSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "XLV"));
  assert.ok(defensiveSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "XLU"));
  assert.ok(defensiveSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "XLP"));
  assert.ok(fixedIncomeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "BND"));
  assert.ok(fixedIncomeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "BNDX"));
  assert.ok(inflationHedgeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "GLD"));
  assert.ok(internationalSuggestion?.candidateInstruments.every((candidate) => typeof candidate.relevanceScore === "number" && typeof candidate.diversificationBenefitScore === "number"));
  assert.match(internationalSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "VXUS")?.whyThisCandidate ?? "", /US look-through exposure is 72\.9%/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLV")?.whyThisCandidate ?? "", /Technology at 30\.6%/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLV")?.secondaryBenefit ?? "", /pharma, services, devices and care delivery/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLU")?.secondaryBenefit ?? "", /regulated demand/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLP")?.secondaryBenefit ?? "", /essential-consumption businesses/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLP")?.expectedPortfolioBenefit ?? "", /essential-consumption businesses/);
  assert.equal(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BNDX")?.diversificationType, "International fixed income");
  assert.match(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BNDX")?.secondaryBenefit ?? "", /rate, currency and issuer exposure/);
  assert.match(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BNDX")?.potentialTradeOff ?? "", /currency and non-US rate-cycle exposure/);
  assert.ok((defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLV")?.diversificationBenefitScore ?? 0) > 60);
  assert.ok(defensiveSuggestion?.candidateInstruments.every((candidate) => typeof candidate.issueFitScore === "number" && typeof candidate.overlapPenalty === "number"));
  assert.ok(new Set(defensiveSuggestion?.candidateInstruments.map((candidate) => candidate.diversificationBenefitScore)).size > 1);
});

test("improvement suggestions do not emit duplicate legacy gap categories", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationBySector: [
        { label: "Technology", value: 40, percent: 0.4 },
        { label: "Healthcare", value: 5, percent: 0.05 }
      ],
      allocationByGeography: [
        { label: "United States", value: 75, percent: 0.75 },
        { label: "International", value: 25, percent: 0.25 }
      ]
    },
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Technology", exposureWeight: 0.4, directWeight: 0.4, etfLookthroughWeight: 0, asOfDate: "2026-06-01" },
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Healthcare", exposureWeight: 0.05, directWeight: 0.05, etfLookthroughWeight: 0, asOfDate: "2026-06-01" }
      ],
      countryExposures: [
        { portfolioId: "portfolio-1", exposureType: "country", exposureName: "United States", exposureWeight: 0.75, directWeight: 0.75, etfLookthroughWeight: 0, asOfDate: "2026-06-01" }
      ],
      topHoldingExposures: [],
      holdingExposures: [],
      currencyExposures: [],
      themeExposures: [],
      diagnostics: []
    }
  }));

  assert.equal(suggestions.filter((suggestion) => suggestion.issueCategory === "sector_concentration").length, 0);
  assert.equal(suggestions.filter((suggestion) => suggestion.issueCategory === "insufficient_international_exposure").length, 1);
  assert.equal(suggestions.filter((suggestion) => suggestion.issueCategory === "insufficient_defensive_exposure").length, 1);
  assert.equal(suggestions.filter((suggestion) => suggestion.issueCategory === "concentration_risk").length, 0);
});

test("improvement suggestions emit crypto ballast observation above threshold only", () => {
  const aboveThreshold = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationByType: [
        { label: "stock", value: 94, percent: 0.94 },
        { label: "crypto_etf", value: 6, percent: 0.06 },
        { label: "bond_etf", value: 0, percent: 0 }
      ]
    }
  }));
  const atThreshold = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationByType: [
        { label: "stock", value: 95, percent: 0.95 },
        { label: "crypto_etf", value: 5, percent: 0.05 },
        { label: "bond_etf", value: 0, percent: 0 }
      ]
    }
  }));
  const cryptoSuggestion = aboveThreshold.find((suggestion) => suggestion.issueCategory === "excessive_crypto_risk");
  const bondCandidate = cryptoSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BND");

  assert.ok(cryptoSuggestion);
  assert.match(bondCandidate?.primaryReason ?? "", /Ballast/);
  assert.match(bondCandidate?.primaryReason ?? "", /crypto/);
  assert.match(cryptoSuggestion.rationale, /Analytical observation only - not a position sizing recommendation\./);
  assert.equal(atThreshold.some((suggestion) => suggestion.issueCategory === "excessive_crypto_risk"), false);
});

test("improvement suggestions emit single-name look-through concentration only above threshold", () => {
  const report = (weight: number) => ({
    asOfDate: "2026-06-01",
    coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 },
    sectorExposures: [],
    countryExposures: [],
    topHoldingExposures: [],
    holdingExposures: [
      { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "MSFT", holdingName: "Microsoft", directWeight: 0.02, indirectWeight: weight - 0.02, totalWeight: weight, sourceEtfs: [{ symbol: "VOO", weight }], inputsSnapshot: {} }
    ],
    currencyExposures: [],
    themeExposures: [],
    diagnostics: []
  });
  const aboveThreshold = new PortfolioImprovementSuggestionService().build(context({ lookthroughReport: report(0.11) }));
  const atThreshold = new PortfolioImprovementSuggestionService().build(context({ lookthroughReport: report(0.10) }));
  const concentrationSuggestion = aboveThreshold.find((suggestion) => suggestion.issueCategory === "concentration_risk");

  assert.ok(concentrationSuggestion);
  assert.equal(concentrationSuggestion.category, "concentration");
  assert.match(concentrationSuggestion.rationale, /MSFT represents 11\.0%/);
  assert.match(concentrationSuggestion.rationale, /Analytical observation only - not a position sizing recommendation\./);
  assert.equal(atThreshold.some((suggestion) => suggestion.issueCategory === "concentration_risk"), false);
});

test("improvement suggestions emit macro vulnerability only in slowing growth with limited hedges", () => {
  const slowing = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationByType: [
        { label: "equity_etf", value: 85, percent: 0.85 },
        { label: "bond_etf", value: 10, percent: 0.10 },
        { label: "gold_etf", value: 2, percent: 0.02 }
      ]
    },
    macroRegime: { ...context().macroRegime!, growthRegime: "slowdown" }
  }));
  const expanding = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationByType: [
        { label: "equity_etf", value: 85, percent: 0.85 },
        { label: "bond_etf", value: 10, percent: 0.10 },
        { label: "gold_etf", value: 2, percent: 0.02 }
      ]
    },
    macroRegime: { ...context().macroRegime!, growthRegime: "expansion" }
  }));
  const macroSuggestion = slowing.find((suggestion) => suggestion.issueCategory === "macro_vulnerability");

  assert.ok(macroSuggestion);
  assert.match(macroSuggestion.rationale, /FRED-derived growth regime is slowdown/);
  assert.match(macroSuggestion.rationale, /Analytical observation only - not a position sizing recommendation\./);
  assert.equal(expanding.some((suggestion) => suggestion.issueCategory === "macro_vulnerability"), false);
});

test("concentration risk candidates use diversified funds and exclude stocks", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context({
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [],
      countryExposures: [],
      topHoldingExposures: [],
      holdingExposures: [
        { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "MSFT", holdingName: "Microsoft", directWeight: 0.02, indirectWeight: 0.10, totalWeight: 0.12, sourceEtfs: [{ symbol: "VOO", weight: 0.10 }], inputsSnapshot: {} }
      ],
      currencyExposures: [],
      themeExposures: [],
      diagnostics: []
    },
    instruments: [
      instrument({ id: "vxus", symbol: "VXUS", name: "Vanguard Total International Stock ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], geography: "International", geoExposure: "International" }),
      instrument({ id: "vea", symbol: "VEA", name: "Vanguard Developed Markets ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], geography: "International", geoExposure: "International" }),
      instrument({ id: "bnd", symbol: "BND", name: "Vanguard Total Bond Market ETF", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Treasury Bonds"] }),
      instrument({ id: "gld", symbol: "GLD", name: "SPDR Gold Shares", assetClass: "gold_etf", instrumentType: "etf", canonicalSector: "Commodities / Gold", canonicalThemes: ["Inflation Hedge"] }),
      instrument({ id: "msft", symbol: "MSFT", name: "Microsoft", assetClass: "stock", instrumentType: "stock", canonicalSector: "Technology", canonicalThemes: ["Cloud / Software"] })
    ],
    recommendations: []
  }));
  const concentrationSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "concentration_risk");
  const candidateSymbols = concentrationSuggestion?.candidateInstruments.map((candidate) => candidate.symbol) ?? [];
  const bondCandidate = concentrationSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BND");
  const diversifierCandidate = concentrationSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "VXUS");

  assert.ok(concentrationSuggestion);
  assert.ok(concentrationSuggestion.candidateInstruments.length > 0);
  assert.ok(concentrationSuggestion.candidateInstruments.every((candidate) => candidate.assetClass !== "stock"));
  assert.ok(candidateSymbols.every((symbol) => ["VXUS", "VEA", "BND", "GLD"].includes(symbol)));
  assert.ok(!candidateSymbols.includes("MSFT"));
  assert.doesNotMatch(bondCandidate?.primaryReason ?? "", /fixed income where bond allocation is/);
  assert.match(bondCandidate?.primaryReason ?? "", /lower-correlation|concentration/);
  assert.match(diversifierCandidate?.primaryReason ?? "", /concentrated single-name look-through exposure/);
});

test("improvement suggestions calculate ETF top-company overlap for candidates", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context({
    dashboard: {
      ...context().dashboard,
      allocationBySector: [
        { label: "Technology", value: 30.58, percent: 0.3058 },
        { label: "Healthcare", value: 5.4, percent: 0.054 }
      ],
      allocationByGeography: [
        { label: "United States", value: 90, percent: 0.9 },
        { label: "International", value: 10, percent: 0.1 }
      ]
    },
    lookthroughReport: {
      asOfDate: "2026-06-01",
      coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 },
      sectorExposures: [
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Technology", exposureWeight: 0.3058, directWeight: 0.2, etfLookthroughWeight: 0.1058, asOfDate: "2026-06-01" },
        { portfolioId: "portfolio-1", exposureType: "sector", exposureName: "Healthcare", exposureWeight: 0.054, directWeight: 0, etfLookthroughWeight: 0.054, asOfDate: "2026-06-01" }
      ],
      countryExposures: [
        { portfolioId: "portfolio-1", exposureType: "country", exposureName: "United States", exposureWeight: 0.9, directWeight: 0.6, etfLookthroughWeight: 0.3, asOfDate: "2026-06-01" }
      ],
      topHoldingExposures: [],
      holdingExposures: [
        { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "JNJ", holdingName: "Johnson & Johnson", directWeight: 0, indirectWeight: 0.04, totalWeight: 0.04, sourceEtfs: [{ symbol: "VOO", weight: 0.04 }], inputsSnapshot: {} },
        { portfolioId: "portfolio-1", asOfDate: "2026-06-01", holdingSymbol: "UNH", holdingName: "UnitedHealth", directWeight: 0, indirectWeight: 0.03, totalWeight: 0.03, sourceEtfs: [{ symbol: "VOO", weight: 0.03 }], inputsSnapshot: {} }
      ],
      currencyExposures: [],
      themeExposures: [],
      diagnostics: []
    },
    instruments: [
      instrument({ id: "vht", symbol: "VHT", name: "Vanguard Health Care ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Healthcare", canonicalThemes: ["Quality"] })
    ],
    recommendations: [
      { id: "r-vht", recommendationRunId: "run-1", instrumentId: "vht", symbol: "VHT", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 62, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" }
    ],
    etfTopHoldings: [
      { etfInstrumentId: "vht", etfSymbol: "VHT", holdingSymbol: "JNJ", holdingName: "Johnson & Johnson", holdingWeight: 0.2, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} },
      { etfInstrumentId: "vht", etfSymbol: "VHT", holdingSymbol: "UNH", holdingName: "UnitedHealth", holdingWeight: 0.16, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} },
      { etfInstrumentId: "vht", etfSymbol: "VHT", holdingSymbol: "ABT", holdingName: "Abbott", holdingWeight: 0.05, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ]
  }));
  const defensiveSuggestion = suggestions.find((suggestion) => suggestion.issueCategory === "insufficient_defensive_exposure");
  const candidate = defensiveSuggestion?.candidateInstruments.find((item) => item.symbol === "VHT");

  assert.ok(candidate);
  assert.equal(candidate.sharedCompanyCount, 2);
  assert.equal(candidate.sharedCompanyWeight, 0.36);
  assert.deepEqual(candidate.topSharedSymbols, ["JNJ", "UNH"]);
  assert.ok((candidate.overlapPenalty ?? 0) >= 20);
  assert.match(candidate.overlapWarning ?? "", /top company holding overlap via ETF look-through/);
});

test("portfolio look-through combines direct stock and ETF underlying exposures", async () => {
  const stored: unknown[] = [];
  const storedHoldings: unknown[] = [];
  const repository = {
    listLatestSectorExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", sector: "Technology", exposureWeight: 0.2, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} },
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", sector: "Information Technology", exposureWeight: 0.15, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} },
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", sector: "Health Care", exposureWeight: 0.15, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listLatestCountryExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", country: "United States", exposureWeight: 1, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listLatestTopHoldings: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", holdingSymbol: "MSFT US", holdingName: "Microsoft", holdingSecurityId: "security-msft", mappingStatus: "mapped", mappingConfidenceScore: 95, holdingWeight: 0.07, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listIssuerLinksForSecurityIds: async () => [
      { securityId: "security-msft", issuerId: "issuer-msft", issuerName: "Microsoft", normalizedIssuerName: "Microsoft", shareClass: null, linkSource: "normalized_security_name", confidenceScore: 95 }
    ],
    listLatestThemeExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", theme: "Quality", exposureWeight: 0.4, confidenceScore: 72, derivationMethod: "test", asOfDate: "2026-06-01" }
    ],
    upsertPortfolioLookthroughExposures: async (input: unknown[]) => { stored.push(...input); },
    upsertPortfolioLookthroughHoldings: async (input: unknown[]) => { storedHoldings.push(...input); },
    getLatestExposureDateForEtf: async () => null,
    upsertSectorExposures: async () => undefined,
    upsertCountryExposures: async () => undefined,
    upsertTopHoldings: async () => undefined,
    upsertThemeExposures: async () => undefined,
    listPortfolioLookthroughExposures: async () => [],
    listPortfolioLookthroughHoldings: async () => [],
    insertRefreshLog: async () => undefined,
    listRefreshLogs: async () => []
  } as Partial<EtfExposureRepository> as EtfExposureRepository;
  const dashboard = context({
    dashboard: {
      ...context().dashboard,
      holdings: [
        { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "MSFT", assetName: "Microsoft", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" },
        { id: "h2", portfolioId: "portfolio-1", assetId: "a2", assetType: "etf", ticker: "VOO", assetName: "Vanguard S&P 500 ETF", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Multi-Asset / Broad Market" }
      ],
      holdingValuations: [
        { holding: { id: "h2", portfolioId: "portfolio-1", assetId: "a2", assetType: "etf", ticker: "VOO", assetName: "Vanguard S&P 500 ETF", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Multi-Asset / Broad Market" }, unitPrice: 50, value: 50, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" },
        { holding: { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "MSFT", assetName: "Microsoft", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }, unitPrice: 50, value: 50, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" }
      ],
      totalValueEstimate: 100
    },
    instruments: [
      ...context().instruments,
      { id: "stock-1", securityId: "security-msft", symbol: "MSFT", name: "Microsoft", assetClass: "stock", instrumentType: "stock", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NASDAQ", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true },
      { id: "etf-1", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", instrumentType: "etf", sector: null, industry: null, canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true }
    ]
  }).dashboard;
  const service = new PortfolioLookthroughExposureService(repository);
  const report = await service.calculateAndStore("portfolio-1", dashboard, context().instruments.concat([
    { id: "stock-1", securityId: "security-msft", symbol: "MSFT", name: "Microsoft", assetClass: "stock", instrumentType: "stock", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NASDAQ", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true },
    { id: "internal-msft", securityId: "security-msft", symbol: "MSFT", name: "Microsoft ETF underlying", assetClass: "other", instrumentType: "underlying_security", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: null, watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "security_master", isUserSelectable: false, isInternalOnly: true, isActive: true },
    { id: "etf-1", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", instrumentType: "etf", sector: null, industry: null, canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true }
  ]));

  const technology = report.sectorExposures.find((item) => item.exposureName === "Technology");
  const healthcare = report.sectorExposures.find((item) => item.exposureName === "Healthcare");
  const informationTechnology = report.sectorExposures.find((item) => item.exposureName === "Information Technology");
  const healthCare = report.sectorExposures.find((item) => item.exposureName === "Health Care");
  const aiSector = report.sectorExposures.find((item) => item.exposureName === "AI");
  const unitedStates = report.countryExposures.find((item) => item.exposureName === "United States");
  const duplicateUs = report.countryExposures.find((item) => item.exposureName === "US");
  const msft = report.topHoldingExposures.find((item) => item.exposureName === "Microsoft");
  const msftHolding = report.holdingExposures.find((item) =>
    item.holdingIssuerId === "issuer-msft" ||
    ((item.inputsSnapshot.rawSymbols as string[] | undefined) ?? []).includes("MSFT")
  );
  const vooHolding = report.holdingExposures.find((item) => item.holdingSymbol === "VOO");
  assert.ok(technology);
  assert.ok(Math.abs(technology.exposureWeight - 0.85) < 0.000001);
  assert.ok(healthcare);
  assert.ok(Math.abs(healthcare.exposureWeight - 0.15) < 0.000001);
  assert.equal(informationTechnology, undefined);
  assert.equal(healthCare, undefined);
  assert.equal(aiSector, undefined);
  assert.ok(unitedStates);
  assert.equal(duplicateUs, undefined);
  assert.ok(Math.abs(unitedStates.exposureWeight - 1) < 0.000001);
  assert.ok(msft);
  assert.ok(Math.abs(msft.exposureWeight - 0.535) < 0.000001);
  assert.equal(msft.exposureSecurityId, null);
  assert.equal(msft.exposureIssuerId, "issuer-msft");
  assert.ok(msftHolding);
  assert.ok(Math.abs(msftHolding.directWeight - 0.5) < 0.000001);
  assert.ok(Math.abs(msftHolding.indirectWeight - 0.035) < 0.000001);
  assert.equal(msftHolding.holdingSecurityId, null);
  assert.equal(msftHolding.holdingIssuerId, "issuer-msft");
  assert.equal(msftHolding.inputsSnapshot.instrumentAssetClass, "stock");
  assert.deepEqual((msftHolding.inputsSnapshot.rawSymbols as string[]), ["MSFT", "MSFT US"]);
  assert.deepEqual((msftHolding.inputsSnapshot.securityBreakdown as Array<{ symbol: string }>).map((item) => item.symbol), ["MSFT"]);
  assert.deepEqual(msftHolding.sourceEtfs.map((item) => item.symbol), ["VOO"]);
  assert.ok(vooHolding);
  assert.equal(vooHolding.indirectWeight, 0);
  assert.ok(stored.length > 0);
  assert.ok(storedHoldings.length > 0);
});

test("potential actions do not include exact trade amounts or position sizes", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context());
  const actions = new PortfolioActionSuggestionService().build(suggestions);
  const text = JSON.stringify(actions);
  assert.doesNotMatch(text, /\$\d/);
  assert.doesNotMatch(text, /\b\d+\s+shares\b/i);
  assert.doesNotMatch(text, /\b(buy|sell)\s+\d/i);
});

test("portfolio look-through labels direct stock holdings from holding asset type when matched instrument is internal", async () => {
  const repository = {
    listLatestSectorExposures: async () => [],
    listLatestCountryExposures: async () => [],
    listLatestTopHoldings: async () => [],
    listLatestThemeExposures: async () => [],
    listIssuerLinksForSecurityIds: async () => [],
    upsertPortfolioLookthroughExposures: async () => undefined,
    upsertPortfolioLookthroughHoldings: async () => undefined,
    getLatestExposureDateForEtf: async () => null,
    upsertSectorExposures: async () => undefined,
    upsertCountryExposures: async () => undefined,
    upsertTopHoldings: async () => undefined,
    upsertThemeExposures: async () => undefined,
    listPortfolioLookthroughExposures: async () => [],
    listPortfolioLookthroughHoldings: async () => [],
    insertRefreshLog: async () => undefined,
    listRefreshLogs: async () => []
  } as Partial<EtfExposureRepository> as EtfExposureRepository;
  const dashboard = context({
    dashboard: {
      ...context().dashboard,
      holdings: [
        { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "NVDA", assetName: "NVIDIA", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }
      ],
      holdingValuations: [
        { holding: { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "NVDA", assetName: "NVIDIA", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }, unitPrice: 100, value: 100, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" }
      ],
      totalValueEstimate: 100
    }
  }).dashboard;
  const service = new PortfolioLookthroughExposureService(repository);
  const report = await service.calculateAndStore("portfolio-1", dashboard, [
    { id: "internal-nvda", securityId: "security-nvda", symbol: "NVDA", name: "NVIDIA ETF underlying", assetClass: "other", instrumentType: "underlying_security", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: null, watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "security_master", isUserSelectable: false, isInternalOnly: true, isActive: true }
  ]);
  const nvdaHolding = report.holdingExposures.find((item) => item.holdingSymbol === "NVDA");

  assert.ok(nvdaHolding);
  assert.equal(nvdaHolding.inputsSnapshot.instrumentAssetClass, "stock");
});

test("risk review normalizes percent-style drawdowns before scoring", () => {
  const review = new PortfolioRiskReviewService().review(context({
    riskReport: {
      ...context().riskReport,
      volatility: { metrics: [{ label: "1Y", value: 951, observations: 252 }], trend: [] },
      drawdown: { currentDrawdown: -18.59, maxDrawdown: -37.56, drawdownDurationDays: 12, points: [] }
    } as any
  }));

  assert.ok(review.score > 0);
  assert.ok(Math.abs(Number(review.metrics.annualizedVolatility) - 0.0951) < 0.000001);
  assert.ok(Math.abs(Number(review.metrics.currentDrawdown) - -0.1859) < 0.000001);
  assert.ok(Math.abs(Number(review.metrics.maxDrawdown) - -0.3756) < 0.000001);
});
