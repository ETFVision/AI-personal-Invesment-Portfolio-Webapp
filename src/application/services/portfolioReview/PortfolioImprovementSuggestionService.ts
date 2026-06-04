import type { PortfolioImprovementIssueCategory, PortfolioImprovementSuggestion, PortfolioReviewCandidate } from "@/domain/portfolioReview/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { Instrument } from "@/domain/universe/types";
import { type PortfolioReviewInputContext } from "./portfolioReviewScoring";

const blockedLabels = new Set(["Reduce", "Sell", "Insufficient Data", "Not Applicable"]);
const internationalSymbols = new Set(["VXUS", "VEA", "VWO", "VT", "ACWI", "IEMG"]);
const defensiveSectors = new Set(["healthcare", "consumer staples", "utilities"]);
const hedgeAssetClasses = new Set(["gold_etf", "bond_etf", "cash_proxy"]);

function recommendationMap(recommendations: InstrumentRecommendation[]) {
  return new Map(recommendations.map((recommendation) => [recommendation.instrumentId, recommendation]));
}

type SuggestionContext = {
  dominantSector: string | null;
  dominantSectorWeight: number;
  technologyWeight: number;
  healthcareWeight: number;
  usExposure: number;
  internationalExposure: number;
  bondAllocation: number;
  goldAllocation: number;
  heldSymbols: Set<string>;
};

function normalizedSector(instrument: Instrument) {
  return (instrument.canonicalSector ?? instrument.sector ?? "").toLowerCase();
}

function hasTheme(instrument: Instrument, themeName: string) {
  return instrument.canonicalThemes.some((theme) => theme.toLowerCase() === themeName);
}

function instrumentIsInternationalDiversifier(instrument: Instrument) {
  const symbol = instrument.symbol?.toUpperCase() ?? "";
  const geography = (instrument.geography ?? instrument.geoExposure ?? "").toLowerCase();
  return internationalSymbols.has(symbol) || hasTheme(instrument, "global diversification") || geography.includes("international") || geography.includes("global") || geography.includes("emerging");
}

function instrumentIsDefensiveDiversifier(instrument: Instrument) {
  const sector = normalizedSector(instrument);
  return defensiveSectors.has(sector) || hasTheme(instrument, "defensive") || hasTheme(instrument, "defensive consumer");
}

function instrumentIsSameDominantSector(instrument: Instrument, context: SuggestionContext) {
  const dominantSector = context.dominantSector?.toLowerCase();
  return Boolean(dominantSector && normalizedSector(instrument) === dominantSector);
}

function issueFit(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext) {
  const themes = instrument.canonicalThemes.map((theme) => theme.toLowerCase());
  const sector = normalizedSector(instrument);
  if (issueCategory === "insufficient_fixed_income") return instrument.assetClass === "bond_etf" ? 35 : 0;
  if (issueCategory === "insufficient_cash_like_exposure") return instrument.assetClass === "cash_proxy" || themes.includes("short duration / cash-like") ? 35 : 0;
  if (issueCategory === "insufficient_inflation_hedge") return instrument.assetClass === "gold_etf" || themes.includes("inflation hedge") ? 35 : 0;
  if (issueCategory === "insufficient_geopolitical_hedge") return instrument.assetClass === "gold_etf" || themes.includes("recession hedge") ? 30 : 0;
  if (issueCategory === "insufficient_international_exposure") return instrumentIsInternationalDiversifier(instrument) ? 35 : 0;
  if (issueCategory === "insufficient_defensive_exposure") return instrumentIsDefensiveDiversifier(instrument) ? 34 : 0;
  if (issueCategory === "sector_concentration" || issueCategory === "theme_concentration") {
    if (instrumentIsSameDominantSector(instrument, context)) return 0;
    if (context.dominantSector === "Technology" && sector === "technology") return 0;
    if (instrumentIsInternationalDiversifier(instrument)) return 34;
    if (instrumentIsDefensiveDiversifier(instrument)) return 32;
    if (hedgeAssetClasses.has(instrument.assetClass)) return 26;
    return 0;
  }
  if (issueCategory === "concentration_risk") {
    if (instrumentIsSameDominantSector(instrument, context)) return 0;
    if (instrumentIsInternationalDiversifier(instrument)) return 32;
    if (instrumentIsDefensiveDiversifier(instrument)) return 30;
    if (hedgeAssetClasses.has(instrument.assetClass)) return 25;
    return 0;
  }
  if (issueCategory === "excessive_crypto_risk") return instrument.assetClass === "cash_proxy" || instrument.assetClass === "bond_etf" || instrument.assetClass === "gold_etf" ? 24 : 0;
  if (issueCategory === "macro_vulnerability") return themes.includes("defensive") || themes.includes("inflation hedge") || themes.includes("recession hedge") ? 24 : 0;
  return 10;
}

