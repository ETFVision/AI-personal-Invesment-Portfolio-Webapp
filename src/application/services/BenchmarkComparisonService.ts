import { Benchmark, BenchmarkComparison, BenchmarkComparisonPoint, BenchmarkSnapshot, PortfolioSnapshot, Transaction } from "@/domain/portfolio/types";

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

function cashFlowAmount(transaction: Transaction) {
  return Math.abs(transaction.netAmount ?? transaction.grossAmount ?? 0);
}

function externalPortfolioFlow(transactions: Transaction[], startExclusive: string, endInclusive: string) {
  return transactions
    .filter((transaction) => transaction.transactionDate > startExclusive && transaction.transactionDate <= endInclusive)
    .reduce((sum, transaction) => {
      if (transaction.transactionType === "deposit_cash") return sum + cashFlowAmount(transaction);
      if (transaction.transactionType === "withdraw_cash") return sum - cashFlowAmount(transaction);
      return sum;
    }, 0);
}

function simpleManualReturn(input: {
  currentValue: number;
  currentDate: string;
  transactions: Transaction[];
  minimumCapitalBase: number;
}) {
  const withdrawals = input.transactions
    .filter((transaction) => transaction.transactionDate <= input.currentDate && transaction.transactionType === "withdraw_cash")
    .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
  return input.minimumCapitalBase === 0 ? null : (input.currentValue + withdrawals - input.minimumCapitalBase) / input.minimumCapitalBase;
}

function drawdown(currentValue: number, peakValue: number) {
  return peakValue === 0 ? null : currentValue / peakValue - 1;
}

function rollingBaseline<T extends { snapshotDate: string }>(
  points: T[],
  latestDate: string,
  periodDays: number,
  toleranceDays: number
) {
  const targetDate = shiftDate(latestDate, periodDays);
  const oldestAcceptableDate = shiftDate(latestDate, periodDays + toleranceDays);
  return [...points]
    .filter((point) => point.snapshotDate <= targetDate && point.snapshotDate >= oldestAcceptableDate)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
}

function rollingPortfolioReturn(input: {
  latest: BenchmarkComparisonPoint;
  baseline: BenchmarkComparisonPoint | undefined;
}) {
  if (!input.baseline) return null;
  const baselineReturnBase = 1 + input.baseline.portfolioReturn;
  return baselineReturnBase === 0 ? null : (1 + input.latest.portfolioReturn) / baselineReturnBase - 1;
}

function rollingBenchmarkReturn(latest: BenchmarkComparisonPoint, baseline: BenchmarkComparisonPoint | undefined) {
  return baseline ? cumulativeReturn(latest.benchmarkValue, baseline.benchmarkValue) : null;
}

function latestBenchmarkOnOrBefore(points: BenchmarkSnapshot[], targetDate: string) {
  return points.filter((point) => point.snapshotDate <= targetDate).at(-1);
}

