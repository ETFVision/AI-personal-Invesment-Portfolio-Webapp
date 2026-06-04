import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class ConcentrationReviewService {
  review({ riskReport, lookthroughReport, dashboard }: PortfolioReviewInputContext) {
    const topHolding = riskReport.concentration.topHoldingConcentration;
    const topFive = riskReport.concentration.topFiveConcentration;
    const totalValue = dashboard.totalValueEstimate;
    const holdingExposures = lookthroughReport?.holdingExposures ?? [];
    const topDirectHolding = holdingExposures.length
      ? holdingExposures.filter((holding) => holding.directWeight > 0).sort((a, b) => b.directWeight - a.directWeight)[0] ?? null
      : dashboard.holdingValuations
        .filter((valuation) => valuation.value > 0)
        .map((valuation) => ({
          portfolioId: dashboard.portfolio.id,
          asOfDate: dashboard.latestPriceDate ?? "",
          holdingSymbol: valuation.holding.ticker ?? valuation.holding.assetName,
          holdingName: valuation.holding.assetName,
          directWeight: totalValue > 0 ? valuation.value / totalValue : 0,
          indirectWeight: 0,
          totalWeight: totalValue > 0 ? valuation.value / totalValue : 0,
          sourceEtfs: [],
          inputsSnapshot: {}
        }))
        .sort((a, b) => b.directWeight - a.directWeight)[0] ?? null;
    const topIndirectHolding = holdingExposures.filter((holding) => holding.indirectWeight > 0).sort((a, b) => b.indirectWeight - a.indirectWeight)[0] ?? null;
    const topCombinedFive = holdingExposures.length
      ? holdingExposures.slice(0, 5).reduce((sum, item) => sum + item.totalWeight, 0)
      : topFive;
    const sectorTop = lookthroughReport?.sectorExposures[0]?.exposureWeight ?? riskReport.concentration.bySector[0]?.percent ?? 0;
    const findings = [
      topHolding > 0.25 ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.") : null,
      topCombinedFive > 0.65 ? finding("attention", "Top five concentration", "The top five direct and indirect holdings account for a large share of invested assets.") : null,
      sectorTop > 0.5 ? finding("watch", "Sector concentration", "One sector is more than half of portfolio value.") : null,
      lookthroughReport && lookthroughReport.coverage.etfCount > 0 && lookthroughReport.coverage.etfsWithTopHoldings === 0
        ? finding("info", "Indirect holding exposure unavailable", "ETF top-holding data is unavailable, so indirect holdings are not inferred from ETF tickers.")
        : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 90 - Math.max(0, topHolding - 0.15) * 120 - Math.max(0, topCombinedFive - 0.5) * 80 - Math.max(0, sectorTop - 0.4) * 60;
    return section(score, "Concentration is assessed from direct holdings plus ETF look-through top holding and sector exposure.", findings, {
      topHoldingConcentration: topHolding,
      topFiveConcentration: topCombinedFive,
      largestDirectHolding: topDirectHolding,
      largestIndirectHolding: topIndirectHolding,
      largestSector: lookthroughReport?.sectorExposures[0] ?? riskReport.concentration.bySector[0] ?? null,
      combinedTopExposures: holdingExposures.slice(0, 10)
    });
  }
}
