import test from "node:test";
import assert from "node:assert/strict";
import { PortfolioImprovementSuggestionService } from "../src/application/services/portfolioReview/PortfolioImprovementSuggestionService";
import { PortfolioActionSuggestionService } from "../src/application/services/portfolioReview/PortfolioActionSuggestionService";
import { AllocationReviewService } from "../src/application/services/portfolioReview/AllocationReviewService";
import { ConcentrationReviewService } from "../src/application/services/portfolioReview/ConcentrationReviewService";
import { PortfolioRiskReviewService } from "../src/application/services/portfolioReview/PortfolioRiskReviewService";
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
      diagnostics: []
    }
  }));
  const largestDirect = review.metrics.largestDirectHolding as { exposureName?: string; exposureWeight?: number };
  const largestIndirect = review.metrics.largestIndirectHolding as { exposureName?: string; exposureWeight?: number };
  assert.equal(largestDirect.exposureName, "MSFT");
  assert.equal(largestIndirect.exposureName, "MSFT");
  assert.ok(Number(largestIndirect.exposureWeight) > 0);
});

test("improvement suggestions only include approved non-reduce candidates", () => {
  const suggestions = new PortfolioImprovementSuggestionService().build(context());
  const candidates = suggestions.flatMap((suggestion) => suggestion.candidateInstruments);
  assert.ok(candidates.some((candidate) => candidate.symbol === "BND"));
  assert.ok(!candidates.some((candidate) => candidate.symbol === "HYG"));
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
      currencyExposures: [],
      themeExposures: [],
      diagnostics: []
    },
    instruments: [
      instrument({ id: "xlk", symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Technology", canonicalThemes: ["Cloud / Software"] }),
      instrument({ id: "vgt", symbol: "VGT", name: "Vanguard Information Technology ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Technology", canonicalThemes: ["Cloud / Software"] }),
      instrument({ id: "vxus", symbol: "VXUS", name: "Vanguard Total International Stock ETF", assetClass: "etf", instrumentType: "etf", canonicalSector: "Multi-Asset / Broad Market", canonicalThemes: ["Global Diversification"], geography: "International", geoExposure: "International" }),
      instrument({ id: "xlv", symbol: "XLV", name: "Health Care Select Sector SPDR", assetClass: "etf", instrumentType: "etf", canonicalSector: "Healthcare", canonicalThemes: ["Healthcare Innovation", "Quality"] }),
      instrument({ id: "bndx", symbol: "BNDX", name: "Vanguard Total International Bond ETF", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Global Diversification", "Interest Rate Sensitive"], geography: "Global", geoExposure: "Global" }),
      instrument({ id: "bnd", symbol: "BND", name: "Vanguard Total Bond Market ETF", assetClass: "bond_etf", instrumentType: "bond_etf", canonicalSector: "Bonds / Fixed Income", canonicalThemes: ["Treasury Bonds"] }),
      instrument({ id: "gld", symbol: "GLD", name: "SPDR Gold Shares", assetClass: "gold_etf", instrumentType: "etf", canonicalSector: "Commodities / Gold", canonicalThemes: ["Inflation Hedge"] })
    ],
    recommendations: [
      { id: "r-xlk", recommendationRunId: "run-1", instrumentId: "xlk", symbol: "XLK", instrumentType: "ETF", recommendationLabel: "Buy", overallScore: 80, confidenceScore: 80, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-vgt", recommendationRunId: "run-1", instrumentId: "vgt", symbol: "VGT", instrumentType: "ETF", recommendationLabel: "Buy", overallScore: 80, confidenceScore: 80, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-vxus", recommendationRunId: "run-1", instrumentId: "vxus", symbol: "VXUS", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 62, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
      { id: "r-xlv", recommendationRunId: "run-1", instrumentId: "xlv", symbol: "XLV", instrumentType: "ETF", recommendationLabel: "Hold", overallScore: 61, confidenceScore: 70, riskLevel: "medium", timeHorizon: "medium_term", recommendationReasoningSummary: "", positiveDrivers: [], negativeDrivers: [], guardrailsApplied: [], dataLimitations: [], recommendationChangeTriggers: { upgrade: [], downgrade: [] }, inputsSnapshot: {}, scoringBreakdown: {}, createdAt: "", updatedAt: "" },
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

  assert.ok(sectorSuggestion);
  assert.ok(!sectorSuggestion.candidateInstruments.some((candidate) => ["XLK", "VGT"].includes(candidate.symbol)));
  assert.ok(sectorSuggestion.candidateInstruments.some((candidate) => ["VXUS", "XLV", "BND", "GLD"].includes(candidate.symbol)));
  assert.ok(internationalSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "VXUS"));
  assert.ok(defensiveSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "XLV"));
  assert.ok(fixedIncomeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "BND"));
  assert.ok(fixedIncomeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "BNDX"));
  assert.ok(inflationHedgeSuggestion?.candidateInstruments.some((candidate) => candidate.symbol === "GLD"));
  assert.ok(sectorSuggestion.candidateInstruments.every((candidate) => typeof candidate.relevanceScore === "number" && typeof candidate.diversificationBenefitScore === "number"));
  assert.match(internationalSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "VXUS")?.whyThisCandidate ?? "", /72\.9% US look-through exposure/);
  assert.match(defensiveSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "XLV")?.whyThisCandidate ?? "", /Technology at 30\.6%/);
  assert.equal(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BNDX")?.diversificationType, "International fixed income");
  assert.match(fixedIncomeSuggestion?.candidateInstruments.find((candidate) => candidate.symbol === "BNDX")?.whyThisCandidate ?? "", /unlike BND/);
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
  const unitedStates = report.countryExposures.find((item) => item.exposureName === "United States");
  const duplicateUs = report.countryExposures.find((item) => item.exposureName === "US");
  const msft = report.topHoldingExposures.find((item) => item.exposureName === "MSFT");
  assert.ok(technology);
  assert.ok(Math.abs(technology.exposureWeight - 0.85) < 0.000001);
  assert.ok(unitedStates);
  assert.equal(duplicateUs, undefined);
  assert.ok(Math.abs(unitedStates.exposureWeight - 1) < 0.000001);
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
