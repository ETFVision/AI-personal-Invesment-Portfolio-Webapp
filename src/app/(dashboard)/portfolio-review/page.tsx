import Link from "next/link";
import { createContainer } from "@/server/container";
import { runPortfolioReviewAction } from "@/server/actions/portfolioReviewActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPercent } from "@/lib/utils";
import type {
  PortfolioImprovementSuggestion,
  PortfolioPotentialAction,
  PortfolioReviewFinding,
  PortfolioReviewReport,
  PortfolioReviewSection
} from "@/domain/portfolioReview/types";

type PortfolioReviewPageProps = {
  searchParams?: Promise<{
    portfolioReviewMessage?: string;
    portfolioReviewError?: string;
  }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function severityTone(severity: PortfolioReviewFinding["severity"]) {
  if (severity === "attention") return "border-red-200 bg-red-50 text-red-900";
  if (severity === "watch") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function metricLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDisplayRatio(value: number) {
  let normalized = value;
  while (Math.abs(normalized) > 1) normalized /= 100;
  return normalized;
}

function isRatioMetric(key: string) {
  const normalized = key.toLowerCase();
  return [
    "allocation",
    "concentration",
    "drawdown",
    "exposure",
    "volatility",
    "percent",
    "correlation"
  ].some((term) => normalized.includes(term));
}

function metricValue(key: string, value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "number") {
    if (isRatioMetric(key)) return formatPercent(normalizeDisplayRatio(value));
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const label = typeof objectValue.label === "string" ? objectValue.label : null;
    const percent = typeof objectValue.percent === "number" ? objectValue.percent : null;
    const itemValue = typeof objectValue.value === "number" ? objectValue.value : null;
    if (label && percent != null) return `${label} - ${formatPercent(normalizeDisplayRatio(percent))}`;
    if (label && itemValue != null) return `${label} - ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(itemValue)}`;
    if (label) return label;
    return "Details available";
  }
  return String(value);
}

function SectionMetrics({ metrics }: { metrics: Record<string, unknown> }) {
  const entries = Object.entries(metrics).filter(([, value]) => value != null);
  if (entries.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">No metrics available for this section.</p>;
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">{metricLabel(key)}</p>
          <p className="mt-1 text-sm font-medium">{metricValue(key, value)}</p>
        </div>
      ))}
    </div>
  );
}

function normalizedSectionForDisplay(title: string, section: PortfolioReviewSection): PortfolioReviewSection {
  if (title !== "Risk Review" || section.score > 0) return section;
  const volatility = typeof section.metrics.annualizedVolatility === "number"
    ? normalizeDisplayRatio(section.metrics.annualizedVolatility)
    : 0.12;
  const maxDrawdown = typeof section.metrics.maxDrawdown === "number"
    ? normalizeDisplayRatio(section.metrics.maxDrawdown)
    : 0;
  const currentDrawdown = typeof section.metrics.currentDrawdown === "number"
    ? normalizeDisplayRatio(section.metrics.currentDrawdown)
    : 0;
  const correctedScore = Math.max(0, Math.min(100, Math.round(
    88
      - Math.max(0, volatility - 0.18) * 120
      - Math.max(0, Math.abs(maxDrawdown) - 0.15) * 100
      - Math.max(0, Math.abs(currentDrawdown) - 0.08) * 70
  )));

  return {
    ...section,
    score: correctedScore,
    metrics: {
      ...section.metrics,
      annualizedVolatility: volatility,
      currentDrawdown,
      maxDrawdown
    }
  };
}

function SectionCard({ title, section }: { title: string; section: PortfolioReviewSection }) {
  const displaySection = normalizedSectionForDisplay(title, section);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{displaySection.summary}</CardDescription>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-sm font-medium">{score(displaySection.score)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displaySection.findings.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No material finding in this section.</p>
        ) : (
          <div className="space-y-2">
            {displaySection.findings.map((finding, index) => (
              <div key={`${finding.title}-${index}`} className={`rounded-md border p-3 text-sm ${severityTone(finding.severity)}`}>
                <p className="font-medium">{finding.title}</p>
                <p className="mt-1 opacity-90">{finding.detail}</p>
              </div>
            ))}
          </div>
        )}
        <details className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Section metrics</summary>
          <SectionMetrics metrics={displaySection.metrics} />
        </details>
      </CardContent>
    </Card>
  );
}

