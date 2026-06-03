import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class ConcentrationReviewService {
  review({ riskReport }: PortfolioReviewInputContext) {
    const topHolding = riskReport.concentration.topHoldingConcentration;
    const topFive = riskReport.concentration.topFiveConcentration;
    const sectorTop = riskReport.concentration.bySector[0]?.percent ?? 0;
    const findings = [
      topHolding > 0.25 ? finding("attention", "Top holding concentration", "The largest holding exceeds 25% of invested assets.") : null,
      topFive > 0.65 ? finding("attention", "Top five concentration", "The top five holdings account for a large share of invested assets.") : null,
      sectorTop > 0.5 ? finding("watch", "Sector concentration", "One sector is more than half of portfolio value.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 90 - Math.max(0, topHolding - 0.15) * 120 - Math.max(0, topFive - 0.5) * 80 - Math.max(0, sectorTop - 0.4) * 60;
    return section(score, "Concentration is assessed from top holding, top-five and sector exposure.", findings, {
      topHoldingConcentration: topHolding,
      topFiveConcentration: topFive,
      largestSector: riskReport.concentration.bySector[0] ?? null
    });
  }
}
