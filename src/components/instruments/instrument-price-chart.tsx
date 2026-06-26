"use client";

import { type MouseEvent, useMemo, useState } from "react";
import type { PriceSeriesPoint } from "@/domain/universe/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GREEN = "#16a34a";
const RED = "#dc2626";
const WIDTH = 600;
const HEIGHT = 160;
const PADDING_X = 16;
const PADDING_Y = 14;
const PERIODS = [
  { key: "1M", label: "1M", points: 21 },
  { key: "3M", label: "3M", points: 63 },
  { key: "6M", label: "6M", points: 126 },
  { key: "1Y", label: "1Y", points: 252 },
  { key: "5Y", label: "5Y", points: 1260 },
  { key: "20Y", label: "20Y", points: null }
] as const;

type ChartPoint = PriceSeriesPoint & {
  x: number;
  y: number;
};

type ChartGeometry = {
  points: ChartPoint[];
  linePath: string;
  areaPath: string;
  min: number;
  max: number;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatTickDate(value: string, span: number) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (span <= 140) return date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
  if (span <= 400) {
    const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `${month} '${String(date.getUTCFullYear()).slice(-2)}`;
  }
  return String(date.getUTCFullYear());
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function axisMoney(value: number) {
  if (Math.abs(value) >= 1000) return `$${Math.round(value).toLocaleString("en-US")}`;
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`;
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function changeMetrics(series: PriceSeriesPoint[]) {
  const first = series[0]?.close ?? 0;
  const latest = series.at(-1)?.close ?? 0;
  const absolute = latest - first;
  const percent = first === 0 ? 0 : (absolute / first) * 100;
  const positive = latest >= first;
  return { first, latest, absolute, percent, positive };
}

function storedReturnForPeriod(
  periodKey: (typeof PERIODS)[number]["key"],
  returns: { oneYearReturn: number | null; fiveYearReturn: number | null; twentyYearReturn: number | null }
) {
  if (periodKey === "1Y") return returns.oneYearReturn;
  if (periodKey === "5Y") return returns.fiveYearReturn;
  if (periodKey === "20Y") return returns.twentyYearReturn;
  return null;
}

function headerChangeMetrics(series: PriceSeriesPoint[], storedReturn: number | null) {
  const windowMetrics = changeMetrics(series);
  if (storedReturn == null || !Number.isFinite(storedReturn) || Math.abs(1 + storedReturn) < 0.000001) {
    return windowMetrics;
  }
  const latest = windowMetrics.latest;
  const absolute = latest * (storedReturn / (1 + storedReturn));
  return {
    first: latest - absolute,
    latest,
    absolute,
    percent: storedReturn * 100,
    positive: storedReturn >= 0
  };
}

function getTicks(series: PriceSeriesPoint[]) {
  if (series.length === 0) return [];
  const targetCount = Math.min(6, series.length);
  const seen = new Set<number>();
  const ticks: Array<{ index: number; label: string }> = [];
  for (let tick = 0; tick < targetCount; tick += 1) {
    const index = Math.round((tick / Math.max(1, targetCount - 1)) * (series.length - 1));
    if (seen.has(index)) continue;
    seen.add(index);
    ticks.push({ index, label: formatTickDate(series[index].date, series.length) });
  }
  return ticks;
}

function chartGeometry(series: PriceSeriesPoint[]): ChartGeometry {
  const closes = series.map((point) => point.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const rawRange = maxClose - minClose;
  const padding = rawRange === 0 ? Math.max(1, maxClose * 0.1) : rawRange * 0.1;
  const min = minClose - padding;
  const max = maxClose + padding;
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_Y * 2;

  const points: ChartPoint[] = series.map((point, index) => {
    const x = PADDING_X + (index / Math.max(1, series.length - 1)) * plotWidth;
    const y = PADDING_Y + ((max - point.close) / Math.max(1, max - min)) * plotHeight;
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const first = points[0];
  const last = points.at(-1);
  const baseline = HEIGHT - PADDING_Y;
  const areaPath = first && last ? `${linePath} L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z` : "";

  return { points, linePath, areaPath, min, max };
}

function yForValue(value: number, min: number, max: number) {
  return PADDING_Y + ((max - value) / Math.max(1, max - min)) * (HEIGHT - PADDING_Y * 2);
}

function referenceLine(value: number | null | undefined, label: string, geometry: ChartGeometry) {
  if (value == null || !Number.isFinite(value) || value < geometry.min || value > geometry.max) return null;
  const y = yForValue(value, geometry.min, geometry.max);
  return { label, value, y, topPct: (y / HEIGHT) * 100 };
}

function axisLabels(geometry: ChartGeometry) {
  return [0.25, 0.5, 0.75].map((line) => {
    const y = PADDING_Y + (HEIGHT - PADDING_Y * 2) * line;
    const value = geometry.max - ((y - PADDING_Y) / (HEIGHT - PADDING_Y * 2)) * (geometry.max - geometry.min);
    return { y, topPct: (y / HEIGHT) * 100, value };
  });
}

export function InstrumentPriceChart({
  series,
  fiftyTwoWeekLow,
  fiftyTwoWeekHigh,
  oneYearReturn,
  fiveYearReturn,
  twentyYearReturn
}: {
  series: PriceSeriesPoint[];
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  oneYearReturn: number | null;
  fiveYearReturn: number | null;
  twentyYearReturn: number | null;
}) {
  const [periodKey, setPeriodKey] = useState<(typeof PERIODS)[number]["key"]>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const selectedPeriod = PERIODS.find((period) => period.key === periodKey) ?? PERIODS[3];
  const periodSeries = useMemo(() => {
    const cleaned = series.filter((point) => Number.isFinite(point.close) && point.close > 0);
    return selectedPeriod.points == null ? cleaned : cleaned.slice(-selectedPeriod.points);
  }, [selectedPeriod.points, series]);

  if (periodSeries.length < 2) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Price chart</CardTitle>
          <CardDescription>Stored adjusted close history.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex min-h-44 flex-1 items-center justify-center rounded-lg border bg-muted/40 text-sm font-medium text-muted-foreground">
            No price history
          </div>
        </CardContent>
      </Card>
    );
  }

  const storedReturn = storedReturnForPeriod(periodKey, { oneYearReturn, fiveYearReturn, twentyYearReturn });
  const { latest, absolute, percent, positive } = headerChangeMetrics(periodSeries, storedReturn);
  const color = positive ? GREEN : RED;
  const direction = positive ? "\u25B2" : "\u25BC";
  const geometry = chartGeometry(periodSeries);
  const ticks = getTicks(periodSeries);
  const references = [
    referenceLine(fiftyTwoWeekHigh, "52W High", geometry),
    referenceLine(fiftyTwoWeekLow, "52W Low", geometry)
  ].filter((item): item is NonNullable<typeof item> => item != null);
  const yAxisLabels = axisLabels(geometry);
  const hoverPoint = hoverIndex == null ? null : geometry.points[hoverIndex] ?? null;
  const hoverMetrics = hoverIndex == null ? null : changeMetrics(periodSeries.slice(0, hoverIndex + 1));
  const gradientId = `instrument-price-gradient-${periodKey}`;

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * Math.max(0, periodSeries.length - 1)));
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Price chart</CardTitle>
            <CardDescription>Adjusted close history, sliced locally by period.</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{money(latest)}</p>
            <p className="text-sm font-semibold" style={{ color }}>
              {direction} {money(Math.abs(absolute))} ({pct(Math.abs(percent))})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Price chart periods">
          {PERIODS.map((period) => (
            <button
              key={period.key}
              type="button"
              onClick={() => {
                setPeriodKey(period.key);
                setHoverIndex(null);
              }}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                period.key === periodKey
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="relative flex min-h-44 flex-1 flex-col" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16">
            {yAxisLabels.map((label) => (
              <span
                key={label.topPct}
                className="absolute left-0 -translate-y-1/2 rounded bg-background/80 px-1 text-left text-[11px] tabular-nums text-muted-foreground"
                style={{ top: `${label.topPct}%` }}
              >
                {axisMoney(label.value)}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24">
            {references.map((line) => (
              <span
                key={line.label}
                className="absolute right-0 -translate-y-1/2 rounded border bg-background/90 px-1 text-[11px] tabular-nums text-muted-foreground shadow-sm"
                style={{ top: `${line.topPct}%` }}
              >
                {line.label} {axisMoney(line.value)}
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="min-h-44 w-full flex-1 overflow-visible" role="img" aria-label={`${selectedPeriod.label} adjusted close price chart`}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((line) => (
              <line
                key={line}
                x1={PADDING_X}
                x2={WIDTH - PADDING_X}
                y1={PADDING_Y + (HEIGHT - PADDING_Y * 2) * line}
                y2={PADDING_Y + (HEIGHT - PADDING_Y * 2) * line}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1"
              />
            ))}
            {references.map((line) => (
              <line
                key={line.label}
                x1={PADDING_X}
                x2={WIDTH - PADDING_X}
                y1={line.y}
                y2={line.y}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeDasharray="5 5"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
            <path d={geometry.linePath} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            {geometry.points.at(-1) ? <circle cx={geometry.points.at(-1)?.x} cy={geometry.points.at(-1)?.y} r="4" fill={color} /> : null}
            {hoverPoint ? (
              <>
                <line x1={hoverPoint.x} x2={hoverPoint.x} y1={PADDING_Y} y2={HEIGHT - PADDING_Y} stroke="currentColor" strokeOpacity="0.3" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4.5" fill={color} stroke="currentColor" strokeWidth="1.5" />
              </>
            ) : null}
          </svg>
          {hoverPoint && hoverMetrics ? (
            <div
              className="pointer-events-none absolute top-3 z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
              style={{
                left: `${(hoverPoint.x / WIDTH) * 100}%`,
                transform: hoverPoint.x > WIDTH * 0.75 ? "translateX(-105%)" : "translateX(8px)"
              }}
            >
              <p className="font-semibold text-popover-foreground">{formatDate(hoverPoint.date)}</p>
              <p className="text-muted-foreground">{money(hoverPoint.close)}</p>
              <p className="font-semibold" style={{ color }}>
                {hoverMetrics.positive ? "\u25B2" : "\u25BC"} {pct(Math.abs(hoverMetrics.percent))} from period start
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground sm:grid-cols-6">
          {ticks.map((tick) => (
            <span key={tick.index} className="truncate">
              {tick.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
