import { ArrowRight, CheckCircle2, Clock3, Database, LineChart, SearchCheck } from "lucide-react";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { cn, formatPercent } from "@/lib/utils";
import { assessmentLabel } from "@/application/services/recommendations/recommendationPresentation";
import type {
  TelemetryEvidenceBucket,
  TelemetryMarketVisionOutcome,
  TelemetryOverview,
  TelemetryPortfolioReviewOutcome
} from "@/domain/telemetry/types";

type Tone = "neutral" | "positive" | "warning" | "danger" | "info";
type ReadinessStatus = "Collecting" | "Awaiting Evidence" | "Building History" | "Active" | "Available";

const mutedToneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800"
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Awaiting first evaluation";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Singapore"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function evidenceTone(bucket: TelemetryEvidenceBucket): Tone {
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

function statusForCount(count: number, evaluatedCount = 0) {
  if (evaluatedCount > 0) return { label: "Evaluated", tone: "positive" as Tone };
  if (count > 0) return { label: "Collecting Evidence", tone: "info" as Tone };
  return { label: "Building History", tone: "neutral" as Tone };
}

function readinessTone(status: ReadinessStatus): Tone {
  if (status === "Available" || status === "Active") return "positive";
  if (status === "Awaiting Evidence") return "warning";
  if (status === "Collecting") return "info";
  return "neutral";
}

function coverageCopy(evaluated: number, matured: number, label: string) {
  if (matured === 0) return `${label} coverage will appear after the first evaluation horizon matures.`;
  return `${evaluated} of ${matured} matured observations evaluated successfully.`;
}

function coverageValue(evaluated: number, matured: number, value: number | null) {
  if (matured === 0 || value == null) return "Awaiting maturity";
  return formatPercent(value);
}

function progressLabel(count: number, activeText: string) {
  if (count > 0) return `${count} ${activeText}`;
  return "Collecting observations";
}

function TelemetryStatusCard({
  title,
  count,
  status,
  description,
  footer
}: {
  title: string;
  count: number;
  status: { label: string; tone: Tone };
  description: string;
  footer: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-200" />
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</CardTitle>
            <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{status.label}</p>
          </div>
          <MutedBadge tone={status.tone}>{count} stored</MutedBadge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">{footer}</p>
      </CardContent>
    </Card>
  );
}

function MutedBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", mutedToneClasses[tone], className)}>
      {children}
    </span>
  );
}

