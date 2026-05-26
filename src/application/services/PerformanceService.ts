import { PerformanceMetric, PortfolioSnapshot } from "@/domain/portfolio/types";

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildMetric(
  label: PerformanceMetric["label"],
  currentValue: number,
  snapshots: PortfolioSnapshot[],
  daysAgo: number
): PerformanceMetric {
  const targetDate = isoDateDaysAgo(daysAgo);
  const baseline = snapshots
    .filter((snapshot) => snapshot.snapshotDate <= targetDate)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];

  if (!baseline || baseline.totalValue === 0) {
    return {
      label,
      valueChange: null,
      percentChange: null,
      baselineDate: null
    };
  }

  const valueChange = currentValue - baseline.totalValue;
  return {
    label,
    valueChange,
    percentChange: valueChange / baseline.totalValue,
    baselineDate: baseline.snapshotDate
  };
}

export class PerformanceService {
  calculatePerformance(currentValue: number, snapshots: PortfolioSnapshot[]): PerformanceMetric[] {
    return [
      buildMetric("Daily", currentValue, snapshots, 1),
      buildMetric("Weekly", currentValue, snapshots, 7),
      buildMetric("Monthly", currentValue, snapshots, 30)
    ];
  }
}
