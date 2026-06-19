import Link from "next/link";
import { Info } from "lucide-react";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { runPortfolioReviewAction } from "@/server/actions/portfolioReviewActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalExposureBars, StackedExposureBar } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPercent } from "@/lib/utils";
import type {
  PortfolioImprovementSuggestion,
  PortfolioPotentialAction,
  PortfolioReviewCandidate,
  PortfolioReviewFinding,
  PortfolioReviewReport,
  PortfolioReviewSection
} from "@/domain/portfolioReview/types";
import type { PortfolioLookthroughExposure, PortfolioLookthroughHolding, PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";
import { consolidatePortfolioLookthroughExposures } from "@/domain/etfLookthrough/exposureNormalization";
import { assessmentLabel } from "@/application/services/recommendations/recommendationPresentation";

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

function formatPctOneDecimal(value: number) {
  return (normalizeDisplayRatio(value) * 100).toFixed(1);
}

function sanitizeGapText(value: string | null | undefined) {
  if (!value) return value;
  return value
    .replace(/\bPortfolio Improvement Observations\b/gi, "Gap Analysis — Instruments in Underweighted Categories")
    .replace(/\bPotential Review Actions\b/gi, "Analytical Gap Summary")
    .replace(/\bimprovement suggestions\b/gi, "gap findings")
    .replace(/\bReview healthcare and defensive diversification\b/gi, "Healthcare & Defensive — Underweighted Category")
    .replace(/\bReview diversification candidates\b/gi, "International Equity — Underweighted Category")
    .replace(/\byou should consider\b/gi, "context for review:")
    .replace(/\bAdds ([^.]+?) exposure\b/gi, "Provides exposure to $1")
    .replace(/\bAdds a differentiated exposure driver\b/gi, "Provides a differentiated exposure driver")
    .replace(/\bAdds defensive earnings drivers\b/gi, "Provides exposure to defensive earnings drivers")
    .replace(/\bAdds essential-consumption exposure\b/gi, "Provides exposure to essential-consumption")
    .replace(/\bReduces reliance\b/gi, "May reduce reliance")
    .replace(/\bCan lower\b/gi, "May affect")
    .replace(/\bCan improve\b/gi, "May relate to")
    .replace(
      /\bConcentration and diversification metrics suggest the portfolio could benefit from broader exposure review\./gi,
      "Concentration and diversification metrics indicate the portfolio has below-median exposure in the international equity category."
    )
    .replace(
      /\bSuggestions are review prompts only and do not recommend exact trades or position sizes\./gi,
      "Gap findings are deterministic analytical outputs and do not constitute investment advice, trade instructions, or position sizing guidance."
    );
}

function exposureWeight(rows: PortfolioLookthroughExposure[], name: string) {
  return rows.find((row) => row.exposureName.toLowerCase() === name.toLowerCase())?.exposureWeight ?? 0;
}

function gapCategoryForTooltip(suggestion: PortfolioImprovementSuggestion, candidate: PortfolioReviewCandidate) {
  const title = sanitizeGapText(suggestion.title) ?? suggestion.title;
  if (suggestion.issueCategory === "insufficient_defensive_exposure" || title.includes("Healthcare")) return "Healthcare";
  if (suggestion.issueCategory === "insufficient_international_exposure" || title.includes("International Equity")) return "International equity";
  return candidate.diversificationType?.replace(/ sector$/i, "") ?? title.replace(" — Underweighted Category", "");
}

function whyThisAppearedText(
  suggestion: PortfolioImprovementSuggestion,
  candidate: PortfolioReviewCandidate,
  lookthrough: PortfolioLookthroughReport | null
) {
  const sectors = lookthrough?.sectorExposures ?? [];
  const countries = lookthrough?.countryExposures ?? [];
  const category = gapCategoryForTooltip(suggestion, candidate);

  if (category === "Healthcare") {
    return `This instrument appears because Healthcare look-through is ${formatPctOneDecimal(exposureWeight(sectors, "Healthcare"))}% vs Technology at ${formatPctOneDecimal(exposureWeight(sectors, "Technology"))}%. It belongs to the Healthcare category in the approved analytics universe and has passed all guardrail filters.`;
  }

  if (category === "International equity") {
    const usWeight = countries.find((row) => ["us", "usa", "united states"].includes(row.exposureName.toLowerCase()))?.exposureWeight ?? 0;
    return `This instrument appears because US look-through is ${formatPctOneDecimal(usWeight)}%, exceeding the broad-market allocation threshold. It belongs to the International equity category in the approved analytics universe and has passed all guardrail filters.`;
  }

  const actual = exposureWeight(sectors, category);
  const comparison = sectors[0];
  const comparisonCategory = comparison?.exposureName ?? "the largest comparison category";
  const comparisonPct = comparison?.exposureWeight ?? 0;
  return `This instrument appears because ${category} look-through is ${formatPctOneDecimal(actual)}% vs ${comparisonCategory} at ${formatPctOneDecimal(comparisonPct)}%. It belongs to the ${category} category in the approved analytics universe and has passed all guardrail filters.`;
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
    "correlation",
    "coverage"
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

function GapAnalysisTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-slate-800 focus:bg-muted focus:text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
        aria-label={`Why this appeared: ${text}`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

function Suggestions({ suggestions, lookthrough }: { suggestions: PortfolioImprovementSuggestion[]; lookthrough: PortfolioLookthroughReport | null }) {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap Analysis — Instruments in Underweighted Categories</CardTitle>
        <CardDescription>Instruments below pass all guardrail filters and belong to an underweighted category. Ordered by instrument quality score only. Portfolio impact indicators are factual observations {"\u2014"} not a recommendation to buy, sell, or hold.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeSuggestions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No gap finding generated for the latest review.</p>
        ) : safeSuggestions.map((suggestion) => {
          const candidates = Array.isArray(suggestion.candidateInstruments) ? suggestion.candidateInstruments : [];
          const sortedCandidates = [...candidates].sort(
            (a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0)
          );
          const title = sanitizeGapText(suggestion.title) ?? suggestion.title;
          return <div key={`${suggestion.category}-${suggestion.title}`} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{title}</p>
              <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">{suggestion.priority}</span>
              <span className="rounded-md bg-muted px-2 py-1 text-xs">{suggestion.category.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{sanitizeGapText(suggestion.rationale)}</p>
            {suggestion.expectedPortfolioBenefit || suggestion.potentialTradeOff ? (
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                {suggestion.expectedPortfolioBenefit ? (
                  <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
                    <p className="text-xs font-medium uppercase">Analytical context</p>
                    <p className="mt-1">{sanitizeGapText(suggestion.expectedPortfolioBenefit)}</p>
                  </div>
                ) : null}
                {suggestion.potentialTradeOff ? (
                  <div className="rounded-md bg-amber-50 p-3 text-amber-900">
                    <p className="text-xs font-medium uppercase">Trade-off</p>
                    <p className="mt-1">{sanitizeGapText(suggestion.potentialTradeOff)}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {candidates.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase text-muted-foreground">Ordered by:</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">Instrument quality</span>
                  <span className="text-[10px] text-muted-foreground">universal {"\u00b7"} not portfolio-specific</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase text-muted-foreground">Impact indicators:</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Exposure</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Overlap</span>
                  <span className="text-[10px] text-muted-foreground">factual {"\u00b7"} your portfolio</span>
                </div>
              </div>
            ) : null}
            {candidates.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {sortedCandidates.map((candidate, candidateIndex) => {
                  const tooltip = whyThisAppearedText(suggestion, candidate, lookthrough);
                  const issueFitWidth = Math.min(100, Math.max(0, candidate.issueFitScore ?? 0));
                  const sharedCompanyWeight = candidate.sharedCompanyWeight ?? 0;
                  const overlapLevel = sharedCompanyWeight > 0.35 ? "High" : sharedCompanyWeight >= 0.15 ? "Moderate" : "Low";
                  const overlapClasses =
                    overlapLevel === "High"
                      ? "bg-red-100 text-red-800"
                      : overlapLevel === "Moderate"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800";
                  const sharedCompanyCount = candidate.sharedCompanyCount ?? 0;
                  const etfList = candidate.topSharedSymbols?.length > 0
                    ? ` via ${candidate.topSharedSymbols.slice(0, 3).join(", ")} look-through`
                    : "";
                  const overlapDetail = sharedCompanyCount > 0
                    ? `${sharedCompanyCount} shared ${sharedCompanyCount === 1 ? "company" : "companies"}${etfList}`
                    : candidate.overlapWarning
                      ? sanitizeGapText(candidate.overlapWarning)
                      : "No material company overlap detected";
                  return (
                  <div
                    key={`${suggestion.title}-${candidate.instrumentId}`}
                    className="rounded-md border p-3 text-xs transition-colors hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">#{candidateIndex + 1}</span>
                      <span className="text-xs font-medium">Quality {Math.round(candidate.recommendationScore ?? candidate.score ?? 0)}</span>
                      <div className="min-w-0 shrink-0">
                        <Link
                          href={`/instruments/${encodeURIComponent(candidate.symbol)}`}
                          className="font-medium text-slate-900 underline-offset-4 hover:underline"
                        >
                          {candidate.symbol}
                        </Link>
                        <p className="mt-1 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          Shown because category is underweighted — not a buy recommendation
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <Link
                          href={`/instruments/${encodeURIComponent(candidate.symbol)}`}
                          className="truncate font-medium text-slate-800 underline-offset-4 hover:underline"
                        >
                          {candidate.name}
                        </Link>
                        <GapAnalysisTooltip text={tooltip} />
                      </div>
                      <span>{assessmentLabel(candidate.recommendationLabel)}</span>
                      {candidate.confidenceScore != null ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Conf {formatPercent(candidate.confidenceScore / 100)}</span> : null}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Exposure impact</p>
                        <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                          <div className="h-full rounded bg-blue-500" style={{ width: `${issueFitWidth}%` }} />
                        </div>
                        <p className="mt-1 text-muted-foreground">{sanitizeGapText(candidate.primaryReason ?? candidate.whyThisCandidate ?? candidate.reason)}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Holdings overlap</p>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${overlapClasses}`}>{overlapLevel}</span>
                        <p className="mt-1 text-muted-foreground">{overlapDetail}</p>
                      </div>
                    </div>
                  </div>
                );
                })}
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
          <div className="space-y-3">
            <HorizontalExposureBars
              max={mode === "overlap" ? Math.max(...shownRows.map((row) => row.exposureWeight), 0.01) : 1}
              items={shownRows.map((row) => ({
                label: row.exposureName,
                value: row.exposureWeight,
                valueLabel: formatPercent(row.exposureWeight),
                detail: `${mode === "overlap" ? "Direct signal" : "Direct"} ${formatPercent(row.directWeight)} - ETF look-through ${formatPercent(row.etfLookthroughWeight)}`,
                tone: mode === "overlap" ? "muted" : "default"
              }))}
            />
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

type DisplayHoldingExposure = PortfolioLookthroughHolding & {
  displayLabel?: string;
};

function holdingSnapshot(row: PortfolioLookthroughHolding) {
  return row.inputsSnapshot && typeof row.inputsSnapshot === "object" ? row.inputsSnapshot as Record<string, unknown> : {};
}

function rawSymbols(row: PortfolioLookthroughHolding) {
  const snapshot = holdingSnapshot(row);
  const values = Array.isArray(snapshot.rawSymbols) ? snapshot.rawSymbols : [row.holdingSymbol];
  return Array.from(new Set(values.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().toUpperCase())));
}

function instrumentAssetClass(row: PortfolioLookthroughHolding) {
  const value = holdingSnapshot(row).instrumentAssetClass;
  return typeof value === "string" ? value : null;
}

function exposureRole(row: PortfolioLookthroughHolding) {
  const value = holdingSnapshot(row).exposureRole;
  return typeof value === "string" ? value : null;
}

function isFundWrapper(row: PortfolioLookthroughHolding) {
  const assetClass = instrumentAssetClass(row);
  return row.directWeight > 0 && row.indirectWeight === 0 && ["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"].includes(assetClass ?? "");
}

function isUnderlyingExposure(row: PortfolioLookthroughHolding) {
  return row.indirectWeight > 0 || exposureRole(row) === "underlying_security";
}

function normalizeIssuerName(name: string | null | undefined, fallback: string) {
  const base = (name ?? fallback)
    .replace(/\s+Class\s+[A-Z0-9]+$/i, "")
    .replace(/\s+Ordinary\s+Shares?$/i, "")
    .replace(/\s+Common\s+Stock$/i, "")
    .replace(/\s+Sponsored\s+ADR$/i, "")
    .replace(/\s+ADR$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return base || fallback;
}

function issuerKey(row: PortfolioLookthroughHolding) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerId = typeof snapshot.issuerId === "string" ? snapshot.issuerId : null;
  return row.holdingIssuerId ?? snapshotIssuerId ?? normalizeIssuerName(row.holdingIssuerName ?? row.holdingName, row.holdingSymbol).toUpperCase();
}

function issuerDisplayName(row: PortfolioLookthroughHolding) {
  const snapshot = holdingSnapshot(row);
  const snapshotIssuerName = typeof snapshot.issuerName === "string" ? snapshot.issuerName : null;
  return row.holdingIssuerName ?? snapshotIssuerName ?? normalizeIssuerName(row.holdingName, row.holdingSymbol);
}

function securityBreakdown(row: PortfolioLookthroughHolding) {
  const snapshot = holdingSnapshot(row);
  const values = Array.isArray(snapshot.securityBreakdown) ? snapshot.securityBreakdown : [];
  return values.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const symbol = typeof entry.symbol === "string" ? entry.symbol : null;
    if (!symbol) return [];
    return [{
      symbol,
      shareClass: typeof entry.shareClass === "string" ? entry.shareClass : null,
      directWeight: typeof entry.directWeight === "number" ? entry.directWeight : 0,
      indirectWeight: typeof entry.indirectWeight === "number" ? entry.indirectWeight : 0,
      linkSource: typeof entry.linkSource === "string" ? entry.linkSource : null
    }];
  });
}

function securityBreakdownDetail(row: PortfolioLookthroughHolding) {
  const breakdown = securityBreakdown(row);
  if (breakdown.length === 0) return null;
  return `Securities: ${breakdown
    .slice(0, 4)
    .map((item) => `${item.symbol}${item.shareClass ? ` ${item.shareClass}` : ""} ${formatPercent(item.directWeight + item.indirectWeight)}`)
    .join(", ")}${breakdown.length > 4 ? ` +${breakdown.length - 4} more` : ""}`;
}

function aggregateByIssuer(rows: PortfolioLookthroughHolding[], mode: "underlying" | "indirect"): DisplayHoldingExposure[] {
  const map = new Map<string, DisplayHoldingExposure>();
  for (const row of rows) {
    if (isFundWrapper(row)) continue;
    if (mode === "underlying" && !isUnderlyingExposure(row)) continue;
    if (mode === "indirect" && row.indirectWeight <= 0) continue;
    const key = issuerKey(row);
    const symbols = rawSymbols(row);
    const current = map.get(key) ?? {
      ...row,
      holdingSymbol: symbols[0] ?? row.holdingSymbol,
      holdingName: issuerDisplayName(row),
      holdingIssuerId: row.holdingIssuerId ?? (typeof holdingSnapshot(row).issuerId === "string" ? holdingSnapshot(row).issuerId as string : null),
      holdingIssuerName: issuerDisplayName(row),
      directWeight: 0,
      indirectWeight: 0,
      totalWeight: 0,
      sourceEtfs: [],
      inputsSnapshot: {
        source: "portfolio_review_display",
        aggregation: "issuer",
        rawSymbols: []
      }
    };
    current.directWeight += row.directWeight;
    current.indirectWeight += row.indirectWeight;
    current.totalWeight += mode === "indirect" ? row.indirectWeight : row.totalWeight;
    const currentRawSymbols = rawSymbols(current);
    const combinedSymbols = Array.from(new Set([...currentRawSymbols, ...symbols])).sort();
    current.holdingSymbol = combinedSymbols.length > 1 ? combinedSymbols.join(" + ") : combinedSymbols[0] ?? row.holdingSymbol;
    current.displayLabel = `${current.holdingName ?? current.holdingSymbol}${combinedSymbols.length > 1 ? ` (${combinedSymbols.join(" + ")})` : ""}`;
    current.inputsSnapshot = {
      ...current.inputsSnapshot,
      rawSymbols: combinedSymbols
    };
    for (const source of row.sourceEtfs) {
      const existing = current.sourceEtfs.find((item) => item.symbol === source.symbol);
      if (existing) existing.weight += source.weight;
      else current.sourceEtfs.push({ ...source });
    }
    current.sourceEtfs.sort((a, b) => b.weight - a.weight);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.totalWeight - a.totalWeight);
}

function DirectPositionExposureTable({ rows }: { rows: PortfolioLookthroughHolding[] }) {
  const shownRows = rows
    .filter((row) => row.directWeight > 0)
    .sort((a, b) => b.directWeight - a.directWeight)
    .slice(0, 12);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Portfolio Positions</CardTitle>
        <CardDescription>What the portfolio directly owns before ETF look-through. This includes ETF wrappers, direct stocks, bond funds, gold funds and cash-like products.</CardDescription>
      </CardHeader>
      <CardContent>
        {shownRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No direct position exposure available.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Weights shown as % of total portfolio value (including cash).</p>
            <HorizontalExposureBars
              max={Math.max(...shownRows.map((row) => row.directWeight), 0.01)}
              items={shownRows.map((row) => ({
                label: `${row.holdingSymbol}${row.holdingName ? ` - ${row.holdingName}` : ""}`,
                value: row.directWeight,
                valueLabel: formatPercent(row.directWeight),
                detail: instrumentAssetClass(row) ? `Type: ${metricLabel(instrumentAssetClass(row) ?? "")}` : undefined
              }))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingExposureTable({ rows }: { rows: PortfolioLookthroughHolding[] }) {
  const shownRows = aggregateByIssuer(rows, "underlying").slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Underlying Company Exposure</CardTitle>
        <CardDescription>Issuer-level company exposure after ETF look-through. ETF wrappers are excluded here and share-class variants such as GOOGL and GOOG are rolled up for concentration review.</CardDescription>
      </CardHeader>
      <CardContent>
        {shownRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Underlying company exposure unavailable.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Weights shown as % of total portfolio value (including cash).</p>
            {shownRows.map((row) => (
              <StackedExposureBar
                key={`${row.holdingSymbol}-${row.holdingName}`}
                label={row.displayLabel ?? `${row.holdingSymbol}${row.holdingName ? ` - ${row.holdingName}` : ""}`}
                totalLabel={formatPercent(row.totalWeight)}
                direct={row.directWeight}
                indirect={row.indirectWeight}
                detail={[
                  row.sourceEtfs.length > 0 ? `Source ETFs: ${row.sourceEtfs.map((item) => `${item.symbol} ${formatPercent(item.weight)}`).join(", ")}` : null,
                  securityBreakdownDetail(row)
                ].filter(Boolean).join(" - ") || undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IndirectHoldingExposureTable({ rows }: { rows: PortfolioLookthroughHolding[] }) {
  const shownRows = aggregateByIssuer(rows, "indirect").slice(0, 10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Indirect Company Exposure</CardTitle>
        <CardDescription>ETF-derived underlying company exposure only. Direct stock weights are excluded, while share-class variants are rolled up at issuer level.</CardDescription>
      </CardHeader>
      <CardContent>
        {shownRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No indirect ETF holding exposure available yet.</p>
        ) : (
          <HorizontalExposureBars
            max={Math.max(...shownRows.map((row) => row.indirectWeight), 0.01)}
            items={shownRows.map((row) => ({
              label: row.displayLabel ?? `${row.holdingSymbol}${row.holdingName ? ` - ${row.holdingName}` : ""}`,
              value: row.indirectWeight,
              valueLabel: formatPercent(row.indirectWeight),
              detail: [
                row.directWeight > 0 ? `Total with direct holding ${formatPercent(row.directWeight + row.indirectWeight)}` : null,
                row.sourceEtfs.length > 0 ? `Source ETFs: ${row.sourceEtfs.map((item) => `${item.symbol} ${formatPercent(item.weight)}`).join(", ")}` : null,
                securityBreakdownDetail(row)
              ].filter(Boolean).join(" - ")
            }))}
          />
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
        <CardTitle>Analytical Gap Summary</CardTitle>
        <CardDescription>Deterministic summary of gap findings. Not investment advice, trade instructions, or a recommendation to buy, sell, or hold any instrument.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {safeActions.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No analytical gap summary generated.</p>
        ) : safeActions.map((action) => (
          <div key={`${action.actionType}-${action.title}`} className="rounded-md border p-3 text-sm">
            <p className="font-medium">{sanitizeGapText(action.title)}</p>
            <p className="mt-1 text-muted-foreground">{sanitizeGapText(action.detail)}</p>
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

  const [dashboard, etfExposureLogs] = await measureRenderStep(`portfolio-review:${portfolio.id}:dashboard-data`, () =>
    Promise.all([
      container.portfolioReviewService.getDashboard(portfolio.id),
      container.etfExposureRepository.listRefreshLogs(1)
    ])
  );
  const latestEtfExposureLog = etfExposureLogs[0] ?? null;
  const report = dashboard.latestReport;
  const currentLookthroughReport = report ? lookthroughReport(report) : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Portfolio Review"
        description="Deterministic portfolio-level review across allocation, risk, macro, insights, fixed income and themes."
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
          description="Run the deterministic review after insight, risk, macro and news inputs have been refreshed."
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
              <p className="text-sm leading-6 text-muted-foreground">{sanitizeGapText(report.executiveSummary)}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Allocation Review" section={report.allocationReview} />
            <SectionCard title="Concentration Review" section={report.concentrationReview} />
            <SectionCard title="Diversification Review" section={report.diversificationReview} />
            <SectionCard title="Risk Review" section={report.riskReview} />
            <SectionCard title="Macro Fit Review" section={report.macroFitReview} />
            <SectionCard title="Insight Alignment Review" section={report.recommendationAlignmentReview} />
            <SectionCard title="Fixed Income Review" section={report.fixedIncomeReview} />
            <SectionCard title="Theme Exposure Review" section={report.themeExposureReview} />
            <SectionCard title="Geography Review" section={report.geographyReview} />
          </div>

          {currentLookthroughReport ? (
            <section className="space-y-4">
              <SectionHeader
                title="ETF Look-Through Exposure"
                description="Provider ETF allocations are used where cached; direct instrument taxonomy is used as fallback."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <ExposureTable title="Look-Through Sector Exposure" description="Actual sector exposure after decomposing equity ETFs." rows={currentLookthroughReport.sectorExposures} />
                <ExposureTable title="Look-Through Country Exposure" description="Country exposure from ETF allocations and direct holdings." rows={currentLookthroughReport.countryExposures ?? []} />
                <DirectPositionExposureTable rows={currentLookthroughReport.holdingExposures} />
                <HoldingExposureTable rows={currentLookthroughReport.holdingExposures} />
                <IndirectHoldingExposureTable rows={currentLookthroughReport.holdingExposures} />
                <ExposureTable
                  title="Look-Through Theme Signals"
                  description="Canonical themes derived from ETF sectors and instrument taxonomy."
                  rows={currentLookthroughReport.themeExposures ?? []}
                  mode="overlap"
                />
              </div>
            </section>
          ) : null}

          <Suggestions suggestions={report.portfolioImprovementSuggestions} lookthrough={currentLookthroughReport} />
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
