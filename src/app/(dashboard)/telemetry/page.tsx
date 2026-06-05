import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { formatPercent } from "@/lib/utils";
import type { TelemetryEvidenceBucket, TelemetryMarketVisionOutcome, TelemetryPortfolioReviewOutcome } from "@/domain/telemetry/types";

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

function avg(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numeric.length === 0 ? null : numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function summarizeMarketVision(outcomes: TelemetryMarketVisionOutcome[]) {
  const groups = new Map<string, TelemetryMarketVisionOutcome[]>();
  for (const outcome of outcomes.filter((item) => item.outcomeStatus === "evaluated")) {
    const key = `${outcome.proxySymbol ?? "Unknown"}|${outcome.horizon}`;
    groups.set(key, [...(groups.get(key) ?? []), outcome]);
  }
  return Array.from(groups.entries()).map(([key, rows]) => {
    const [proxySymbol, horizon] = key.split("|");
    return {
      proxySymbol,
      horizon,
      count: rows.length,
      hitRate: rows.length === 0 ? null : rows.filter((row) => row.success).length / rows.length,
      averageExcessReturn: avg(rows.map((row) => row.excessReturn))
    };
  }).sort((a, b) => b.count - a.count || a.proxySymbol.localeCompare(b.proxySymbol));
}

function summarizePortfolioReview(outcomes: TelemetryPortfolioReviewOutcome[]) {
  const evaluated = outcomes.filter((item) => item.outcomeStatus === "evaluated");
  return {
    evaluatedCount: evaluated.length,
    effectiveRate: evaluated.length === 0 ? null : evaluated.filter((item) => item.effectivenessClassification === "effective").length / evaluated.length,
    averagePortfolioScoreChange: avg(evaluated.map((item) => item.portfolioScoreChange)),
    averageDiversificationChange: avg(evaluated.map((item) => item.diversificationScoreChange)),
    averageConcentrationChange: avg(evaluated.map((item) => item.concentrationScoreChange)),
    averageRiskChange: avg(evaluated.map((item) => item.riskScoreChange)),
    averageExcessReturn: avg(evaluated.map((item) => item.excessReturn))
  };
}

export default async function TelemetryPage() {
  const dashboard = await createContainer().telemetryDashboardService.getDashboard();
  const overview = dashboard.overview;
  const hasRecommendationEvidence = dashboard.recommendationSummary.length > 0;
  const marketVisionAccuracy = summarizeMarketVision(dashboard.marketVisionOutcomes);
  const portfolioReviewSummary = summarizePortfolioReview(dashboard.portfolioReviewOutcomes);

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
        <SectionHeader title="Coverage" description="Evaluated observations divided by matured snapshot-horizons. Empty coverage means no snapshot has matured for that pillar yet." />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Recommendation coverage"
            value={overview.coverage.recommendationCoverage == null ? "-" : formatPercent(overview.coverage.recommendationCoverage)}
            footer={`${overview.coverage.evaluatedRecommendationObservations}/${overview.coverage.maturedRecommendationObservations} matured observations`}
          />
          <MetricCard
            title="Market Vision coverage"
            value={overview.coverage.marketVisionCoverage == null ? "-" : formatPercent(overview.coverage.marketVisionCoverage)}
            footer={`${overview.coverage.evaluatedMarketVisionObservations}/${overview.coverage.maturedMarketVisionObservations} matured observations`}
          />
          <MetricCard
            title="Portfolio Review coverage"
            value={overview.coverage.portfolioReviewCoverage == null ? "-" : formatPercent(overview.coverage.portfolioReviewCoverage)}
            footer={`${overview.coverage.evaluatedPortfolioReviewObservations}/${overview.coverage.maturedPortfolioReviewObservations} matured observations`}
          />
        </div>
      </section>

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
          title="Confidence Calibration"
          description="Compares recommendation confidence buckets with actual hit rate and excess return."
        />
        <Card>
          <CardContent className="pt-5">
            {dashboard.confidenceCalibration.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="pb-3">Confidence bucket</th>
                      <th className="pb-3">Horizon</th>
                      <th className="pb-3 text-right">Observations</th>
                      <th className="pb-3 text-right">Hit rate</th>
                      <th className="pb-3 text-right">Avg excess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.confidenceCalibration.map((row) => (
                      <tr key={`${row.bucket}-${row.horizon}`}>
                        <td className="py-3 font-medium text-slate-950">{row.bucket}</td>
                        <td className="py-3 text-slate-600">{row.horizon}</td>
                        <td className="py-3 text-right">{row.observationCount}</td>
                        <td className="py-3 text-right">{row.hitRate == null ? "-" : formatPercent(row.hitRate)}</td>
                        <td className="py-3 text-right">{row.averageExcessReturn == null ? "-" : formatPercent(row.averageExcessReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No confidence calibration yet" description="Calibration appears after recommendation outcomes have been evaluated." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Factor Evidence"
          description="Aggregated outcome evidence by factor bucket. This is for calibration QA and future review, not automatic weight changes."
        />
        {dashboard.factorOutcomes.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Best factors</CardTitle>
                <CardDescription>Ranked by average excess return with at least early evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.bestFactors.length > 0 ? dashboard.bestFactors.map((factor) => (
                  <div key={factor.id} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{factor.factorName.replaceAll("_", " ")} - {factor.factorValue}</p>
                        <p className="mt-1 text-xs text-slate-500">{factor.horizon} - {factor.observationCount} observations - hit {factor.hitRate == null ? "-" : formatPercent(factor.hitRate)}</p>
                      </div>
                      <p className="font-semibold text-emerald-700">{factor.averageExcessReturn == null ? "-" : formatPercent(factor.averageExcessReturn)}</p>
                    </div>
                  </div>
                )) : <EmptyState title="No ranked best factors yet" description="At least 10 evaluated observations are required before ranking." />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Worst factors</CardTitle>
                <CardDescription>Lowest average excess return, subject to the same evidence threshold.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.worstFactors.length > 0 ? dashboard.worstFactors.map((factor) => (
                  <div key={factor.id} className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{factor.factorName.replaceAll("_", " ")} - {factor.factorValue}</p>
                        <p className="mt-1 text-xs text-slate-500">{factor.horizon} - {factor.observationCount} observations - hit {factor.hitRate == null ? "-" : formatPercent(factor.hitRate)}</p>
                      </div>
                      <p className="font-semibold text-red-700">{factor.averageExcessReturn == null ? "-" : formatPercent(factor.averageExcessReturn)}</p>
                    </div>
                  </div>
                )) : <EmptyState title="No ranked weak factors yet" description="At least 10 evaluated observations are required before ranking." />}
              </CardContent>
            </Card>
            {dashboard.factorOutcomes.slice(0, 6).map((factor) => (
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
            <CardTitle>Market Vision Accuracy</CardTitle>
            <CardDescription>Evaluates theme proxy returns against the benchmark by horizon.</CardDescription>
          </CardHeader>
          <CardContent>
            {marketVisionAccuracy.length > 0 ? (
              <div className="space-y-3">
                {marketVisionAccuracy.slice(0, 8).map((row) => (
                  <div key={`${row.proxySymbol}-${row.horizon}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-950">{row.proxySymbol}</p>
                      <p className="text-xs text-slate-500">{row.horizon} - {row.count} evaluated observations</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">{row.hitRate == null ? "-" : formatPercent(row.hitRate)}</p>
                      <p className="text-xs text-slate-500">excess {row.averageExcessReturn == null ? "-" : formatPercent(row.averageExcessReturn)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No Market Vision accuracy yet" description="Market Vision snapshots need to mature before accuracy can be evaluated." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Review Effectiveness</CardTitle>
            <CardDescription>Measures whether later review scores and portfolio outcomes improved after prior reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioReviewSummary.evaluatedCount > 0 ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MetricCard title="Effectiveness rate" value={portfolioReviewSummary.effectiveRate == null ? "-" : formatPercent(portfolioReviewSummary.effectiveRate)} />
                <MetricCard title="Evaluated reviews" value={portfolioReviewSummary.evaluatedCount} />
                <MetricCard title="Portfolio score change" value={formatNumber(portfolioReviewSummary.averagePortfolioScoreChange)} />
                <MetricCard title="Diversification change" value={formatNumber(portfolioReviewSummary.averageDiversificationChange)} />
                <MetricCard title="Concentration change" value={formatNumber(portfolioReviewSummary.averageConcentrationChange)} />
                <MetricCard title="Avg excess return" value={portfolioReviewSummary.averageExcessReturn == null ? "-" : formatPercent(portfolioReviewSummary.averageExcessReturn)} />
              </div>
            ) : (
              <EmptyState title="No Portfolio Review effectiveness yet" description="Portfolio Review snapshots need a later comparison review and matured horizon before effectiveness can be evaluated." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
