import Link from "next/link";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { formatPercent } from "@/lib/utils";

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "-";
}

function freshness(lastRefreshedAt: string | null | undefined) {
  if (!lastRefreshedAt) return "Not refreshed";
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastRefreshedAt).getTime()) / 86_400_000));
  return days === 0 ? "Fresh" : `${days}d`;
}

export default async function FundamentalsPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();
  const [rows, logs] = await measureRenderStep("fundamentals:summary-data", () =>
    Promise.all([
      container.fundamentalsRepository.listSummaryRows(),
      container.fundamentalsRepository.listRefreshLogs(5)
    ])
  );
  const covered = rows.filter((row) => row.latestScore?.overallFundamentalScore != null).length;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Fundamentals"
        description="Company fundamentals for individual stocks only. No investment recommendations are generated here."
        meta={
          <>
            <StatusBadge tone="info">{covered}/{rows.length} covered</StatusBadge>
            <StatusBadge tone={logs[0]?.status === "success" ? "positive" : logs[0] ? "warning" : "neutral"}>{logs[0]?.status ?? "No refresh yet"}</StatusBadge>
          </>
        }
      />

      {params.message ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</div> : null}
      {params.error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Coverage" description="Stocks with a calculated score." value={`${covered}/${rows.length}`} />
        <MetricCard title="Latest run" description="Most recent refresh status." value={logs[0]?.status ?? "No run"} footer={logs[0] ? `${logs[0].profilesUpdated} profiles, ${logs[0].scoresUpdated} scores` : "No refresh logs yet"} />
        <MetricCard title="Scope" description="Individual stocks only." value="Stocks" footer="ETFs, bonds, gold, and crypto are intentionally excluded." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock fundamentals</CardTitle>
          <CardDescription>Deterministic score components used later by the insights engine.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="No stock instruments found" description="Add stock holdings or active stock universe entries before refreshing fundamentals." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3">Overall</th>
                    <th className="py-2 pr-3">Growth</th>
                    <th className="py-2 pr-3">Profitability</th>
                    <th className="py-2 pr-3">Valuation</th>
                    <th className="py-2 pr-3">Balance</th>
                    <th className="py-2 pr-3">Cash flow</th>
                    <th className="py-2 pr-3">Trend</th>
                    <th className="py-2 pr-3">Confidence</th>
                    <th className="py-2 pr-3">Freshness</th>
                    <th className="py-2 pr-3">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.instrument.id} className="border-b align-top last:border-0">
                      <td className="py-3 pr-3 font-medium">
                        <Link href={`/instruments/${row.instrument.symbol}#fundamentals`} className="hover:underline">
                          {row.instrument.symbol}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <div>{row.profile?.companyName ?? row.instrument.name}</div>
                        <div className="text-xs text-muted-foreground">{row.profile?.sector ?? row.instrument.canonicalSector ?? "-"}</div>
                      </td>
                      <td className="py-3 pr-3 font-medium">{score(row.latestScore?.overallFundamentalScore)}</td>
                      <td className="py-3 pr-3">{score(row.latestScore?.growthScore)}</td>
                      <td className="py-3 pr-3">{score(row.latestScore?.profitabilityScore)}</td>
                      <td className="py-3 pr-3">{score(row.latestScore?.valuationScore)}</td>
                      <td className="py-3 pr-3">{score(row.latestScore?.balanceSheetScore)}</td>
                      <td className="py-3 pr-3">{score(row.latestScore?.cashFlowScore)}</td>
                      <td className="py-3 pr-3">
                        {row.latestTrendSummary ? (
                          <div>
                            <div className="font-medium">{score(row.latestTrendSummary.overallTrendScore)}</div>
                            <div className="text-xs capitalize text-muted-foreground">{label(row.latestTrendSummary.overallTrendDirection)}</div>
                            <div className="text-xs text-muted-foreground">
                              +{row.latestTrendSummary.improvingMetricsCount} / -{row.latestTrendSummary.deterioratingMetricsCount}
                            </div>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="py-3 pr-3">{row.latestScore ? formatPercent(row.latestScore.scoreConfidence / 100) : "-"}</td>
                      <td className="py-3 pr-3">{freshness(row.profile?.lastRefreshedAt)}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {[...row.missingDataWarnings, ...(row.latestTrendSummary?.warnings ?? []).slice(0, 2)].join("; ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
