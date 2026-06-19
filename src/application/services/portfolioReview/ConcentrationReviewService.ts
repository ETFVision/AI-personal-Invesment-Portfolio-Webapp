import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";
import { holdingSnapshot, isIssuerExposure, issuerKey } from "./portfolioIssuerExposure";

type HoldingExposure = NonNullable<PortfolioReviewInputContext["lookthroughReport"]>["holdingExposures"][number];

function issuerName(row: HoldingExposure) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerName = typeof snapshot.issuerName === "string" ? snapshot.issuerName : null;
  return row.holdingIssuerName ?? snapshotIssuerName ?? row.holdingName ?? row.holdingSymbol;
}

function issuerGroupedUnderlying(rows: HoldingExposure[]) {
  const map = new Map<string, HoldingExposure>();
  for (const row of rows) {
    if (!isIssuerExposure(row)) continue;
    const key = issuerKey(row);
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        ...row,
        holdingName: issuerName(row),
        holdingIssuerId: row.holdingIssuerId ?? (typeof holdingSnapshot(row).issuerId === "string" ? holdingSnapshot(row).issuerId as string : null),
        holdingIssuerName: issuerName(row)
      });
      continue;
    }
    current.directWeight += row.directWeight;
    current.indirectWeight += row.indirectWeight;
    current.totalWeight += row.totalWeight;
    for (const source of row.sourceEtfs) {
      const existing = current.sourceEtfs.find((item) => item.symbol === source.symbol);
      if (existing) existing.weight += source.weight;
      else current.sourceEtfs.push({ ...source });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalWeight - a.totalWeight);
}

export class ConcentrationReviewService {
  review({ riskReport, lookthroughReport, dashboard }: PortfolioReviewInputContext) {
    const topHolding = riskReport.concentration.topHoldingConcentration;
    const topFive = riskReport.concentration.topFiveConcentration;
    const totalValue = dashboard.totalValueEstimate;
    const holdingExposures = lookthroughReport?.holdingExposures ?? [];
    const underlyingExposures = issuerGroupedUnderlying(holdingExposures);
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
    const topIndirectHolding = underlyingExposures.filter((holding) => holding.indirectWeight > 0).sort((a, b) => b.indirectWeight - a.indirectWeight)[0] ?? null;
    const topCombinedFive = underlyingExposures.length
      ? underlyingExposures.slice(0, 5).reduce((sum, item) => sum + item.totalWeight, 0)
      : topFive;
    const topIssuerConcentration = underlyingExposures[0]?.totalWeight ?? topHolding;
    const sectorTop = lookthroughReport?.sectorExposures[0]?.exposureWeight ?? riskReport.concentration.bySector[0]?.percent ?? 0;
    const findings = [
      topIssuerConcentration > 0.20
        ? finding("attention", "Single-company concentration", "A single underlying company exceeds 20% of look-through exposure.")
        : topIssuerConcentration > 0.10
          ? finding("watch", "Single-company concentration", "A single underlying company exceeds 10% of look-through exposure.")
          : null,
      topCombinedFive > 0.50 ? finding("watch", "Top five company concentration", "The top five underlying companies account for a large share of look-through exposure.") : null,
      sectorTop > 0.5 ? finding("watch", "Sector concentration", "One sector is more than half of portfolio value.") : null,
      lookthroughReport && lookthroughReport.coverage.etfCount > 0 && lookthroughReport.coverage.etfsWithTopHoldings === 0
        ? finding("info", "Indirect holding exposure unavailable", "ETF top-holding data is unavailable, so indirect holdings are not inferred from ETF tickers.")
        : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 90 - Math.max(0, topIssuerConcentration - 0.10) * 150 - Math.max(0, topCombinedFive - 0.40) * 80 - Math.max(0, sectorTop - 0.40) * 60;
    return section(score, "Concentration is assessed from issuer-level company exposure plus ETF look-through top-five and sector exposure on a total-value basis.", findings, {
      topHoldingConcentration: topIssuerConcentration,
      topFiveConcentration: topCombinedFive,
      largestDirectHolding: topDirectHolding,
      largestIndirectHolding: topIndirectHolding,
      largestSector: lookthroughReport?.sectorExposures[0] ?? riskReport.concentration.bySector[0] ?? null,
      combinedTopExposures: underlyingExposures.slice(0, 10)
    });
  }
}
