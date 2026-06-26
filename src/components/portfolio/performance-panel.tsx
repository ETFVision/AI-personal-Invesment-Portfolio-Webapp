"use client";

import { useState } from "react";
import { BenchmarkComparison, PerformanceMetric, PortfolioDashboard } from "@/domain/portfolio/types";
import { formatPercent } from "@/lib/utils";

const performancePeriods = ["1Y", "YTD", "Since inception"] as const;
type PerformancePeriod = (typeof performancePeriods)[number];
const plottedBenchmarkKeys = ["sixty_forty", "global_equities", "sp500", "gold"] as const;
const benchmarkLineColors: Record<(typeof plottedBenchmarkKeys)[number], string> = {
  sixty_forty: "#0ea5e9",
  global_equities: "#7c3aed",
  sp500: "#2563eb",
  gold: "#d97706"
};

type PerformancePanelData = {
  performance: PerformanceMetric[];
  benchmarkComparisons: BenchmarkComparison[];
  latestPriceDate?: string | null;
};

export function PerformancePanel({ dashboard }: { dashboard: PerformancePanelData }) {
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriod>("1Y");
  const shortTermMetrics = dashboard.performance.filter(
    (item) => item.label === "Daily" || item.label === "Weekly" || item.label === "Monthly"
  );
  return (
    <LongTermPerformanceCharts
      dashboard={dashboard}
      selectedPeriod={selectedPeriod}
      onSelectPeriod={setSelectedPeriod}
      shortTermMetrics={shortTermMetrics}
    />
  );
}

function LongTermPerformanceCharts({
  dashboard,
  selectedPeriod,
  onSelectPeriod,
  shortTermMetrics
}: {
  dashboard: PerformancePanelData;
  selectedPeriod: PerformancePeriod;
  onSelectPeriod: (period: PerformancePeriod) => void;
  shortTermMetrics: PerformanceMetric[];
}) {
  const comparisons = dashboard.benchmarkComparisons.filter((comparison) => comparison.points.length >= 2);
  if (comparisons.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        The long-term benchmark charts will appear once benchmark history is available.
      </div>
    );
  }

  const periodConfig: Record<PerformancePeriod, { fallbackMessage: string; metricLabel: PerformanceMetric["label"] }> = {
    "1Y": { fallbackMessage: "Needs 1Y history", metricLabel: "1Y" },
    "YTD": { fallbackMessage: "Needs YTD history", metricLabel: "YTD" },
    "Since inception": { fallbackMessage: "Needs inception history", metricLabel: "Since inception" }
  };
  const config = periodConfig[selectedPeriod];

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="text-sm">
          <span className="font-medium">Longer-term performance</span>
          <span className="ml-2 text-muted-foreground">TWR portfolio vs price-return benchmarks</span>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {performancePeriods.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onSelectPeriod(period)}
              className={period === selectedPeriod
                ? "rounded-md bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <MultiBenchmarkPeriodChart
        label={selectedPeriod}
        comparisons={comparisons}
        portfolioMetric={dashboard.performance.find((metric) => metric.label === config.metricLabel)}
        period={selectedPeriod}
        fallbackMessage={config.fallbackMessage}
        latestPriceDate={dashboard.latestPriceDate}
        shortTermMetrics={shortTermMetrics}
      />
    </div>
  );
}

function buildComparisonSeriesForPeriod(
  points: PortfolioDashboard["benchmarkComparisons"][number]["points"],
  label: "1Y" | "YTD" | "Since inception"
) {
  if (points.length < 2) return [];

  const endDate = points[points.length - 1].snapshotDate;
  const startIso =
    label === "1Y"
      ? (() => {
          const date = new Date(`${endDate}T00:00:00.000Z`);
          date.setUTCDate(date.getUTCDate() - 365);
          return date.toISOString().slice(0, 10);
        })()
      : label === "YTD"
        ? `${new Date(endDate).getUTCFullYear()}-01-01`
        : points[0].snapshotDate;

  const filtered = points.filter((point) => point.snapshotDate >= startIso);
  return filtered.length >= 2 ? filtered : [];
}

function parseChartDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function selectReturnTicks(minValue: number, maxValue: number) {
  const paddedMin = Math.min(minValue, 0);
  const paddedMax = Math.max(maxValue, 0);
  const mid = (paddedMin + paddedMax) / 2;
  return Array.from(new Set([paddedMin, mid, 0, paddedMax].map((value) => Number(value.toFixed(4))))).sort((a, b) => a - b);
}

function sampleEvenly<T>(items: T[], limit: number) {
  if (items.length <= limit) return items;
  return Array.from({ length: limit }, (_, index) => items[Math.round((index / (limit - 1)) * (items.length - 1))]);
}

