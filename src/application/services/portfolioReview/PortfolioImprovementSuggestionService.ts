import type { PortfolioImprovementIssueCategory, PortfolioImprovementSuggestion, PortfolioReviewCandidate } from "@/domain/portfolioReview/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { Instrument } from "@/domain/universe/types";
import { type PortfolioReviewInputContext } from "./portfolioReviewScoring";

const blockedLabels = new Set(["Reduce", "Sell", "Insufficient Data", "Not Applicable"]);

function recommendationMap(recommendations: InstrumentRecommendation[]) {
  return new Map(recommendations.map((recommendation) => [recommendation.instrumentId, recommendation]));
}

function issueFit(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory) {
  const themes = instrument.canonicalThemes.map((theme) => theme.toLowerCase());
  const sector = (instrument.canonicalSector ?? instrument.sector ?? "").toLowerCase();
  const symbol = instrument.symbol ?? "";
  if (issueCategory === "insufficient_fixed_income") return instrument.assetClass === "bond_etf" ? 35 : 0;
  if (issueCategory === "insufficient_cash_like_exposure") return instrument.assetClass === "cash_proxy" || themes.includes("short duration / cash-like") ? 35 : 0;
  if (issueCategory === "insufficient_inflation_hedge") return instrument.assetClass === "gold_etf" || themes.includes("inflation hedge") ? 35 : 0;
  if (issueCategory === "insufficient_geopolitical_hedge") return instrument.assetClass === "gold_etf" || themes.includes("recession hedge") ? 30 : 0;
  if (issueCategory === "insufficient_international_exposure") return ["VXUS", "VEA", "VWO", "VT", "ACWI"].includes(symbol) || themes.includes("global diversification") ? 35 : 0;
  if (issueCategory === "insufficient_defensive_exposure") return themes.includes("defensive") || sector.includes("utilities") || sector.includes("healthcare") || sector.includes("consumer staples") ? 30 : 0;
  if (issueCategory === "sector_concentration" || issueCategory === "theme_concentration" || issueCategory === "concentration_risk") return instrument.assetClass === "etf" && (themes.includes("global diversification") || themes.includes("quality") || themes.includes("dividend / income")) ? 28 : 0;
  if (issueCategory === "excessive_crypto_risk") return instrument.assetClass === "cash_proxy" || instrument.assetClass === "bond_etf" || instrument.assetClass === "gold_etf" ? 24 : 0;
  if (issueCategory === "macro_vulnerability") return themes.includes("defensive") || themes.includes("inflation hedge") || themes.includes("recession hedge") ? 24 : 0;
  return 10;
}

function candidate(
  instrument: Instrument,
  recommendation: InstrumentRecommendation | undefined,
  issueCategory: PortfolioImprovementIssueCategory,
  why: string
): PortfolioReviewCandidate | null {
  if (!instrument.isActive || !instrument.symbol) return null;
  if (recommendation && blockedLabels.has(recommendation.recommendationLabel)) return null;
  const fit = issueFit(instrument, issueCategory);
  if (fit <= 0) return null;
  const recommendationScore = recommendation?.overallScore ?? 55;
  const confidenceScore = recommendation?.confidenceScore ?? 50;
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    name: instrument.name,
    assetClass: instrument.assetClass,
    recommendationLabel: recommendation?.recommendationLabel ?? "Hold",
    score: recommendationScore,
    recommendationScore,
    confidenceScore,
    candidateType: instrument.assetClass,
    reason: why,
    whyThisCandidate: why,
    expectedPortfolioBenefit:
      issueCategory.includes("international") ? "Adds non-US exposure and reduces geography dependence." :
      issueCategory.includes("fixed_income") || issueCategory.includes("cash_like") ? "Adds portfolio ballast and may reduce equity volatility." :
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

function rankedCandidates(context: PortfolioReviewInputContext, issueCategory: PortfolioImprovementIssueCategory, reason: string, limit = 5) {
  const recs = recommendationMap(context.recommendations);
  return context.instruments
    .map((instrument) => candidate(instrument, recs.get(instrument.id), issueCategory, reason))
    .filter((item): item is PortfolioReviewCandidate => Boolean(item))
    .sort((a, b) => {
      const fitA = issueFit(context.instruments.find((instrument) => instrument.id === a.instrumentId) as Instrument, issueCategory);
      const fitB = issueFit(context.instruments.find((instrument) => instrument.id === b.instrumentId) as Instrument, issueCategory);
      return (fitB + (b.recommendationScore ?? 0) * 0.35 + (b.confidenceScore ?? 0) * 0.15) - (fitA + (a.recommendationScore ?? 0) * 0.35 + (a.confidenceScore ?? 0) * 0.15);
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
    const usExposure = context.lookthroughReport?.countryExposures.find((item) => ["us", "usa", "united states"].includes(item.exposureName.toLowerCase()))?.exposureWeight ?? 0;
    const goldAllocation = context.dashboard.allocationByType
      .filter((item) => item.label.toLowerCase().includes("gold"))
      .reduce((sum, item) => sum + item.percent, 0);

    if (bondAllocation < 0.05) {
      suggestions.push(suggestion({
        category: "fixed_income",
        issueCategory: "insufficient_fixed_income",
        priority: "medium",
        title: "Review fixed-income ballast",
        rationale: "Bond ETF allocation is low relative to a portfolio that may need volatility dampening.",
        candidates: rankedCandidates(context, "insufficient_fixed_income", "Approved fixed-income or cash-like universe instrument with non-negative recommendation.", 5),
        benefit: "Can add ballast and reduce equity-only sensitivity.",
        tradeOff: "May reduce upside capture if equity markets rise strongly."
      }));
    }

    if ((topSector?.exposureWeight ?? 0) > 0.5) {
      suggestions.push(suggestion({
        category: "theme_exposure",
        issueCategory: "sector_concentration",
        priority: "medium",
        title: "Review sector concentration alternatives",
        rationale: `${topSector?.exposureName ?? "One sector"} is dominant on a look-through basis.`,
        candidates: rankedCandidates(context, "sector_concentration", "Candidate may broaden exposure away from the dominant sector.", 5),
        benefit: "Can reduce dependency on a single sector driver.",
        tradeOff: "May dilute exposure to the portfolio's strongest current theme."
      }));
    }

    if (usExposure > 0.8) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "insufficient_international_exposure",
        priority: "medium",
        title: "Review international diversification",
        rationale: "Look-through country exposure is heavily US-oriented.",
        candidates: rankedCandidates(context, "insufficient_international_exposure", "Candidate can add international or global exposure.", 5),
        benefit: "Can reduce US home bias and add regional diversification.",
        tradeOff: "Introduces currency and non-US market risks."
      }));
    }

    if (topHolding > 0.25 || diversificationScore < 55) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "concentration_risk",
        priority: topHolding > 0.3 ? "high" : "medium",
        title: "Review diversification candidates",
        rationale: "Concentration and diversification metrics suggest the portfolio could benefit from broader exposure review.",
        candidates: rankedCandidates(context, "concentration_risk", "Approved broad or quality ETF candidate with non-negative recommendation.", 5),
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
        candidates: rankedCandidates(context, "insufficient_inflation_hedge", "Approved inflation-hedge candidate with non-negative recommendation.", 3),
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
