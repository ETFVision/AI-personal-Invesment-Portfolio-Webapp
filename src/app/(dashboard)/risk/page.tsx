import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAssetTypeLabel, formatPercent } from "@/lib/utils";
import type { AllocationItem, BenchmarkComparison, BenchmarkSnapshot, HoldingSnapshot } from "@/domain/portfolio/types";
import type { Instrument, InstrumentPrice } from "@/domain/universe/types";
import type { DrawdownPoint } from "@/application/services/risk/riskMath";
import type { RiskAnalyticsReport } from "@/application/services/risk/RiskAnalyticsService";

type ChartPoint = {
  date: string;
  value: number;
};

function formatMaybePercent(value: number | null | undefined) {
  return value == null ? "Not enough data" : formatPercent(value);
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(`${value}T00:00:00Z`));
}

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
      .filter(([symbol]) => Boolean(symbol))
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

function makePolyline(points: ChartPoint[], width: number, height: number) {
  if (points.length < 2) return "";
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function LineChart({
  points,
  label,
  formatValue
}: {
  points: ChartPoint[];
  label: string;
  formatValue: (value: number) => string;
}) {
  if (points.length < 2) {
    return <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">More stored snapshots are needed for this chart.</div>;
  }

  const width = 720;
  const height = 220;
  const first = points[0];
  const last = points.at(-1) ?? first;
  const path = makePolyline(points, width, height);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full bg-background" role="img" aria-label={label}>
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} className="stroke-muted" strokeWidth="1" />
          <polyline points={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{compactDate(first.date)}</span>
        <span>{formatValue(last.value)}</span>
        <span>{compactDate(last.date)}</span>
      </div>
    </div>
  );
}

