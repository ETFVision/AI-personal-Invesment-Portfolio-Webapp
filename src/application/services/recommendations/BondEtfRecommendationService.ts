import { buildEvaluation, scoreMacroFit, scoreMarketVisionAlignment, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

function scoreDurationFit(input: RecommendationInput) {
  const duration = input.bondProfile?.durationCategory;
  if (!duration) return null;
  if (duration === "ultra-short" || duration === "short") return 72;
  if (duration === "intermediate") return 62;
  return 48;
}

function scoreRateRegime(input: RecommendationInput) {
  if (!input.macroRegime || !input.bondProfile) return null;
  const rates = input.macroRegime.ratesRegime.toLowerCase();
  const duration = input.bondProfile.durationCategory;
  if (duration === "long" && (rates.includes("high") || rates.includes("restrictive") || rates.includes("rising"))) return 35;
  if ((duration === "ultra-short" || duration === "short") && rates.includes("restrictive")) return 75;
  return 58;
}

function scoreInflationRegime(input: RecommendationInput) {
  if (!input.macroRegime || !input.bondProfile) return null;
  const inflation = input.macroRegime.inflationRegime.toLowerCase();
  if (input.bondProfile.inflationLinked && (inflation.includes("elevated") || inflation.includes("rising"))) return 78;
  if (input.bondProfile.durationCategory === "long" && inflation.includes("elevated")) return 42;
  return 58;
}

export class BondEtfRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const creditScore = input.bondProfile?.creditQuality === "high yield" ? 40 : input.bondProfile?.creditQuality ? 65 : null;
    const stabilityScore = input.bondProfile?.liquidityRole === "cash-like" || input.bondProfile?.treasuryClassification === "treasury" ? 75 : 55;
    const components: ScoreComponent[] = [
      { key: "duration_fit", label: "Duration Fit", score: scoreDurationFit(input), weight: 0.2, reason: "Duration profile fits the portfolio role" },
      { key: "rate_regime", label: "Rate Regime", score: scoreRateRegime(input), weight: 0.2, reason: "Rate regime supports this duration" },
      { key: "inflation_regime", label: "Inflation Regime", score: scoreInflationRegime(input), weight: 0.15, reason: "Inflation regime supports bond role" },
      { key: "yield_curve", label: "Yield Curve", score: scoreMacroFit(input.instrument, input.macroRegime, input.bondProfile), weight: 0.12, reason: "Yield-curve context supports the holding" },
      { key: "credit_risk", label: "Credit Risk", score: creditScore, weight: 0.1, reason: "Credit quality is controlled" },
      { key: "portfolio_stability", label: "Portfolio Stability", score: stabilityScore, weight: 0.1, reason: "Adds portfolio stability" },
      { key: "diversification", label: "Diversification", score: input.portfolioFit.score, weight: 0.08, reason: "Improves fixed-income diversification" },
      { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.05, reason: "Market Vision supports fixed-income role" }
    ];
    return buildEvaluation(input, this.rules, components, {
      timeHorizon: "medium_term",
      negativeDrivers: [input.bondProfile?.creditQuality === "high yield" ? "High-yield credit risk" : ""].filter(Boolean),
      changeTriggers: {
        upgrade: ["Rate regime becomes more supportive for this duration"],
        downgrade: ["Market Vision or FRED regime flags higher duration or credit stress"]
      }
    });
  }
}
