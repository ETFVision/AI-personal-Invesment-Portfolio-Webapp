import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

type HoldingExposure = NonNullable<PortfolioReviewInputContext["lookthroughReport"]>["holdingExposures"][number];

function holdingSnapshot(row: HoldingExposure) {
  return row.inputsSnapshot && typeof row.inputsSnapshot === "object" ? row.inputsSnapshot as Record<string, unknown> : {};
}

function instrumentAssetClass(row: HoldingExposure) {
  const value = holdingSnapshot(row).instrumentAssetClass;
  return typeof value === "string" ? value : null;
}

function exposureRole(row: HoldingExposure) {
  const value = holdingSnapshot(row).exposureRole;
  return typeof value === "string" ? value : null;
}

function isFundWrapper(row: HoldingExposure) {
  const assetClass = instrumentAssetClass(row);
  return row.directWeight > 0 && row.indirectWeight === 0 && ["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"].includes(assetClass ?? "");
}

function isUnderlyingExposure(row: HoldingExposure) {
  return row.indirectWeight > 0 || exposureRole(row) === "underlying_security";
}

function normalizeIssuerName(name: string | null | undefined, fallback: string) {
  return (name ?? fallback)
    .replace(/\s+Class\s+[A-Z0-9]+$/i, "")
    .replace(/\s+Ordinary\s+Shares?$/i, "")
    .replace(/\s+Common\s+Stock$/i, "")
    .replace(/\s+Sponsored\s+ADR$/i, "")
    .replace(/\s+ADR$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || fallback.toUpperCase();
}

function issuerName(row: HoldingExposure) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerName = typeof snapshot.issuerName === "string" ? snapshot.issuerName : null;
  return row.holdingIssuerName ?? snapshotIssuerName ?? row.holdingName ?? row.holdingSymbol;
}

function issuerKey(row: HoldingExposure) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerId = typeof snapshot.issuerId === "string" ? snapshot.issuerId : null;
  return row.holdingIssuerId ?? snapshotIssuerId ?? normalizeIssuerName(row.holdingName, row.holdingSymbol);
}

function issuerGroupedUnderlying(rows: HoldingExposure[]) {
  const map = new Map<string, HoldingExposure>();
  for (const row of rows) {
    if (isFundWrapper(row) || !isUnderlyingExposure(row)) continue;
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
      combinedTopExposures: underlyingExposures.slice(0, 10)
    });
  }
}