function selectDateTicks(
  points: PortfolioDashboard["benchmarkComparisons"][number]["points"],
  period: "1Y" | "YTD" | "Since inception"
) {
  if (points.length <= 2) return points;
  const grouped = new Map<string, PortfolioDashboard["benchmarkComparisons"][number]["points"][number]>();
  for (const point of points) {
    const key = period === "Since inception" ? point.snapshotDate.slice(0, 4) : point.snapshotDate.slice(0, 7);
    if (!grouped.has(key)) grouped.set(key, point);
  }
  const candidates = [points[0], ...Array.from(grouped.values()), points[points.length - 1]];
  const unique = Array.from(new Map(candidates.map((point) => [point.snapshotDate, point])).values());
  return sampleEvenly(unique, 6);
}

function formatChartDateLabel(value: string, period: "1Y" | "YTD" | "Since inception") {
  if (period === "Since inception") return value.slice(0, 4);
  return value.slice(5, 7) === "01" ? value.slice(0, 4) : value.slice(5, 7);
}

function PerformanceSideRow({
  label,
  value,
  color,
  valueTone = "muted"
}: {
  label: string;
  value: string;
  color?: string;
  valueTone?: "positive" | "danger" | "muted";
}) {
  const valueClass =
    valueTone === "positive"
      ? "text-emerald-600"
      : valueTone === "danger"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs leading-5">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {color ? <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-right font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function MultiBenchmarkPeriodChart({
  label,
  comparisons,
  portfolioMetric,
  period,
  fallbackMessage,
  latestPriceDate,
  shortTermMetrics
}: {
  label: string;
  comparisons: PortfolioDashboard["benchmarkComparisons"];
  portfolioMetric: PerformanceMetric | undefined;
  period: "1Y" | "YTD" | "Since inception";
  fallbackMessage: string;
  latestPriceDate?: string | null;
  shortTermMetrics: PerformanceMetric[];
}) {
  const sourcePeriodComparisons = comparisons
    .map((comparison) => ({
      comparison,
      points: buildComparisonSeriesForPeriod(comparison.points, period)
    }))
    .filter((item) => item.points.length >= 2);
  const periodComparisons = sourcePeriodComparisons.filter((item) =>
    plottedBenchmarkKeys.includes(item.comparison.benchmark.benchmarkKey as (typeof plottedBenchmarkKeys)[number])
  );
  const portfolioPoints = sourcePeriodComparisons[0]?.points ?? [];

  if (portfolioPoints.length < 2) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {fallbackMessage}
      </div>
    );
  }

  const rebaseReturn = (current: number, baseline: number) => {
    const denominator = 1 + baseline;
    return denominator === 0 ? 0 : (1 + current) / denominator - 1;
  };
  const basePortfolioReturn = portfolioPoints[0].portfolioReturn;
  const portfolioSeries = portfolioPoints.map((point) => ({
    date: point.snapshotDate,
    value: rebaseReturn(point.portfolioReturn, basePortfolioReturn)
  }));
  const benchmarkSeries = periodComparisons.map(({ comparison, points }) => {
    const baseBenchmarkReturn = points[0].benchmarkReturn;
    const benchmarkKey = comparison.benchmark.benchmarkKey as (typeof plottedBenchmarkKeys)[number];
    return {
      id: comparison.benchmark.id,
      name: comparison.benchmark.name,
      color: benchmarkLineColors[benchmarkKey],
      values: points.map((point) => ({
        date: point.snapshotDate,
        value: rebaseReturn(point.benchmarkReturn, baseBenchmarkReturn)
      })),
      latestValue: rebaseReturn(points[points.length - 1].benchmarkReturn, baseBenchmarkReturn)
    };
  });
  const allValues = [...portfolioSeries.map((point) => point.value), ...benchmarkSeries.flatMap((series) => series.values.map((point) => point.value))];
  const allDates = [...portfolioSeries.map((point) => point.date), ...benchmarkSeries.flatMap((series) => series.values.map((point) => point.date))];
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = Math.max(maxValue - minValue, 0.01);
  const minDate = Math.min(...allDates.map(parseChartDate));
  const maxDate = Math.max(...allDates.map(parseChartDate));
  const dateRange = Math.max(maxDate - minDate, 1);
  const width = 100;
  const height = 100;
  const left = 13;
  const right = 94;
  const top = 12;
  const bottom = 84;
  const tickValues = selectReturnTicks(minValue, maxValue);
  const dateTicks = selectDateTicks(portfolioPoints, period);
  const staleTail = latestPriceDate ? portfolioSeries.some((point) => point.date > latestPriceDate) : false;

  const buildPath = (series: Array<{ date: string; value: number }>) =>
    series
      .map((point) => {
        const x = left + ((parseChartDate(point.date) - minDate) / dateRange) * (right - left);
        const y = bottom - ((point.value - minValue) / range) * (bottom - top);
        return `${x},${y}`;
      })
      .join(" ");

  const yFor = (value: number) => bottom - ((value - minValue) / range) * (bottom - top);
  const xFor = (date: string) => left + ((parseChartDate(date) - minDate) / dateRange) * (right - left);
  const splitForFreshness = (series: Array<{ date: string; value: number }>) => {
    if (!latestPriceDate) return { solid: series, dashed: [] as Array<{ date: string; value: number }> };
    const firstStaleIndex = series.findIndex((point) => point.date > latestPriceDate);
    if (firstStaleIndex === -1) return { solid: series, dashed: [] as Array<{ date: string; value: number }> };
    return {
      solid: series.slice(0, Math.max(firstStaleIndex, 1)),
      dashed: series.slice(Math.max(0, firstStaleIndex - 1))
    };
  };
  const portfolioSegments = splitForFreshness(portfolioSeries);
  const portfolioLatestValue = portfolioMetric?.percentChange ?? portfolioSeries[portfolioSeries.length - 1]?.value ?? 0;
  const legendRows = [
    {
      id: "portfolio",
      label: "Portfolio",
      value: portfolioLatestValue,
      color: "hsl(var(--primary))"
    },
    ...benchmarkSeries.map((series) => ({
      id: series.id,
      label: series.name,
      value: series.latestValue,
      color: series.color
    }))
  ];

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="w-full rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{benchmarkSeries.length} plotted benchmark{benchmarkSeries.length === 1 ? "" : "s"}</div>
          </div>
          <div className="text-xs text-muted-foreground">Portfolio / benchmarks</div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label} portfolio versus benchmark chart`} className="h-52 w-full">
          {tickValues.map((value) => {
            const y = yFor(value);
            const isZero = Math.abs(value) < 0.00001;
            return (
              <g key={value}>
                <line
                  x1={left}
                  y1={y}
                  x2={right}
                  y2={y}
                  className={isZero ? "stroke-muted-foreground" : "stroke-muted"}
                  strokeWidth={isZero ? "0.7" : "0.4"}
                  strokeDasharray={isZero ? undefined : "2 2"}
                />
                <text x={left - 1.5} y={y + 1.2} textAnchor="end" className="fill-muted-foreground text-[3.8px]">
                  {formatPercent(value)}
                </text>
              </g>
            );
          })}
          {dateTicks.map((point) => {
            const x = xFor(point.snapshotDate);
            return (
              <text key={point.snapshotDate} x={x} y={97} textAnchor="middle" className="fill-muted-foreground text-[3.7px]">
                {formatChartDateLabel(point.snapshotDate, period)}
              </text>
            );
          })}
          <polyline points={buildPath(portfolioSegments.solid)} fill="none" className="stroke-primary" strokeWidth="2.1" strokeLinecap="round" />
          {portfolioSegments.dashed.length >= 2 ? (
            <polyline points={buildPath(portfolioSegments.dashed)} fill="none" className="stroke-primary opacity-50" strokeWidth="2.1" strokeLinecap="round" strokeDasharray="3 2" />
          ) : null}
          {benchmarkSeries.map((series) => {
            const segments = splitForFreshness(series.values);
            return (
              <g key={series.id}>
                <polyline
                  points={buildPath(segments.solid)}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                {segments.dashed.length >= 2 ? (
                  <polyline
                    points={buildPath(segments.dashed)}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeDasharray="3 2"
                    opacity="0.45"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
        {staleTail && latestPriceDate ? (
          <p className="mt-2 text-xs text-muted-foreground">prices as of {latestPriceDate} · provisional</p>
        ) : null}
      </div>

      <div className="flex h-full flex-col rounded-md border bg-muted/30 p-4">
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legend</div>
          {legendRows.map((row) => (
            <PerformanceSideRow key={row.id} label={row.label} value={formatPercent(row.value)} color={row.color} valueTone={row.value < 0 ? "danger" : "positive"} />
          ))}
        </div>
        <div className="my-4 border-t border-border" />
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Return summary</div>
          {shortTermMetrics.map((metric) => (
            <PerformanceSideRow
              key={metric.label}
              label={metric.label}
              value={metric.percentChange == null ? "Needs history" : formatPercent(metric.percentChange)}
              valueTone={metric.percentChange == null ? "muted" : metric.percentChange < 0 ? "danger" : "positive"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
