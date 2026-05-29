import { AnalyticsRepository } from "@/application/ports/repositories/AnalyticsRepository";
import { BenchmarkRepository } from "@/application/ports/repositories/BenchmarkRepository";
import { MarketDataRepository } from "@/application/ports/repositories/MarketDataRepository";
import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { BenchmarkComparison, BenchmarkSnapshot, DailyPrice, HoldingSnapshot, PortfolioDashboard } from "@/domain/portfolio/types";
import { Instrument, InstrumentPrice } from "@/domain/universe/types";
import { RiskAnalyticsReport, RiskAnalyticsService } from "@/application/services/risk/RiskAnalyticsService";

function yearsAgoIso(years: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function instrumentBySymbol(instruments: Instrument[]) {
  const aliases: Record<string, string> = {
    BTCUSD: "BTC",
    ETHUSD: "ETH",
    SOLUSD: "SOL"
  };
  return new Map(
    instruments.flatMap((instrument) => {
      const symbol = instrument.symbol?.trim().toUpperCase() ?? "";
      if (!symbol) return [];
      const entries: Array<readonly [string, Instrument]> = [[symbol, instrument]];
      for (const [alias, target] of Object.entries(aliases)) {
        if (target === symbol) entries.push([alias, instrument]);
      }
      return entries;
    })
  );
}

function priceSeriesByInstrument(prices: InstrumentPrice[]) {
  const grouped = new Map<string, InstrumentPrice[]>();
  for (const price of prices) {
    const series = grouped.get(price.instrumentId) ?? [];
    series.push(price);
    grouped.set(price.instrumentId, series);
  }
  for (const series of grouped.values()) {
    series.sort((a, b) => a.priceDate.localeCompare(b.priceDate));
  }
  return grouped;
}

function buildSyntheticBenchmarkSnapshots(input: {
  comparisons: BenchmarkComparison[];
  instruments: Instrument[];
  prices: InstrumentPrice[];
}): BenchmarkSnapshot[] {
  const instrumentsBySymbol = instrumentBySymbol(input.instruments);
  const pricesByInstrument = priceSeriesByInstrument(input.prices);
  const snapshots: BenchmarkSnapshot[] = [];

  for (const comparison of input.comparisons) {
    const benchmark = comparison.benchmark;
    if (benchmark.symbol) {
      const instrument = instrumentsBySymbol.get(benchmark.symbol.trim().toUpperCase());
      const series = instrument ? pricesByInstrument.get(instrument.id) ?? [] : [];
      snapshots.push(...series.map((price) => ({
        id: `universe-benchmark-${benchmark.id}-${price.id}`,
        benchmarkId: benchmark.id,
        benchmarkKey: benchmark.benchmarkKey,
        snapshotDate: price.priceDate,
        closePrice: price.closePrice,
        levelValue: price.closePrice,
        dailyReturn: null,
        drawdown: null,
        currency: price.currency ?? benchmark.currency,
        provider: price.provider
      })));
      continue;
    }

    if (benchmark.components.length > 0) {
      const componentSeries = benchmark.components.map((component) => {
        const instrument = instrumentsBySymbol.get(component.symbol.trim().toUpperCase());
        const series = instrument ? pricesByInstrument.get(instrument.id) ?? [] : [];
        return { component, byDate: new Map(series.map((price) => [price.priceDate, price.closePrice])) };
      });
      if (componentSeries.some((item) => item.byDate.size === 0)) continue;

      const commonDates = componentSeries
        .map((item) => Array.from(item.byDate.keys()))
        .reduce<string[]>((intersection, dates) => intersection.filter((date) => dates.includes(date)), Array.from(componentSeries[0].byDate.keys()))
        .sort();
      let previousDate: string | null = null;
      let levelValue = benchmark.baseValue;

      for (const date of commonDates) {
        const dailyReturn = previousDate
          ? componentSeries.reduce((sum, item) => {
              const current = item.byDate.get(date);
              const previous = item.byDate.get(previousDate!);
              if (!current || !previous || previous === 0) return sum;
              return sum + item.component.weight * (current / previous - 1);
            }, 0)
          : null;
        if (dailyReturn != null) levelValue *= 1 + dailyReturn;
        snapshots.push({
          id: `universe-benchmark-${benchmark.id}-${date}`,
          benchmarkId: benchmark.id,
          benchmarkKey: benchmark.benchmarkKey,
          snapshotDate: date,
          closePrice: levelValue,
          levelValue,
          dailyReturn,
          drawdown: null,
          currency: benchmark.currency,
          provider: "instrument_prices"
        });
        previousDate = date;
      }
    }
  }

  return snapshots;
}

export class RiskAnalyticsDataService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly marketDataRepository: MarketDataRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly benchmarkRepository: BenchmarkRepository,
    private readonly riskAnalyticsService: RiskAnalyticsService
  ) {}

  async buildReport(portfolioId: string, dashboard: PortfolioDashboard): Promise<RiskAnalyticsReport> {
    const assetIds = Array.from(new Set(dashboard.holdings.map((holding) => holding.assetId)));
    const holdingSymbols = Array.from(
      new Set(
        dashboard.holdings
          .map((holding) => holding.ticker?.trim().toUpperCase())
          .filter((symbol): symbol is string => Boolean(symbol))
      )
    );

    const [portfolioSnapshots, holdingSnapshots, dailyPrices, universeInstruments] = await Promise.all([
      this.analyticsRepository.listPortfolioSnapshots(portfolioId, 1400),
      this.analyticsRepository.listHoldingSnapshots(portfolioId, 1400),
      this.marketDataRepository.listDailyPricesForAssets(assetIds, yearsAgoIso(5)),
      this.universeRepository.listInstruments()
    ]);

    const holdingsBySymbol = new Map(
      dashboard.holdings
        .filter((holding) => holding.ticker)
        .map((holding) => [holding.ticker!.trim().toUpperCase(), holding])
    );
    const matchedUniverseInstruments = universeInstruments.filter((instrument) =>
      instrument.symbol ? holdingSymbols.includes(instrument.symbol.trim().toUpperCase()) : false
    );
    const benchmarkSymbols = Array.from(
      new Set(
        dashboard.benchmarkComparisons.flatMap((comparison) => [
          comparison.benchmark.symbol?.trim().toUpperCase(),
          ...comparison.benchmark.components.map((component) => component.symbol.trim().toUpperCase())
        ]).filter((symbol): symbol is string => Boolean(symbol))
      )
    );
    const matchedBenchmarkInstruments = universeInstruments.filter((instrument) =>
      instrument.symbol ? benchmarkSymbols.includes(instrument.symbol.trim().toUpperCase()) : false
    );
    const requiredInstrumentIds = Array.from(new Set([
      ...matchedUniverseInstruments.map((instrument) => instrument.id),
      ...matchedBenchmarkInstruments.map((instrument) => instrument.id)
    ]));
    const universePrices = await this.universeRepository.listInstrumentPrices(requiredInstrumentIds, yearsAgoIso(5));
    const benchmarkIds = Array.from(new Set(dashboard.benchmarkComparisons.map((comparison) => comparison.benchmark.id)));
    const benchmarkSnapshots = await this.benchmarkRepository.listBenchmarkSnapshots(benchmarkIds, 10_000);
    const universeBenchmarkSnapshots = buildSyntheticBenchmarkSnapshots({
      comparisons: dashboard.benchmarkComparisons,
      instruments: matchedBenchmarkInstruments,
      prices: universePrices
    });
    const universeBenchmarkIds = new Set(universeBenchmarkSnapshots.map((snapshot) => snapshot.benchmarkId));
    const selectedBenchmarkSnapshots = [
      ...benchmarkSnapshots.filter((snapshot) => !universeBenchmarkIds.has(snapshot.benchmarkId)),
      ...universeBenchmarkSnapshots
    ];

    const instrumentSymbolById = new Map(
      matchedUniverseInstruments.map((instrument) => [instrument.id, instrument.symbol?.trim().toUpperCase() ?? ""])
    );
    const universeDailyPrices: DailyPrice[] = universePrices.flatMap((price) => {
      const symbol = instrumentSymbolById.get(price.instrumentId);
      const holding = symbol ? holdingsBySymbol.get(symbol) : null;
      if (!holding) return [];
      return [{
        id: price.id,
        assetId: holding.assetId,
        provider: price.provider,
        symbol: price.symbol,
        priceDate: price.priceDate,
        closePrice: price.closePrice,
        currency: price.currency
      }];
    });
    const universeHoldingSnapshots: HoldingSnapshot[] = universePrices.flatMap((price) => {
      const symbol = instrumentSymbolById.get(price.instrumentId);
      const holding = symbol ? holdingsBySymbol.get(symbol) : null;
      if (!holding) return [];
      return [{
        id: `instrument-price-${price.id}`,
        portfolioId,
        holdingId: holding.id,
        assetId: holding.assetId,
        snapshotDate: price.priceDate,
        quantity: holding.quantity,
        marketPrice: price.closePrice,
        marketValue: price.closePrice * holding.quantity,
        costBasis: holding.averageCost == null ? null : holding.averageCost * holding.quantity,
        unrealizedGainLoss: holding.averageCost == null ? null : (price.closePrice - holding.averageCost) * holding.quantity,
        currency: price.currency ?? holding.costCurrency
      }];
    });
    const holdingsWithUniverseHistory = new Set(universeHoldingSnapshots.map((snapshot) => snapshot.holdingId));
    const fallbackHoldingSnapshots = holdingSnapshots.filter((snapshot) => !holdingsWithUniverseHistory.has(snapshot.holdingId));

    return this.riskAnalyticsService.calculateRiskAnalytics({
      dashboard,
      portfolioSnapshots,
      holdingSnapshots: [...fallbackHoldingSnapshots, ...universeHoldingSnapshots],
      dailyPrices: [...dailyPrices, ...universeDailyPrices],
      benchmarkSnapshots: selectedBenchmarkSnapshots
    });
  }
}
