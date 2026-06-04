import test from "node:test";
import assert from "node:assert/strict";
import { PortfolioImprovementSuggestionService } from "../src/application/services/portfolioReview/PortfolioImprovementSuggestionService";
import { PortfolioActionSuggestionService } from "../src/application/services/portfolioReview/PortfolioActionSuggestionService";
import { AllocationReviewService } from "../src/application/services/portfolioReview/AllocationReviewService";
import { PortfolioRiskReviewService } from "../src/application/services/portfolioReview/PortfolioRiskReviewService";
import { weightedPortfolioScore } from "../src/application/services/portfolioReview/portfolioReviewScoring";
import type { PortfolioReviewInputContext } from "../src/application/services/portfolioReview/portfolioReviewScoring";
import { PortfolioLookthroughExposureService } from "../src/application/services/etfLookthrough/PortfolioLookthroughExposureService";
import type { EtfExposureRepository } from "../src/application/ports/repositories/EtfExposureRepository";

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
    ...overrides
  };
}

test("portfolio review weights calculate a deterministic overall score", () => {
  const score = weightedPortfolioScore([
    { key: "allocation", label: "Allocation", score: 80, weight: 0.5, reason: "" },
    { key: "risk", label: "Risk", score: 60, weight: 0.5, reason: "" }
  ]);
  assert.equal(score, 70);
});

test("allocation review flags equity-heavy and low fixed-income portfolios", () => {
  const review = new AllocationReviewService().review(context());
  assert.ok(review.findings.some((finding) => finding.title === "Equity-heavy allocation"));
  assert.ok(review.findings.some((finding) => finding.title === "Limited fixed-income ballast"));
});

test("improvement suggestions only include approved non-reduce candidates", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context());
  const candidates = suggestions.flatMap((suggestion) => suggestion.candidateInstruments);
  assert.ok(candidates.some((candidate) => candidate.symbol === "BND"));
  assert.ok(!candidates.some((candidate) => candidate.symbol === "HYG"));
});

test("portfolio look-through combines direct stock and ETF underlying exposures", async () => {
  const stored: unknown[] = [];
  const repository = {
    listLatestSectorExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", sector: "Technology", exposureWeight: 0.35, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} },
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", sector: "Healthcare", exposureWeight: 0.15, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listLatestCountryExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", country: "United States", exposureWeight: 1, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listLatestTopHoldings: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", holdingSymbol: "MSFT", holdingName: "Microsoft", holdingWeight: 0.07, asOfDate: "2026-06-01", sourceProvider: "test", providerMetadata: {} }
    ],
    listLatestThemeExposures: async () => [
      { etfInstrumentId: "etf-1", etfSymbol: "VOO", theme: "Quality", exposureWeight: 0.4, confidenceScore: 72, derivationMethod: "test", asOfDate: "2026-06-01" }
    ],
    upsertPortfolioLookthroughExposures: async (input: unknown[]) => { stored.push(...input); },
    getLatestExposureDateForEtf: async () => null,
    upsertSectorExposures: async () => undefined,
    upsertCountryExposures: async () => undefined,
    upsertTopHoldings: async () => undefined,
    upsertThemeExposures: async () => undefined,
    listPortfolioLookthroughExposures: async () => [],
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
        { holding: { id: "h1", portfolioId: "portfolio-1", assetId: "a1", assetType: "stock", ticker: "MSFT", assetName: "Microsoft", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Technology" }, unitPrice: 50, value: 50, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" },
        { holding: { id: "h2", portfolioId: "portfolio-1", assetId: "a2", assetType: "etf", ticker: "VOO", assetName: "Vanguard S&P 500 ETF", accountName: null, brokerName: null, quantity: 1, averageCost: 100, costCurrency: "USD", firstPurchaseDate: "2026-01-01", notes: null, sector: "Multi-Asset / Broad Market" }, unitPrice: 50, value: 50, valueCurrency: "USD", priceDate: "2026-06-01", priceProvider: "test", valuationSource: "market_price" }
      ],
      totalValueEstimate: 100
    },
    instruments: [
      ...context().instruments,
      { id: "stock-1", symbol: "MSFT", name: "Microsoft", assetClass: "stock", instrumentType: "stock", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NASDAQ", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true },
      { id: "etf-1", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", instrumentType: "etf", sector: null, industry: null, canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true }
    ]
  }).dashboard;
  const service = new PortfolioLookthroughExposureService(repository);
  const report = await service.calculateAndStore("portfolio-1", dashboard, context().instruments.concat([
    { id: "stock-1", symbol: "MSFT", name: "Microsoft", assetClass: "stock", instrumentType: "stock", sector: "Technology", industry: null, canonicalSector: "Technology", canonicalThemes: ["Technology"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NASDAQ", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true },
    { id: "etf-1", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", instrumentType: "etf", sector: null, industry: null, canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], taxonomyIsManualOverride: false, taxonomyReviewStatus: "mapped", geography: "US", currency: "USD", exchange: "NYSE", watchlistTier: null, benchmarkTags: [], thematicTags: [], riskCategory: null, volatilityBucket: null, durationCategory: null, treasuryClassification: null, inflationLinked: null, creditQuality: null, geoExposure: "United States", rateSensitivity: null, inflationSensitivity: null, recessionSensitivity: null, liquidityRole: null, cryptoClassification: null, metadataLastRefreshedAt: null, providerPrimary: null, providerMetadata: {}, sourceType: "seeded", isActive: true }
  ]));

  const technology = report.sectorExposures.find((item) => item.exposureName === "Technology");
  const msft = report.topHoldingExposures.find((item) => item.exposureName === "MSFT");
  assert.ok(technology);
  assert.ok(Math.abs(technology.exposureWeight - 0.675) < 0.000001);
  assert.ok(msft);
  assert.ok(Math.abs(msft.exposureWeight - 0.535) < 0.000001);
  assert.ok(stored.length > 0);
});

test("potential actions do not include exact trade amounts or position sizes", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context());
  const actions = new PortfolioActionSuggestionService().build(suggestions);
  const text = JSON.stringify(actions);
  assert.doesNotMatch(text, /\$\d/);
  assert.doesNotMatch(text, /\b\d+\s+shares\b/i);
  assert.doesNotMatch(text, /\b(buy|sell)\s+\d/i);
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