function AllocationTable({ title, items }: { title: string; items: AllocationItem[] }) {
  const visibleItems = items.slice(0, 6);
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground">No exposure data yet.</td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.label} className="border-b last:border-0">
                  <td className="p-3">{item.label}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatPercent(item.percent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorrelationHeatmap({
  matrix,
  emptyText
}: {
  matrix: RiskAnalyticsReport["correlations"]["matrix"];
  emptyText: string;
}) {
  const symbols = Array.from(new Set(matrix.flatMap((cell) => [cell.left, cell.right]))).slice(0, 8);
  if (symbols.length < 2) {
    return <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">{emptyText}</div>;
  }
  const valueFor = (row: string, column: string) => {
    if (row === column) return 1;
    return matrix.find((cell) => cell.left === row && cell.right === column)?.value ?? null;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-16"></th>
            {symbols.map((symbol) => <th key={symbol} className="p-1 text-muted-foreground">{symbol}</th>)}
          </tr>
        </thead>
        <tbody>
          {symbols.map((row) => (
            <tr key={row}>
              <th className="p-1 text-left text-muted-foreground">{row}</th>
              {symbols.map((column) => {
                const value = valueFor(row, column);
                const intensity = value == null ? 0 : Math.max(0, Math.min(1, (value + 1) / 2));
                return (
                  <td
                    key={`${row}-${column}`}
                    className="h-9 min-w-12 rounded text-center"
                    style={{ backgroundColor: `rgba(14, 165, 233, ${0.12 + intensity * 0.55})` }}
                  >
                    {value == null ? "-" : value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskContributorTable({ report }: { report: RiskAnalyticsReport }) {
  const rows = report.riskContributors.slice(0, 8);
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="p-3 font-medium">Instrument</th>
            <th className="p-3 font-medium">Class</th>
            <th className="p-3 text-right font-medium">Allocation</th>
            <th className="p-3 text-right font-medium">Own vol</th>
            <th className="p-3 text-right font-medium">Risk share</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-muted-foreground">No holdings yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="p-3 font-medium">{row.label}</td>
                <td className="p-3 text-muted-foreground">{formatAssetTypeLabel(row.assetClass)}</td>
                <td className="p-3 text-right">{formatPercent(row.allocation)}</td>
                <td className="p-3 text-right">{row.annualizedVolatility == null ? "-" : formatPercent(row.annualizedVolatility)}</td>
                <td className="p-3 text-right">{formatPercent(row.riskContribution)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function RiskPage() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        description="Create your base portfolio before reviewing risk analytics."
        action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/setup">Start setup</Link>}
      />
    );
  }

  const dashboard = await container.portfolioService.getDashboard(portfolio.id);
  const assetIds = Array.from(new Set(dashboard.holdings.map((holding) => holding.assetId)));
  const holdingSymbols = Array.from(
    new Set(
      dashboard.holdings
        .map((holding) => holding.ticker?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol))
    )
  );
  const [portfolioSnapshots, holdingSnapshots, dailyPrices, universeInstruments] = await Promise.all([
    container.analyticsRepository.listPortfolioSnapshots(portfolio.id, 1400),
    container.analyticsRepository.listHoldingSnapshots(portfolio.id, 1400),
    container.marketDataRepository.listDailyPricesForAssets(assetIds, yearsAgoIso(5)),
    container.universeRepository.listInstruments()
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
  const universePrices = await container.universeRepository.listInstrumentPrices(
    requiredInstrumentIds,
    yearsAgoIso(5)
  );
  const benchmarkIds = Array.from(new Set(dashboard.benchmarkComparisons.map((comparison) => comparison.benchmark.id)));
  const benchmarkSnapshots = await container.benchmarkRepository.listBenchmarkSnapshots(benchmarkIds, 10_000);
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
  const universeDailyPrices = universePrices.flatMap((price) => {
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
      portfolioId: portfolio.id,
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
  const report = container.riskAnalyticsService.calculateRiskAnalytics({
    dashboard,
    portfolioSnapshots,
    holdingSnapshots: [...fallbackHoldingSnapshots, ...universeHoldingSnapshots],
    dailyPrices: [...dailyPrices, ...universeDailyPrices],
    benchmarkSnapshots: selectedBenchmarkSnapshots
  });
  const volatilityPoints: ChartPoint[] = report.volatility.trend.map((point) => ({
    date: point.date,
    value: point.volatility ?? 0
  })).filter((point) => point.value > 0);
  const drawdownPoints: ChartPoint[] = report.drawdown.points.map((point: DrawdownPoint) => ({
    date: point.date,
    value: point.drawdown
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Risk analytics</p>
        <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deterministic portfolio risk metrics from stored snapshots, prices, metadata, and benchmark history.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Diversification score</CardTitle>
            <CardDescription>{report.diversification.label}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{report.diversification.score}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>30D volatility</CardTitle>
            <CardDescription>Annualised using sqrt(252).</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatMaybePercent(report.volatility.metrics[0]?.value)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current drawdown</CardTitle>
            <CardDescription>From portfolio snapshot peak.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatMaybePercent(report.drawdown.currentDrawdown)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top holding risk</CardTitle>
            <CardDescription>Share of invested holdings.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatPercent(report.concentration.topHoldingConcentration)}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estimated max drawdown</CardTitle>
            <CardDescription>Current weights replayed over available instrument history.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.estimatedDrawdown?.maxDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.estimatedDrawdown
                ? `${report.estimatedDrawdown.observationCount} overlapping return days, ${formatPercent(report.estimatedDrawdown.coverage)} coverage.`
                : "Needs overlapping historical price data for current holdings."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated current drawdown</CardTitle>
            <CardDescription>Where the current-weight backtest sits versus its prior peak.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.estimatedDrawdown?.currentDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.estimatedDrawdown?.startDate && report.estimatedDrawdown?.endDate
                ? `${compactDate(report.estimatedDrawdown.startDate)} to ${compactDate(report.estimatedDrawdown.endDate)}`
                : "No synthetic history available yet."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Snapshot max drawdown</CardTitle>
            <CardDescription>Actual drawdown since portfolio snapshots began.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.drawdown.maxDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.drawdown.drawdownDurationDays ?? 0} current drawdown day{report.drawdown.drawdownDurationDays === 1 ? "" : "s"}.
            </p>
          </CardContent>
        </Card>
      </section>

      {report.warnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Warnings and insights</CardTitle>
            <CardDescription>Simple deterministic checks for early risk review.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {report.warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-md border p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{warning}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volatility trend</CardTitle>
            <CardDescription>Rolling 30-day annualised portfolio volatility.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart points={volatilityPoints} label="Rolling portfolio volatility" formatValue={formatPercent} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Snapshot drawdown trend</CardTitle>
            <CardDescription>Actual portfolio decline from the latest stored snapshot peak.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart points={drawdownPoints} label="Portfolio drawdown" formatValue={formatPercent} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Concentration</CardTitle>
            <CardDescription>Current invested exposure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Top 5 holdings</span>
              <span className="font-medium">{formatPercent(report.concentration.topFiveConcentration)}</span>
            </div>
            <AllocationTable title="Asset class" items={report.concentration.byAssetClass} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exposure profile</CardTitle>
            <CardDescription>Sector and geography spread.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AllocationTable title="Sector" items={report.concentration.bySector} />
            <AllocationTable title="Geography" items={report.concentration.byGeography} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Currency and themes</CardTitle>
            <CardDescription>Currency concentration and available thematic tags.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AllocationTable title="Currency" items={report.concentration.byCurrency} />
            <AllocationTable title="Theme" items={report.concentration.byTheme} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Correlation heatmap</CardTitle>
            <CardDescription>Product-level correlations from holding snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="mb-3 text-sm font-medium">Holdings</h3>
              <CorrelationHeatmap
                matrix={report.correlations.matrix}
                emptyText="More product-level price history is needed for holding correlations."
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Asset classes</h3>
              <CorrelationHeatmap
                matrix={report.assetClassCorrelations.matrix}
                emptyText="More multi-asset history is needed for asset-class correlations."
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top risk contributors</CardTitle>
            <CardDescription>
              {report.riskContributionMethod === "covariance"
                ? `Covariance-based, ${report.riskContributionObservationCount} overlapping return days.`
                : "Proxy estimate until enough overlapping daily price history exists."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Method</p>
                <p className="mt-1 font-medium">{report.riskContributionMethod === "covariance" ? "Covariance-based" : "Proxy estimate"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">History coverage</p>
                <p className="mt-1 font-medium">{formatPercent(report.riskContributionCoverage)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Risk model vol</p>
                <p className="mt-1 font-medium">{report.riskContributionVolatility == null ? "-" : formatPercent(report.riskContributionVolatility)}</p>
              </div>
            </div>
            <RiskContributorTable report={report} />
            <AllocationTable title="Volatility contribution by asset class" items={report.riskByAssetClass} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark drawdown comparison</CardTitle>
          <CardDescription>Portfolio snapshot drawdown versus full benchmark history where available.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-medium">Benchmark</th>
                  <th className="p-3 text-right font-medium">Portfolio max drawdown</th>
                  <th className="p-3 text-right font-medium">Benchmark max drawdown</th>
                  <th className="p-3 text-right font-medium">Gap</th>
                  <th className="p-3 text-right font-medium">History</th>
                </tr>
              </thead>
              <tbody>
                {report.benchmarkDrawdowns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-muted-foreground">Refresh benchmark history to compare drawdowns.</td>
                  </tr>
                ) : (
                  report.benchmarkDrawdowns.map((row) => (
                    <tr key={row.benchmarkKey} className="border-t">
                      <td className="p-3 font-medium">{row.benchmarkName}</td>
                      <td className="p-3 text-right">{formatMaybePercent(row.portfolioMaxDrawdown)}</td>
                      <td className="p-3 text-right">{formatMaybePercent(row.benchmarkMaxDrawdown)}</td>
                      <td className="p-3 text-right">
                        {row.portfolioMaxDrawdown == null || row.benchmarkMaxDrawdown == null
                          ? "Not enough data"
                          : formatPercent(row.portfolioMaxDrawdown - row.benchmarkMaxDrawdown)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.benchmarkObservationCount > 0 ? `${row.benchmarkObservationCount} rows` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Values are in {portfolio.baseCurrency}; cash is included in portfolio-level volatility and drawdown because it affects total account risk.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
