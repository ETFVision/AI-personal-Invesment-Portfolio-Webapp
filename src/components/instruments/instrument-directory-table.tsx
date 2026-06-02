import Link from "next/link";
import type { InstrumentMarketView } from "@/domain/universe/types";
import { formatCurrencyWithCode, formatPercent } from "@/lib/utils";
import { DataFreshnessBadge, InstrumentTypeBadge, ThemeBadgeList } from "./instrument-badges";
import { instrumentTypeLabel, resolveInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";

type InstrumentDirectoryTableProps = {
  rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null; reviewDate?: string | null }>;
  emptyMessage?: string;
};

export function InstrumentDirectoryTable({ rows, emptyMessage = "No instruments found." }: InstrumentDirectoryTableProps) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Symbol</th>
            <th className="p-3">Name</th>
            <th className="p-3">Type</th>
            <th className="p-3">Asset / Sector</th>
            <th className="p-3">Themes</th>
            <th className="p-3">Risk</th>
            <th className="p-3">Freshness</th>
            <th className="p-3">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const symbol = row.instrument.symbol ?? "";
            const type = resolveInstrumentType(row.instrument);
            return (
              <tr key={row.instrument.id} className="border-b align-top last:border-0">
                <td className="p-3 font-medium">
                  {symbol ? <Link className="hover:underline" href={`/instruments/${encodeURIComponent(symbol)}`}>{symbol}</Link> : "-"}
                  <p className="mt-1 text-xs text-muted-foreground">{(row.watchlistTierLabel ?? row.instrument.benchmarkTags.join(", ")) || "-"}</p>
                </td>
                <td className="p-3">
                  <p className="font-medium">{row.instrument.name}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.exchange ?? "-"} - {row.instrument.currency ?? "-"}</p>
                  {row.thesis ? <p className="mt-1 text-xs text-muted-foreground">{row.thesis}</p> : null}
                </td>
                <td className="p-3"><InstrumentTypeBadge label={instrumentTypeLabel(type)} /></td>
                <td className="p-3">
                  <p className="capitalize">{row.instrument.assetClass.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.canonicalSector ?? row.instrument.sector ?? "-"}</p>
                </td>
                <td className="p-3"><ThemeBadgeList themes={row.instrument.canonicalThemes.slice(0, 3)} /></td>
                <td className="p-3">
                  <p>{row.instrument.riskCategory ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.volatilityBucket ?? "-"}</p>
                </td>
                <td className="p-3">
                  <DataFreshnessBadge label={row.freshnessLabel} tone={row.freshnessTone} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.latestPrice == null ? "No latest price" : formatCurrencyWithCode(row.latestPrice, row.instrument.currency ?? "USD")}
                    {row.dailyReturn == null ? "" : ` - ${formatPercent(row.dailyReturn)}`}
                  </p>
                </td>
                <td className="p-3">
                  {symbol ? (
                    <Link className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted" href={`/instruments/${encodeURIComponent(symbol)}`}>
                      Open
                    </Link>
                  ) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
