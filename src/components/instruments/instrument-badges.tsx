import { cn } from "@/lib/utils";

export function InstrumentTypeBadge({ label }: { label: string }) {
  return <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{label}</span>;
}

export function DataFreshnessBadge({ label, tone }: { label: string; tone?: string }) {
  return <span className={cn("rounded-full bg-muted px-2.5 py-1 text-xs font-medium", tone)}>{label}</span>;
}

export function ThemeBadgeList({ themes }: { themes: string[] }) {
  if (themes.length === 0) return <span className="text-sm text-muted-foreground">No themes mapped.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((theme) => (
        <span key={theme} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          {theme}
        </span>
      ))}
    </div>
  );
}
