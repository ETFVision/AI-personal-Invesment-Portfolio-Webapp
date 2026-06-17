import Link from "next/link";
import { Suspense } from "react";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import { runRecommendationsAction } from "@/server/actions/recommendationActions";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import { assessmentLabel, assessmentTone } from "@/application/services/recommendations/recommendationPresentation";

type RecommendationsPageProps = {
  searchParams?: Promise<{
    recommendationMessage?: string;
    recommendationError?: string;
  }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function businessQualityLabel(bqScore: number | null): { label: string; tone: string } | null {
  if (bqScore == null) return null;
  if (bqScore >= 80) return { label: "Exceptional", tone: "positive" };
  if (bqScore >= 65) return { label: "Strong", tone: "positive" };
  if (bqScore >= 50) return { label: "Solid", tone: "info" };
  if (bqScore >= 35) return { label: "Moderate", tone: "warning" };
  return { label: "Weak", tone: "danger" };
}

function valuationLabel(valScore: number | null): { label: string; tone: string } | null {
  if (valScore == null) return null;
  if (valScore >= 65) return { label: "Attractive", tone: "positive" };
  if (valScore >= 45) return { label: "Fair", tone: "info" };
  if (valScore >= 30) return { label: "Premium", tone: "warning" };
  return { label: "Elevated", tone: "danger" };
}

function extractBusinessQualityScore(breakdown: Record<string, unknown>): number | null {
  const val = breakdown.businessQualityScore;
  return typeof val === "number" ? val : null;
}

function extractValuationScore(breakdown: Record<string, unknown>): number | null {
  const components = breakdown.components;
  if (!Array.isArray(components)) return null;
  const comp = components.find(
    (component: unknown) => (component as { key: string }).key === "valuation"
  );
  return comp ? ((comp as { score: number | null }).score ?? null) : null;
}

function InsightTable({ title, description, rows }: { title: string; description: string; rows: InstrumentRecommendation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No instrument insights in this section yet. Run the deterministic analytics engine after applying the migration.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Business Quality</th>
                  <th className="p-3">Valuation</th>
                  <th className="p-3">Characteristics</th>
                  <th className="p-3 text-right">Characteristics Score</th>
                  <th className="p-3 text-right">Confidence</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Signals</th>
                  <th className="p-3">Guardrails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isStock = row.instrumentType === "Stock";
                  const bqScore = extractBusinessQualityScore(row.scoringBreakdown);
                  const valScore = extractValuationScore(row.scoringBreakdown);
                  const bqChip = isStock ? businessQualityLabel(bqScore) : null;
                  const valChip = isStock ? valuationLabel(valScore) : null;

                  return (
                    <tr key={row.id} className="border-b align-top last:border-0">
                      <td className="p-3">
                        <Link href={`/instruments/${encodeURIComponent(row.symbol)}#insights`} className="font-medium hover:underline">{row.symbol}</Link>
                        <p className="text-xs text-muted-foreground">{row.instrumentType}</p>
                      </td>
                      <td className="p-3">
                        {bqChip
                          ? <StatusBadge tone={bqChip.tone as never}>{bqChip.label}</StatusBadge>
                          : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="p-3">
                        {valChip
                          ? <StatusBadge tone={valChip.tone as never}>{valChip.label}</StatusBadge>
                          : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="p-3">
                        <StatusBadge tone={assessmentTone(row.recommendationLabel)}>{assessmentLabel(row.recommendationLabel)}</StatusBadge>
                      </td>
                      <td className="p-3 text-right">{score(row.overallScore)}</td>
                      <td className="p-3 text-right">{formatPercent(row.confidenceScore / 100)}</td>
                      <td className="p-3 capitalize">{row.riskLevel.replaceAll("_", " ")}</td>
                      <td className="max-w-xs p-3 text-xs text-muted-foreground">{row.positiveDrivers.slice(0, 2).join("; ") || "-"}</td>
                      <td className="max-w-xs p-3 text-xs text-muted-foreground">{row.guardrailsApplied.join("; ") || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightTablesFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading insight tables</CardTitle>
        <CardDescription>Preparing portfolio, watchlist and universe classifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function RecommendationInsightTables({ portfolioId }: { portfolioId: string | null }) {
  const container = createContainer();
  const dashboard = await measureRenderStep(`recommendations:${portfolioId ?? "no-portfolio"}:detail-tables-data`, () =>
    container.recommendationService.getDashboard(portfolioId)
  );
  const recommendations = dashboard.recommendations.slice().sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));

  return (
    <>
      <InsightTable title="Universe Characteristics" description="Highest-scoring approved instruments after deterministic guardrails." rows={dashboard.universeOpportunities} />
      <InsightTable title="Portfolio Instrument Insights" description="Latest analytical assessments for instruments currently held in the default portfolio." rows={dashboard.portfolioRecommendations.slice(0, 50)} />
      <InsightTable title="Watchlist Instrument Insights" description="Latest analytical assessments for active watchlist instruments." rows={dashboard.watchlistRecommendations.slice(0, 50)} />
      <InsightTable title="All Instrument Insights" description="Full latest instrument insight set for QA and traceability." rows={recommendations.slice(0, 100)} />
    </>
  );
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  const overview = await measureRenderStep(`recommendations:${portfolio?.id ?? "no-portfolio"}:overview-data`, () =>
    container.recommendationService.getDashboardOverview()
  );
  const labelCounts = overview.labelCounts;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Insights"
        description="Deterministic portfolio intelligence, characteristics scoring and guardrails. No trades, target allocations or investment recommendations are generated."
        meta={
          <>
            <StatusBadge tone={overview.latestRun?.status === "success" ? "positive" : overview.latestRun ? "warning" : "neutral"}>
              {overview.latestRun?.status ?? "No run yet"}
            </StatusBadge>
            <StatusBadge tone="info">{overview.recommendationsCount} latest insights</StatusBadge>
          </>
        }
        actions={
        <form action={runRecommendationsAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="returnTo" value="/recommendations" />
          <SubmitButton pendingLabel="Running insights...">Run insights</SubmitButton>
        </form>
        }
      />

      {params?.recommendationMessage ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{params.recommendationMessage}</p> : null}
      {params?.recommendationError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{params.recommendationError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Latest run" value={overview.latestRun?.runDate ?? "-"} footer={overview.latestRun?.status ?? "No run yet"} />
        <MetricCard title="Evaluated" value={formatNumber(overview.latestRun?.instrumentsEvaluated ?? 0, 0)} footer="Approved active instruments" />
        <MetricCard title="Good / Excellent" value={formatNumber((labelCounts.Buy ?? 0) + (labelCounts["Strong Buy"] ?? 0), 0)} footer="High characteristics scores after guardrails" />
        <MetricCard title="Insufficient data" value={formatNumber(labelCounts["Insufficient Data"] ?? 0, 0)} footer="Needs more inputs" />
      </div>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          ETFVision Insights are analytical classifications based on stored data. They are not investment advice, trade instructions, or buy/sell recommendations.
        </CardContent>
      </Card>

      <Suspense fallback={<InsightTablesFallback />}>
        <RecommendationInsightTables portfolioId={portfolio?.id ?? null} />
      </Suspense>
    </PageContainer>
  );
}
