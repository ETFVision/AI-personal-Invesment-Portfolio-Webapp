import * as React from "react";
import { cn, formatPercent } from "@/lib/utils";

export type ExposureBarItem = {
  label: string;
  value: number;
  valueLabel: string;
  detail?: string;
  tone?: "default" | "positive" | "warning" | "danger" | "muted";
};

const toneBars = {
  default: "bg-teal-600",
  positive: "bg-emerald-600",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  muted: "bg-muted-foreground"
};

function collapseExposureItems(items: ExposureBarItem[], maxItems: number) {
  if (items.length <= maxItems) return items;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, maxItems);
  const remaining = sorted.slice(maxItems);
  const otherValue = remaining.reduce((sum, item) => sum + item.value, 0);
  return [
    ...visible,
    {
      label: "Other",
      value: otherValue,
      valueLabel: formatPercent(otherValue),
      tone: "muted" as const
    }
  ];
}

export function ChartShell({
  title,
  description,
  children,
  className
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm", className)}>
      {title || description ? (
        <div className="mb-4">
          {title ? <p className="text-sm font-semibold tracking-tight text-slate-950">{title}</p> : null}
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function HorizontalExposureBars({
  items,
  emptyText = "No exposure data available.",
  max = 1,
  className,
  maxItems = 8
}: {
  items: ExposureBarItem[];
  emptyText?: string;
  max?: number;
  className?: string;
  maxItems?: number;
}) {
  if (items.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">{emptyText}</div>;
  }

  const displayItems = collapseExposureItems(items, maxItems);

  return (
    <div className={cn("space-y-3", className)}>
      {displayItems.map((item) => {
        const width = `${Math.min(100, Math.max(0, (item.value / max) * 100))}%`;
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.label}</p>
                {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{item.valueLabel}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", toneBars[item.tone ?? "default"])} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StackedExposureBar({
  label,
  totalLabel,
  direct,
  indirect,
  detail
}: {
  label: string;
  totalLabel: string;
  direct: number;
  indirect: number;
  detail?: string;
}) {
  const directWidth = Math.min(100, Math.max(0, direct * 100));
  const indirectWidth = Math.min(100 - directWidth, Math.max(0, indirect * 100));
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{label}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        <span className="shrink-0 font-semibold text-slate-900">{totalLabel}</span>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-teal-700" style={{ width: `${directWidth}%` }} />
        <div className="h-full bg-cyan-500" style={{ width: `${indirectWidth}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span>Direct</span>
        <span>ETF look-through</span>
      </div>
    </div>
  );
}

export function MiniRangeBar({
  lowLabel,
  highLabel,
  current,
  low,
  high
}: {
  lowLabel: string;
  highLabel: string;
  current: number | null;
  low: number | null;
  high: number | null;
}) {
  const position = current == null || low == null || high == null || high <= low
    ? null
    : Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  return (
    <div className="min-w-40 space-y-1.5">
      <div className="relative h-2 rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300" style={{ width: "100%" }} />
        {position == null ? null : <div className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-full bg-teal-700" style={{ left: `calc(${position}% - 3px)` }} />}
      </div>
      <div className="flex justify-between gap-2 text-[0.68rem] text-slate-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  className,
  tone = "default"
}: {
  points: string;
  className?: string;
  tone?: "default" | "positive" | "danger" | "muted";
}) {
  const stroke = tone === "positive" ? "stroke-emerald-600" : tone === "danger" ? "stroke-red-500" : tone === "muted" ? "stroke-slate-400" : "stroke-teal-700";
  return (
    <svg viewBox="0 0 180 60" className={cn("h-12 w-36", className)}>
      <polyline points={points} fill="none" className={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
