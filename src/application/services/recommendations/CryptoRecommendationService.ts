import { buildEvaluation, scoreMacroFit, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export class CryptoRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const concentration = input.portfolioFit.concentrationPercent;
    const concentrationScore = concentration == null ? null : Math.max(0, Math.min(100, 70 - concentration * 500));
    const liquidityScore = input.macroRegime?.liquidityRegime?.toLowerCase().includes("tight") ? 35 : input.macroRegime ? 58 : null;
    const components: ScoreComponent[] = [
      { key: "risk", label: "Risk", score: scoreRisk(input.riskMetric), weight: 0.3, reason: "Crypto risk is controlled" },
      { key: "portfolio_concentration", label: "Portfolio Concentration", score: concentrationScore, weight: 0.25, reason: "Crypto allocation remains small" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.15, reason: "Positive crypto momentum" },
      { key: "liquidity_regime", label: "Liquidity Regime", score: liquidityScore, weight: 0.15, reason: "Liquidity regime supports risk assets" },
      { key: "macro_risk_appetite", label: "Macro Risk Appetite", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.1, reason: "Macro risk appetite is supportive" },
      { key: "theme_score", label: "Theme Score", score: scoreThemeFit(input.instrument), weight: 0.05, reason: "Digital asset theme alignment" }
    ];
    return buildEvaluation(input, this.rules, components, {
      baseConfidence: 62,
      timeHorizon: "long_term",
      negativeDrivers: ["Crypto recommendations are intentionally conservative in V1"]
    });
  }
}