export class BenchmarkComparisonService {
  calculateComparisons(input: {
    portfolioSnapshots: PortfolioSnapshot[];
    benchmarkSnapshots: BenchmarkSnapshot[];
    benchmarks: Benchmark[];
    transactions?: Transaction[];
    minimumCapitalBase?: number;
  }): BenchmarkComparison[] {
    const minimumCapitalBase = input.minimumCapitalBase ?? 0;
    const portfolioSeries = [...input.portfolioSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    if (portfolioSeries.length === 0) return [];

    return input.benchmarks
      .filter((benchmark) => benchmark.isActive)
      .map((benchmark) =>
        this.calculateComparisonForBenchmark(
          portfolioSeries,
          benchmark,
          input.benchmarkSnapshots.filter((snapshot) => snapshot.benchmarkId === benchmark.id),
          input.transactions ?? [],
          minimumCapitalBase
        )
      )
      .filter((comparison): comparison is BenchmarkComparison => Boolean(comparison));
  }

  private calculateComparisonForBenchmark(
    portfolioSeries: PortfolioSnapshot[],
    benchmark: Benchmark,
    benchmarkSnapshots: BenchmarkSnapshot[],
    transactions: Transaction[],
    minimumCapitalBase: number
  ): BenchmarkComparison | null {
    const benchmarkSeries = [...benchmarkSnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    if (benchmarkSeries.length === 0) {
      return {
        benchmark,
        cumulativePortfolioReturn: null,
        cumulativeBenchmarkReturn: null,
        relativeOutperformance: null,
        rolling1DayPortfolioReturn: null,
        rolling1DayBenchmarkReturn: null,
        rolling7DayPortfolioReturn: null,
        rolling7DayBenchmarkReturn: null,
        rolling30DayPortfolioReturn: null,
        rolling30DayBenchmarkReturn: null,
        rolling90DayPortfolioReturn: null,
        rolling90DayBenchmarkReturn: null,
        portfolioMaxDrawdown: null,
        benchmarkMaxDrawdown: null,
        points: []
      };
    }

    const alignedPoints = portfolioSeries
      .map((portfolioPoint) => ({
        portfolioPoint,
        benchmarkPoint: latestBenchmarkOnOrBefore(benchmarkSeries, portfolioPoint.snapshotDate)
      }))
      .filter((point): point is { portfolioPoint: PortfolioSnapshot; benchmarkPoint: BenchmarkSnapshot } => Boolean(point.benchmarkPoint));

    if (alignedPoints.length === 0) {
      return null;
    }

    const baselinePortfolio = alignedPoints[0].portfolioPoint;
    const baselineBenchmark = alignedPoints[0].benchmarkPoint;

    const useManualCapitalFallback = minimumCapitalBase > 0 && baselinePortfolio.totalValue < minimumCapitalBase * 0.8;
    let portfolioPeak = baselinePortfolio.totalValue;
    let benchmarkPeak = baselineBenchmark.levelValue;
    let cumulativePortfolioReturn = 0;
    const points: BenchmarkComparisonPoint[] = [];

    for (let index = 0; index < alignedPoints.length; index += 1) {
      const { portfolioPoint, benchmarkPoint } = alignedPoints[index];
      const snapshotDate = portfolioPoint.snapshotDate;
      const previousPoint = alignedPoints[index - 1]?.portfolioPoint;
      const previousDate = previousPoint?.snapshotDate;
      if (index > 0 && previousDate) {
        if (useManualCapitalFallback) {
          cumulativePortfolioReturn = simpleManualReturn({
            currentValue: portfolioPoint.totalValue,
            currentDate: snapshotDate,
            transactions,
            minimumCapitalBase
          }) ?? cumulativePortfolioReturn;
        } else if (previousPoint.totalValue !== 0) {
          const netFlow = externalPortfolioFlow(transactions, previousDate, snapshotDate);
          cumulativePortfolioReturn = (1 + cumulativePortfolioReturn) * (1 + ((portfolioPoint.totalValue - netFlow) / previousPoint.totalValue - 1)) - 1;
        }
      }
      portfolioPeak = Math.max(portfolioPeak, portfolioPoint.totalValue);
      benchmarkPeak = Math.max(benchmarkPeak, benchmarkPoint.levelValue);
      points.push({
        snapshotDate,
        portfolioValue: portfolioPoint.totalValue,
        benchmarkValue: benchmarkPoint.levelValue,
        portfolioReturn: cumulativePortfolioReturn,
        benchmarkReturn: cumulativeReturn(benchmarkPoint.levelValue, baselineBenchmark.levelValue) ?? 0,
        portfolioDrawdown: drawdown(portfolioPoint.totalValue, portfolioPeak) ?? 0,
        benchmarkDrawdown: drawdown(benchmarkPoint.levelValue, benchmarkPeak) ?? 0
      });
    }

    const latest = points[points.length - 1];
    const rolling1Baseline = rollingBaseline(points, latest.snapshotDate, 1, 4);
    const rolling7Baseline = rollingBaseline(points, latest.snapshotDate, 7, 7);
    const rolling30Baseline = rollingBaseline(points, latest.snapshotDate, 30, 10);
    const rolling90Baseline = rollingBaseline(points, latest.snapshotDate, 90, 15);

    return {
      benchmark,
      cumulativePortfolioReturn: latest.portfolioReturn,
      cumulativeBenchmarkReturn: latest.benchmarkReturn,
      relativeOutperformance: latest.portfolioReturn - latest.benchmarkReturn,
      rolling1DayPortfolioReturn: rollingPortfolioReturn({ latest, baseline: rolling1Baseline }),
      rolling1DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling1Baseline),
      rolling7DayPortfolioReturn: rollingPortfolioReturn({ latest, baseline: rolling7Baseline }),
      rolling7DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling7Baseline),
      rolling30DayPortfolioReturn: rollingPortfolioReturn({ latest, baseline: rolling30Baseline }),
      rolling30DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling30Baseline),
      rolling90DayPortfolioReturn: rollingPortfolioReturn({ latest, baseline: rolling90Baseline }),
      rolling90DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling90Baseline),
      portfolioMaxDrawdown: Math.min(...points.map((point) => point.portfolioDrawdown)),
      benchmarkMaxDrawdown: Math.min(...points.map((point) => point.benchmarkDrawdown)),
      points
    };
  }
}
