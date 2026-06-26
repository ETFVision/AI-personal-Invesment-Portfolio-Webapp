import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Briefcase, CheckCircle2, CircleDollarSign, ExternalLink, PiggyBank, Wallet } from "lucide-react";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import {
  AllocationDonutPanel,
  CurrencyExposurePanel,
  WinnersLosersPanel
} from "@/components/portfolio/analytics-panels";
import { PerformancePanel } from "@/components/portfolio/performance-panel";
import { HorizontalExposureBars } from "@/components/ui/charts";
import { cn, formatAssetTypeLabel, formatCurrency, formatPercent } from "@/lib/utils";
import type { AllocationItem, BenchmarkComparison, PortfolioDashboard, PortfolioPerformanceSummary } from "@/domain/portfolio/types";
import type { PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";
import { consolidatePortfolioLookthroughExposures } from "@/domain/etfLookthrough/exposureNormalization";
import type { PortfolioReviewReport, PortfolioReviewSection } from "@/domain/portfolioReview/types";

type PortfolioPageProps = {
  searchParams?: Promise<{
    priceMessage?: string;
    priceError?: string;
    benchmarkMessage?: string;
    benchmarkError?: string;
    refreshMessage?: string;
    refreshError?: string;
  }>;
};

type PerformanceDashboard = {
  portfolio: Pick<PortfolioDashboard["portfolio"], "baseCurrency">;
  performance: PortfolioPerformanceSummary["performance"];
  benchmarkComparisons: PortfolioPerformanceSummary["benchmarkComparisons"];
  latestPriceDate?: string | null;
};

function lookthroughReportFromSnapshot(value: unknown): PortfolioLookthroughReport | null {
  if (!value || typeof value !== "object") return null;
  const typed = value as PortfolioLookthroughReport;
  if (!Array.isArray(typed.sectorExposures) || !Array.isArray(typed.countryExposures)) return null;
  return {
    ...typed,
    sectorExposures: consolidatePortfolioLookthroughExposures(typed.sectorExposures),
    countryExposures: consolidatePortfolioLookthroughExposures(typed.countryExposures),
    currencyExposures: consolidatePortfolioLookthroughExposures(typed.currencyExposures ?? []),
    themeExposures: consolidatePortfolioLookthroughExposures(typed.themeExposures ?? []),
    topHoldingExposures: consolidatePortfolioLookthroughExposures(typed.topHoldingExposures ?? []),
    holdingExposures: typed.holdingExposures ?? []
  };
}

function allocationFromLookthrough(rows: PortfolioLookthroughReport["sectorExposures"]): AllocationItem[] {
  return rows.map((row) => ({
    label: row.exposureName,
    value: row.exposureWeight,
    percent: row.exposureWeight
  }));
}

function DashboardCard({
  children,
  className,
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Card id={id} className={cn("h-full rounded-lg border border-border/60 bg-card p-4 shadow-sm", className)}>
      {children}
    </Card>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <DashboardCard>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Loading stored analytics...</p>
        </div>
        <div className="h-24 rounded-lg border border-dashed bg-muted/40" />
      </div>
    </DashboardCard>
  );
}

function performanceDashboardFromSummary(portfolio: PortfolioDashboard["portfolio"], summary: PortfolioPerformanceSummary): PerformanceDashboard {
  return {
    portfolio,
    performance: summary.performance,
    benchmarkComparisons: summary.benchmarkComparisons,
    latestPriceDate: summary.latestPriceDate
  };
}

function scoreBand(score: number | null | undefined) {
  if (score == null) {
    return {
      label: "Not reviewed",
      textClass: "text-muted-foreground",
      bgClass: "bg-muted",
      stroke: "stroke-muted-foreground",
      badgeClass: "border-border bg-muted text-muted-foreground"
    };
  }
  if (score >= 75) {
    return {
      label: "Good",
      textClass: "text-emerald-700 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
      stroke: "stroke-emerald-600",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
    };
  }
  if (score >= 55) {
    return {
      label: "Moderate",
      textClass: "text-amber-700 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/30",
      stroke: "stroke-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
    };
  }
  return {
    label: "Watch",
    textClass: "text-red-700 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    stroke: "stroke-red-600",
    badgeClass: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
  };
}

function scoreText(score: number | null | undefined) {
  return score == null ? "-" : `${Math.round(score)}/100`;
}

function HealthGauge({ score }: { score: number | null | undefined }) {
  const band = scoreBand(score);
  const value = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div className="relative mx-auto h-28 w-48">
      <svg viewBox="0 0 160 92" className="h-full w-full" role="img" aria-label="Portfolio health gauge">
        <path d="M 20 76 A 60 60 0 0 1 140 76" fill="none" className="stroke-muted" strokeWidth="14" strokeLinecap="round" pathLength={100} />
        <path
          d="M 20 76 A 60 60 0 0 1 140 76"
          fill="none"
          className={band.stroke}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value} 100`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-3xl font-semibold tabular-nums text-foreground">{scoreText(score)}</div>
        <div className={cn("text-xs font-semibold uppercase tracking-wide", band.textClass)}>{band.label}</div>
      </div>
    </div>
  );
}

function SubRating({ label, section }: { label: string; section: PortfolioReviewSection | undefined }) {
  const band = scoreBand(section?.score);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums", band.badgeClass)}>
        {scoreText(section?.score)}
      </span>
    </div>
  );
}

function PortfolioHealthCard({ review }: { review: PortfolioReviewReport | null }) {
  const band = scoreBand(review?.overallPortfolioScore);
  return (
    <DashboardCard>
      <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:w-[26rem] lg:shrink-0">
          <HealthGauge score={review?.overallPortfolioScore} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Portfolio health</p>
            <div className="mt-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", band.badgeClass)}>{band.label}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Latest deterministic review across allocation, concentration, diversification and risk.</p>
          </div>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-4">
          <SubRating label="Diversification" section={review?.diversificationReview} />
          <SubRating label="Concentration" section={review?.concentrationReview} />
          <SubRating label="Risk" section={review?.riskReview} />
          <SubRating label="Allocation" section={review?.allocationReview} />
        </div>
      </div>
    </DashboardCard>
  );
}

function formatMaybeCurrency(value: number | null | undefined, currency: string | undefined) {
  if (value == null) return "-";
  return currency ? formatCurrency(value, currency) : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function ValueCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default"
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warning";
}) {
  const iconClass = tone === "positive" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : tone === "warning" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "bg-primary/10 text-primary";
  return (
    <DashboardCard>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <span className={cn("rounded-lg p-2", iconClass)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <div>
          <div className="text-4xl font-semibold tabular-nums text-foreground">{value}</div>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </DashboardCard>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral"
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "danger";
}) {
  const valueClass = tone === "positive" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <DashboardCard>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <div className={cn("text-3xl font-semibold tabular-nums", valueClass)}>{value}</div>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </DashboardCard>
  );
}

function pickBenchmarkComparison(summary: PortfolioPerformanceSummary | null | undefined) {
  return summary?.benchmarkComparisons.find((comparison) => comparison.benchmark.benchmarkKey === "sixty_forty") ?? null;
}

function rebaseReturn(current: number, baseline: number) {
  const denominator = 1 + baseline;
  return denominator === 0 ? 0 : (1 + current) / denominator - 1;
}

function formatPeriodLabel(points: BenchmarkComparison["points"]) {
  if (points.length < 2) return "available period";
  return `${points[0].snapshotDate} to ${points[points.length - 1].snapshotDate}`;
}

function PortfolioBanner({
  summary,
  review
}: {
  summary: PortfolioPerformanceSummary | null;
  review: PortfolioReviewReport | null;
}) {
  const comparison = pickBenchmarkComparison(summary);
  const points = comparison?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];
  const delta = first && last
    ? rebaseReturn(last.portfolioReturn, first.portfolioReturn) - rebaseReturn(last.benchmarkReturn, first.benchmarkReturn)
    : null;
  const watchCount = review?.watchAreas.length ?? 0;
  const isPositive = (delta ?? 0) >= 0;

  return (
    <DashboardCard className={cn("border-l-4", isPositive ? "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-l-muted-foreground/50 bg-muted/40")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          Portfolio return vs 60/40 benchmark:{" "}
          <span className={cn("font-semibold tabular-nums", delta == null ? "text-muted-foreground" : delta < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
            {delta == null ? "-" : formatPercent(delta)}
          </span>{" "}
          ({formatPeriodLabel(points)}) · {watchCount} watch area{watchCount === 1 ? "" : "s"} flagged · not investment advice.
        </p>
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/portfolio-review">
          Open review <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </DashboardCard>
  );
}

async function PortfolioPerformanceSection({
  dashboard: summaryDashboard,
  initialSummary
}: {
  dashboard: PortfolioDashboard;
  initialSummary: PortfolioPerformanceSummary | null;
}) {
  const container = createContainer();
  const summary = initialSummary ?? await measureRenderStep(`portfolio:${summaryDashboard.portfolio.id}:performance-summary-data`, () =>
    container.portfolioService.getPerformanceSummary(summaryDashboard.portfolio.id)
  );
  const performanceDashboard = summary
    ? performanceDashboardFromSummary(summaryDashboard.portfolio, summary)
    : await measureRenderStep(`portfolio:${summaryDashboard.portfolio.id}:performance-history-data`, async () => {
        const liveDashboard = await container.portfolioService.getDashboard(summaryDashboard.portfolio.id);
        await container.portfolioService.savePerformanceSummaryFromDashboard(summaryDashboard.portfolio.id, liveDashboard);
        return { ...liveDashboard, latestPriceDate: liveDashboard.latestPriceDate };
      });

  return (
    <DashboardCard id="performance" className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance command center</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cumulative time-weighted return (TWR, incl. cash) vs key benchmarks · differs from cost-based unrealised G/L%.
          </p>
        </div>
      </div>
      {summary?.status === "stale" || summary?.status === "failed" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Performance summary is {summary.status}; showing last stored summary.
        </div>
      ) : null}
      <PerformancePanel dashboard={performanceDashboard} />
    </DashboardCard>
  );
}

function ExposurePanel({
  title,
  description,
  items,
  emptyText,
  formatter = (label) => label,
  minPercent
}: {
  title: string;
  description: string;
  items: AllocationItem[];
  emptyText: string;
  formatter?: (label: string) => string;
  minPercent?: number;
}) {
  return (
    <DashboardCard>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <HorizontalExposureBars
        maxItems={8}
        minPercent={minPercent}
        emptyText={emptyText}
        items={items.map((item) => ({
          label: formatter(item.label),
          value: item.percent,
          valueLabel: formatPercent(item.percent)
        }))}
      />
    </DashboardCard>
  );
}

function PortfolioAllocationSections({
  dashboard,
  latestPortfolioReview
}: {
  dashboard: PortfolioDashboard;
  latestPortfolioReview: PortfolioReviewReport | null;
}) {
  const lookthroughReport = lookthroughReportFromSnapshot(latestPortfolioReview?.inputsSnapshot?.lookthroughExposure);
  const sectorAllocation = lookthroughReport?.sectorExposures.length
    ? allocationFromLookthrough(lookthroughReport.sectorExposures)
    : dashboard.allocationBySector;
  const geographyAllocation = lookthroughReport?.countryExposures.length
    ? allocationFromLookthrough(lookthroughReport.countryExposures)
    : dashboard.allocationByGeography;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocation & exposure</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Composition</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Portfolio composition with ETF look-through exposure when the latest review has cached provider data.
        </p>
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <DashboardCard>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset class</p>
            <p className="mt-1 text-sm text-muted-foreground">Latest allocation by holding type.</p>
          </div>
          <AllocationDonutPanel title="Asset class" items={dashboard.allocationByType} labelFormatter={formatAssetTypeLabel} />
        </DashboardCard>
        <DashboardCard>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sector</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lookthroughReport ? "ETF look-through sector exposure from the latest Portfolio Review." : "Direct sector metadata; run Portfolio Review for ETF look-through exposure."}
            </p>
          </div>
          <AllocationDonutPanel title="Sector allocation" items={sectorAllocation} />
        </DashboardCard>
        <DashboardCard>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</p>
            <p className="mt-1 text-sm text-muted-foreground">Native currency exposure before FX conversion is added.</p>
          </div>
          <CurrencyExposurePanel dashboard={dashboard} />
        </DashboardCard>
        <ExposurePanel
          title="Geography"
          description={lookthroughReport ? "ETF look-through country exposure from the latest Portfolio Review." : "Direct geography metadata; run Portfolio Review for ETF look-through exposure."}
          items={geographyAllocation}
          emptyText="No geography exposure available."
          minPercent={0.004}
        />
      </div>
    </section>
  );
}

function WatchAreasCard({ review }: { review: PortfolioReviewReport | null }) {
  const top = review?.watchAreas[0];
  const count = review?.watchAreas.length ?? 0;
  return (
    <DashboardCard className="lg:col-span-1">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch areas</p>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{count}</span>
          </div>
          {top ? (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">{top.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{top.detail}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No watch areas in the latest stored review.</p>
          )}
        </div>
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href="/portfolio-review">
          Open review <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </DashboardCard>
  );
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const resolvedSearchParams = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        description="Create your base portfolio before adding cash, holdings, and transactions."
        action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/setup">Start setup</Link>}
      />
    );
  }

  const [dashboard, latestPortfolioReview, performanceSummary] = await measureRenderStep(`portfolio:${portfolio.id}:summary-top-cards-data`, () =>
    Promise.all([
      container.portfolioService.getCachedDashboardSummary(portfolio.id),
      container.portfolioReviewRepository.getLatestReport(portfolio.id),
      container.portfolioService.getPerformanceSummary(portfolio.id)
    ])
  );
  const cashCurrencies = new Set(dashboard.cashBalances.map((cash) => cash.currency));
  const holdingCurrencies = new Set(dashboard.holdingValuations.map((valuation) => valuation.valueCurrency));
  const allCurrencies = new Set([...cashCurrencies, ...holdingCurrencies]);
  const hasMixedOrNonBaseCurrency = allCurrencies.size > 1 || (allCurrencies.size === 1 && !allCurrencies.has(portfolio.baseCurrency));
  const displayCurrency = hasMixedOrNonBaseCurrency ? undefined : portfolio.baseCurrency;
  const distinctAssetClasses = new Set(dashboard.allocationByType.map((item) => item.label)).size;
  const coverage = latestPortfolioReview?.confidenceScore ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${portfolio.name}`}
        description="Executive overview of performance, allocation, review status and data freshness."
        meta={
          <>
            <StatusBadge tone={dashboard.latestPriceDate ? "positive" : "warning"}>
              Prices {dashboard.latestPriceDate ? `as of ${dashboard.latestPriceDate}` : "not refreshed"}
            </StatusBadge>
            <StatusBadge tone={latestPortfolioReview ? "info" : "neutral"}>
              Reviewed {latestPortfolioReview ? latestPortfolioReview.reviewDate : "not run"}
            </StatusBadge>
          </>
        }
        actions={
          <>
            <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/cash">Add cash</Link>
            <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/holdings">Add holding</Link>
          </>
        }
      />

      {resolvedSearchParams?.priceMessage || resolvedSearchParams?.benchmarkMessage || resolvedSearchParams?.refreshMessage ? (
        <DashboardCard>
          <div className="space-y-1 text-sm">
            {resolvedSearchParams.refreshMessage ? (
              <div className={resolvedSearchParams.refreshError ? "text-destructive" : "text-muted-foreground"}>
                {resolvedSearchParams.refreshError ?? resolvedSearchParams.refreshMessage}
              </div>
            ) : null}
            {resolvedSearchParams.priceMessage ? (
              <div className={resolvedSearchParams.priceError ? "text-destructive" : "text-muted-foreground"}>
                {resolvedSearchParams.priceError ?? resolvedSearchParams.priceMessage}
              </div>
            ) : null}
            {resolvedSearchParams.benchmarkMessage ? (
              <div className={resolvedSearchParams.benchmarkError ? "text-destructive" : "text-muted-foreground"}>
                {resolvedSearchParams.benchmarkError ?? resolvedSearchParams.benchmarkMessage}
              </div>
            ) : null}
          </div>
        </DashboardCard>
      ) : null}

      <section>
        <PortfolioHealthCard review={latestPortfolioReview} />
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-3">
        <ValueCard
          icon={Wallet}
          label="Total portfolio value"
          value={formatMaybeCurrency(dashboard.totalValueEstimate, displayCurrency)}
          detail={hasMixedOrNonBaseCurrency ? "Native-currency sum until FX conversion is added." : `Prices ${dashboard.latestPriceDate ? `as of ${dashboard.latestPriceDate}` : "not refreshed"}.`}
          tone="positive"
        />
        <ValueCard
          icon={PiggyBank}
          label="Cash"
          value={formatMaybeCurrency(dashboard.totalCash, displayCurrency)}
          detail={`${formatPercent(dashboard.cashPercent)} cash · ${formatPercent(dashboard.investedPercent)} invested`}
        />
        <ValueCard
          icon={Briefcase}
          label="Invested"
          value={formatMaybeCurrency(dashboard.totalHoldingsMarketValue, displayCurrency)}
          detail={`${formatPercent(dashboard.investedPercent)} invested · ${formatPercent(dashboard.cashPercent)} cash`}
        />
      </section>

      <PortfolioBanner summary={performanceSummary} review={latestPortfolioReview} />

      <section className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Unrealised G/L"
          value={formatMaybeCurrency(dashboard.unrealizedGainLoss, displayCurrency)}
          detail={formatPercent(dashboard.unrealizedGainLossPercent)}
          tone={dashboard.unrealizedGainLoss < 0 ? "danger" : dashboard.unrealizedGainLoss > 0 ? "positive" : "neutral"}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Realised G/L"
          value={formatMaybeCurrency(dashboard.realizedGainLoss, displayCurrency)}
          detail="From sell transactions where available"
          tone={dashboard.realizedGainLoss < 0 ? "danger" : dashboard.realizedGainLoss > 0 ? "positive" : "neutral"}
        />
        <StatCard
          icon={Briefcase}
          label="Holdings"
          value={`${dashboard.holdings.length}`}
          detail={`${dashboard.holdings.length} positions · across ${distinctAssetClasses} asset class${distinctAssetClasses === 1 ? "" : "es"}`}
        />
        <StatCard
          icon={coverage === 100 ? CheckCircle2 : AlertTriangle}
          label="Data coverage"
          value={coverage == null ? "-" : `${Math.round(coverage)}%`}
          detail={coverage === 100 ? "Review inputs complete" : "Latest review confidence"}
          tone={coverage === 100 ? "positive" : "neutral"}
        />
      </section>

      {hasMixedOrNonBaseCurrency ? (
        <DashboardCard>
          <p className="text-sm text-muted-foreground">
            Portfolio base currency is {portfolio.baseCurrency}, but your current cash/holding entries use{" "}
            {Array.from(allCurrencies).join(", ")}. This dashboard preserves native currencies and does not convert FX yet, so totals are shown as unconverted estimates.
          </p>
        </DashboardCard>
      ) : null}

      <Suspense fallback={<LoadingCard title="Performance" />}>
        <PortfolioPerformanceSection dashboard={dashboard} initialSummary={performanceSummary} />
      </Suspense>

      <PortfolioAllocationSections dashboard={dashboard} latestPortfolioReview={latestPortfolioReview} />

      <section className="grid items-stretch gap-4 lg:grid-cols-3">
        <DashboardCard className="lg:col-span-2">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top movers</p>
            <p className="mt-1 text-sm text-muted-foreground">Unrealised movement from average cost using refreshed prices.</p>
          </div>
          <WinnersLosersPanel dashboard={dashboard} />
        </DashboardCard>
        <WatchAreasCard review={latestPortfolioReview} />
      </section>

      <DashboardCard>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Portfolio analytics are deterministic classifications for informational purposes only, not investment advice. Past performance is not indicative of future results.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="text-primary hover:underline" href="/methodology">Methodology</Link>
            <Link className="text-primary hover:underline" href="/legal/disclosures">Legal</Link>
            <Link className="text-primary hover:underline" href="/legal/disclosures#full-disclaimer">Full disclaimer</Link>
          </div>
        </div>
      </DashboardCard>
    </PageContainer>
  );
}
