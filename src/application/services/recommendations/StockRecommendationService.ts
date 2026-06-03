import { buildEvaluation, scoreMacroFit, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export class StockRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const score = input.fundamentals?.latestScore ?? null;
    const trend = input.fundamentals?.latestTrendSummary ?? null;
    const components: ScoreComponent[] = [
      { key: "fundamentals", label: "Fundamentals", score: score?.overallFundamentalScore ?? null, weight: 0.3, reason: "Strong overall fundamentals" },
      { key: "fundamental_trends", label: "Fundamental Trends", score: trend?.overallTrendScore ?? null, weight: 0.2, reason: "Improving fundamental trends" },
      { key: "valuation", label: "Valuation", score: score?.valuationScore ?? null, weight: 0.1, reason: "Supportive valuation score" },
      { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMacroFit(input.instrument, input.macroRegime), weight: 0.1, reason: "Macro context supports the instrument" },
      { key: "theme_alignment", label: "Theme Alignment", score: scoreThemeFit(input.instrument), weight: 0.1, reason: "Useful canonical theme alignment" },
      { key: "risk_analytics", label: "Risk Analytics", score: scoreRisk(input.riskMetric), weight: 0.1, reason: "Instrument risk is controlled" },
      { key: "portfolio_fit", label: "Portfolio Fit", score: input.portfolioFit.score, weight: 0.05, reason: "Improves portfolio fit" },
      { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.05, reason: "Positive price momentum" }
    ];
    return buildEvaluation(input, this.rules, components, {
      fundamentalScore: score?.overallFundamentalScore ?? null,
      valuationScore: score?.valuationScore ?? null,
      positiveDrivers: [
        score?.profitabilityScore != null && score.profitabilityScore >= 70 ? "Strong profitability" : "",
        score?.cashFlowScore != null && score.cashFlowScore >= 70 ? "Strong cash flow" : "",
        trend?.overallTrendScore != null && trend.overallTrendScore >= 70 ? "Improving fundamentals trend" : ""
      ].filter(Boolean),
      negativeDrivers: [
        score?.valuationScore != null && score.valuationScore < 40 ? "Valuation score is weak" : "",
        trend?.overallTrendScore != null && trend.overallTrendScore < 40 ? "Fundamental trend is deteriorating" : ""
      ].filter(Boolean)
    });
  }
}
