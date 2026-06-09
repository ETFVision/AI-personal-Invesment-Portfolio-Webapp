import { MarketDataProvider } from "@/application/ports/providers/MarketDataProvider";
import { BenchmarkRepository } from "@/application/ports/repositories/BenchmarkRepository";
import { Benchmark, BenchmarkSnapshot } from "@/domain/portfolio/types";

export type RefreshBenchmarkResult = {
  benchmarkCount: number;
  snapshotCount: number;
  message: string;
  errors: string[];
};

type BenchmarkSeriesQuote = {
  symbol: string;
  date: string;
  price: number;
  raw: unknown;
};

const DEFAULT_BENCHMARKS: Array<{
  benchmarkKey: string;
  name: string;
  benchmarkType: Benchmark["benchmarkType"];
  symbol: string | null;
  currency: string;
  baseValue: number;
  components: Benchmark["components"];
  metadata: Record<string, unknown>;
}> = [
  {
    benchmarkKey: "sp500",
    name: "S&P 500",
    benchmarkType: "equity",
    symbol: "SPY",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "S&P 500 ETF" }
  },
  {
    benchmarkKey: "nasdaq100",
    name: "Nasdaq 100",
    benchmarkType: "equity",
    symbol: "QQQ",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "Nasdaq 100 ETF" }
  },
  {
    benchmarkKey: "global_equities",
    name: "Global equities",
    benchmarkType: "equity",
    symbol: "VT",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "Global equities ETF" }
  },
  {
    benchmarkKey: "us_aggregate_bonds",
    name: "US aggregate bonds",
    benchmarkType: "bond",
    symbol: "AGG",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "US aggregate bond ETF" }
  },
  {
    benchmarkKey: "gold",
    name: "Gold",
    benchmarkType: "commodity",
    symbol: "GLD",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "Gold ETF" }
  },
  {
    benchmarkKey: "bitcoin",
    name: "Bitcoin",
    benchmarkType: "crypto",
    symbol: "BTCUSD",
    currency: "USD",
    baseValue: 100,
    components: [],
    metadata: { proxy: "Bitcoin spot" }
  },
  {
    benchmarkKey: "sixty_forty",
    name: "60/40 portfolio proxy",
    benchmarkType: "composite",
    symbol: null,
    currency: "USD",
    baseValue: 100,
    components: [
      { symbol: "SPY", weight: 0.6 },
      { symbol: "AGG", weight: 0.4 }
    ],
    metadata: { description: "60% S&P 500 and 40% US aggregate bonds" }
  }
];

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function latestExpectedEodDate() {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 8);
  date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

function buildDatePriceMap(quotes: BenchmarkSeriesQuote[]) {
  return new Map(quotes.map((quote) => [quote.date, quote]));
}

export class BenchmarkService {
  constructor(
    private readonly repository: BenchmarkRepository,
    private readonly provider: MarketDataProvider
  ) {}

  async ensureBenchmarkUniverse() {
    await this.repository.upsertBenchmarks(
      DEFAULT_BENCHMARKS.map((benchmark) => ({
        benchmarkKey: benchmark.benchmarkKey,
        name: benchmark.name,
        benchmarkType: benchmark.benchmarkType,
        symbol: benchmark.symbol,
        currency: benchmark.currency,
        baseValue: benchmark.baseValue,
        components: benchmark.components,
        providerPrimary: this.provider.name,
        metadata: benchmark.metadata,
        isActive: true
      }))
    );
    return this.repository.listBenchmarks();
  }

