import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class DiversificationReviewService {
  review({ riskReport, dashboard, lookthroughReport }: PortfolioReviewInputContext) {
    const score = riskReport.diversification.score;
    const meaningfulHoldings = dashboard.holdingValuations.filter((valuation) => dashboard.totalValueEstimate > 0 && valuation.value / dashboard.totalValueEstimate >= 0.01).length;
    const sectorCount = (lookthroughReport?.sectorExposures ?? []).filter((item) => item.exposureWeight >= 0.03).length;
    const countryCount = (lookthroughReport?.countryExposures ?? []).filter((item) => item.exposureWeight >= 0.03).length;
    const findings = [
      score < 50 ? finding("attention", "Diversification score is low", "The portfolio may rely on a narrow set of holdings, sectors or correlated assets.") : null,
      riskReport.correlations.highCorrelationPairs.length > 0 ? finding("watch", "High correlations detected", "Some holdings may move together and reduce practical diversification.") : null,
      meaningfulHoldings < 8 ? finding("watch", "Limited number of meaningful holdings", "Only holdings above 1% of portfolio value count as meaningful exposures.") : null,
      lookthroughReport && sectorCount < 5 ? finding("watch", "Narrow look-through sector spread", "ETF look-through shows only a small number of meaningful sector exposures.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const adjustedScore = lookthroughReport ? Math.min(100, score + Math.min(8, sectorCount + countryCount)) : score;
    return section(adjustedScore, "Diversification combines meaningful holding count, asset-class spread, look-through sector/geography spread, currency spread and correlations.", findings, {
      meaningfulHoldings,
      averageCorrelation: riskReport.correlations.averageCorrelation,
      highCorrelationPairs: riskReport.correlations.highCorrelationPairs.slice(0, 5),
      lookthroughSectorCount: sectorCount || null,
      lookthroughCountryCount: countryCount || null,
      lookthroughCoverage: lookthroughReport?.coverage ?? null
    });
  }
}
