"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstrumentMarketView } from "@/domain/universe/types";
import { cn, formatCurrencyWithCode, formatPercent } from "@/lib/utils";
import { saveInstrumentTagsAction, toggleInstrumentActiveAction } from "@/server/actions/universeActions";

type InstrumentMarketTableProps = {
  rows: InstrumentMarketView[];
  emptyMessage?: string;
  showManagementActions?: boolean;
};

function metricTone(value: number | null) {
  if (value == null) return "text-muted-foreground";
  return value >= 0 ? "text-emerald-600" : "text-destructive";
}

function formatRange(low: number | null, high: number | null, currency: string | null) {
  if (low == null || high == null) return "-";
  return `${formatCurrencyWithCode(low, currency ?? "USD")} - ${formatCurrencyWithCode(high, currency ?? "USD")}`;
}

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return "-";
  return formatCurrencyWithCode(value, currency ?? "USD");
}

export function InstrumentMarketTable({ rows, emptyMessage = "No instruments in this section.", showManagementActions = false }: InstrumentMarketTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Rank</th>
            <th className="py-2 pr-3">Symbol</th>
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Latest</th>
            <th className="py-2 pr-3">Daily</th>
            <th className="py-2 pr-3">52W range</th>
            <th className="py-2 pr-3">Liquidity</th>
            <th className="py-2 pr-3">Freshness</th>
            <th className="py-2 pr-3">Tags</th>
            <th className="py-2 pr-3">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = openId === row.instrument.id;
            const currency = row.instrument.currency ?? "USD";
            return (
              <Fragment key={row.instrument.id}>
                <tr className="border-b align-top last:border-0">
                  <td className="py-3 pr-3 font-medium">{row.rank}</td>
                  <td className="py-3 pr-3 font-medium">{row.instrument.symbol ?? "-"}</td>
                  <td className="py-3 pr-3">
                    <div className="font-medium">{row.instrument.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.instrument.exchange ?? "-"} {row.instrument.currency ? `• ${row.instrument.currency}` : ""}
                    </div>
                  </td>
                  <td className="py-3 pr-3">{formatMoney(row.latestPrice, currency)}</td>
                  <td className={cn("py-3 pr-3 font-medium", metricTone(row.dailyReturn))}>
                    {row.dailyReturn == null ? "-" : formatPercent(row.dailyReturn)}
                  </td>
                  <td className="py-3 pr-3">{formatRange(row.fiftyTwoWeekLow, row.fiftyTwoWeekHigh, currency)}</td>
                  <td className="py-3 pr-3">{row.liquidity}</td>
                  <td className={cn("py-3 pr-3", row.freshnessTone)}>{row.freshnessLabel}</td>
                  <td className="py-3 pr-3">
                    <div className="text-xs text-muted-foreground">Bench: {row.instrument.benchmarkTags.join(", ") || "-"}</div>
                    <div className="text-xs text-muted-foreground">Theme: {row.instrument.thematicTags.join(", ") || "-"}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(isOpen ? null : row.instrument.id)}>
                      {isOpen ? "Hide" : "More"}
                    </Button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-b bg-muted/30 last:border-0">
                    <td className="py-4 pr-3" colSpan={10}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="1Y return" value={row.oneYearReturn == null ? "-" : formatPercent(row.oneYearReturn)} tone={metricTone(row.oneYearReturn)} />
                        <MetricCard label="YTD return" value={row.ytdReturn == null ? "-" : formatPercent(row.ytdReturn)} tone={metricTone(row.ytdReturn)} />
                        <MetricCard label="History" value={`${row.priceObservationCount} row${row.priceObservationCount === 1 ? "" : "s"}`} />
                        <MetricCard label="Price start" value={row.priceHistoryStart ?? "-"} />
                        <MetricCard label="Price end" value={row.priceHistoryEnd ?? "-"} />
                        {row.detailFields.map((field) => (
                          <MetricCard key={`${row.instrument.id}-${field.label}`} label={field.label} value={field.value} />
                        ))}
                      </div>
                      {showManagementActions ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <form action={saveInstrumentTagsAction} className="space-y-2 rounded-md border bg-background p-3">
                            <input type="hidden" name="instrumentId" value={row.instrument.id} />
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Edit tags</div>
                            <Input name="benchmarkTags" defaultValue={row.instrument.benchmarkTags.join(", ")} placeholder="benchmark tags" className="h-9" />
                            <Input name="thematicTags" defaultValue={row.instrument.thematicTags.join(", ")} placeholder="thematic tags" className="h-9" />
                            <Button type="submit" size="sm" variant="outline">
                              Save tags
                            </Button>
                          </form>
                          <form action={toggleInstrumentActiveAction} className="space-y-2 rounded-md border bg-background p-3">
                            <input type="hidden" name="instrumentId" value={row.instrument.id} />
                            <input type="hidden" name="isActive" value={String(!row.instrument.isActive)} />
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                            <div className="text-sm">
                              {row.instrument.isActive ? "Active" : "Inactive"}
                            </div>
                            <Button type="submit" size="sm" variant="secondary">
                              {row.instrument.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-medium", tone)}>{value}</div>
    </div>
  );
}
