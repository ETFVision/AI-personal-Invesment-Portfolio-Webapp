import Link from "next/link";
import { createContainer } from "@/server/container";
import { refreshFundamentalsAction } from "@/server/actions/fundamentalsActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPercent } from "@/lib/utils";

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
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
  const rows = await container.fundamentalsRepository.listSummaryRows();
  const logs = await container.fundamentalsRepository.listRefreshLogs(5);
  const covered = rows.filter((row) => row.latestScore?.overallFundamentalScore != null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Research</p>
          <h1 className="text-2xl font-semibold">Fundamentals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Company fundamentals for individual stocks only. No recommendations are generated here.</p>
        </div>
        <form action={refreshFundamentalsAction} className="flex gap-2">
          <input type="hidden" name="returnTo" value="/fundamentals" />
          <input type="hidden" name="force" value="true" />
          <SubmitButton pendingLabel="Refreshing fundamentals...">Refresh fundamentals</SubmitButton>
        </form>
      </div>

      {params.message ? <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</div> : null}
      {params.error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Coverage</CardTitle>
            <CardDescription>Stocks with a calculated score.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{covered}/{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest run</CardTitle>
            <CardDescription>Most recent refresh status.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {logs[0] ? `${logs[0].status} - ${logs[0].profilesUpdated} profiles, ${logs[0].scoresUpdated} scores` : "No refresh logs yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
            <CardDescription>Individual stocks only.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">ETFs, bonds, gold, and crypto are intentionally excluded.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock fundamentals</CardTitle>
          <CardDescription>Deterministic score components used later by the recommendation engine.</CardDescription>
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
                      <td className="py-3 pr-3">{row.latestScore ? formatPercent(row.latestScore.scoreConfidence / 100) : "-"}</td>
                      <td className="py-3 pr-3">{freshness(row.profile?.lastRefreshedAt)}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">{row.missingDataWarnings.join("; ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