function LifecyclePanel() {
  const steps = [
    { title: "Capture", description: "Instrument insight snapshots, Market Vision reports and Portfolio Reviews are archived.", icon: Database },
    { title: "Wait", description: "Telemetry waits for 1m, 3m, 6m and 12m horizons to mature.", icon: Clock3 },
    { title: "Evaluate", description: "Outcomes are compared with later prices, benchmarks and review scores.", icon: SearchCheck },
    { title: "Learn", description: "Evidence accumulates into accuracy, calibration and effectiveness diagnostics.", icon: LineChart }
  ];

  return (
    <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle>How Telemetry Works</CardTitle>
            <CardDescription>Evidence appears as captured observations mature through fixed review horizons.</CardDescription>
          </div>
          <MutedBadge tone="info">Learning System In Progress</MutedBadge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  {index < steps.length - 1 ? <ArrowRight className="hidden h-4 w-4 text-slate-400 md:block" aria-hidden="true" /> : null}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-950">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessPanel({ overview }: { overview: TelemetryOverview }) {
  const rows: Array<{ metric: string; status: ReadinessStatus; availability: string; detail: string }> = [
    {
      metric: "Insight Outcome Tracking",
      status: overview.evaluatedOutcomes > 0 ? "Available" : overview.recommendationSnapshots > 0 ? "Collecting" : "Building History",
      availability: overview.evaluatedOutcomes > 0 ? "Active" : "After first 1m horizon",
      detail: progressLabel(overview.recommendationSnapshots, "insight snapshots collected")
    },
    {
      metric: "Confidence Calibration",
      status: overview.evaluatedOutcomes > 0 ? "Available" : "Awaiting Evidence",
      availability: overview.evaluatedOutcomes > 0 ? "Active" : "After matured insight outcomes",
      detail: `${overview.evaluatedOutcomes} evaluated outcomes`
    },
    {
      metric: "Factor Intelligence",
      status: overview.evaluatedOutcomes > 0 ? "Active" : "Collecting",
      availability: overview.evaluatedOutcomes > 0 ? "Available" : "After sufficient matured observations",
      detail: "Evidence strength improves with sample size"
    },
    {
      metric: "Market Vision Accuracy",
      status: overview.coverage.evaluatedMarketVisionObservations > 0 ? "Available" : overview.marketVisionSnapshots > 0 ? "Collecting" : "Building History",
      availability: overview.coverage.evaluatedMarketVisionObservations > 0 ? "Active" : "After first 1m horizon",
      detail: progressLabel(overview.marketVisionSnapshots, "theme signals collected")
    },
    {
      metric: "Portfolio Review Effectiveness",
      status: overview.coverage.evaluatedPortfolioReviewObservations > 0 ? "Available" : overview.portfolioReviewSnapshots > 0 ? "Collecting" : "Building History",
      availability: overview.coverage.evaluatedPortfolioReviewObservations > 0 ? "Active" : "Requires later comparison history",
      detail: progressLabel(overview.portfolioReviewSnapshots, "review snapshots collected")
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry Readiness</CardTitle>
        <CardDescription>Current evidence state by telemetry pillar.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="pb-3">Metric</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Expected availability</th>
                <th className="pb-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.metric}>
                  <td className="py-3 font-medium text-slate-950">{row.metric}</td>
                  <td className="py-3"><MutedBadge tone={readinessTone(row.status)}>{row.status}</MutedBadge></td>
                  <td className="py-3 text-slate-600">{row.availability}</td>
                  <td className="py-3 text-slate-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CoverageCard({
  title,
  value,
  evaluated,
  matured
}: {
  title: string;
  value: number | null;
  evaluated: number;
  matured: number;
}) {
  const width = matured > 0 && value != null ? `${Math.min(100, Math.max(0, value * 100))}%` : "0%";
  const ready = matured > 0;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{coverageValue(evaluated, matured, value)}</p>
          </div>
          <MutedBadge tone={ready ? "positive" : "neutral"}>{ready ? "Coverage Active" : "Awaiting Maturity"}</MutedBadge>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-700" style={{ width }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{coverageCopy(evaluated, matured, title)}</p>
      </CardContent>
    </Card>
  );
}

function LearningEmptyState({
  title,
  description,
  badge,
  note
}: {
  title: string;
  description: string;
  badge: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          {note ? <p className="mt-3 text-xs font-medium text-slate-500">{note}</p> : null}
        </div>
        <MutedBadge tone="info">{badge}</MutedBadge>
      </div>
    </div>
  );
}

function MiniStat({ title, value, detail }: { title: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default async function TelemetryPage() {
  const dashboard = await createContainer().telemetryDashboardService.getDashboard();
  const overview = dashboard.overview;
  const hasRecommendationEvidence = dashboard.recommendationSummary.length > 0;
  const marketVisionAccuracy = summarizeMarketVision(dashboard.marketVisionOutcomes);
  const portfolioReviewSummary = summarizePortfolioReview(dashboard.portfolioReviewOutcomes);
  const recommendationStatus = statusForCount(overview.recommendationSnapshots, overview.evaluatedOutcomes);
  const marketVisionStatus = statusForCount(overview.marketVisionSnapshots, overview.coverage.evaluatedMarketVisionObservations);
  const portfolioReviewStatus = statusForCount(overview.portfolioReviewSnapshots, overview.coverage.evaluatedPortfolioReviewObservations);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Telemetry"
        description="A read-only learning system that captures decisions now and evaluates outcomes after evidence has matured."
        meta={
          <>
            <StatusBadge tone="info">Observational only</StatusBadge>
            <StatusBadge tone="neutral">1m / 3m / 6m / 12m horizons</StatusBadge>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TelemetryStatusCard
          title="Insight Snapshots"
          count={overview.recommendationSnapshots}
          status={recommendationStatus}
          description="Instrument insight classifications are being captured and stored for future evaluation."
          footer="Evaluated after 1m, 3m, 6m and 12m horizons."
        />
        <TelemetryStatusCard
          title="Evaluated Outcomes"
          count={overview.evaluatedOutcomes}
          status={overview.evaluatedOutcomes > 0 ? { label: "Ready", tone: "positive" } : { label: "Waiting For Maturity", tone: "neutral" }}
          description={overview.evaluatedOutcomes > 0 ? "Matured observations are now being evaluated." : "Outcome evaluation begins automatically once sufficient history exists."}
          footer={`${overview.pendingOutcomes} pending observations still awaiting maturity or data.`}
        />
        <TelemetryStatusCard
          title="Market Vision Snapshots"
          count={overview.marketVisionSnapshots}
          status={marketVisionStatus.label === "Collecting Evidence" ? { label: "Collecting Signals", tone: "info" } : marketVisionStatus}
          description="Theme observations are being stored for future accuracy evaluation."
          footer="Theme proxies are checked after the same telemetry horizons."
        />
        <TelemetryStatusCard
          title="Portfolio Review Snapshots"
          count={overview.portfolioReviewSnapshots}
          status={portfolioReviewStatus}
          description="Portfolio Reviews are archived for future effectiveness measurement."
          footer="Effectiveness needs a later comparison review and matured horizon."
        />
      </div>

      <LifecyclePanel />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <ReadinessPanel overview={overview} />
        <Card>
          <CardHeader>
            <CardTitle>Collection Progress</CardTitle>
            <CardDescription>Real snapshot counts currently available for evaluation later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniStat title="Insight Telemetry" value={overview.recommendationSnapshots} detail={progressLabel(overview.recommendationSnapshots, "snapshots collected")} />
            <MiniStat title="Market Vision" value={overview.marketVisionSnapshots} detail={progressLabel(overview.marketVisionSnapshots, "signals collected")} />
            <MiniStat title="Portfolio Reviews" value={overview.portfolioReviewSnapshots} detail={progressLabel(overview.portfolioReviewSnapshots, "review snapshots collected")} />
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-950">
                <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                Automated weekly evaluation
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Latest evaluation: {formatDate(overview.latestEvaluationDate)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionHeader title="Coverage" description="Coverage becomes meaningful once observations reach their first evaluation horizon." />
        <div className="grid gap-4 md:grid-cols-3">
          <CoverageCard
            title="Insight Coverage"
            value={overview.coverage.recommendationCoverage}
            evaluated={overview.coverage.evaluatedRecommendationObservations}
            matured={overview.coverage.maturedRecommendationObservations}
          />
          <CoverageCard
            title="Market Vision Coverage"
            value={overview.coverage.marketVisionCoverage}
            evaluated={overview.coverage.evaluatedMarketVisionObservations}
            matured={overview.coverage.maturedMarketVisionObservations}
          />
          <CoverageCard
            title="Portfolio Review Coverage"
            value={overview.coverage.portfolioReviewCoverage}
            evaluated={overview.coverage.evaluatedPortfolioReviewObservations}
            matured={overview.coverage.maturedPortfolioReviewObservations}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Insight Outcomes"
          description="Hit rates and average excess returns by assessment label and horizon."
        />
        <Card>
          <CardContent className="pt-5">
            {hasRecommendationEvidence ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="pb-3">Assessment</th>
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
                        <td className="py-3 font-medium text-slate-950">{assessmentLabel(row.recommendation)}</td>
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
              <LearningEmptyState
                title="No matured observations yet"
                description="Insight snapshots are captured when the deterministic insight engine runs. Outcome evaluation begins automatically once observations reach the selected horizon."
                badge="Collecting Data"
                note="Expected first results: approximately 30 days after the first insight run."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Confidence Calibration"
          description="Compares insight confidence buckets with later hit rates and excess returns."
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
              <LearningEmptyState
                title="Waiting for sufficient observations"
                description="Confidence calibration compares historical success rates against insight confidence levels. Results will appear once enough outcomes have matured."
                badge="Awaiting Evidence"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Factor Intelligence"
          description="Aggregated outcome evidence by factor bucket for calibration QA and future review."
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
                )) : (
                  <LearningEmptyState
                    title="Learning in progress"
                    description="Best-factor rankings appear after a minimum observation threshold is reached."
                    badge="Awaiting Evidence"
                    note="Early observations should be interpreted cautiously."
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Weakest factors</CardTitle>
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
                )) : (
                  <LearningEmptyState
                    title="Learning in progress"
                    description="Weak-factor rankings appear after enough evaluated observations are available."
                    badge="Awaiting Evidence"
                    note="Early observations should be interpreted cautiously."
                  />
                )}
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
                    <MutedBadge tone={evidenceTone(factor.confidenceBucket)}>{evidenceLabel(factor.confidenceBucket)}</MutedBadge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <MiniStat title="Observations" value={factor.observationCount} />
                    <MiniStat title="Hit rate" value={factor.hitRate == null ? "-" : formatPercent(factor.hitRate)} />
                    <MiniStat title="Avg asset" value={factor.averageAssetReturn == null ? "-" : formatPercent(factor.averageAssetReturn)} />
                    <MiniStat title="Avg excess" value={factor.averageExcessReturn == null ? "-" : formatPercent(factor.averageExcessReturn)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <LearningEmptyState
                title="Learning in progress"
                description="Factor effectiveness is calculated after insight outcomes mature. Evidence strength improves as more observations are collected."
                badge="Awaiting Evidence"
                note="Early observations should be interpreted cautiously."
              />
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market Vision Accuracy</CardTitle>
            <CardDescription>Theme proxy returns are evaluated against benchmarks by horizon.</CardDescription>
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
              <LearningEmptyState
                title="Theme signals are being tracked"
                description="Market Vision observations are accumulating historical outcomes. Technology, Healthcare, Rates, Inflation and other themes will begin displaying accuracy metrics after evaluation horizons mature."
                badge="Collecting Signals"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Review Effectiveness</CardTitle>
            <CardDescription>Later review scores and portfolio outcomes are compared with prior reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioReviewSummary.evaluatedCount > 0 ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MiniStat title="Effectiveness rate" value={portfolioReviewSummary.effectiveRate == null ? "-" : formatPercent(portfolioReviewSummary.effectiveRate)} />
                <MiniStat title="Evaluated reviews" value={portfolioReviewSummary.evaluatedCount} />
                <MiniStat title="Portfolio score change" value={formatNumber(portfolioReviewSummary.averagePortfolioScoreChange)} />
                <MiniStat title="Diversification change" value={formatNumber(portfolioReviewSummary.averageDiversificationChange)} />
                <MiniStat title="Concentration change" value={formatNumber(portfolioReviewSummary.averageConcentrationChange)} />
                <MiniStat title="Avg excess return" value={portfolioReviewSummary.averageExcessReturn == null ? "-" : formatPercent(portfolioReviewSummary.averageExcessReturn)} />
              </div>
            ) : (
              <LearningEmptyState
                title="Waiting for comparison history"
                description="Portfolio Review effectiveness requires an initial review snapshot, a future review snapshot and a matured evaluation horizon. Results will appear as portfolio history accumulates."
                badge="Building History"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
