import { Benchmark, BenchmarkComparison, BenchmarkComparisonPoint, BenchmarkSnapshot, PortfolioSnapshot } from "@/domain/portfolio/types";

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function cumulativeReturn(currentValue: number, baselineValue: number) {
  return baselineValue === 0 ? null : currentValue / baselineValue - 1;
}

function drawdown(currentValue: number, peakValue: number) {
  return peakValue === 0 ? null : currentValue / peakValue - 1;
}

function latestPointOnOrBefore<T extends { snapshotDate: string }>(points: T[], targetDate: string) {
  return [...points].filter((point) => point.snapshotDate <= targetDate).sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
}

export class BenchmarkComparisonService {
  calculateComparisons(input: {
    portfolioSnapshots: PortfolioSnapshot[];
    benchmarkSnapshots: BenchmarkSnapshot[];
    benchmarks: Benchmark[];
  }): BenchmarkComparison[] {
    const portfolioSeries = [...input.portfolioSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    if (portfolioSeries.length === 0) return [];

    return input.benchmarks
      .filter((benchmark) => benchmark.isActive)
      .map((benchmark) => this.calculateComparisonForBenchmark(portfolioSeries, benchmark, input.benchmarkSnapshots.filter((snapshot) => snapshot.benchmarkId === benchmark.id)))
      .filter((comparison): comparison is BenchmarkComparison => Boolean(comparison));
  }

  private calculateComparisonForBenchmark(
    portfolioSeries: PortfolioSnapshot[],
    benchmark: Benchmark,
    benchmarkSnapshots: BenchmarkSnapshot[]
  ): BenchmarkComparison | null {
    const benchmarkSeries = [...benchmarkSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    if (benchmarkSeries.length === 0) {
      return {
        benchmark,
        cumulativePortfolioReturn: null,
        cumulativeBenchmarkReturn: null,
        relativeOutperformance: null,
        rolling30DayPortfolioReturn: null,
        rolling30DayBenchmarkReturn: null,
        rolling90DayPortfolioReturn: null,
        rolling90DayBenchmarkReturn: null,
        portfolioMaxDrawdown: null,
        benchmarkMaxDrawdown: null,
        points: []
      };
    }

    const portfolioByDate = new Map(portfolioSeries.map((point) => [point.snapshotDate, point]));
    const benchmarkByDate = new Map(benchmarkSeries.map((point) => [point.snapshotDate, point]));
    const commonDates = portfolioSeries
      .map((point) => point.snapshotDate)
      .filter((date) => benchmarkByDate.has(date))
      .sort((a, b) => a.localeCompare(b));

    if (commonDates.length === 0) {
      return null;
    }

    const baselineDate = commonDates[0];
    const baselinePortfolio = portfolioByDate.get(baselineDate)!;
    const baselineBenchmark = benchmarkByDate.get(baselineDate)!;

    let portfolioPeak = baselinePortfolio.totalValue;
    let benchmarkPeak = baselineBenchmark.levelValue;
    const points: BenchmarkComparisonPoint[] = [];

    for (const snapshotDate of commonDates) {
      const portfolioPoint = portfolioByDate.get(snapshotDate)!;
      const benchmarkPoint = benchmarkByDate.get(snapshotDate)!;
      portfolioPeak = Math.max(portfolioPeak, portfolioPoint.totalValue);
      benchmarkPeak = Math.max(benchmarkPeak, benchmarkPoint.levelValue);
      points.push({
        snapshotDate,
        portfolioValue: portfolioPoint.totalValue,
        benchmarkValue: benchmarkPoint.levelValue,
        portfolioReturn: cumulativeReturn(portfolioPoint.totalValue, baselinePortfolio.totalValue) ?? 0,
        benchmarkReturn: cumulativeReturn(benchmarkPoint.levelValue, baselineBenchmark.levelValue) ?? 0,
        portfolioDrawdown: drawdown(portfolioPoint.totalValue, portfolioPeak) ?? 0,
        benchmarkDrawdown: drawdown(benchmarkPoint.levelValue, benchmarkPeak) ?? 0
      });
    }

    const latest = points[points.length - 1];
    const rolling30Baseline = latestPointOnOrBefore(points, shiftDate(latest.snapshotDate, 30));
    const rolling90Baseline = latestPointOnOrBefore(points, shiftDate(latest.snapshotDate, 90));

    return {
      benchmark,
      cumulativePortfolioReturn: latest.portfolioReturn,
      cumulativeBenchmarkReturn: latest.benchmarkReturn,
      relativeOutperformance: latest.portfolioReturn - latest.benchmarkReturn,
      rolling30DayPortfolioReturn: rolling30Baseline ? cumulativeReturn(latest.portfolioValue, rolling30Baseline.portfolioValue) : null,
      rolling30DayBenchmarkReturn: rolling30Baseline ? cumulativeReturn(latest.benchmarkValue, rolling30Baseline.benchmarkValue) : null,
      rolling90DayPortfolioReturn: rolling90Baseline ? cumulativeReturn(latest.portfolioValue, rolling90Baseline.portfolioValue) : null,
      rolling90DayBenchmarkReturn: rolling90Baseline ? cumulativeReturn(latest.benchmarkValue, rolling90Baseline.benchmarkValue) : null,
      portfolioMaxDrawdown: Math.min(...points.map((point) => point.portfolioDrawdown)),
      benchmarkMaxDrawdown: Math.min(...points.map((point) => point.benchmarkDrawdown)),
      points
    };
  }
}
