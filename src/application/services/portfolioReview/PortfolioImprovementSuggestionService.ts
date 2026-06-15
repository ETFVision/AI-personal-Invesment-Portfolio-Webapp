import type { PortfolioImprovementIssueCategory, PortfolioImprovementSuggestion, PortfolioReviewCandidate } from "@/domain/portfolioReview/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { Instrument } from "@/domain/universe/types";
import { DiversificationBenefitService } from "./DiversificationBenefitService";
import { type PortfolioReviewInputContext } from "./portfolioReviewScoring";

const blockedLabels = new Set(["Reduce", "Sell", "Insufficient Data", "Not Applicable"]);
const internationalSymbols = new Set(["VXUS", "VEA", "VWO", "VT", "ACWI", "IEMG"]);
const defensiveSectors = new Set(["healthcare", "consumer staples", "utilities"]);
const roleLabels = {
  international_equity: "International equity",
  developed_international_equity: "Developed international equity",
  emerging_market_equity: "Emerging-market equity",
  global_equity: "Global equity",
  healthcare_defensive: "Healthcare defensive sector",
  utilities_defensive: "Defensive utilities",
  consumer_staples_defensive: "Defensive consumer staples",
  core_us_bond: "Core US bond ballast",
  international_bond: "International fixed income",
  intermediate_treasury: "Intermediate Treasury ballast",
  long_duration_treasury: "Long-duration recession hedge",
  short_treasury_cash_like: "Short-duration / cash-like ballast",
  tips_inflation_linked: "Inflation-linked bonds",
  investment_grade_credit: "Investment-grade corporate credit",
  high_yield_credit: "High-yield credit",
  gold_hedge: "Gold / inflation hedge",
  real_estate: "Real estate",
  energy_inflation_equity: "Energy / inflation-sensitive equity",
  financials_cyclical: "Financial cyclicals",
  industrials_cyclical: "Industrial cyclicals",
  crypto_alternative: "Crypto / high-risk alternative",
  broad_market: "Broad-market equity",
  other: "Diversifying exposure"
} as const;

type CandidateRole = keyof typeof roleLabels;

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

