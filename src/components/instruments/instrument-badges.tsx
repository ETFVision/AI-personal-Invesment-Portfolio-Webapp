import { cn } from "@/lib/utils";

export function InstrumentTypeBadge({ label }: { label: string }) {
  return <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{label}</span>;
}

export function DataFreshnessBadge({ label, tone }: { label: string; tone?: string }) {
  return <span className={cn("rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold", tone)}>{label}</span>;
}

export function ThemeBadgeList({ themes }: { themes: string[] }) {
  if (themes.length === 0) return <span className="text-sm text-muted-foreground">No themes mapped.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((theme) => (
        <span key={theme} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {theme}
        </span>
      ))}
    </div>
  );
}
