import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { formatPercent } from "@/lib/utils";
import type { TelemetryEvidenceBucket } from "@/domain/telemetry/types";

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No evaluation yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Singapore"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function evidenceTone(bucket: TelemetryEvidenceBucket) {
  if (bucket === "stronger_evidence") return "positive";
  if (bucket === "moderate_evidence") return "info";
  if (bucket === "early_signal") return "warning";
  return "neutral";
}

function evidenceLabel(bucket: string) {
  return bucket.replaceAll("_", " ");
}

export default async function TelemetryPage() {
  const dashboard = await createContainer().telemetryDashboardService.getDashboard();
  const overview = dashboard.overview;
  const topFactors = dashboard.factorOutcomes.slice(0, 12);
  const hasRecommendationEvidence = dashboard.recommendationSummary.length > 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Telemetry"
        description="Observational learning layer for recommendation, Market Vision and portfolio review outcomes. Telemetry measures historical outcomes only; it does not change scoring weights or generate actions."
        meta={
          <>
            <StatusBadge tone="info">Read-only evidence</StatusBadge>
            <StatusBadge tone="neutral">Horizons 1m / 3m / 6m / 12m</StatusBadge>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Recommendation snapshots" value={overview.recommendationSnapshots} description="Immutable decision points captured at run time." />
        <MetricCard title="Evaluated outcomes" value={overview.evaluatedOutcomes} description="Outcomes with sufficient price and benchmark data." tone={overview.evaluatedOutcomes > 0 ? "positive" : "neutral"} />
        <MetricCard title="Market Vision snapshots" value={overview.marketVisionSnapshots} description="Theme and direction observations captured from reports." />
        <MetricCard title="Portfolio Review snapshots" value={overview.portfolioReviewSnapshots} description="Portfolio review scores and suggestions captured over time." />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total outcomes" value={overview.recommendationOutcomes} description="All evaluated or attempted outcome rows." />
        <MetricCard title="Pending outcomes" value={overview.pendingOutcomes} description="Outcome rows not ready for evaluation yet." />
        <MetricCard title="Latest evaluation" value={formatDate(overview.latestEvaluationDate)} description="Most recent telemetry evaluation date." />
      </div>

      <section className="space-y-3">
        <SectionHeader
          title="Recommendation Outcomes"
          description="Hit rates and average excess returns by recommendation label and horizon. Small samples should be read as diagnostics, not proof."
        />
        <Card>
          <CardContent className="pt-5">
            {hasRecommendationEvidence ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="pb-3">Recommendation</th>
                      <th className="pb-3">Horizon</th>
                      <th className="pb-3 text-right">Observed</th>
                      <th className="pb-3 text-right">Evaluated</th>
                      <th className="pb-3 text-right">Hit rate</th>
                      <th className="pb-3 text-right">Asset return</th>
                      <th className="pb-3 text-right">Benchmark</th>
                      <th className="pb-3 text-right">Excess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.recommendationSummary.map((row) => (
                      <tr key={`${row.recommendation}-${row.horizon}`}>
                        <td className="py-3 font-medium text-slate-950">{row.recommendation}</td>
                        <td className="py-3 text-slate-600">{row.horizon}</td>
                        <td className="py-3 text-right text-slate-600">{row.observationCount}</td>
                        <td className="py-3 text-right text-slate-600">{row.evaluatedCount}</td>
                        <td className="py-3 text-right font-medium">{row.hitRate == null ? "-" : formatPercent(row.hitRate)}</td>
                        <td className="py-3 text-right">{row.averageAssetReturn == null ? "-" : formatPercent(row.averageAssetReturn)}</td>
                        <td className="py-3 text-right">{row.averageBenchmarkReturn == null ? "-" : formatPercent(row.averageBenchmarkReturn)}</td>
                        <td className="py-3 text-right font-medium">{row.averageExcessReturn == null ? "-" : formatPercent(row.averageExcessReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No recommendation outcomes yet"
                description="Run recommendations to capture snapshots. Outcomes will populate after the configured horizons have enough price and benchmark history."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Factor Evidence"
          description="Aggregated outcome evidence by factor bucket. This is for calibration QA and future review, not automatic weight changes."
        />
        {topFactors.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {topFactors.map((factor) => (
              <Card key={factor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{factor.factorName.replaceAll("_", " ")}</CardTitle>
                      <CardDescription>{factor.factorValue} - {factor.horizon}</CardDescription>
                    </div>
                    <StatusBadge tone={evidenceTone(factor.confidenceBucket)}>{evidenceLabel(factor.confidenceBucket)}</StatusBadge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Observations</p>
                      <p className="mt-1 font-semibold text-slate-950">{factor.observationCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hit rate</p>
                      <p className="mt-1 font-semibold text-slate-950">{factor.hitRate == null ? "-" : formatPercent(factor.hitRate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avg asset</p>
                      <p className="mt-1 font-semibold text-slate-950">{factor.averageAssetReturn == null ? "-" : formatPercent(factor.averageAssetReturn)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Avg excess</p>
                      <p className="mt-1 font-semibold text-slate-950">{factor.averageExcessReturn == null ? "-" : formatPercent(factor.averageExcessReturn)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <EmptyState
                title="No factor evidence yet"
                description="Factor evidence appears after recommendation snapshots mature and are evaluated. Early samples will remain marked as weak evidence."
              />
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market Vision Telemetry</CardTitle>
            <CardDescription>Latest theme direction snapshots prepared for future outcome tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.marketVisionSnapshots.length > 0 ? (
              <div className="space-y-3">
                {dashboard.marketVisionSnapshots.slice(0, 8).map((snapshot) => (
                  <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-950">{snapshot.theme}</p>
                      <p className="text-xs text-slate-500">{snapshot.proxySymbol ?? "No proxy"} - {formatNumber(snapshot.confidence)} confidence</p>
                    </div>
                    <StatusBadge>{snapshot.direction}</StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No Market Vision telemetry" description="Generate a Market Vision report to capture theme snapshots." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Review Telemetry</CardTitle>
            <CardDescription>Recent portfolio review snapshots captured for longitudinal review.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.portfolioReviewSnapshots.length > 0 ? (
              <div className="space-y-3">
                {dashboard.portfolioReviewSnapshots.slice(0, 8).map((snapshot) => (
                  <div key={snapshot.id} className="grid grid-cols-3 gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Portfolio</p>
                      <p className="font-semibold text-slate-950">{formatNumber(snapshot.portfolioScore)}/100</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Diversification</p>
                      <p className="font-semibold text-slate-950">{formatNumber(snapshot.diversificationScore)}/100</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Risk</p>
                      <p className="font-semibold text-slate-950">{formatNumber(snapshot.riskScore)}/100</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No Portfolio Review telemetry" description="Run Portfolio Review to capture score and suggestion snapshots." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
