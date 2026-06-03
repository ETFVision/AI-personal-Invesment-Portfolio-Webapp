import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class RecommendationAlignmentReviewService {
  review({ dashboard, recommendations }: PortfolioReviewInputContext) {
    const holdingSymbols = new Set(dashboard.holdings.map((holding) => holding.ticker?.toUpperCase()).filter(Boolean));
    const heldRecommendations = recommendations.filter((item) => holdingSymbols.has(item.symbol.toUpperCase()));
    const weakHeld = heldRecommendations.filter((item) => ["Reduce", "Sell", "Watch"].includes(item.recommendationLabel));
    const constructiveHeld = heldRecommendations.filter((item) => ["Strong Buy", "Buy", "Hold"].includes(item.recommendationLabel));
    const coverage = dashboard.holdings.length === 0 ? 0 : heldRecommendations.length / dashboard.holdings.length;
    const findings = [
      coverage < 0.7 ? finding("watch", "Recommendation coverage is incomplete", "Some holdings do not yet have deterministic recommendation output.") : null,
      weakHeld.length > 0 ? finding("attention", "Some holdings need review", "A subset of current holdings is labelled Watch, Reduce or Sell by the recommendation engine.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 60 + constructiveHeld.length * 4 - weakHeld.length * 8 + coverage * 12;
    return section(score, "Recommendation alignment checks whether current holdings agree with the deterministic recommendation engine.", findings, {
      recommendationCoverage: coverage,
      heldRecommendations: heldRecommendations.map((item) => ({
        symbol: item.symbol,
        label: item.recommendationLabel,
        score: item.overallScore,
        guardrails: item.guardrailsApplied
      })),
      weakHeldCount: weakHeld.length
    });
  }
}
