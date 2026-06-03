import Link from "next/link";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { runRecommendationsAction } from "@/server/actions/recommendationActions";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";

type RecommendationsPageProps = {
  searchParams?: Promise<{
    recommendationMessage?: string;
    recommendationError?: string;
  }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function tone(label: string) {
  if (label === "Strong Buy" || label === "Buy") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (label === "Hold") return "border-blue-200 bg-blue-50 text-blue-900";
  if (label === "Watch") return "border-amber-200 bg-amber-50 text-amber-900";
  if (label === "Reduce" || label === "Sell") return "border-red-200 bg-red-50 text-red-900";
  return "border-border bg-muted text-muted-foreground";
}

function RecommendationTable({ title, description, rows }: { title: string; description: string; rows: InstrumentRecommendation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No recommendations in this section yet. Run the deterministic engine after applying the migration.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Label</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Drivers</th>
                  <th className="p-3">Guardrails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top last:border-0">
                    <td className="p-3">
                      <Link href={`/instruments/${encodeURIComponent(row.symbol)}#recommendations`} className="font-medium hover:underline">{row.symbol}</Link>
                      <p className="text-xs text-muted-foreground">{row.instrumentType}</p>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone(row.recommendationLabel)}`}>{row.recommendationLabel}</span>
                    </td>
                    <td className="p-3">{score(row.overallScore)}</td>
                    <td className="p-3">{formatPercent(row.confidenceScore / 100)}</td>
                    <td className="p-3 capitalize">{row.riskLevel.replaceAll("_", " ")}</td>
                    <td className="max-w-xs p-3 text-xs text-muted-foreground">{row.positiveDrivers.slice(0, 2).join("; ") || "-"}</td>
                    <td className="max-w-xs p-3 text-xs text-muted-foreground">{row.guardrailsApplied.join("; ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  const dashboard = await container.recommendationService.getDashboard(portfolio?.id ?? null);
  const recommendations = dashboard.recommendations.slice().sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
  const labelCounts = recommendations.reduce<Record<string, number>>((counts, item) => {
    counts[item.recommendationLabel] = (counts[item.recommendationLabel] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Research</p>
          <h1 className="text-2xl font-semibold">Recommendations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deterministic scoring, explainable drivers and guardrails. No trades are placed.</p>
        </div>
        <form action={runRecommendationsAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="returnTo" value="/recommendations" />
          <SubmitButton pendingLabel="Running recommendations...">Run recommendations</SubmitButton>
        </form>
      </div>

      {params?.recommendationMessage ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{params.recommendationMessage}</p> : null}
      {params?.recommendationError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{params.recommendationError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Latest run</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{dashboard.latestRun?.runDate ?? "-"}</p><p className="text-xs text-muted-foreground">{dashboard.latestRun?.status ?? "No run yet"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evaluated</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{formatNumber(dashboard.latestRun?.instrumentsEvaluated ?? 0, 0)}</p><p className="text-xs text-muted-foreground">Approved active instruments</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Buy / Strong Buy</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{formatNumber((labelCounts.Buy ?? 0) + (labelCounts["Strong Buy"] ?? 0), 0)}</p><p className="text-xs text-muted-foreground">After guardrails</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Insufficient data</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold">{formatNumber(labelCounts["Insufficient Data"] ?? 0, 0)}</p><p className="text-xs text-muted-foreground">Needs more inputs</p></CardContent>
        </Card>
      </div>

      <RecommendationTable title="Universe Opportunities" description="Highest-scoring approved instruments after deterministic guardrails." rows={dashboard.universeOpportunities} />
      <RecommendationTable title="Portfolio Recommendations" description="Latest recommendations for instruments currently held in the default portfolio." rows={dashboard.portfolioRecommendations.slice(0, 50)} />
      <RecommendationTable title="Watchlist Recommendations" description="Latest recommendations for active watchlist instruments." rows={dashboard.watchlistRecommendations.slice(0, 50)} />
      <RecommendationTable title="All Recommendations" description="Full latest recommendation set for QA and traceability." rows={recommendations.slice(0, 100)} />
    </div>
  );
}
