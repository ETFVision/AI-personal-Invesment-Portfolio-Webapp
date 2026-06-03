import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

export class FixedIncomeReviewService {
  review({ bondReport }: PortfolioReviewInputContext) {
    const findings = [
      bondReport.totalBondAllocation < 0.05 ? finding("watch", "Small fixed-income sleeve", "Bond ETF allocation is low, so defensive fixed-income ballast is limited.") : null,
      bondReport.longDurationExposure > 0.4 ? finding("attention", "Long-duration exposure is high", "Long-duration bond ETFs can be sensitive to rate moves.") : null,
      bondReport.highYieldExposure > 0.25 ? finding("attention", "High-yield credit exposure is high", "High-yield ETFs behave more like credit risk than defensive ballast.") : null,
      bondReport.cashLikeExposure > 0.25 ? finding("info", "Cash-like bond exposure is material", "Short-duration treasury ETFs can support stability and liquidity.") : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 78
      - Math.max(0, 0.08 - bondReport.totalBondAllocation) * 120
      - Math.max(0, bondReport.longDurationExposure - 0.35) * 60
      - Math.max(0, bondReport.highYieldExposure - 0.2) * 80
      + Math.min(8, bondReport.recessionHedgeExposure * 10);
    return section(score, "Fixed-income review uses curated bond ETF profiles, duration buckets, credit quality and recession-hedge roles.", findings, {
      totalBondAllocation: bondReport.totalBondAllocation,
      byDuration: bondReport.byDuration,
      byCreditQuality: bondReport.byCreditQuality,
      treasuryExposure: bondReport.treasuryExposure,
      corporateExposure: bondReport.corporateExposure,
      highYieldExposure: bondReport.highYieldExposure,
      recessionHedgeExposure: bondReport.recessionHedgeExposure,
      profileCoverage: bondReport.profileCoverage
    });
  }
}
