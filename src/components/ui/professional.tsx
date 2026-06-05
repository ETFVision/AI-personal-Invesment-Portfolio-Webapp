import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  info: "border-cyan-200 bg-cyan-50 text-cyan-900"
};

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-7", className)}>{children}</div>;
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-cyan-500 to-slate-300" />
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
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
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">Section</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
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
        "absolute inset-x-0 top-0 h-1",
        tone === "positive" ? "bg-emerald-500" : tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-teal-600"
      )} />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold tracking-tight text-slate-950", valueTone)}>{value}</div>
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
