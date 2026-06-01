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

function flowAdjustedReturn(input: {
  currentValue: number;
  baselineValue: number;
  baselineDate: string;
  currentDate: string;
  transactions: Transaction[];
  minimumCapitalBase?: number;
}) {
  const periodTransactions = input.transactions.filter(
    (transaction) => transaction.transactionDate > input.baselineDate && transaction.transactionDate <= input.currentDate
  );
  const deposits = periodTransactions
    .filter((transaction) => transaction.transactionType === "deposit_cash")
    .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
  const withdrawals = periodTransactions
    .filter((transaction) => transaction.transactionType === "withdraw_cash")
    .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
  const snapshotCapitalBase = input.baselineValue + deposits;
  const manualCapitalBase = input.minimumCapitalBase ?? 0;
  const useManualCapitalBase = manualCapitalBase > 0 && snapshotCapitalBase < manualCapitalBase * 0.8;
  const denominator = useManualCapitalBase ? manualCapitalBase : snapshotCapitalBase;
  const valueChange = useManualCapitalBase
    ? input.currentValue + withdrawals - manualCapitalBase
    : input.currentValue - input.baselineValue - deposits + withdrawals;
  return denominator === 0 ? null : valueChange / denominator;
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

function rollingFlowAdjustedReturn(input: {
  latest: BenchmarkComparisonPoint;
  baseline: BenchmarkComparisonPoint | undefined;
  transactions: Transaction[];
  minimumCapitalBase: number;
}) {
  if (!input.baseline) return null;
  return flowAdjustedReturn({
    currentValue: input.latest.portfolioValue,
    baselineValue: input.baseline.portfolioValue,
    baselineDate: input.baseline.snapshotDate,
    currentDate: input.latest.snapshotDate,
    transactions: input.transactions,
    minimumCapitalBase: input.minimumCapitalBase
  });
}

function rollingBenchmarkReturn(latest: BenchmarkComparisonPoint, baseline: BenchmarkComparisonPoint | undefined) {
  return baseline ? cumulativeReturn(latest.benchmarkValue, baseline.benchmarkValue) : null;
}

export class BenchmarkComparisonService {
  calculateComparisons(input: {
    portfolioSnapshots: PortfolioSnapshot[];
    benchmarkSnapshots: BenchmarkSnapshot[];
    benchmarks: Benchmark[];
    transactions?: Transaction[];
    minimumCapitalBase?: number;
  }): BenchmarkComparison[] {
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
          input.minimumCapitalBase ?? 0
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
        portfolioReturn: flowAdjustedReturn({
          currentValue: portfolioPoint.totalValue,
          baselineValue: baselinePortfolio.totalValue,
          baselineDate,
          currentDate: snapshotDate,
          transactions,
          minimumCapitalBase
        }) ?? 0,
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
      rolling1DayPortfolioReturn: rollingFlowAdjustedReturn({ latest, baseline: rolling1Baseline, transactions, minimumCapitalBase }),
      rolling1DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling1Baseline),
      rolling7DayPortfolioReturn: rollingFlowAdjustedReturn({ latest, baseline: rolling7Baseline, transactions, minimumCapitalBase }),
      rolling7DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling7Baseline),
      rolling30DayPortfolioReturn: rollingFlowAdjustedReturn({ latest, baseline: rolling30Baseline, transactions, minimumCapitalBase }),
      rolling30DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling30Baseline),
      rolling90DayPortfolioReturn: rollingFlowAdjustedReturn({ latest, baseline: rolling90Baseline, transactions, minimumCapitalBase }),
      rolling90DayBenchmarkReturn: rollingBenchmarkReturn(latest, rolling90Baseline),
      portfolioMaxDrawdown: Math.min(...points.map((point) => point.portfolioDrawdown)),
      benchmarkMaxDrawdown: Math.min(...points.map((point) => point.benchmarkDrawdown)),
      points
    };
  }
}
