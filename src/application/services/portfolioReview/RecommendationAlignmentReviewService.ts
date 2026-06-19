import { assessmentLabel } from "../recommendations/recommendationPresentation";
import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class RecommendationAlignmentReviewService {
  review({ dashboard, recommendations }: PortfolioReviewInputContext) {
    const holdingSymbols = new Set(dashboard.holdings.map((holding) => holding.ticker?.toUpperCase()).filter(Boolean));
    const heldRecommendations = recommendations.filter((item) => holdingSymbols.has(item.symbol.toUpperCase()));
    const weakHeld = heldRecommendations.filter((item) => ["Reduce", "Sell", "Watch"].includes(item.recommendationLabel));
    const constructiveHeld = heldRecommendations.filter((item) => ["Strong Buy", "Buy", "Hold"].includes(item.recommendationLabel));
    const coverage = dashboard.holdings.length === 0 ? 0 : heldRecommendations.length / dashboard.holdings.length;
    const findings = [
      coverage < 0.7 ? finding("watch", "Insights coverage is incomplete", "Some holdings do not yet have deterministic insight output.") : null,
      weakHeld.length > 0 ? finding("attention", "Some holdings need review", "A subset of current holdings has Weak, Poor or Significant Concerns insight assessments.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const rawScore = 60 + constructiveHeld.length * 4 - weakHeld.length * 8 + coverage * 12;
    const hasConcern = findings.some((item) => item.severity !== "info");
    const score = hasConcern ? Math.min(rawScore, 94) : rawScore;
    return section(score, "Insight alignment checks whether current holdings agree with the deterministic characteristics engine.", findings, {
      recommendationCoverage: coverage,
      heldRecommendations: heldRecommendations.map((item) => ({
        symbol: item.symbol,
        label: assessmentLabel(item.recommendationLabel),
        score: item.overallScore,
        guardrails: item.guardrailsApplied
      })),
      weakHeldCount: weakHeld.length
    });
  }
}