  async refreshBenchmarkSnapshots(input?: { lookbackDays?: number }): Promise<RefreshBenchmarkResult> {
    const benchmarks = await this.ensureBenchmarkUniverse();
    const lookbackDays = input?.lookbackDays ?? 1825;
    const errors: string[] = [];
    let snapshotCount = 0;
    let skippedCount = 0;
    const expectedPriceDate = latestExpectedEodDate();

    for (const benchmark of benchmarks.filter((item) => item.isActive)) {
      try {
        const desiredStartDate = isoDateDaysAgo(lookbackDays);
        const existingSnapshots = await this.repository.listBenchmarkSnapshots([benchmark.id], 10_000);
        const sortedExistingSnapshots = existingSnapshots.slice().sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
        const earliestSnapshot = sortedExistingSnapshots[0];
        const latestSnapshot = sortedExistingSnapshots.at(-1);
        if (latestSnapshot && latestSnapshot.snapshotDate >= expectedPriceDate) {
          if (earliestSnapshot && earliestSnapshot.snapshotDate <= desiredStartDate) {
            skippedCount += 1;
            continue;
          }
        }
        const needsBackfill = !earliestSnapshot || earliestSnapshot.snapshotDate > desiredStartDate;
        const fetchFrom = needsBackfill ? desiredStartDate : latestSnapshot?.snapshotDate ?? desiredStartDate;
        const previousSnapshot = needsBackfill ? undefined : latestSnapshot;
        const toDate = new Date().toISOString().slice(0, 10);

        const snapshots = benchmark.symbol
          ? await this.buildSingleSymbolSeries(benchmark, fetchFrom, toDate, previousSnapshot)
          : await this.buildCompositeSeries(benchmark, fetchFrom, toDate, previousSnapshot);

        if (snapshots.length > 0) {
          await this.repository.upsertBenchmarkSnapshots(
            snapshots.map((snapshot) => ({
              benchmarkId: snapshot.benchmarkId,
              snapshotDate: snapshot.snapshotDate,
              closePrice: snapshot.closePrice,
              levelValue: snapshot.levelValue,
              dailyReturn: snapshot.dailyReturn,
              drawdown: snapshot.drawdown,
              currency: snapshot.currency,
              provider: snapshot.provider,
              rawPayload: {
                benchmarkKey: snapshot.benchmarkKey,
                closePrice: snapshot.closePrice,
                levelValue: snapshot.levelValue,
                dailyReturn: snapshot.dailyReturn,
                drawdown: snapshot.drawdown
              }
            }))
          );
          snapshotCount += snapshots.length;
        }
      } catch (error) {
        errors.push(`${benchmark.name}: ${error instanceof Error ? error.message : "Benchmark refresh failed."}`);
      }
    }

    return {
      benchmarkCount: benchmarks.length,
      snapshotCount,
      errors,
      message:
        errors.length === 0
          ? snapshotCount === 0 && skippedCount > 0
            ? "Benchmark snapshots are already fresh."
            : `Stored ${snapshotCount} benchmark snapshot${snapshotCount === 1 ? "" : "s"}.${skippedCount > 0 ? ` ${skippedCount} benchmark${skippedCount === 1 ? "" : "s"} already fresh.` : ""}`
          : `Stored ${snapshotCount} benchmark snapshot${snapshotCount === 1 ? "" : "s"} with ${errors.length} issue${errors.length === 1 ? "" : "s"}.`
    };
  }

  private async buildSingleSymbolSeries(
    benchmark: Benchmark,
    fromDate: string,
    toDate: string,
    latestSnapshot: BenchmarkSnapshot | undefined
  ) {
    const quotes = await this.provider.getHistoricalPrices(benchmark.symbol!, fromDate, toDate);
    const series = quotes.map((quote) => ({
      symbol: quote.symbol.toUpperCase(),
      date: quote.asOfDate,
      price: quote.price,
      raw: quote.raw
    }));
    if (series.length === 0) {
      throw new Error(`No historical benchmark data returned for ${benchmark.name}.`);
    }

    const previousClose = latestSnapshot?.closePrice ?? null;
    const previousLevel = latestSnapshot?.levelValue ?? benchmark.baseValue;
    let prevClose = previousClose;
    let prevLevel = previousLevel;
    let peak = latestSnapshot ? Math.max(latestSnapshot.levelValue, benchmark.baseValue) : benchmark.baseValue;
    const snapshots: BenchmarkSnapshot[] = [];

    for (const point of series) {
      if (latestSnapshot && point.date <= latestSnapshot.snapshotDate) {
        prevClose = point.price;
        continue;
      }

      const dailyReturn = prevClose == null || prevClose === 0 ? null : point.price / prevClose - 1;
      const levelValue = dailyReturn == null ? prevLevel : prevLevel * (1 + dailyReturn);
      peak = Math.max(peak, levelValue);
      const drawdown = peak === 0 ? null : levelValue / peak - 1;
      snapshots.push({
        id: "",
        benchmarkId: benchmark.id,
        benchmarkKey: benchmark.benchmarkKey,
        snapshotDate: point.date,
        closePrice: point.price,
        levelValue,
        dailyReturn,
        drawdown,
        currency: benchmark.currency,
        provider: this.provider.name
      });
      prevClose = point.price;
      prevLevel = levelValue;
    }

    return snapshots;
  }

