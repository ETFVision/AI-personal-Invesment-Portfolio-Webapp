import { finding, section, type PortfolioReviewInputContext } from "./portfolioReviewScoring";

function normalizeRatio(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  let normalized = value;
  while (Math.abs(normalized) > 1) normalized /= 100;
  return normalized;
}

export class PortfolioRiskReviewService {
  review({ riskReport }: PortfolioReviewInputContext) {
    const rawVol = riskReport.volatility.metrics.find((metric) => metric.label === "1Y")?.value
      ?? riskReport.volatility.metrics.find((metric) => metric.label === "90D")?.value
      ?? riskReport.volatility.metrics.find((metric) => metric.label === "30D")?.value
      ?? null;
    const vol = rawVol == null ? null : normalizeRatio(rawVol);
    const maxDrawdown = normalizeRatio(riskReport.drawdown.maxDrawdown ?? 0);
    const currentDrawdown = normalizeRatio(riskReport.drawdown.currentDrawdown ?? 0);
    const topRiskContributor = riskReport.riskContributors[0];
    const findings = [
      vol != null && vol > 0.25 ? finding("attention", "Elevated portfolio volatility", "Annualised volatility is above a moderate risk range.") : null,
      maxDrawdown < -0.25 ? finding("attention", "Large historical drawdown", "Portfolio drawdown history shows a material peak-to-trough loss.") : null,
      currentDrawdown < -0.1 ? finding("watch", "Portfolio is currently in drawdown", "The current portfolio value remains below a recent peak.") : null,
      topRiskContributor && topRiskContributor.riskContribution > 0.35 ? finding("watch", "Risk contribution is concentrated", `${topRiskContributor.label} contributes a large share of portfolio risk.`) : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    const score = 88
      - Math.max(0, (vol ?? 0.12) - 0.18) * 120
      - Math.max(0, Math.abs(maxDrawdown) - 0.15) * 100
      - Math.max(0, Math.abs(currentDrawdown) - 0.08) * 70;
    return section(score, "Risk is reviewed from volatility, drawdown and top risk contributors.", findings, {
      annualizedVolatility: vol,
      currentDrawdown,
      maxDrawdown,
      riskContributionMethod: riskReport.riskContributionMethod,
      topRiskContributors: riskReport.riskContributors.slice(0, 5)
    });
  }
}
