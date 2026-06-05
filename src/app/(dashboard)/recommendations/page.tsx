import Link from "next/link";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, PageContainer, PageHeader, RecommendationBadge, StatusBadge } from "@/components/ui/professional";
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
          <div className="professional-table overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Label</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3 text-right">Confidence</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Drivers</th>
                  <th className="p-3">Guardrails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="p-3">
                      <Link href={`/instruments/${encodeURIComponent(row.symbol)}#recommendations`} className="font-medium hover:underline">{row.symbol}</Link>
                      <p className="text-xs text-muted-foreground">{row.instrumentType}</p>
                    </td>
                    <td className="p-3">
                      <RecommendationBadge label={row.recommendationLabel} />
                    </td>
                    <td className="p-3 text-right">{score(row.overallScore)}</td>
                    <td className="p-3 text-right">{formatPercent(row.confidenceScore / 100)}</td>
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
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Recommendations"
        description="Deterministic scoring, explainable drivers and guardrails. No trades are placed."
        meta={
          <>
            <StatusBadge tone={dashboard.latestRun?.status === "success" ? "positive" : dashboard.latestRun ? "warning" : "neutral"}>
              {dashboard.latestRun?.status ?? "No run yet"}
            </StatusBadge>
            <StatusBadge tone="info">{recommendations.length} latest recommendations</StatusBadge>
          </>
        }
        actions={
        <form action={runRecommendationsAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="returnTo" value="/recommendations" />
          <SubmitButton pendingLabel="Running recommendations...">Run recommendations</SubmitButton>
        </form>
        }
      />

      {params?.recommendationMessage ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{params.recommendationMessage}</p> : null}
      {params?.recommendationError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{params.recommendationError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Latest run" value={dashboard.latestRun?.runDate ?? "-"} footer={dashboard.latestRun?.status ?? "No run yet"} />
        <MetricCard title="Evaluated" value={formatNumber(dashboard.latestRun?.instrumentsEvaluated ?? 0, 0)} footer="Approved active instruments" />
        <MetricCard title="Buy / Strong Buy" value={formatNumber((labelCounts.Buy ?? 0) + (labelCounts["Strong Buy"] ?? 0), 0)} footer="After guardrails" />
        <MetricCard title="Insufficient data" value={formatNumber(labelCounts["Insufficient Data"] ?? 0, 0)} footer="Needs more inputs" />
      </div>

      <RecommendationTable title="Universe Opportunities" description="Highest-scoring approved instruments after deterministic guardrails." rows={dashboard.universeOpportunities} />
      <RecommendationTable title="Portfolio Recommendations" description="Latest recommendations for instruments currently held in the default portfolio." rows={dashboard.portfolioRecommendations.slice(0, 50)} />
      <RecommendationTable title="Watchlist Recommendations" description="Latest recommendations for active watchlist instruments." rows={dashboard.watchlistRecommendations.slice(0, 50)} />
      <RecommendationTable title="All Recommendations" description="Full latest recommendation set for QA and traceability." rows={recommendations.slice(0, 100)} />
    </PageContainer>
  );
}
