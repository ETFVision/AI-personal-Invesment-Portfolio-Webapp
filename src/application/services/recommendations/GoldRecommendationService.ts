import { buildEvaluation, scoreMacroFit, scoreMomentum, scoreRisk, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

function scoreInflationHedge(input: RecommendationInput) {
  if (!input.macroRegime) return null;
  const inflation = input.macroRegime.inflationRegime.toLowerCase();
  return inflation.includes("elevated") || inflation.includes("rising") ? 78 : 55;
}

function scoreGeopoliticalHedge(input: RecommendationInput) {
  if (!input.macroRegime) return null;
  const liquidity = input.macroRegime.liquidityRegime.toLowerCase();
  return liquidity.includes("stress") || liquidity.includes("tight") ? 72 : 55;
}

export class GoldRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const components: ScoreComponent[] = [
      { key: "inflation_hedge", label: "Inflation Hedge", score: scoreInflationHedge(input), weight: 0.25, reason: "Inflation backdrop supports gold hedge value" },
      { key: "geopolitical_hedge", label: "Geopolitical Hedge", score: scoreGeopoliticalHedge(input), weight: 0.2, reason: "Risk backdrop supports hedge value" },
      { key: "diversification", label: "Diversification", score: input.portfolioFit.score, weight: 0.2, reason: "Gold improves diversification" },
      { key: "rates_context", label: "Rates Context", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.15, reason: "Rates context is supportive" },
      { key: "portfolio_fit", label: "Portfolio Fit", score: input.portfolioFit.score, weight: 0.1, reason: "Position size fits portfolio" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.1, reason: "Positive gold momentum" }
    ];
    return buildEvaluation(input, this.rules, components, {
      timeHorizon: "medium_term",
      positiveDrivers: [scoreRisk(input.riskMetric) != null && (scoreRisk(input.riskMetric) ?? 0) >= 65 ? "Controlled volatility for hedge role" : ""].filter(Boolean)
    });
  }
}