function hasAnyTheme(instrument: Instrument, themes: string[]) {
  const canonicalThemes = instrument.canonicalThemes.map((theme) => theme.toLowerCase());
  return themes.some((theme) => canonicalThemes.includes(theme));
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

function candidateRole(instrument: Instrument): CandidateRole {
  const symbol = instrument.symbol?.toUpperCase() ?? "";
  const sector = normalizedSector(instrument);
  const themes = instrument.canonicalThemes.map((theme) => theme.toLowerCase());
  const duration = instrument.durationCategory?.toLowerCase() ?? "";
  const classification = instrument.treasuryClassification?.toLowerCase() ?? "";
  const creditQuality = instrument.creditQuality?.toLowerCase() ?? "";

  if (["VXUS"].includes(symbol)) return "international_equity";
  if (["VEA"].includes(symbol)) return "developed_international_equity";
  if (["VWO", "IEMG"].includes(symbol)) return "emerging_market_equity";
  if (["VT", "ACWI"].includes(symbol)) return "global_equity";
  if (["BNDX"].includes(symbol)) return "international_bond";
  if (["BND", "AGG"].includes(symbol)) return "core_us_bond";
  if (["IEF"].includes(symbol)) return "intermediate_treasury";
  if (["TLT"].includes(symbol)) return "long_duration_treasury";
  if (["SHY", "SGOV", "BIL"].includes(symbol)) return "short_treasury_cash_like";
  if (["TIP"].includes(symbol) || instrument.inflationLinked || themes.includes("inflation hedge")) return "tips_inflation_linked";
  if (["LQD"].includes(symbol) || (classification.includes("corporate") && creditQuality.includes("investment"))) return "investment_grade_credit";
  if (["HYG"].includes(symbol) || creditQuality.includes("high yield")) return "high_yield_credit";
  if (["GLD", "IAU"].includes(symbol) || instrument.assetClass === "gold_etf") return "gold_hedge";
  if (sector === "healthcare") return "healthcare_defensive";
  if (sector === "utilities") return "utilities_defensive";
  if (sector === "consumer staples") return "consumer_staples_defensive";
  if (sector === "real estate") return "real_estate";
  if (sector === "energy") return "energy_inflation_equity";
  if (sector === "financials") return "financials_cyclical";
  if (sector === "industrials") return "industrials_cyclical";
  if (instrument.assetClass === "crypto") return "crypto_alternative";
  if (instrument.assetClass === "bond_etf") {
    if (duration === "long") return "long_duration_treasury";
    if (duration === "ultra-short" || duration === "short") return "short_treasury_cash_like";
    return "core_us_bond";
  }
  if (hasAnyTheme(instrument, ["global diversification"]) || instrumentIsInternationalDiversifier(instrument)) return "global_equity";
  if (instrument.assetClass === "etf" && normalizedSector(instrument) === "multi-asset / broad market") return "broad_market";
  return "other";
}

function rolePriority(issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext): CandidateRole[] {
  if (issueCategory === "insufficient_international_exposure") {
    return ["international_equity", "developed_international_equity", "emerging_market_equity", "global_equity", "international_bond"];
  }
  if (issueCategory === "insufficient_fixed_income") {
    return ["core_us_bond", "international_bond", "intermediate_treasury", "short_treasury_cash_like", "tips_inflation_linked", "long_duration_treasury", "investment_grade_credit"];
  }
  if (issueCategory === "insufficient_cash_like_exposure") {
    return ["short_treasury_cash_like", "intermediate_treasury", "core_us_bond"];
  }
  if (issueCategory === "insufficient_inflation_hedge") {
    return ["gold_hedge", "tips_inflation_linked", "energy_inflation_equity"];
  }
  if (issueCategory === "insufficient_geopolitical_hedge") {
    return ["gold_hedge", "intermediate_treasury", "long_duration_treasury", "short_treasury_cash_like", "utilities_defensive", "consumer_staples_defensive"];
  }
  if (issueCategory === "insufficient_defensive_exposure") {
    return ["healthcare_defensive", "utilities_defensive", "consumer_staples_defensive", "short_treasury_cash_like", "core_us_bond"];
  }
  if (issueCategory === "sector_concentration" || issueCategory === "theme_concentration") {
    if (context.technologyWeight > 0.25) {
      return ["healthcare_defensive", "utilities_defensive", "consumer_staples_defensive", "international_equity", "developed_international_equity", "emerging_market_equity", "core_us_bond", "international_bond", "gold_hedge"];
    }
    return ["international_equity", "healthcare_defensive", "utilities_defensive", "consumer_staples_defensive", "core_us_bond", "gold_hedge", "real_estate"];
  }
  if (issueCategory === "concentration_risk") {
    return ["international_equity", "developed_international_equity", "emerging_market_equity", "international_bond", "core_us_bond", "gold_hedge", "healthcare_defensive", "utilities_defensive", "consumer_staples_defensive"];
  }
  if (issueCategory === "excessive_crypto_risk") {
    return ["short_treasury_cash_like", "core_us_bond", "gold_hedge"];
  }
  if (issueCategory === "macro_vulnerability") {
    return ["gold_hedge", "tips_inflation_linked", "intermediate_treasury", "healthcare_defensive", "utilities_defensive", "consumer_staples_defensive"];
  }
  return ["other"];
}

function roleFit(role: CandidateRole, issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext) {
  const roles = rolePriority(issueCategory, context);
  const index = roles.indexOf(role);
  if (index < 0) return 0;
  return Math.max(16, 35 - index * 3);
}

function issueFit(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext) {
  const role = candidateRole(instrument);
  const themes = instrument.canonicalThemes.map((theme) => theme.toLowerCase());
  const sector = normalizedSector(instrument);
  if (issueCategory === "insufficient_fixed_income") return roleFit(role, issueCategory, context);
  if (issueCategory === "insufficient_cash_like_exposure") return roleFit(role, issueCategory, context) || (instrument.assetClass === "cash_proxy" || themes.includes("short duration / cash-like") ? 35 : 0);
  if (issueCategory === "insufficient_inflation_hedge") return roleFit(role, issueCategory, context) || (instrument.assetClass === "gold_etf" || themes.includes("inflation hedge") ? 35 : 0);
  if (issueCategory === "insufficient_geopolitical_hedge") return roleFit(role, issueCategory, context) || (instrument.assetClass === "gold_etf" || themes.includes("recession hedge") ? 30 : 0);
  if (issueCategory === "insufficient_international_exposure") return roleFit(role, issueCategory, context);
  if (issueCategory === "insufficient_defensive_exposure") return roleFit(role, issueCategory, context) || (instrumentIsDefensiveDiversifier(instrument) ? 24 : 0);
  if (issueCategory === "sector_concentration" || issueCategory === "theme_concentration") {
    if (instrumentIsSameDominantSector(instrument, context)) return 0;
    if (context.dominantSector === "Technology" && sector === "technology") return 0;
    const fit = roleFit(role, issueCategory, context);
    if (fit > 0) return fit;
    return 0;
  }
  if (issueCategory === "concentration_risk") {
    if (instrumentIsSameDominantSector(instrument, context)) return 0;
    return roleFit(role, issueCategory, context);
  }
  if (issueCategory === "excessive_crypto_risk") return roleFit(role, issueCategory, context) || (instrument.assetClass === "cash_proxy" || instrument.assetClass === "bond_etf" || instrument.assetClass === "gold_etf" ? 24 : 0);
  if (issueCategory === "macro_vulnerability") return roleFit(role, issueCategory, context) || (themes.includes("defensive") || themes.includes("inflation hedge") || themes.includes("recession hedge") ? 24 : 0);
  return 10;
}

function relevanceScore(fit: number) {
  return Math.max(0, Math.min(100, Math.round((fit / 35) * 100)));
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function diversificationType(instrument: Instrument) {
  return roleLabels[candidateRole(instrument)];
}

function roleExplanation(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory, context: SuggestionContext) {
  const symbol = instrument.symbol ?? instrument.name;
  const role = candidateRole(instrument);
  if (role === "international_equity") return `${symbol} provides exposure to broad non-US equity, and may reduce reliance on ${pct(context.usExposure)} US look-through exposure.`;
  if (role === "developed_international_equity") return `${symbol} provides exposure to developed-market non-US equities, adding regional balance without adding emerging-market concentration.`;
  if (role === "emerging_market_equity") return `${symbol} provides exposure to emerging-market equities, introducing different growth, currency and valuation drivers from US large caps.`;
  if (role === "global_equity") return `${symbol} provides exposure to global equity breadth, but its US overlap may be reviewed because current US exposure is ${pct(context.usExposure)}.`;
  if (role === "international_bond") return `${symbol} provides exposure to international investment-grade bonds. Compared with BND, it diversifies fixed income across non-US rate cycles and currencies instead of only adding US aggregate bond ballast.`;
  if (role === "core_us_bond") return `${symbol} provides exposure to core US aggregate bond ballast, diversifying away from equity sector risk and large single-name exposures.`;
  if (role === "intermediate_treasury") return `${symbol} provides exposure to intermediate Treasury duration, which can help offset equity stress without the larger rate sensitivity of long-duration Treasuries.`;
  if (role === "long_duration_treasury") return `${symbol} provides exposure to long-duration Treasuries with stronger recession-hedge potential, but higher sensitivity to interest-rate moves.`;
  if (role === "short_treasury_cash_like") return `${symbol} provides exposure to short-duration Treasury or cash-like ballast, improving liquidity and reducing equity-volatility dependence.`;
  if (role === "tips_inflation_linked") return `${symbol} provides exposure to inflation-linked bonds, which are more directly tied to inflation protection than nominal bonds.`;
  if (role === "investment_grade_credit") return `${symbol} provides exposure to investment-grade corporate credit, introducing income exposure with less equity beta than stock-heavy sectors.`;
  if (role === "high_yield_credit") return `${symbol} provides exposure to high-yield credit, but it is a risk asset and is not treated as defensive bond ballast.`;
  if (role === "gold_hedge") return `${symbol} provides exposure to gold, a hedge sleeve that can respond differently to inflation, real-rate and geopolitical stress than equities.`;
  if (role === "healthcare_defensive") return `${symbol} provides exposure to Healthcare where current Healthcare weight is ${pct(context.healthcareWeight)} versus Technology at ${pct(context.technologyWeight)}; the sector has different earnings drivers such as pharma, services and medical devices.`;
  if (role === "utilities_defensive") return `${symbol} provides exposure to regulated utilities, which can reduce dependence on technology earnings cycles and usually has more defensive demand characteristics.`;
  if (role === "consumer_staples_defensive") return `${symbol} provides exposure to Consumer Staples, giving the portfolio essential-consumption businesses that can behave differently in slower-growth environments.`;
  if (role === "real_estate") return `${symbol} provides exposure to real estate, diversifying sector mix through property income and rate-sensitive assets.`;
  if (role === "energy_inflation_equity") return `${symbol} provides exposure to energy, which may affect sensitivity to oil and commodity cycles but remains cyclical equity risk.`;
  if (role === "financials_cyclical") return `${symbol} provides exposure to financials, increasing sensitivity to credit, rates and capital-market cycles.`;
  if (role === "industrials_cyclical") return `${symbol} provides exposure to industrials, diversifying toward infrastructure, manufacturing and capital-spending cycles.`;
  if (issueCategory === "sector_concentration" || issueCategory === "theme_concentration") {
    return `${symbol} broadens away from ${context.dominantSector ?? "the dominant sector"}, currently ${pct(context.dominantSectorWeight)} of look-through sector exposure.`;
  }
  if (symbol) return `${symbol} provides exposure to ${roleLabels[role].toLowerCase()} to address ${issueCategory.replaceAll("_", " ")}.`;
  return `${symbol} provides exposure to a different profile to address ${issueCategory.replaceAll("_", " ")}.`;
}

function expectedBenefit(instrument: Instrument, issueCategory: PortfolioImprovementIssueCategory) {
  const role = candidateRole(instrument);
  if (["international_equity", "developed_international_equity", "emerging_market_equity", "global_equity"].includes(role)) {
    return "May relate to geographic diversification and may reduce dependence on US equity leadership.";
  }
  if (role === "international_bond") return "Provides exposure to fixed-income ballast while diversifying rate, currency and issuer exposure beyond US-only bonds.";
  if (["core_us_bond", "intermediate_treasury", "long_duration_treasury", "short_treasury_cash_like", "tips_inflation_linked", "investment_grade_credit"].includes(role)) {
    return "Provides exposure to fixed-income ballast that may reduce reliance on equity returns and may relate to portfolio stability.";
  }
  if (role === "gold_hedge") return "Provides exposure to a hedge sleeve that may relate to resilience to inflation, real-rate shocks and geopolitical stress.";
  if (["healthcare_defensive", "utilities_defensive", "consumer_staples_defensive"].includes(role)) {
    return "Broadens sector exposure toward more defensive earnings drivers and away from technology-led concentration.";
  }
  if (role === "energy_inflation_equity") return "Provides exposure to commodity-cycle sensitivity that may help when inflation or energy shocks are important portfolio risks.";
  if (role === "real_estate") return "Provides exposure to property income and a different sensitivity profile from growth equities.";
  if (issueCategory === "concentration_risk") return "May affect reliance on the current largest direct and ETF look-through exposures.";
  return "Provides exposure to a different driver that may improve diversification if overlap is acceptable.";
}

function potentialTradeOff(instrument: Instrument) {
  const role = candidateRole(instrument);
  if (role === "international_bond") return "Introduces currency and non-US rate-cycle exposure; returns may diverge from US aggregate bonds.";
  if (role === "core_us_bond") return "May reduce upside participation during strong equity rallies and remains exposed to US rate moves.";
  if (role === "long_duration_treasury") return "Can be volatile when long-term interest rates rise.";
  if (role === "short_treasury_cash_like") return "Provides stability but limited long-term return potential.";
  if (role === "tips_inflation_linked") return "Inflation protection can lag when real yields rise or inflation cools.";
  if (role === "investment_grade_credit") return "Adds credit-spread risk and may not protect as well as Treasuries during stress.";
  if (role === "high_yield_credit") return "High yield can behave more like equities during recessions and credit stress.";
  if (role === "gold_hedge") return "Gold can be volatile, does not generate cash flow, and may lag in strong risk-on markets.";
  if (["international_equity", "developed_international_equity", "emerging_market_equity", "global_equity"].includes(role)) return "Introduces non-US market and currency risk; global ETFs may still overlap with existing US holdings.";
  if (["healthcare_defensive", "utilities_defensive", "consumer_staples_defensive"].includes(role)) return "Defensive sectors can lag during high-beta growth rallies and may overlap with broad-market ETFs.";
  if (role === "energy_inflation_equity") return "Energy exposure is cyclical and can be sensitive to commodity-price swings.";
  if (role === "real_estate") return "Real estate can be sensitive to interest rates and financing conditions.";
  return "May overlap with existing holdings; duplication can be reviewed analytically.";
}

function recommendationComponentScore(recommendation: InstrumentRecommendation | undefined, keys: string[], fallback = 50) {
  const components = recommendation?.scoringBreakdown?.components;
  if (!Array.isArray(components)) return fallback;
  const match = components.find((component) => {
    if (!component || typeof component !== "object") return false;
    const key = "key" in component ? String(component.key) : "";
    return keys.includes(key);
  });
  if (!match || typeof match !== "object" || !("score" in match)) return fallback;
  const score = Number(match.score);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback;
}

function candidateRankScore(candidate: PortfolioReviewCandidate) {
  return (
    (candidate.issueFitScore ?? candidate.relevanceScore ?? 0) * 0.35 +
    (candidate.diversificationBenefitScore ?? 0) * 0.3 +
    (candidate.recommendationScore ?? 0) * 0.15 +
    (candidate.confidenceScore ?? 0) * 0.1 +
    (candidate.macroFitScore ?? 50) * 0.05 -
    (candidate.overlapPenalty ?? 0) * 0.05
  );
}

const diversificationBenefitService = new DiversificationBenefitService();

function candidate(
  instrument: Instrument,
  recommendation: InstrumentRecommendation | undefined,
  issueCategory: PortfolioImprovementIssueCategory,
  context: SuggestionContext
): PortfolioReviewCandidate | null {
  if (!instrument.isActive || !instrument.symbol) return null;
  if (recommendation && blockedLabels.has(recommendation.recommendationLabel)) return null;
  const fit = issueFit(instrument, issueCategory, context);
  if (fit <= 0) return null;
  const recommendationScore = recommendation?.overallScore ?? 55;
  const confidenceScore = recommendation?.confidenceScore ?? 50;
  const candidateRelevanceScore = relevanceScore(fit);
  const type = diversificationType(instrument);
  const benefit = diversificationBenefitService.evaluate({
    roleLabel: type,
    issueCategory,
    issueFitScore: candidateRelevanceScore,
    dominantSector: context.dominantSector,
    dominantSectorWeight: context.dominantSectorWeight,
    candidateSector: instrument.canonicalSector ?? instrument.sector,
    technologyWeight: context.technologyWeight,
    healthcareWeight: context.healthcareWeight,
    usExposure: context.usExposure,
    internationalExposure: context.internationalExposure,
    bondAllocation: context.bondAllocation,
    goldAllocation: context.goldAllocation,
    heldSymbols: context.heldSymbols,
    symbol: instrument.symbol
  });
  const explanation = benefit.primaryReason || roleExplanation(instrument, issueCategory, context);
  const macroFitScore = recommendationComponentScore(recommendation, ["macro_fit", "market_vision_alignment", "theme_alignment"]);
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
    issueFitScore: candidateRelevanceScore,
    diversificationBenefitScore: benefit.score,
    macroFitScore,
    overlapPenalty: benefit.overlapPenalty,
    primaryReason: benefit.primaryReason,
    secondaryBenefit: benefit.secondaryBenefit,
    overlapWarning: benefit.overlapWarning,
    diversificationType: type,
    candidateType: instrument.assetClass,
    reason: `${explanation} Issue fit ${candidateRelevanceScore}/100; diversification benefit ${benefit.score}/100; overlap penalty ${benefit.overlapPenalty}/100.`,
    whyThisCandidate: `${explanation} Issue fit ${candidateRelevanceScore}/100; diversification benefit ${benefit.score}/100; overlap penalty ${benefit.overlapPenalty}/100.`,
    expectedPortfolioBenefit: benefit.secondaryBenefit || expectedBenefit(instrument, issueCategory),
    potentialTradeOff: potentialTradeOff(instrument),
    keyRisks: recommendation?.negativeDrivers?.slice(0, 3) ?? [],
    dataLimitations: recommendation?.dataLimitations?.slice(0, 3) ?? [],
    source: recommendation ? "recommendation_engine" : "seeded_universe"
  };
}

function rankedCandidates(context: PortfolioReviewInputContext, issueContext: SuggestionContext, issueCategory: PortfolioImprovementIssueCategory, limit = 5) {
  const recs = recommendationMap(context.recommendations);
  return context.instruments
    .map((instrument) => candidate(instrument, recs.get(instrument.id), issueCategory, issueContext))
    .filter((item): item is PortfolioReviewCandidate => Boolean(item))
    .sort((a, b) => {
      return candidateRankScore(b) - candidateRankScore(a);
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
        candidates: rankedCandidates(context, issueContext, "insufficient_fixed_income", 5),
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
        rationale: `${issueContext.dominantSector ?? "One sector"} is the largest look-through sector exposure; candidates are filtered for categories away from that sector.`,
        candidates: rankedCandidates(context, issueContext, "sector_concentration", 5),
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
        candidates: rankedCandidates(context, issueContext, "insufficient_international_exposure", 5),
        benefit: "Can reduce US home bias and add regional diversification.",
        tradeOff: "Introduces currency and non-US market risks."
      }));
    }

    if (issueContext.healthcareWeight < 0.08 && issueContext.technologyWeight > 0.25) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "insufficient_defensive_exposure",
        priority: "low",
        title: "Healthcare & Defensive — Underweighted Category",
        rationale: "Healthcare and defensive sectors are modest relative to technology exposure.",
        candidates: rankedCandidates(context, issueContext, "insufficient_defensive_exposure", 5),
        benefit: "May relate to sector balance without relying only on broad-market ETFs.",
        tradeOff: "Defensive sectors may lag during high-beta technology-led rallies."
      }));
    }

    if (topHolding > 0.25 || diversificationScore < 55) {
      suggestions.push(suggestion({
        category: "diversification",
        issueCategory: "concentration_risk",
        priority: topHolding > 0.3 ? "high" : "medium",
        title: "International Equity — Underweighted Category",
        rationale: "Concentration and diversification metrics suggest the portfolio could benefit from broader exposure review.",
        candidates: rankedCandidates(context, issueContext, "concentration_risk", 5),
        benefit: "May affect direct or indirect concentration risk.",
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
        candidates: rankedCandidates(context, issueContext, "insufficient_inflation_hedge", 3),
        benefit: "Can add inflation and geopolitical hedge characteristics.",
        tradeOff: "Gold and commodity ETFs can lag during disinflationary equity-led markets."
      }));
    }

    if (context.recommendations.length === 0) {
      suggestions.push({
        category: "data_quality",
        issueCategory: "data_quality",
        issueAddressed: "Insight coverage missing",
        priority: "medium",
        title: "Run insights before final review",
        rationale: "Portfolio Review can run without insight outputs, but alignment and candidate screening are limited.",
        candidateInstruments: [],
        expectedPortfolioBenefit: "Improves candidate screening and insight alignment review.",
        potentialTradeOff: "No portfolio exposure change; this is a data readiness item.",
        source: "deterministic_portfolio_review"
      });
    }

    return suggestions;
  }
}
