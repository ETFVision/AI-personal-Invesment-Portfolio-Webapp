import { buildEvaluation, scoreMacroFit, scoreMarketVisionAlignment, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export class CryptoRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const liquidityScore = input.macroRegime?.liquidityRegime?.toLowerCase().includes("tight") ? 35 : input.macroRegime ? 58 : null;
    const components: ScoreComponent[] = [
      { key: "risk", label: "Risk", score: scoreRisk(input.riskMetric), weight: 0.40, reason: "Crypto risk is controlled" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.20, reason: "Positive crypto momentum" },
      { key: "liquidity_regime", label: "Liquidity Regime", score: liquidityScore, weight: 0.20, reason: "Liquidity regime supports risk assets" },
      { key: "macro_risk_appetite", label: "Macro Risk Appetite", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.09, reason: "Macro risk appetite is supportive" },
      { key: "theme_score", label: "Theme Score", score: scoreThemeFit(input.instrument), weight: 0.07, reason: "Digital asset theme alignment" },
      { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.04, reason: "Market Vision risk appetite is supportive" }
    ];
    return buildEvaluation(input, this.rules, components, {
      baseConfidence: 62,
      timeHorizon: "long_term",
      negativeDrivers: ["Crypto insight classifications are intentionally conservative in V1"],
      changeTriggers: {
        upgrade: ["Liquidity regime and Market Vision risk appetite improve"],
        downgrade: ["Crypto risk or liquidity stress rises"]
      }
    });
  }
}