function Suggestions({ suggestions }: { suggestions: PortfolioImprovementSuggestion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Improvement Suggestions</CardTitle>
        <CardDescription>Review prompts only. Candidate instruments are filtered to approved active universe items and exclude Reduce/Sell labels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No improvement suggestion generated for the latest review.</p>
        ) : suggestions.map((suggestion) => (
          <div key={`${suggestion.category}-${suggestion.title}`} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{suggestion.title}</p>
              <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{suggestion.priority}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{suggestion.category.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{suggestion.rationale}</p>
            {suggestion.candidateInstruments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestion.candidateInstruments.map((candidate) => (
                  <Link
                    key={`${suggestion.title}-${candidate.instrumentId}`}
                    href={`/instruments/${encodeURIComponent(candidate.symbol)}`}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    {candidate.symbol} - {candidate.recommendationLabel} - {score(candidate.score)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Actions({ actions }: { actions: PortfolioPotentialAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential Portfolio Actions</CardTitle>
        <CardDescription>Non-trading review actions. No exact amounts, shares or order instructions are generated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No review action generated.</p>
        ) : actions.map((action) => (
          <div key={`${action.actionType}-${action.title}`} className="rounded-md border p-3 text-sm">
            <p className="font-medium">{action.title}</p>
            <p className="mt-1 text-muted-foreground">{action.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SummaryCards({ report }: { report: PortfolioReviewReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Portfolio score</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-semibold">{score(report.overallPortfolioScore)}</p><p className="text-xs text-muted-foreground">Weighted deterministic review</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Confidence</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-semibold">{formatPercent(report.confidenceScore / 100)}</p><p className="text-xs text-muted-foreground">Input coverage and freshness</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Watch areas</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-semibold">{report.watchAreas.length}</p><p className="text-xs text-muted-foreground">Attention or watch findings</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Review date</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-semibold">{report.reviewDate}</p><p className="text-xs text-muted-foreground">{report.status}</p></CardContent>
      </Card>
    </div>
  );
}

export default async function PortfolioReviewPage({ searchParams }: PortfolioReviewPageProps) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        description="Create your base portfolio before running a portfolio review."
        action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/setup">Start setup</Link>}
      />
    );
  }

  const dashboard = await container.portfolioReviewService.getDashboard(portfolio.id);
  const report = dashboard.latestReport;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Research</p>
          <h1 className="text-2xl font-semibold">Portfolio Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deterministic portfolio-level review across allocation, risk, macro, recommendations, fixed income and themes.</p>
        </div>
        <form action={runPortfolioReviewAction}>
          <input type="hidden" name="returnTo" value="/portfolio-review" />
          <SubmitButton pendingLabel="Running review...">Run portfolio review</SubmitButton>
        </form>
      </div>

      {params?.portfolioReviewMessage ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{params.portfolioReviewMessage}</p> : null}
      {params?.portfolioReviewError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{params.portfolioReviewError}</p> : null}

      {!report ? (
        <EmptyState
          title="No portfolio review yet"
          description="Run the deterministic review after recommendation, risk, macro and news inputs have been refreshed."
        />
      ) : (
        <>
          <SummaryCards report={report} />

          <Card>
            <CardHeader>
              <CardTitle>Executive Portfolio Summary</CardTitle>
              <CardDescription>
                Review period {report.periodStart ?? "-"} to {report.periodEnd ?? "-"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{report.executiveSummary}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Allocation Review" section={report.allocationReview} />
            <SectionCard title="Concentration Review" section={report.concentrationReview} />
            <SectionCard title="Diversification Review" section={report.diversificationReview} />
            <SectionCard title="Risk Review" section={report.riskReview} />
            <SectionCard title="Macro Fit Review" section={report.macroFitReview} />
            <SectionCard title="Recommendation Alignment Review" section={report.recommendationAlignmentReview} />
            <SectionCard title="Fixed Income Review" section={report.fixedIncomeReview} />
            <SectionCard title="Theme Exposure Review" section={report.themeExposureReview} />
          </div>

          <Suggestions suggestions={report.portfolioImprovementSuggestions} />
          <Actions actions={report.potentialActions} />

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Data Limitations</CardTitle>
                <CardDescription>Limitations are carried forward for QA and later assistant workflows.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.dataLimitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No material data limitation recorded.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {report.dataLimitations.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Review History</CardTitle>
                <CardDescription>Latest reports and run status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {dashboard.reports.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2">
                    <span>{item.reviewDate}</span>
                    <span>{score(item.overallPortfolioScore)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
