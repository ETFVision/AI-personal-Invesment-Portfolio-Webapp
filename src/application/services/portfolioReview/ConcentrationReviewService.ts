import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class ConcentrationReviewService {
  review({ riskReport, lookthroughReport }: PortfolioReviewInputContext) {
    const topHolding = riskReport.concentration.topHoldingConcentration;
    const topFive = riskReport.concentration.topFiveConcentration;
    const topIndirectHolding = lookthroughReport?.topHoldingExposures[0] ?? null;
    const topCombinedFive = lookthroughReport?.topHoldingExposures.slice(0, 5).reduce((sum, item) => sum + item.exposureWeight, 0) ?? topFive;
    const sectorTop = lookthroughReport?.sectorExposures[0]?.exposureWeight ?? riskReport.concentration.bySector[0]?.percent ?? 0;
    const findings = [
      topHolding > 0.25 ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.") : null,
      topCombinedFive > 0.65 ? finding("attention", "Top five concentration", "The top five direct and indirect holdings account for a large share of invested assets.") : null,
      sectorTop > 0.5 ? finding("watch", "Sector concentration", "One sector is more than half of portfolio value.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 90 - Math.max(0, topHolding - 0.15) * 120 - Math.max(0, topCombinedFive - 0.5) * 80 - Math.max(0, sectorTop - 0.4) * 60;
    return section(score, "Concentration is assessed from direct holdings plus ETF look-through top holding and sector exposure.", findings, {
      topHoldingConcentration: topHolding,
      topFiveConcentration: topCombinedFive,
      largestDirectHolding: riskReport.concentration.topHoldingConcentration,
      largestIndirectHolding: topIndirectHolding,
      largestSector: lookthroughReport?.sectorExposures[0] ?? riskReport.concentration.bySector[0] ?? null,
      combinedTopExposures: lookthroughReport?.topHoldingExposures.slice(0, 10) ?? []
    });
  }
}