function relevanceScore(fit: number) {
  return Math.max(0, Math.min(100, Math.round((fit / 35) * 100)));
}

function diversificationBenefit(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext) {
  let score = 45;
  if (instrumentIsInternationalDiversifier(instrument) && context.usExposure > 0.7) score += 30;
  if (instrumentIsDefensiveDiversifier(instrument) && context.technologyWeight > 0.3) score += 28;
  if (instrument.assetClass === "bond_etf" && context.bondAllocation < 0.1) score += 26;
  if (instrument.assetClass === "gold_etf" && context.goldAllocation < 0.05) score += 24;
  if (instrument.assetClass === "cash_proxy") score += 16;
  if (instrumentIsSameDominantSector(instrument, context)) score -= 45;
  if (context.heldSymbols.has(instrument.symbol?.toUpperCase() ?? "")) score -= 8;
  if (issueCategory === "insufficient_defensive_exposure" && normalizedSector(instrument) === "healthcare" && context.healthcareWeight < 0.08) score += 18;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function candidate(
  instrument: Instrument,
  recommendation: InstrumentRecommendation | undefined,
  issueCategory: PortfolioImprovementIssueCategory,
  why: string,
  context: SuggestionContext
): PortfolioReviewCandidate | null {
  if (!instrument.isActive || !instrument.symbol) return null;
  if (recommendation && blockedLabels.has(recommendation.recommendationLabel)) return null;
  const fit = issueFit(instrument, issueCategory, context);
  if (fit <= 0) return null;
  const recommendationScore = recommendation?.overallScore ?? 55;
  const confidenceScore = recommendation?.confidenceScore ?? 50;
  const candidateRelevanceScore = relevanceScore(fit);
  const diversificationBenefitScore = diversificationBenefit(instrument, issueCategory, context);
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    name: instrument.name,
    assetClass: instrument.assetClass,
    recommendationLabel: recommendation?.recommendationLabel ?? "Hold",
    score: recommendationScore,
    recommendationScore,
    confidenceScore,
    relevanceScore: candidateRelevanceScore,
    diversificationBenefitScore,
    candidateType: instrument.assetClass,
    reason: `${why} Relevance ${candidateRelevanceScore}/100; diversification benefit ${diversificationBenefitScore}/100.`,
    whyThisCandidate: `${why} Relevance ${candidateRelevanceScore}/100; diversification benefit ${diversificationBenefitScore}/100.`,
    expectedPortfolioBenefit:
      issueCategory.includes("international") ? "Adds non-US exposure and reduces geography dependence." :
      issueCategory.includes("fixed_income") || issueCategory.includes("cash_like") ? "Adds portfolio ballast and may reduce equity volatility." :
      issueCategory.includes("defensive") ? "Adds exposure to defensive sectors that can offset technology-led concentration." :
      issueCategory.includes("inflation") || issueCategory.includes("geopolitical") ? "Adds a hedge sleeve that can behave differently from equities." :
      "Adds a different exposure profile that can reduce reliance on the current dominant exposure.",
    potentialTradeOff:
      instrument.assetClass === "bond_etf" || instrument.assetClass === "cash_proxy" ? "May lower upside participation during strong equity rallies." :
      instrument.assetClass === "gold_etf" ? "Gold can be volatile and does not generate operating cash flow." :
      "May overlap with existing broad-market holdings and should be reviewed for duplication.",
    keyRisks: recommendation?.negativeDrivers?.slice(0, 3) ?? [],
    dataLimitations: recommendation?.dataLimitations?.slice(0, 3) ?? [],
    source: recommendation ? "recommendation_engine" : "seeded_universe"
  };
}

