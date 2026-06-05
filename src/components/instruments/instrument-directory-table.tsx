import Link from "next/link";
import { MiniRangeBar } from "@/components/ui/charts";
import type { InstrumentMarketView } from "@/domain/universe/types";
import type { FundamentalsSummaryRow } from "@/domain/fundamentals/types";
import { formatCurrencyWithCode, formatPercent } from "@/lib/utils";
import { DataFreshnessBadge, InstrumentTypeBadge, ThemeBadgeList } from "./instrument-badges";
import { instrumentTypeLabel, resolveInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";

type InstrumentDirectoryTableProps = {
  rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null; reviewDate?: string | null }>;
  fundamentalsByInstrumentId?: Map<string, FundamentalsSummaryRow>;
  emptyMessage?: string;
};

function fundamentalsFreshness(row: FundamentalsSummaryRow | undefined) {
  const refreshedAt = row?.profile?.lastRefreshedAt;
  if (!refreshedAt) return "Not refreshed";
  const days = Math.max(0, Math.floor((Date.now() - new Date(refreshedAt).getTime()) / 86_400_000));
  return days === 0 ? "Fresh" : `${days}d`;
}

function score(value: number | null | undefined) {
  return value == null ? "-" : String(Math.round(value));
}

export function InstrumentDirectoryTable({ rows, fundamentalsByInstrumentId, emptyMessage = "No instruments found." }: InstrumentDirectoryTableProps) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Symbol</th>
            <th className="p-3">Name</th>
            <th className="p-3">Type</th>
            <th className="p-3">Latest</th>
            <th className="p-3">Daily</th>
            <th className="p-3">52W range</th>
            <th className="p-3">Liquidity</th>
            <th className="p-3">Freshness</th>
            <th className="p-3">Themes</th>
            <th className="p-3">Risk</th>
            <th className="p-3">Fundamentals</th>
            <th className="p-3">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const symbol = row.instrument.symbol ?? "";
            const type = resolveInstrumentType(row.instrument);
            const fundamentals = type === "stock" ? fundamentalsByInstrumentId?.get(row.instrument.id) : undefined;
            return (
              <tr key={row.instrument.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="p-3 font-medium">
                  {symbol ? <Link className="text-slate-950 hover:text-teal-700 hover:underline" href={`/instruments/${encodeURIComponent(symbol)}`}>{symbol}</Link> : "-"}
                  <p className="mt-1 text-xs text-muted-foreground">{(row.watchlistTierLabel ?? row.instrument.benchmarkTags.join(", ")) || "-"}</p>
                </td>
                <td className="p-3">
                  <p className="font-medium">{row.instrument.name}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.exchange ?? "-"} - {row.instrument.currency ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.canonicalSector ?? row.instrument.sector ?? "-"}</p>
                  {row.thesis ? <p className="mt-1 text-xs text-muted-foreground">{row.thesis}</p> : null}
                </td>
                <td className="p-3"><InstrumentTypeBadge label={instrumentTypeLabel(type)} /></td>
                <td className="p-3 text-right font-medium">
                  {row.latestPrice == null ? "-" : formatCurrencyWithCode(row.latestPrice, row.instrument.currency ?? "USD")}
                </td>
                <td className={row.dailyReturn == null ? "p-3 text-right text-slate-500" : row.dailyReturn >= 0 ? "p-3 text-right font-semibold text-emerald-600" : "p-3 text-right font-semibold text-red-600"}>
                  {row.dailyReturn == null ? "-" : formatPercent(row.dailyReturn)}
                </td>
                <td className="p-3">
                  {row.fiftyTwoWeekLow == null || row.fiftyTwoWeekHigh == null
                    ? "-"
                    : (
                      <MiniRangeBar
                        current={row.latestPrice}
                        low={row.fiftyTwoWeekLow}
                        high={row.fiftyTwoWeekHigh}
                        lowLabel={formatCurrencyWithCode(row.fiftyTwoWeekLow, row.instrument.currency ?? "USD")}
                        highLabel={formatCurrencyWithCode(row.fiftyTwoWeekHigh, row.instrument.currency ?? "USD")}
                      />
                    )}
                </td>
                <td className="p-3">
                  {row.liquidity}
                </td>
                <td className="p-3">
                  <DataFreshnessBadge label={row.freshnessLabel} tone={row.freshnessTone} />
                </td>
                <td className="p-3"><ThemeBadgeList themes={row.instrument.canonicalThemes.slice(0, 3)} /></td>
                <td className="p-3">
                  <p>{row.instrument.riskCategory ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{row.instrument.volatilityBucket ?? "-"}</p>
                </td>
                <td className="p-3">
                  {fundamentals ? (
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">Overall {score(fundamentals.latestScore?.overallFundamentalScore)}/100</p>
                      <p className="text-muted-foreground">Val {score(fundamentals.latestScore?.valuationScore)} · Quality {score(fundamentals.latestScore?.qualityScore)}</p>
                      <p className="text-muted-foreground">{fundamentalsFreshness(fundamentals)}</p>
                    </div>
                  ) : "-"}
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
