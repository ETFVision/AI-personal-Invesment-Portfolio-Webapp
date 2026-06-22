import { allocationPercent, finding, isEquityAllocationLabel, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

function textIncludes(value: string | null | undefined, terms: string[]) {
  const text = (value ?? "").toLowerCase();
  return terms.some((term) => text.includes(term));
}

function heldInflationHedges({ holdings }: PortfolioReviewInputContext["dashboard"]) {
  const hedgeSymbols = new Set(["TIP", "STIP", "GLD", "IAU", "SGOL", "DBC", "PDBC", "COMT"]);
  return holdings
    .map((holding) => holding.ticker?.toUpperCase())
    .filter((symbol): symbol is string => Boolean(symbol && hedgeSymbols.has(symbol)));
}

export class MacroFitReviewService {
  review({ macroRegime, marketVisionReport, dashboard }: PortfolioReviewInputContext) {
    const equityAllocation = allocationPercent(dashboard.allocationByType, isEquityAllocationLabel);
    const ratesRestrictive = textIncludes(macroRegime?.ratesRegime, ["restrictive", "rising", "high"]);
    const inflationElevated = textIncludes(macroRegime?.inflationRegime, ["elevated", "sticky", "rising"]);
    const growthWeak = textIncludes(macroRegime?.growthRegime, ["weak", "slowing", "recession"]);
    const marketVisionRiskText = [
      marketVisionReport?.executiveSummary,
      marketVisionReport?.globalMarketSummary,
      marketVisionReport?.portfolioImplications.riskImplication,
      ...(marketVisionReport?.risks ?? [])
    ].filter(Boolean).join(" ").toLowerCase();
    const inflationHedges = heldInflationHedges(dashboard);
    const inflationDetail = inflationHedges.length > 0
      ? `Existing inflation-sensitive holdings detected: ${inflationHedges.join(", ")}. Inflation-linked, commodity and cash-like sleeves may still be useful context for review.`
      : "Inflation-linked, commodity and cash-like sleeves may be useful context for review.";
    const findings = [
      ratesRestrictive && equityAllocation > 0.75 ? finding("watch", "Equity exposure in restrictive rates", "Higher rates can pressure long-duration growth assets and broad equity multiples.") : null,
      inflationElevated ? finding("info", "Inflation regime is active", inflationDetail) : null,
      growthWeak ? finding("watch", "Growth regime is weak", "Defensive quality, cash-like and treasury exposures deserve closer review.") : null,
      marketVisionRiskText.includes("risk") ? finding("info", "Market Vision risk context available", "The latest CIO-style report includes risk language that is captured in this review.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 72
      - (ratesRestrictive && equityAllocation > 0.75 ? 8 : 0)
      - (growthWeak && equityAllocation > 0.7 ? 10 : 0)
      + (inflationElevated && dashboard.allocationByType.some((item) => item.label.toLowerCase().includes("gold")) ? 5 : 0);
    return section(score, "Macro fit compares portfolio posture against FRED regimes and the latest Market Vision context.", findings, {
      ratesRegime: macroRegime?.ratesRegime ?? null,
      inflationRegime: macroRegime?.inflationRegime ?? null,
      growthRegime: macroRegime?.growthRegime ?? null,
      marketVisionReportDate: marketVisionReport?.reportDate ?? null
    });
  }
}
