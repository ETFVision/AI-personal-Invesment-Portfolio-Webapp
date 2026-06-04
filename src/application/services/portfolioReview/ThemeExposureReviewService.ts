import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class ThemeExposureReviewService {
  review({ dashboard, themeIntelligence, lookthroughReport }: PortfolioReviewInputContext) {
    const largestSector = lookthroughReport?.sectorExposures[0] ?? dashboard.allocationBySector[0];
    const portfolioThemes = lookthroughReport?.themeExposures ?? [];
    const topThemes = themeIntelligence?.topThemesThisWeek ?? [];
    const portfolioThemeNames = new Set(
      (portfolioThemes.length ? portfolioThemes.map((theme) => theme.exposureName) : dashboard.holdings
        .flatMap((holding) => [holding.sector, holding.assetType])
        .filter((item): item is string => Boolean(item)))
        .map((item) => item.toLowerCase())
    );
    const alignedThemeCount = topThemes.filter((theme) =>
      portfolioThemeNames.has(theme.theme.toLowerCase()) ||
      (theme.theme === "AI" && portfolioThemeNames.has("technology"))
    ).length;
    const findings = [
      largestSector && ("exposureWeight" in largestSector ? largestSector.exposureWeight : largestSector.percent) > 0.5 ? finding("watch", "Theme exposure may be concentrated", `${"exposureName" in largestSector ? largestSector.exposureName : largestSector.label} is the largest sector exposure.`) : null,
      topThemes.length === 0 ? finding("info", "Theme intelligence is limited", "No recent news or FRED theme summary is available for the current review window.") : null,
      alignedThemeCount > 0 ? finding("info", "Portfolio overlaps current themes", "Some current holdings overlap with this week's dominant news and macro themes.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const largestSectorWeight = largestSector ? ("exposureWeight" in largestSector ? largestSector.exposureWeight : largestSector.percent) : 0;
    const score = 64 + Math.min(15, alignedThemeCount * 4) - Math.max(0, largestSectorWeight - 0.45) * 50;
    return section(score, "Theme exposure compares ETF look-through sectors and themes with current News & Themes intelligence.", findings, {
      largestSector: largestSector ?? null,
      topPortfolioThemes: portfolioThemes.slice(0, 8),
      topThemes: topThemes.slice(0, 8),
      alignedThemeCount
    });
  }
}
