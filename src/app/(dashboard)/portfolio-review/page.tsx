import Link from "next/link";
import { createContainer } from "@/server/container";
import { refreshEtfLookthroughExposureAction, runPortfolioReviewAction } from "@/server/actions/portfolioReviewActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPercent } from "@/lib/utils";
import type {
  PortfolioImprovementSuggestion,
  PortfolioPotentialAction,
  PortfolioReviewFinding,
  PortfolioReviewReport,
  PortfolioReviewSection
} from "@/domain/portfolioReview/types";
import type { PortfolioLookthroughExposure, PortfolioLookthroughHolding, PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";
import { consolidatePortfolioLookthroughExposures } from "@/domain/etfLookthrough/exposureNormalization";

type PortfolioReviewPageProps = {
  searchParams?: Promise<{
    portfolioReviewMessage?: string;
    portfolioReviewError?: string;
  }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
    timeZoneName: "short"
  }).format(new Date(value));
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
  if (Array.isArray(value)) {
    const holdingItems = value
      .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => item !== null && typeof item.holdingSymbol === "string" && typeof item.totalWeight === "number");
    if (holdingItems.length > 0) {
      return holdingItems
        .slice(0, 5)
        .map((item) => {
          const symbol = String(item.holdingSymbol);
          const total = formatPercent(normalizeDisplayRatio(Number(item.totalWeight)));
          const direct = typeof item.directWeight === "number" ? formatPercent(normalizeDisplayRatio(item.directWeight)) : "0%";
          const indirect = typeof item.indirectWeight === "number" ? formatPercent(normalizeDisplayRatio(item.indirectWeight)) : "0%";
          return `${symbol} ${total} (direct ${direct}, indirect ${indirect})`;
        })
        .join("; ");
    }
    const exposureItems = value
      .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => item !== null && typeof item.exposureName === "string" && typeof item.exposureWeight === "number");
    if (exposureItems.length > 0) {
      return exposureItems
        .slice(0, 5)
        .map((item) => {
          const name = String(item.exposureName);
          const total = formatPercent(normalizeDisplayRatio(Number(item.exposureWeight)));
          const direct = typeof item.directWeight === "number" ? formatPercent(normalizeDisplayRatio(item.directWeight)) : null;
          const etf = typeof item.etfLookthroughWeight === "number" ? formatPercent(normalizeDisplayRatio(item.etfLookthroughWeight)) : null;
          return direct || etf ? `${name} ${total} (direct ${direct ?? "0%"}, ETF ${etf ?? "0%"})` : `${name} ${total}`;
        })
        .join("; ");
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const holdingSymbol = typeof objectValue.holdingSymbol === "string" ? objectValue.holdingSymbol : null;
    const totalWeight = typeof objectValue.totalWeight === "number" ? objectValue.totalWeight : null;
    if (holdingSymbol && totalWeight != null) {
      const directWeight = typeof objectValue.directWeight === "number" ? objectValue.directWeight : 0;
      const indirectWeight = typeof objectValue.indirectWeight === "number" ? objectValue.indirectWeight : 0;
      return `${holdingSymbol} - ${formatPercent(normalizeDisplayRatio(totalWeight))}, direct ${formatPercent(normalizeDisplayRatio(directWeight))}, indirect ${formatPercent(normalizeDisplayRatio(indirectWeight))}`;
    }
    const exposureName = typeof objectValue.exposureName === "string" ? objectValue.exposureName : null;
    const exposureWeight = typeof objectValue.exposureWeight === "number" ? objectValue.exposureWeight : null;
    const directWeight = typeof objectValue.directWeight === "number" ? objectValue.directWeight : null;
    const etfLookthroughWeight = typeof objectValue.etfLookthroughWeight === "number" ? objectValue.etfLookthroughWeight : null;
    if (exposureName && exposureWeight != null) {
      const detail = directWeight != null || etfLookthroughWeight != null
        ? `, direct ${formatPercent(normalizeDisplayRatio(directWeight ?? 0))}, ETF ${formatPercent(normalizeDisplayRatio(etfLookthroughWeight ?? 0))}`
        : "";
      return `${exposureName} - ${formatPercent(normalizeDisplayRatio(exposureWeight))}${detail}`;
    }
    const coverageKeys = ["etfCount", "etfsWithSectorExposure", "etfsWithCountryExposure", "etfsWithTopHoldings", "lookthroughWeight", "fallbackWeight"];
    if (coverageKeys.some((coverageKey) => coverageKey in objectValue)) {
      const etfCount = typeof objectValue.etfCount === "number" ? objectValue.etfCount : 0;
      const sectorCount = typeof objectValue.etfsWithSectorExposure === "number" ? objectValue.etfsWithSectorExposure : 0;
      const countryCount = typeof objectValue.etfsWithCountryExposure === "number" ? objectValue.etfsWithCountryExposure : 0;
      const topHoldingCount = typeof objectValue.etfsWithTopHoldings === "number" ? objectValue.etfsWithTopHoldings : 0;
      const lookthroughWeight = typeof objectValue.lookthroughWeight === "number" ? objectValue.lookthroughWeight : null;
      const fallbackWeight = typeof objectValue.fallbackWeight === "number" ? objectValue.fallbackWeight : null;
      const weights = lookthroughWeight != null || fallbackWeight != null
        ? `, look-through ${formatPercent(normalizeDisplayRatio(lookthroughWeight ?? 0))}, fallback ${formatPercent(normalizeDisplayRatio(fallbackWeight ?? 0))}`
        : "";
      return `${sectorCount}/${etfCount} sector, ${countryCount}/${etfCount} country, ${topHoldingCount}/${etfCount} holdings${weights}`;
    }
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

const fallbackSection: PortfolioReviewSection = {
  score: 0,
  summary: "This section is unavailable for the saved report. Run a new portfolio review to refresh it.",
  findings: [],
  metrics: {}
};

function SectionMetrics({ metrics }: { metrics: Record<string, unknown> | undefined }) {
  const entries = Object.entries(metrics ?? {}).filter(([, value]) => value != null);
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

function normalizedSectionForDisplay(title: string, section: PortfolioReviewSection | undefined): PortfolioReviewSection {
  if (!section) return fallbackSection;
  const safeSection = {
    ...section,
    findings: Array.isArray(section.findings) ? section.findings : [],
    metrics: section.metrics ?? {}
  };
  if (title !== "Risk Review" || safeSection.score > 0) return safeSection;
  const volatility = typeof safeSection.metrics.annualizedVolatility === "number"
    ? normalizeDisplayRatio(safeSection.metrics.annualizedVolatility)
    : 0.12;
  const maxDrawdown = typeof safeSection.metrics.maxDrawdown === "number"
    ? normalizeDisplayRatio(safeSection.metrics.maxDrawdown)
    : 0;
  const currentDrawdown = typeof safeSection.metrics.currentDrawdown === "number"
    ? normalizeDisplayRatio(safeSection.metrics.currentDrawdown)
    : 0;
  const correctedScore = Math.max(0, Math.min(100, Math.round(
    88
      - Math.max(0, volatility - 0.18) * 120
      - Math.max(0, Math.abs(maxDrawdown) - 0.15) * 100
      - Math.max(0, Math.abs(currentDrawdown) - 0.08) * 70
  )));

  return {
    ...safeSection,
    score: correctedScore,
    metrics: {
      ...safeSection.metrics,
      annualizedVolatility: volatility,
      currentDrawdown,
      maxDrawdown
    }
  };
}

function SectionCard({ title, section }: { title: string; section: PortfolioReviewSection | undefined }) {
  const displaySection = normalizedSectionForDisplay(title, section);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{displaySection.summary}</CardDescription>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-semibold text-slate-800">{score(displaySection.score)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displaySection.findings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-500">No material finding in this section.</p>
        ) : (
          <div className="space-y-2">
            {displaySection.findings.map((finding, index) => (
              <div key={`${finding.title}-${index}`} className={`rounded-xl border p-3 text-sm shadow-sm ${severityTone(finding.severity)}`}>
                <p className="font-semibold tracking-tight">{finding.title}</p>
                <p className="mt-1 opacity-90">{finding.detail}</p>
              </div>
            ))}
          </div>
        )}
        <details className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-600">Section metrics</summary>
          <SectionMetrics metrics={displaySection.metrics} />
        </details>
      </CardContent>
    </Card>
  );
}