function rankedCandidates(context: PortfolioReviewInputContext, issueContext: SuggestionContext, issueCategory: PortfolioImprovementIssueCategory, reason: string, limit = 5) {
  const recs = recommendationMap(context.recommendations);
  return context.instruments
    .map((instrument) => candidate(instrument, recs.get(instrument.id), issueCategory, reason, issueContext))
    .filter((item): item is PortfolioReviewCandidate => Boolean(item))
    .sort((a, b) => {
      const scoreA = (a.relevanceScore ?? 0) * 0.4 + (a.diversificationBenefitScore ?? 0) * 0.3 + (a.recommendationScore ?? 0) * 0.2 + (a.confidenceScore ?? 0) * 0.1;
      const scoreB = (b.relevanceScore ?? 0) * 0.4 + (b.diversificationBenefitScore ?? 0) * 0.3 + (b.recommendationScore ?? 0) * 0.2 + (b.confidenceScore ?? 0) * 0.1;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

function suggestion(input: {
  category: PortfolioImprovementSuggestion["category"];
  issueCategory: PortfolioImprovementIssueCategory;
  priority: PortfolioImprovementSuggestion["priority"];
  title: string;
  rationale: string;
  candidates: PortfolioReviewCandidate[];
  benefit: string;
  tradeOff: string;
}): PortfolioImprovementSuggestion {
  return {
    category: input.category,
    issueCategory: input.issueCategory,
    issueAddressed: input.title,
    priority: input.priority,
    title: input.title,
    rationale: input.rationale,
    expectedPortfolioBenefit: input.benefit,
    potentialTradeOff: input.tradeOff,
    keyRisks: input.candidates.flatMap((candidate) => candidate.keyRisks ?? []).slice(0, 5),
    dataLimitations: input.candidates.flatMap((candidate) => candidate.dataLimitations ?? []).slice(0, 5),
    source: "deterministic_portfolio_review",
    candidateInstruments: input.candidates
  };
}

export class PortfolioImprovementSuggestionService {
  build(context: PortfolioReviewInputContext): PortfolioImprovementSuggestion[] {
    const suggestions: PortfolioImprovementSuggestion[] = [];
    const bondAllocation = context.bondReport.totalBondAllocation;
    const topHolding = context.riskReport.concentration.topHoldingConcentration;
    const diversificationScore = context.riskReport.diversification.score;
    const topSector = context.lookthroughReport?.sectorExposures[0];
    const sectorExposures = context.lookthroughReport?.sectorExposures ?? context.dashboard.allocationBySector.map((item) => ({
      exposureName: item.label,
      exposureWeight: item.percent
    }));
    const usExposure = context.lookthroughReport?.countryExposures.find((item) => ["us", "usa", "united states"].includes(item.exposureName.toLowerCase()))?.exposureWeight ?? 0;
    const internationalExposure = Math.max(0, 1 - usExposure);
    const goldAllocation = context.dashboard.allocationByType
      .filter((item) => item.label.toLowerCase().includes("gold"))
      .reduce((sum, item) => sum + item.percent, 0);
    const issueContext: SuggestionContext = {
      dominantSector: topSector?.exposureName ?? context.dashboard.allocationBySector[0]?.label ?? null,
      dominantSectorWeight: topSector?.exposureWeight ?? context.dashboard.allocationBySector[0]?.percent ?? 0,
      technologyWeight: sectorExposures.find((item) => item.exposureName.toLowerCase() === "technology")?.exposureWeight ?? 0,
      healthcareWeight: sectorExposures.find((item) => item.exposureName.toLowerCase() === "healthcare")?.exposureWeight ?? 0,
      usExposure,
      internationalExposure,
      bondAllocation,
      goldAllocation,
      heldSymbols: new Set(context.dashboard.holdings.map((holding) => holding.ticker?.toUpperCase()).filter((symbol): symbol is string => Boolean(symbol)))
    };

    if (bondAllocation < 0.05) {
      suggestions.push(suggestion({
        category: "fixed_income",
        issueCategory: "insufficient_fixed_income",
        priority: "medium",
        title: "Review fixed-income ballast",
        rationale: "Bond ETF allocation is low relative to a portfolio that may need volatility dampening.",
        candidates: rankedCandidates(context, issueContext, "insufficient_fixed_income", "Candidate directly addresses low fixed-income ballast.", 5),
        benefit: "Can add ballast and reduce equity-only sensitivity.",
        tradeOff: "May reduce upside capture if equity markets rise strongly."
      }));
    }

    if (issueContext.dominantSectorWeight > 0.35 || issueContext.technologyWeight > 0.3) {
      suggestions.push(suggestion({
        category: "theme_exposure",
        issueCategory: "sector_concentration",
        priority: issueContext.dominantSectorWeight > 0.45 ? "medium" : "low",
        title: "Review sector concentration alternatives",
        rationale: `${issueContext.dominantSector ?? "One sector"} is the largest look-through sector exposure; candidates should broaden away from that sector, not add to it.`,
        candidates: rankedCandidates(context, issueContext, "sector_concentration", "Candidate broadens exposure away from the dominant sector.", 5),
        benefit: "Can reduce dependency on a single sector driver.",
        tradeOff: "May dilute exposure to the portfolio's strongest current theme."
      }));
    }

    if (usExposure > 0.7 || internationalExposure < 0.3) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "insufficient_international_exposure",
        priority: usExposure > 0.8 ? "medium" : "low",
        title: "Review international diversification",
        rationale: "Look-through country exposure is US-oriented relative to a globally diversified baseline.",
        candidates: rankedCandidates(context, issueContext, "insufficient_international_exposure", "Candidate directly adds international or global exposure.", 5),
        benefit: "Can reduce US home bias and add regional diversification.",
        tradeOff: "Introduces currency and non-US market risks."
      }));
    }

    if (issueContext.healthcareWeight < 0.08 && issueContext.technologyWeight > 0.25) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "insufficient_defensive_exposure",
        priority: "low",
        title: "Review healthcare and defensive diversification",
        rationale: "Healthcare and defensive sectors are modest relative to technology exposure.",
        candidates: rankedCandidates(context, issueContext, "insufficient_defensive_exposure", "Candidate adds healthcare or defensive sector exposure that can offset technology concentration.", 5),
        benefit: "Can improve sector balance without relying only on broad-market ETFs.",
        tradeOff: "Defensive sectors may lag during high-beta technology-led rallies."
      }));
    }

    if (topHolding > 0.25 || diversificationScore < 55) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "concentration_risk",
        priority: topHolding > 0.3 ? "high" : "medium",
        title: "Review diversification candidates",
        rationale: "Concentration and diversification metrics suggest the portfolio could benefit from broader exposure review.",
        candidates: rankedCandidates(context, issueContext, "concentration_risk", "Candidate lowers reliance on the current dominant exposure.", 5),
        benefit: "Can lower direct or indirect concentration risk.",
        tradeOff: "May add overlap with broad ETFs already held."
      }));
    }

    if (goldAllocation < 0.03 && context.macroRegime?.inflationRegime.toLowerCase().includes("elevated")) {
      suggestions.push(suggestion({
        category: "macro_fit",
        issueCategory: "insufficient_inflation_hedge",
        priority: "low",
        title: "Review inflation-hedge sleeve",
        rationale: "Inflation regime is elevated and gold/commodity exposure is low.",
        candidates: rankedCandidates(context, issueContext, "insufficient_inflation_hedge", "Candidate adds explicit inflation-hedge exposure.", 3),
        benefit: "Can add inflation and geopolitical hedge characteristics.",
        tradeOff: "Gold and commodity ETFs can lag during disinflationary equity-led markets."
      }));
    }

    if (context.recommendations.length === 0) {
      suggestions.push({
        category: "data_quality",
        issueCategory: "data_quality",
        issueAddressed: "Recommendation coverage missing",
        priority: "medium",
        title: "Run recommendations before final review",
        rationale: "Portfolio Review can run without recommendation outputs, but alignment and candidate screening are limited.",
        candidateInstruments: [],
        expectedPortfolioBenefit: "Improves candidate screening and recommendation alignment review.",
        potentialTradeOff: "No portfolio exposure change; this is a data readiness action.",
        source: "deterministic_portfolio_review"
      });
    }

    return suggestions;
  }
}
