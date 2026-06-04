import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class GeographyReviewService {
  review({ lookthroughReport, dashboard }: PortfolioReviewInputContext) {
    const countryExposures = lookthroughReport?.countryExposures ?? dashboard.allocationByGeography.map((item) => ({
      portfolioId: dashboard.portfolio.id,
      exposureType: "country" as const,
      exposureName: item.label,
      exposureWeight: item.percent,
      directWeight: item.percent,
      etfLookthroughWeight: 0,
      asOfDate: dashboard.latestPriceDate ?? ""
    }));
    const dominantCountry = countryExposures[0] ?? null;
    const usWeight = countryExposures.find((item) => ["us", "united states", "usa"].includes(item.exposureName.toLowerCase()))?.exposureWeight ?? 0;
    const internationalWeight = Math.max(0, 1 - usWeight);
    const findings = [
      usWeight > 0.8 ? finding("watch", "High US home bias", "Look-through exposure is heavily concentrated in US-listed or US-domiciled assets.") : null,
      internationalWeight < 0.15 ? finding("watch", "Limited international exposure", "Non-US look-through exposure is below a broad global diversification threshold.") : null,
      !lookthroughReport ? finding("info", "Look-through geography fallback", "Geography review is using direct allocation fallback until ETF country exposures are refreshed.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 86 - Math.max(0, usWeight - 0.7) * 80 - Math.max(0, 0.12 - internationalWeight) * 120;
    return section(score, "Geography review uses ETF country look-through where available and direct geography otherwise.", findings, {
      dominantCountry,
      usExposure: usWeight,
      internationalExposure: internationalWeight,
      countryCount: countryExposures.filter((item) => item.exposureWeight >= 0.01).length,
      lookthroughCoverage: lookthroughReport?.coverage ?? null
    });
  }
}
