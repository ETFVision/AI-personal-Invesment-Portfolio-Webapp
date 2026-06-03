import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class DiversificationReviewService {
  review({ riskReport, dashboard }: PortfolioReviewInputContext) {
    const score = riskReport.diversification.score;
    const meaningfulHoldings = dashboard.holdingValuations.filter((valuation) => dashboard.totalValueEstimate > 0 && valuation.value / dashboard.totalValueEstimate >= 0.01).length;
    const findings = [
      score < 50 ? finding("attention", "Diversification score is low", "The portfolio may rely on a narrow set of holdings, sectors or correlated assets.") : null,
      riskReport.correlations.highCorrelationPairs.length > 0 ? finding("watch", "High correlations detected", "Some holdings may move together and reduce practical diversification.") : null,
      meaningfulHoldings < 8 ? finding("watch", "Limited number of meaningful holdings", "Only holdings above 1% of portfolio value count as meaningful exposures.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    return section(score, "Diversification combines meaningful holding count, asset-class spread, sector spread, currency spread and correlations.", findings, {
      meaningfulHoldings,
      averageCorrelation: riskReport.correlations.averageCorrelation,
      highCorrelationPairs: riskReport.correlations.highCorrelationPairs.slice(0, 5)
    });
  }
}