function Suggestions({ suggestions }: { suggestions: PortfolioImprovementSuggestion[] }) {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Improvement Suggestions</CardTitle>
        <CardDescription>Review prompts only. Candidate instruments are filtered to approved active universe items and exclude Reduce/Sell labels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeSuggestions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No improvement suggestion generated for the latest review.</p>
        ) : safeSuggestions.map((suggestion) => {
          const candidates = Array.isArray(suggestion.candidateInstruments) ? suggestion.candidateInstruments : [];
          return <div key={`${suggestion.category}-${suggestion.title}`} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{suggestion.title}</p>
              <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{suggestion.priority}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{suggestion.category.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{suggestion.rationale}</p>
            {suggestion.expectedPortfolioBenefit || suggestion.potentialTradeOff ? (
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                {suggestion.expectedPortfolioBenefit ? (
                  <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
                    <p className="text-xs font-medium uppercase">Expected benefit</p>
                    <p className="mt-1">{suggestion.expectedPortfolioBenefit}</p>
                  </div>
                ) : null}
                {suggestion.potentialTradeOff ? (
                  <div className="rounded-md bg-amber-50 p-3 text-amber-900">
                    <p className="text-xs font-medium uppercase">Trade-off</p>
                    <p className="mt-1">{suggestion.potentialTradeOff}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {candidates.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {candidates.map((candidate) => (
                  <Link
                    key={`${suggestion.title}-${candidate.instrumentId}`}
                    href={`/instruments/${encodeURIComponent(candidate.symbol)}`}
                    className="rounded-md border p-3 text-xs hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{candidate.symbol}</span>
                      <span>{candidate.recommendationLabel}</span>
                      <span>{score(candidate.recommendationScore ?? candidate.score)}</span>
                      {candidate.confidenceScore != null ? <span>Conf {formatPercent(candidate.confidenceScore / 100)}</span> : null}
                      {candidate.relevanceScore != null ? <span>Rel {score(candidate.relevanceScore)}</span> : null}
                      {candidate.diversificationBenefitScore != null ? <span>Diversification {score(candidate.diversificationBenefitScore)}</span> : null}
                      {candidate.overlapPenalty != null && candidate.overlapPenalty > 0 ? <span>Overlap penalty {score(candidate.overlapPenalty)}</span> : null}
                      {candidate.diversificationType ? <span>{candidate.diversificationType}</span> : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">{candidate.primaryReason ?? candidate.whyThisCandidate ?? candidate.reason}</p>
                    {candidate.secondaryBenefit ? <p className="mt-1">Benefit: {candidate.secondaryBenefit}</p> : candidate.expectedPortfolioBenefit ? <p className="mt-1">Benefit: {candidate.expectedPortfolioBenefit}</p> : null}
                    {candidate.overlapWarning ? <p className="mt-1 text-muted-foreground">Overlap: {candidate.overlapWarning}</p> : null}
                    {candidate.potentialTradeOff ? <p className="mt-1 text-muted-foreground">Trade-off: {candidate.potentialTradeOff}</p> : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>;
        })}
      </CardContent>
    </Card>
  );
}

function lookthroughReport(report: PortfolioReviewReport): PortfolioLookthroughReport | null {
  const value = report.inputsSnapshot?.lookthroughExposure;
  if (!value || typeof value !== "object") return null;
  const typed = value as PortfolioLookthroughReport;
  if (!Array.isArray(typed.sectorExposures)) return null;
  return {
    ...typed,
    sectorExposures: consolidatePortfolioLookthroughExposures(typed.sectorExposures),
    countryExposures: consolidatePortfolioLookthroughExposures(typed.countryExposures ?? []),
    currencyExposures: consolidatePortfolioLookthroughExposures(typed.currencyExposures ?? []),
    themeExposures: consolidatePortfolioLookthroughExposures(typed.themeExposures ?? []),
    topHoldingExposures: consolidatePortfolioLookthroughExposures(typed.topHoldingExposures ?? []),
    holdingExposures: typed.holdingExposures ?? []
  };
}

function ExposureTable({
  title,
  description,
  rows,
  mode = "allocation"
}: {
  title: string;
  description: string;
  rows: PortfolioLookthroughExposure[];
  mode?: "allocation" | "overlap";
}) {
  const totalExposure = rows.reduce((sum, row) => sum + row.exposureWeight, 0);
  const shownRows = rows.slice(0, 10);
  const remainingTotal = rows.slice(shownRows.length).reduce((sum, row) => sum + row.exposureWeight, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description} {rows.length > 0 && mode === "allocation" ? `Allocation total across ${rows.length} rows: ${formatPercent(totalExposure)}.` : ""}
          {rows.length > 0 && mode === "overlap" ? " Theme signal weights can overlap and are not expected to add to 100%." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No look-through exposure available yet.</p>
        ) : (
          <div className="space-y-2">
            {shownRows.map((row) => (
              <div key={`${row.exposureType}-${row.exposureName}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{row.exposureName}</p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "overlap" ? "Direct signal" : "Direct"} {formatPercent(row.directWeight)} - ETF look-through {formatPercent(row.etfLookthroughWeight)}
                  </p>
                </div>
                <span className="font-medium">{formatPercent(row.exposureWeight)}</span>
              </div>
            ))}
            {rows.length > shownRows.length ? (
              <p className="text-xs text-muted-foreground">
                Showing top {shownRows.length}; remaining rows {mode === "overlap" ? "signal weight" : "total"} {formatPercent(remainingTotal)}.
              </p>
            ) : null}
            {mode === "allocation" && totalExposure > 1.05 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                Allocation total is above 100%, which usually means source classifications overlap. Review this table before treating it as a strict allocation split.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingExposureTable({ rows }: { rows: PortfolioLookthroughHolding[] }) {
  const shownRows = rows.slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Combined Holding Exposure</CardTitle>
        <CardDescription>Direct holdings plus ETF underlying look-through exposure, sorted by total concentration. Top rows are concentration checks and are not expected to add to 100%.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Indirect holding exposure unavailable.</p>
        ) : (
          <div className="space-y-2">
            {shownRows.map((row) => (
              <div key={row.holdingSymbol} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.holdingSymbol}{row.holdingName ? ` - ${row.holdingName}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      Direct {formatPercent(row.directWeight)} - ETF look-through {formatPercent(row.indirectWeight)}
                    </p>
                    {row.sourceEtfs.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source ETFs: {row.sourceEtfs.map((item) => `${item.symbol} ${formatPercent(item.weight)}`).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-medium">{formatPercent(row.totalWeight)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IndirectHoldingExposureTable({ rows }: { rows: PortfolioLookthroughHolding[] }) {
  const shownRows = rows
    .filter((row) => row.indirectWeight > 0)
    .sort((a, b) => b.indirectWeight - a.indirectWeight)
    .slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Indirect Holdings</CardTitle>
        <CardDescription>Largest underlying stock exposures coming only from ETFs, sorted by ETF look-through weight. Top rows are hidden-overlap checks and are not expected to add to 100%.</CardDescription>
      </CardHeader>
      <CardContent>
        {shownRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No indirect ETF holding exposure available yet.</p>
        ) : (
          <div className="space-y-2">
            {shownRows.map((row) => (
              <div key={`indirect-${row.holdingSymbol}`} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.holdingSymbol}{row.holdingName ? ` - ${row.holdingName}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      ETF look-through {formatPercent(row.indirectWeight)}
                      {row.directWeight > 0 ? ` - total with direct holding ${formatPercent(row.totalWeight)}` : ""}
                    </p>
                    {row.sourceEtfs.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source ETFs: {row.sourceEtfs.map((item) => `${item.symbol} ${formatPercent(item.weight)}`).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-medium">{formatPercent(row.indirectWeight)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Actions({ actions }: { actions: PortfolioPotentialAction[] }) {
  const safeActions = Array.isArray(actions) ? actions : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential Portfolio Actions</CardTitle>
        <CardDescription>Non-trading review actions. No exact amounts, shares or order instructions are generated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {safeActions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No review action generated.</p>
        ) : safeActions.map((action) => (
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
  const watchAreas = Array.isArray(report.watchAreas) ? report.watchAreas : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Portfolio score" value={score(report.overallPortfolioScore)} footer="Weighted deterministic review" />
      <MetricCard title="Data Coverage" value={formatPercent(report.confidenceScore / 100)} footer="Input coverage and freshness" />
      <MetricCard title="Watch areas" value={watchAreas.length} footer="Attention or watch findings" tone={watchAreas.length > 0 ? "warning" : "positive"} />
      <MetricCard title="Review date" value={report.reviewDate} footer={report.status} />
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
  const latestEtfExposureLog = (await container.etfExposureRepository.listRefreshLogs(1))[0] ?? null;
  const report = dashboard.latestReport;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Portfolio Review"
        description="Deterministic portfolio-level review across allocation, risk, macro, recommendations, fixed income and themes."
        meta={
          <>
            <StatusBadge tone={report ? "positive" : "neutral"}>{report ? `Report ${report.reviewDate}` : "No report yet"}</StatusBadge>
            <StatusBadge tone={latestEtfExposureLog?.status === "success" ? "positive" : latestEtfExposureLog ? "warning" : "neutral"}>
              ETF exposure {formatDateTime(latestEtfExposureLog?.completedAt ?? latestEtfExposureLog?.startedAt)}
            </StatusBadge>
          </>
        }
        actions={
          <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <form action={refreshEtfLookthroughExposureAction}>
              <input type="hidden" name="returnTo" value="/portfolio-review" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing ETF exposure...">Refresh ETF exposure</SubmitButton>
            </form>
            <form action={runPortfolioReviewAction}>
              <input type="hidden" name="returnTo" value="/portfolio-review" />
              <SubmitButton pendingLabel="Running review...">Run portfolio review</SubmitButton>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            ETF exposure last run: {formatDateTime(latestEtfExposureLog?.completedAt ?? latestEtfExposureLog?.startedAt)}
            {latestEtfExposureLog ? ` - ${latestEtfExposureLog.status} (${latestEtfExposureLog.etfsRefreshed}/${latestEtfExposureLog.etfsRequested} ETFs)` : ""}
          </p>
        </div>
        }
      />

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
            <SectionCard title="Geography Review" section={report.geographyReview} />
          </div>

          {lookthroughReport(report) ? (
            <section className="space-y-4">
              <SectionHeader
                title="ETF Look-Through Exposure"
                description="Provider ETF allocations are used where cached; direct instrument taxonomy is used as fallback."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ExposureTable title="Look-Through Sector Exposure" description="Actual sector exposure after decomposing equity ETFs." rows={lookthroughReport(report)?.sectorExposures ?? []} />
                <ExposureTable title="Look-Through Country Exposure" description="Country exposure from ETF allocations and direct holdings." rows={lookthroughReport(report)?.countryExposures ?? []} />
                <HoldingExposureTable rows={lookthroughReport(report)?.holdingExposures ?? []} />
                <IndirectHoldingExposureTable rows={lookthroughReport(report)?.holdingExposures ?? []} />
                <ExposureTable
                  title="Look-Through Theme Signals"
                  description="Canonical themes derived from ETF sectors and instrument taxonomy."
                  rows={lookthroughReport(report)?.themeExposures ?? []}
                  mode="overlap"
                />
              </div>
            </section>
          ) : null}

          <Suggestions suggestions={report.portfolioImprovementSuggestions} />
          <Actions actions={report.potentialActions} />

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Data Limitations</CardTitle>
                <CardDescription>Limitations are carried forward for QA and later assistant workflows.</CardDescription>
              </CardHeader>
              <CardContent>
                {(report.dataLimitations ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No material data limitation recorded.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(report.dataLimitations ?? []).map((item) => <li key={item}>- {item}</li>)}
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
    </PageContainer>
  );
}
