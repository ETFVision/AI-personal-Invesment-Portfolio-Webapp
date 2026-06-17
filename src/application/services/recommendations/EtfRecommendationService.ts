import { buildEvaluation, scoreMacroFit, scoreMarketVisionAlignment, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export class EtfRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const benchmarkRelative = input.marketMetric?.oneYearReturn == null ? null : Math.max(0, Math.min(100, 50 + input.marketMetric.oneYearReturn * 50));
    const components: ScoreComponent[] = [
      { key: "risk_analytics", label: "Risk Analytics", score: scoreRisk(input.riskMetric), weight: 0.30, reason: "ETF risk is controlled" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.20, reason: "Positive ETF momentum" },
      { key: "macro_fit", label: "Macro Fit", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.18, reason: "Macro context supports ETF exposure" },
      { key: "benchmark_relative", label: "Benchmark Relative", score: benchmarkRelative, weight: 0.18, reason: "Historical return profile is supportive" },
      { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.09, reason: "Market Vision supports ETF exposure" },
      { key: "theme_fit", label: "Theme Fit", score: scoreThemeFit(input.instrument), weight: 0.05, reason: "ETF theme exposure is useful" }
    ];
    return buildEvaluation(input, this.rules, components);
  }
}
