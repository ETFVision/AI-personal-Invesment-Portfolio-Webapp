import { AllocationItem, CashPerformance, PerformanceMetric, PortfolioDashboard, ProductPerformance } from "@/domain/portfolio/types";
import { formatAssetTypeLabel, formatCurrencyWithCode, formatPercent } from "@/lib/utils";

const chartColors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4b5563"];

function ExposureBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(Math.max(percent, 0) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

export function CashInvestedPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  return (
    <div className="space-y-3">
      <ExposureBar
        label="Cash"
        value={formatPercent(dashboard.cashPercent)}
        percent={dashboard.cashPercent}
      />
      <ExposureBar
        label="Invested"
        value={formatPercent(dashboard.investedPercent)}
        percent={dashboard.investedPercent}
      />
    </div>
  );
}

export function AllocationPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.allocationByType.length === 0) {
    return <p className="text-sm text-muted-foreground">Add cash or holdings to see allocation.</p>;
  }

  return (
    <div className="space-y-3">
      {dashboard.allocationByType.map((item) => (
        <ExposureBar
          key={item.label}
          label={formatAssetTypeLabel(item.label)}
          value={formatPercent(item.percent)}
          percent={item.percent}
        />
      ))}
    </div>
  );
}

export function AllocationDonutPanel({
  title,
  items,
  labelFormatter = (label) => label
}: {
  title: string;
  items: AllocationItem[];
  labelFormatter?: (label: string) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No allocation data yet.</p>;
  }

  let cursor = 0;
  const segments = items.map((item, index) => {
    const start = cursor;
    const end = cursor + item.percent * 100;
    cursor = end;
    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });

  return (
    <div className="grid gap-4 md:grid-cols-[150px_1fr] md:items-center">
      <div
        aria-label={title}
        className="mx-auto h-36 w-36 rounded-full border"
        style={{ background: `conic-gradient(${segments.join(", ")})` }}
      />
      <div className="space-y-2">
        {items.slice(0, 6).map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              {labelFormatter(item.label)}
            </span>
            <span className="text-muted-foreground">{formatPercent(item.percent)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CurrencyExposurePanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.currencyExposure.length === 0) {
    return <p className="text-sm text-muted-foreground">Add cash or holdings to see currency exposure.</p>;
  }

  return (
    <div className="space-y-3">
      {dashboard.currencyExposure.map((item) => (
        <ExposureBar
          key={item.currency}
          label={item.currency}
          value={formatPercent(item.percent)}
          percent={item.percent}
        />
      ))}
    </div>
  );
}

export function WinnersLosersPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  const rows = [...dashboard.topWinners, ...dashboard.topLosers];

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Refresh prices to compare current market value against average cost.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Top winners</h3>
        {dashboard.topWinners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No positive unrealised gains yet.</p>
        ) : (
          dashboard.topWinners.map((row) => (
            <div key={row.valuation.holding.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{row.valuation.holding.ticker ?? row.valuation.holding.assetName}</span>
                <span className="text-emerald-600">{formatPercent(row.gainLossPercent)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatCurrencyWithCode(row.gainLoss, row.valuation.valueCurrency)}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Top losers</h3>
        {dashboard.topLosers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unrealised losses yet.</p>
        ) : (
          dashboard.topLosers.map((row) => (
            <div key={row.valuation.holding.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{row.valuation.holding.ticker ?? row.valuation.holding.assetName}</span>
                <span className="text-destructive">{formatPercent(row.gainLossPercent)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatCurrencyWithCode(row.gainLoss, row.valuation.valueCurrency)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PerformancePanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  const shortTermMetrics = dashboard.performance.filter(
    (item) => item.label === "Daily" || item.label === "Weekly" || item.label === "Monthly"
  );
  return (
    <div className="space-y-6">
      <PerformanceLineChart metrics={dashboard.performance} currency={dashboard.portfolio.baseCurrency} />
      <MetricGrid metrics={shortTermMetrics} currency={dashboard.portfolio.baseCurrency} />
      <BenchmarkComparisonPanel dashboard={dashboard} />
    </div>
  );
}

export function PerformanceLineChart({ metrics, currency }: { metrics: PerformanceMetric[]; currency: string }) {
  const chartMetrics = metrics.filter((item) => item.label === "1Y" || item.label === "YTD" || item.label === "Since inception");
  const available = chartMetrics.filter((item) => item.percentChange != null);

  if (available.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        The 1Y, YTD, and since-inception line chart will appear once snapshot and transaction history is available.
      </div>
    );
  }

  const values = available.map((item) => item.percentChange ?? 0);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = Math.max(maxValue - minValue, 0.01);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Longer-term performance</span>
        <span className="text-muted-foreground">Flow-adjusted return</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {chartMetrics.map((item) => (
          <PeriodPerformanceChart key={item.label} metric={item} currency={currency} minValue={minValue} range={range} />
        ))}
      </div>
    </div>
  );
}

function PeriodPerformanceChart({
  metric,
  currency,
  minValue,
  range
}: {
  metric: PerformanceMetric;
  currency: string;
  minValue: number;
  range: number;
}) {
  const hasValue = metric.percentChange != null && metric.valueChange != null;
  const endY = hasValue ? 88 - (((metric.percentChange ?? 0) - minValue) / range) * 76 : 88;
  const startLabel = metric.baselineDate ? metric.baselineDate.slice(0, 7) : "Start";
  const endLabel = "Now";

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{metric.label}</div>
        <div className={hasValue && metric.valueChange! < 0 ? "text-sm text-destructive" : hasValue ? "text-sm text-emerald-600" : "text-sm text-muted-foreground"}>
          {hasValue ? formatPercent(metric.percentChange!) : "Needs history"}
        </div>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${metric.label} returns line chart`} className="h-44 w-full">
        <line x1="0" y1="88" x2="100" y2="88" className="stroke-muted" strokeWidth="0.7" />
        <line x1="0" y1="12" x2="100" y2="12" className="stroke-muted" strokeWidth="0.4" strokeDasharray="2 2" />
        <line
          x1="0"
          y1={88 - ((0 - minValue) / range) * 76}
          x2="100"
          y2={88 - ((0 - minValue) / range) * 76}
          className="stroke-muted-foreground"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        {hasValue ? (
          <>
            <polyline points={`0,88 100,${endY}`} fill="none" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="0" cy="88" r="2.2" className="fill-primary" />
            <circle cx="100" cy={endY} r="2.2" className="fill-primary" />
          </>
        ) : (
          <text x="50" y="50" textAnchor="middle" className="fill-muted-foreground text-[5px]">
            Needs monthly history
          </text>
        )}
        <text x="0" y="97" textAnchor="start" className="fill-muted-foreground text-[4px]">{startLabel}</text>
        <text x="100" y="97" textAnchor="end" className="fill-muted-foreground text-[4px]">{endLabel}</text>
      </svg>
      <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
        {hasValue ? (
          <div className={metric.valueChange! < 0 ? "text-destructive" : "text-emerald-600"}>
            {formatCurrencyWithCode(metric.valueChange!, currency)}
          </div>
        ) : (
          <div className="text-muted-foreground">Snapshot history required</div>
        )}
      </div>
    </div>
  );
}

export function MetricGrid({ metrics, currency }: { metrics: PerformanceMetric[]; currency: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-md border p-3">
          <div className="text-sm font-medium">{item.label}</div>
          {item.valueChange == null || item.percentChange == null ? (
            <div className="mt-2 text-sm text-muted-foreground">Needs history</div>
          ) : (
            <>
              <div className={item.valueChange < 0 ? "mt-2 text-lg font-semibold text-destructive" : "mt-2 text-lg font-semibold text-emerald-600"}>
                {formatCurrencyWithCode(item.valueChange, currency)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercent(item.percentChange)}{item.baselineDate ? ` since ${item.baselineDate}` : ""}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function HoldingPerformancePanel({
  performance,
  currency
}: {
  performance: ProductPerformance | undefined;
  currency: string;
}) {
  if (!performance) {
    return <p className="text-sm text-muted-foreground">Refresh prices to calculate product performance.</p>;
  }

  return <MetricGrid metrics={performance.metrics} currency={currency} />;
}

export function CashPerformancePanel({
  performance,
  currency
}: {
  performance: CashPerformance | undefined;
  currency: string;
}) {
  if (!performance) {
    return <p className="text-sm text-muted-foreground">Create snapshots to calculate cash performance.</p>;
  }

  return <MetricGrid metrics={performance.metrics} currency={currency} />;
}

export function BenchmarkComparisonPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.benchmarkComparisons.length === 0) {
    return <p className="text-sm text-muted-foreground">Refresh benchmarks to compare your portfolio against reference markets.</p>;
  }

  const primary =
    dashboard.benchmarkComparisons.find((item) => item.benchmark.benchmarkKey === "sp500") ?? dashboard.benchmarkComparisons[0];

  return (
    <div className="space-y-6 border-t pt-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Benchmark comparison</div>
        <div className="text-sm text-muted-foreground">Portfolio versus {primary.benchmark.name} using rolling and cumulative spread views.</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <BenchmarkSpreadCard
          label="Daily"
          portfolioReturn={primary.rolling1DayPortfolioReturn}
          benchmarkReturn={primary.rolling1DayBenchmarkReturn}
        />
        <BenchmarkSpreadCard
          label="Weekly"
          portfolioReturn={primary.rolling7DayPortfolioReturn}
          benchmarkReturn={primary.rolling7DayBenchmarkReturn}
        />
        <BenchmarkSpreadCard
          label="Monthly"
          portfolioReturn={primary.rolling30DayPortfolioReturn}
          benchmarkReturn={primary.rolling30DayBenchmarkReturn}
        />
      </div>
      <ComparisonLineChart
        title="Portfolio vs benchmark performance"
        subtitle={primary.benchmark.name}
        points={primary.points}
        leftLabel="Portfolio return"
        rightLabel={`${primary.benchmark.name} return`}
        valueAccessor={(point) => [point.portfolioReturn, point.benchmarkReturn]}
        seriesLabels={["Portfolio", primary.benchmark.name]}
        valueFormatter={formatPercent}
      />
      <ComparisonLineChart
        title="Drawdown comparison"
        subtitle={primary.benchmark.name}
        points={primary.points}
        leftLabel="Portfolio drawdown"
        rightLabel={`${primary.benchmark.name} drawdown`}
        valueAccessor={(point) => [point.portfolioDrawdown, point.benchmarkDrawdown]}
        seriesLabels={["Portfolio", primary.benchmark.name]}
        valueFormatter={formatPercent}
      />
      <BenchmarkSummaryTable comparisons={dashboard.benchmarkComparisons} />
    </div>
  );
}

function benchmarkSpreadPercent(portfolioReturn: number | null, benchmarkReturn: number | null) {
  if (portfolioReturn == null || benchmarkReturn == null) return null;
  return portfolioReturn - benchmarkReturn;
}

function BenchmarkSpreadCard({
  label,
  portfolioReturn,
  benchmarkReturn
}: {
  label: string;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
}) {
  const spread = benchmarkSpreadPercent(portfolioReturn, benchmarkReturn);
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 text-lg font-semibold">
        {spread == null ? <span className="text-muted-foreground">Needs history</span> : <span className={spread < 0 ? "text-destructive" : "text-emerald-600"}>{formatPercent(spread)}</span>}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Portfolio {portfolioReturn == null ? "-" : formatPercent(portfolioReturn)} vs benchmark {benchmarkReturn == null ? "-" : formatPercent(benchmarkReturn)}
      </div>
    </div>
  );
}

function BenchmarkSummaryTable({ comparisons }: { comparisons: PortfolioDashboard["benchmarkComparisons"] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[1.1fr_0.65fr_0.65fr_0.7fr_0.7fr_0.7fr] gap-3 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Benchmark</span>
        <span>Portfolio</span>
        <span>Benchmark</span>
        <span>Relative</span>
        <span>30D</span>
        <span>90D</span>
      </div>
      <div className="divide-y">
        {comparisons.map((comparison) => (
          <div key={comparison.benchmark.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1.1fr_0.65fr_0.65fr_0.7fr_0.7fr_0.7fr]">
            <div className="font-medium">{comparison.benchmark.name}</div>
            <div>{comparison.cumulativePortfolioReturn == null ? "-" : formatPercent(comparison.cumulativePortfolioReturn)}</div>
            <div>{comparison.cumulativeBenchmarkReturn == null ? "-" : formatPercent(comparison.cumulativeBenchmarkReturn)}</div>
            <div className={comparison.relativeOutperformance == null ? "" : comparison.relativeOutperformance < 0 ? "text-destructive" : "text-emerald-600"}>
              {comparison.relativeOutperformance == null ? "-" : formatPercent(comparison.relativeOutperformance)}
            </div>
            <div>{comparison.rolling30DayPortfolioReturn == null || comparison.rolling30DayBenchmarkReturn == null ? "-" : formatPercent(comparison.rolling30DayPortfolioReturn - comparison.rolling30DayBenchmarkReturn)}</div>
            <div>{comparison.rolling90DayPortfolioReturn == null || comparison.rolling90DayBenchmarkReturn == null ? "-" : formatPercent(comparison.rolling90DayPortfolioReturn - comparison.rolling90DayBenchmarkReturn)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonLineChart({
  title,
  subtitle,
  points,
  leftLabel,
  rightLabel,
  valueAccessor,
  seriesLabels,
  valueFormatter
}: {
  title: string;
  subtitle: string;
  points: PortfolioDashboard["benchmarkComparisons"][number]["points"];
  leftLabel: string;
  rightLabel: string;
  valueAccessor: (point: PortfolioDashboard["benchmarkComparisons"][number]["points"][number]) => [number, number];
  seriesLabels: [string, string];
  valueFormatter: (value: number) => string;
}) {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Benchmark history is still being collected.</p>;
  }

  const seriesA = points.map((point) => valueAccessor(point)[0]);
  const seriesB = points.map((point) => valueAccessor(point)[1]);
  const allValues = [...seriesA, ...seriesB];
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = Math.max(maxValue - minValue, 0.01);
  const width = 100;
  const height = 100;
  const left = 8;
  const right = 92;
  const top = 12;
  const bottom = 88;
  const xStep = points.length === 1 ? 0 : (right - left) / (points.length - 1);

  function buildPath(series: number[]) {
    return series
      .map((value, index) => {
        const x = left + index * xStep;
        const y = bottom - ((value - minValue) / range) * (bottom - top);
        return `${x},${y}`;
      })
      .join(" ");
  }

  const startLabel = points[0].snapshotDate.slice(0, 7);
  const endLabel = points[points.length - 1].snapshotDate.slice(0, 7);

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className="text-xs text-muted-foreground">{leftLabel} / {rightLabel}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-48 w-full">
        <line x1={left} y1={bottom} x2={right} y2={bottom} className="stroke-muted" strokeWidth="0.7" />
        <line x1={left} y1={top} x2={right} y2={top} className="stroke-muted" strokeWidth="0.4" strokeDasharray="2 2" />
        <polyline points={buildPath(seriesA)} fill="none" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
        <polyline points={buildPath(seriesB)} fill="none" className="stroke-emerald-600" strokeWidth="1.8" strokeLinecap="round" />
        <text x={left} y={97} textAnchor="start" className="fill-muted-foreground text-[4px]">{startLabel}</text>
        <text x={right} y={97} textAnchor="end" className="fill-muted-foreground text-[4px]">{endLabel}</text>
      </svg>
      <div className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">{seriesLabels[0]}</div>
          <div>{valueFormatter(seriesA[seriesA.length - 1] ?? 0)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{seriesLabels[1]}</div>
          <div>{valueFormatter(seriesB[seriesB.length - 1] ?? 0)}</div>
        </div>
      </div>
    </div>
  );
}

export function CompositionTable({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.holdingValuations.length === 0) {
    return <p className="text-sm text-muted-foreground">Add holdings to see portfolio composition.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Asset</span>
        <span>Class</span>
        <span>Sector</span>
        <span>Geography</span>
        <span>Value</span>
      </div>
      <div className="divide-y">
        {dashboard.holdingValuations.map((valuation) => (
          <div key={valuation.holding.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr]">
            <span className="font-medium">{valuation.holding.ticker ?? valuation.holding.assetName}</span>
            <span><span className="text-xs text-muted-foreground md:hidden">Class </span>{formatAssetTypeLabel(valuation.holding.assetType)}</span>
            <span><span className="text-xs text-muted-foreground md:hidden">Sector </span>{valuation.holding.sector ?? "Unknown"}</span>
            <span><span className="text-xs text-muted-foreground md:hidden">Geography </span>{valuation.holding.region ?? valuation.holding.country ?? "Unknown"}</span>
            <span><span className="text-xs text-muted-foreground md:hidden">Value </span>{formatCurrencyWithCode(valuation.value, valuation.valueCurrency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