  private async buildCompositeSeries(
    benchmark: Benchmark,
    fromDate: string,
    toDate: string,
    latestSnapshot: BenchmarkSnapshot | undefined
  ) {
    const componentQuotes = await Promise.all(
      benchmark.components.map(async (component) => {
        const quotes = await this.provider.getHistoricalPrices(component.symbol, fromDate, toDate);
        return { component, quotes: quotes.map((quote) => ({ symbol: quote.symbol, date: quote.asOfDate, price: quote.price, raw: quote.raw })) };
      })
    );

    if (componentQuotes.some((item) => item.quotes.length === 0)) {
      throw new Error(`Missing historical benchmark data for composite benchmark ${benchmark.name}.`);
    }

    const commonDates = componentQuotes
      .map((item) => new Set(item.quotes.map((quote) => quote.date)))
      .reduce((intersection, dates) => new Set([...intersection].filter((date) => dates.has(date))));

    const sortedDates = Array.from(commonDates).sort((a, b) => a.localeCompare(b));
    if (sortedDates.length === 0) return [];

    const quoteMaps = new Map(componentQuotes.map((item) => [item.component.symbol, buildDatePriceMap(item.quotes)]));
    let prevLevel = latestSnapshot?.levelValue ?? benchmark.baseValue;
    let peak = latestSnapshot ? Math.max(latestSnapshot.levelValue, benchmark.baseValue) : benchmark.baseValue;
    let previousDate = latestSnapshot?.snapshotDate ?? null;
    const snapshots: BenchmarkSnapshot[] = [];

    for (const date of sortedDates) {
      if (latestSnapshot && date <= latestSnapshot.snapshotDate) {
        continue;
      }

      if (!previousDate) {
        snapshots.push({
          id: "",
          benchmarkId: benchmark.id,
          benchmarkKey: benchmark.benchmarkKey,
          snapshotDate: date,
          closePrice: benchmark.baseValue,
          levelValue: benchmark.baseValue,
          dailyReturn: null,
          drawdown: 0,
          currency: benchmark.currency,
          provider: this.provider.name
        });
        previousDate = date;
        continue;
      }

      const comparisonDate = previousDate;
      const weightedReturn = benchmark.components.reduce((sum, component) => {
        const currentQuote = quoteMaps.get(component.symbol)?.get(date);
        const previousQuote = quoteMaps.get(component.symbol)?.get(comparisonDate);
        if (!currentQuote || !previousQuote || previousQuote.price === 0) return sum;
        return sum + component.weight * (currentQuote.price / previousQuote.price - 1);
      }, 0);

      const levelValue = prevLevel * (1 + weightedReturn);
      peak = Math.max(peak, levelValue);
      const drawdown = peak === 0 ? null : levelValue / peak - 1;
      snapshots.push({
        id: "",
        benchmarkId: benchmark.id,
        benchmarkKey: benchmark.benchmarkKey,
        snapshotDate: date,
        closePrice: levelValue,
        levelValue,
        dailyReturn: weightedReturn,
        drawdown,
        currency: benchmark.currency,
        provider: this.provider.name
      });
      prevLevel = levelValue;
      previousDate = date;
    }

    return snapshots;
  }
}
