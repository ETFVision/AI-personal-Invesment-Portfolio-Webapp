import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800"
};

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.055)] md:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-slate-300" />
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-[1.9rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-[0.95rem] leading-6 text-slate-600">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-2 sm:flex-row sm:items-end", className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function ScoreBadge({ value, label, className }: { value: number | null | undefined; label?: string; className?: string }) {
  const tone: Tone = value == null ? "neutral" : value >= 75 ? "positive" : value >= 55 ? "info" : value >= 35 ? "warning" : "danger";
  return <StatusBadge tone={tone} className={className}>{label ? `${label} ` : ""}{value == null ? "-" : `${Math.round(value)}/100`}</StatusBadge>;
}

export function MetricCard({
  title,
  value,
  description,
  tone = "neutral",
  footer,
  className
}: {
  title: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  footer?: React.ReactNode;
  className?: string;
}) {
  const valueTone = tone === "positive" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "";
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className={cn(
        "absolute inset-x-0 top-0 h-px",
        tone === "positive" ? "bg-emerald-500" : tone === "danger" ? "bg-rose-500" : tone === "warning" ? "bg-amber-500" : "bg-slate-300"
      )} />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={cn("text-[1.65rem] font-semibold tracking-tight text-slate-950", valueTone)}>{value}</div>
        {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function InsightCard({
  title,
  description,
  tone = "neutral",
  children,
  className
}: {
  title: string;
  description?: string;
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 text-sm shadow-sm", toneClasses[tone], className)}>
      <p className="font-semibold tracking-tight">{title}</p>
      {description ? <p className="mt-1 opacity-90">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.045)]", className)}>
      {title || description || actions ? (
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start">
          <div>
            {title ? <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function SummaryPanel({
  title,
  value,
  description,
  badge,
  children,
  className
}: {
  title: string;
  value?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
          {value ? <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</div> : null}
        </div>
        {badge}
      </div>
      {description ? <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function RecommendationBadge({ label, className }: { label: string | null | undefined; className?: string }) {
  const normalized = label ?? "Not rated";
  const toneClass =
    normalized === "Strong Buy"
      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
      : normalized === "Buy"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : normalized === "Watch"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : normalized === "Reduce"
            ? "border-orange-200 bg-orange-50 text-orange-800"
            : normalized === "Sell"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold", toneClass, className)}>{normalized}</span>;
}

export function DataFreshnessBadge({
  label,
  stale = false,
  missing = false,
  className
}: {
  label: React.ReactNode;
  stale?: boolean;
  missing?: boolean;
  className?: string;
}) {
  const tone: Tone = missing ? "danger" : stale ? "warning" : "positive";
  return <StatusBadge tone={tone} className={className}>{label}</StatusBadge>;
}

export function LoadingState({ title = "Loading data", description = "Preparing the latest available view." }: { title?: string; description?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function ErrorState({ title = "Unable to load this view", description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 leading-6">{description}</p> : null}
    </div>
  );
}

export function StaleDataNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      {children}
    </div>
  );
}
