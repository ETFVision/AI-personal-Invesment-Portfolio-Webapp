import { buildEvaluation, scoreBusinessQuality, scoreMarketVisionAlignment, scoreMomentum, scoreRisk, scoreThemeFit, type RecommendationInput } from "./recommendationScoring";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export class StockRecommendationService {
  constructor(private readonly rules: RecommendationRulesService) {}

  evaluate(input: RecommendationInput) {
    const score = input.fundamentals?.latestScore ?? null;
    const trend = input.fundamentals?.latestTrendSummary ?? null;
    const businessQualityScore = scoreBusinessQuality(score);
    const phase2Enabled = process.env.ENABLE_STOCK_PHASE2_SCORES === "true";
    const components: ScoreComponent[] = phase2Enabled
      ? [
          { key: "business_quality", label: "Business Quality", score: businessQualityScore, weight: 0.40, reason: "Strong business quality" },
          { key: "valuation", label: "Valuation", score: score?.valuationScore ?? null, weight: 0.20, reason: "Supportive valuation characteristics" },
          { key: "fundamental_trends", label: "Fundamental Trends", score: trend?.overallTrendScore ?? null, weight: 0.15, reason: "Improving fundamental trends" },
          { key: "risk_analytics", label: "Risk Analytics", score: scoreRisk(input.riskMetric), weight: 0.10, reason: "Instrument risk is controlled" },
          { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.07, reason: "Market Vision context supports the instrument" },
          { key: "theme_alignment", label: "Theme Alignment", score: scoreThemeFit(input.instrument), weight: 0.05, reason: "Useful canonical theme alignment" },
          { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.03, reason: "Positive price momentum" }
        ]
      : [
          { key: "fundamentals", label: "Fundamentals", score: score?.overallFundamentalScore ?? null, weight: 0.32, reason: "Strong overall fundamentals" },
          { key: "fundamental_trends", label: "Fundamental Trends", score: trend?.overallTrendScore ?? null, weight: 0.21, reason: "Improving fundamental trends" },
          { key: "valuation", label: "Valuation", score: score?.valuationScore ?? null, weight: 0.11, reason: "Supportive valuation score" },
          { key: "risk_analytics", label: "Risk Analytics", score: scoreRisk(input.riskMetric), weight: 0.11, reason: "Instrument risk is controlled" },
          { key: "market_vision_alignment", label: "Market Vision Alignment", score: scoreMarketVisionAlignment(input), weight: 0.10, reason: "Market Vision context supports the instrument" },
          { key: "theme_alignment", label: "Theme Alignment", score: scoreThemeFit(input.instrument), weight: 0.10, reason: "Useful canonical theme alignment" },
          { key: "momentum", label: "Momentum", score: scoreMomentum(input.marketMetric), weight: 0.05, reason: "Positive price momentum" }
        ];
    return buildEvaluation(input, this.rules, components, {
      fundamentalScore: score?.overallFundamentalScore ?? null,
      valuationScore: score?.valuationScore ?? null,
      businessQualityScore,
      positiveDrivers: [
        score?.profitabilityScore != null && score.profitabilityScore >= 70 ? "Strong profitability" : "",
        score?.cashFlowScore != null && score.cashFlowScore >= 70 ? "Strong cash flow" : "",
        trend?.overallTrendScore != null && trend.overallTrendScore >= 70 ? "Improving fundamentals trend" : ""
      ].filter(Boolean),
      negativeDrivers: [
        score?.valuationScore != null && score.valuationScore < 40 ? (phase2Enabled ? "Valuation characteristics are stretched" : "Valuation score is weak") : "",
        trend?.overallTrendScore != null && trend.overallTrendScore < 40 ? "Fundamental trend is deteriorating" : ""
      ].filter(Boolean),
      changeTriggers: {
        upgrade: ["Market Vision becomes more supportive of this sector or theme"],
        downgrade: ["Market Vision flags persistent risk to this sector or theme"]
      }
    });
  }
}
