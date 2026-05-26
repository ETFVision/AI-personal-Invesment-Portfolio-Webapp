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

  const points = chartMetrics.map((item, index) => ({
    metric: item,
    x: chartMetrics.length === 1 ? 50 : (index / (chartMetrics.length - 1)) * 100,
    y: item.percentChange == null ? null : item.percentChange
  }));
  const values = available.map((item) => item.percentChange ?? 0);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = Math.max(maxValue - minValue, 0.01);
  const plottedPoints = points
    .filter((point): point is typeof point & { y: number } => point.y != null)
    .map((point) => ({
      ...point,
      yPos: 88 - ((point.y - minValue) / range) * 76
    }));
  const polyline = plottedPoints.map((point) => `${point.x},${point.yPos}`).join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Longer-term performance</span>
        <span className="text-muted-foreground">Flow-adjusted return</span>
      </div>
      <div className="rounded-md border p-4">
        <svg viewBox="0 0 100 100" role="img" aria-label="1Y, YTD, and since-inception returns line chart" className="h-56 w-full">
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
          {polyline ? <polyline points={polyline} fill="none" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {plottedPoints.map((point) => (
            <g key={point.metric.label}>
              <circle cx={point.x} cy={point.yPos} r="2.4" className="fill-primary" />
              <text x={point.x} y="97" textAnchor="middle" className="fill-muted-foreground text-[4px]">
                {point.metric.baselineDate ? point.metric.baselineDate.slice(0, 7) : point.metric.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {chartMetrics.map((item) => (
            <div key={item.label} className="rounded-md bg-muted/50 p-3">
              <div className="text-sm font-medium">{item.label}</div>
              {item.percentChange == null || item.valueChange == null ? (
                <div className="mt-1 text-sm text-muted-foreground">Needs history</div>
              ) : (
                <div className={item.valueChange < 0 ? "mt-1 text-sm text-destructive" : "mt-1 text-sm text-emerald-600"}>
                  {formatPercent(item.percentChange)} · {formatCurrencyWithCode(item.valueChange, currency)}
                </div>
              )}
            </div>
          ))}
        </div>
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
