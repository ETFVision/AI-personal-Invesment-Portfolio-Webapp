import Link from "next/link";
import { Suspense } from "react";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import {
  AllocationDonutPanel,
  AllocationPanel,
  CashInvestedPanel,
  CurrencyExposurePanel,
  PerformancePanel,
  WinnersLosersPanel
} from "@/components/portfolio/analytics-panels";
import { formatAssetTypeLabel, formatCurrency, formatPercent } from "@/lib/utils";
import type { AllocationItem, PortfolioDashboard } from "@/domain/portfolio/types";
import type { PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";
import { consolidatePortfolioLookthroughExposures } from "@/domain/etfLookthrough/exposureNormalization";
import type { PortfolioReviewSummary } from "@/application/ports/repositories/PortfolioReviewRepository";

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

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Loading stored analytics...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-24 rounded-xl border border-dashed bg-slate-50" />
      </CardContent>
    </Card>
  );
}

async function PortfolioPerformanceSection({
  portfolioId
}: {
  portfolioId: string;
}) {
  const container = createContainer();
  const dashboard = await measureRenderStep(`portfolio:${portfolioId}:performance-history-data`, () =>
    container.portfolioService.getDashboard(portfolioId)
  );

  return (
    <>
      <SectionHeader
        title="Performance Command Center"
        description="Portfolio return and benchmark comparison panels using stored historical snapshots."
      />
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            Time-weighted returns from stored snapshots. Deposits and withdrawals are excluded from gains where transaction history supports it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformancePanel dashboard={dashboard} />
        </CardContent>
      </Card>
    </>
  );
}

function PortfolioAllocationSections({
  dashboard,
  latestPortfolioReview
}: {
  dashboard: PortfolioDashboard;
  latestPortfolioReview: PortfolioReviewSummary | null;
}) {
  const lookthroughReport = lookthroughReportFromSnapshot(latestPortfolioReview?.inputsSnapshot?.lookthroughExposure);
  const sectorAllocation = lookthroughReport?.sectorExposures.length
    ? allocationFromLookthrough(lookthroughReport.sectorExposures)
    : dashboard.allocationBySector;
  const geographyAllocation = lookthroughReport?.countryExposures.length
    ? allocationFromLookthrough(lookthroughReport.countryExposures)
    : dashboard.allocationByGeography;

  return (
    <>
      <SectionHeader
        title="Allocation & Exposure"
        description="Portfolio composition with ETF look-through exposure when the latest review has cached provider data."
      />
      <Card id="allocation">
        <CardHeader>
          <CardTitle>Allocation by asset type</CardTitle>
          <CardDescription>Uses latest stored prices when available, with cost basis as fallback.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <AllocationDonutPanel
              title="Asset allocation"
              items={dashboard.allocationByType}
              labelFormatter={formatAssetTypeLabel}
            />
            <AllocationPanel dashboard={dashboard} />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Currency exposure</CardTitle>
            <CardDescription>Native currency exposure before FX conversion is added.</CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencyExposurePanel dashboard={dashboard} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sector allocation</CardTitle>
            <CardDescription>
              {lookthroughReport ? "ETF look-through sector exposure from the latest Portfolio Review." : "Direct sector metadata; run Portfolio Review for ETF look-through exposure."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonutPanel title="Sector allocation" items={sectorAllocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Geography allocation</CardTitle>
            <CardDescription>
              {lookthroughReport ? "ETF look-through country exposure from the latest Portfolio Review." : "Direct geography metadata; run Portfolio Review for ETF look-through exposure."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationDonutPanel title="Geography allocation" items={geographyAllocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top winners/losers</CardTitle>
            <CardDescription>Unrealised movement from average cost using refreshed prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <WinnersLosersPanel dashboard={dashboard} />
          </CardContent>
        </Card>
      </section>
    </>
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

  const [dashboard, latestPortfolioReview] = await measureRenderStep(`portfolio:${portfolio.id}:summary-top-cards-data`, () =>
    Promise.all([
      container.portfolioService.getDashboardSummary(portfolio.id),
      container.portfolioReviewRepository.getLatestReportSummary(portfolio.id)
    ])
  );
  const cashCurrencies = new Set(dashboard.cashBalances.map((cash) => cash.currency));
  const holdingCurrencies = new Set(dashboard.holdingValuations.map((valuation) => valuation.valueCurrency));
  const allCurrencies = new Set([...cashCurrencies, ...holdingCurrencies]);
  const hasMixedOrNonBaseCurrency = allCurrencies.size > 1 || (allCurrencies.size === 1 && !allCurrencies.has(portfolio.baseCurrency));
  const displayCurrency = hasMixedOrNonBaseCurrency ? undefined : portfolio.baseCurrency;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dashboard"
        title={portfolio.name}
        description="Executive view of portfolio value, performance, allocation, review status and data freshness."
        meta={
          <>
            <StatusBadge tone={dashboard.latestPriceDate ? "positive" : "warning"}>
              Prices {dashboard.latestPriceDate ? `as of ${dashboard.latestPriceDate}` : "not refreshed"}
            </StatusBadge>
            <StatusBadge tone={latestPortfolioReview ? "info" : "neutral"}>
              Review {latestPortfolioReview ? latestPortfolioReview.reviewDate : "not run"}
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
        <Card>
          <CardContent className="p-4 text-sm">
            <div className="space-y-1">
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
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total portfolio value"
          description={
            hasMixedOrNonBaseCurrency
              ? "Native-currency sum shown until FX conversion is added."
              : dashboard.latestPriceDate
                ? `Cash plus latest stored prices as of ${dashboard.latestPriceDate}.`
                : "Cash plus holding cost basis until prices are refreshed."
          }
          value={displayCurrency ? formatCurrency(dashboard.totalValueEstimate, displayCurrency) : dashboard.totalValueEstimate.toLocaleString("en-US")}
        />
        <MetricCard
          title="Cash"
          description="Available balances entered manually."
          value={displayCurrency ? formatCurrency(dashboard.totalCash, displayCurrency) : dashboard.totalCash.toLocaleString("en-US")}
        />
        <MetricCard
          title="Holdings"
          description={
            dashboard.latestPriceDate
              ? `${dashboard.holdings.length} positions valued from latest stored prices where available.`
              : `${dashboard.holdings.length} current manual positions.`
          }
          value={displayCurrency ? formatCurrency(dashboard.totalHoldingsMarketValue, displayCurrency) : dashboard.totalHoldingsMarketValue.toLocaleString("en-US")}
        />
        <MetricCard
          title="Portfolio review"
          description="Latest deterministic portfolio health readout."
          tone={latestPortfolioReview?.overallPortfolioScore == null ? "neutral" : latestPortfolioReview.overallPortfolioScore >= 75 ? "positive" : latestPortfolioReview.overallPortfolioScore >= 55 ? "info" : "warning"}
          value={latestPortfolioReview?.overallPortfolioScore == null ? "-" : `${Math.round(latestPortfolioReview.overallPortfolioScore)}/100`}
          footer={latestPortfolioReview ? `Reviewed ${latestPortfolioReview.reviewDate}` : "Run Portfolio Review to populate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          title="Unrealised gain/loss"
          description="Current market value versus average cost."
          tone={dashboard.unrealizedGainLoss < 0 ? "danger" : dashboard.unrealizedGainLoss > 0 ? "positive" : "neutral"}
          value={
            displayCurrency
              ? formatCurrency(dashboard.unrealizedGainLoss, displayCurrency)
              : dashboard.unrealizedGainLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })
          }
          footer={formatPercent(dashboard.unrealizedGainLossPercent)}
        />
        <MetricCard
          title="Realised gain/loss"
          description="Calculated from buy/sell transactions where possible."
          tone={dashboard.realizedGainLoss < 0 ? "danger" : dashboard.realizedGainLoss > 0 ? "positive" : "neutral"}
          value={
            displayCurrency
              ? formatCurrency(dashboard.realizedGainLoss, displayCurrency)
              : dashboard.realizedGainLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })
          }
        />
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cash vs invested</CardTitle>
            <CardDescription>Portfolio balance between dry powder and holdings.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashInvestedPanel dashboard={dashboard} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Portfolio Review Snapshot</CardTitle>
              <CardDescription>
                Deterministic review across allocation, concentration, risk, macro, insights and themes.
              </CardDescription>
            </div>
            <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href="/portfolio-review">Open review</Link>
          </div>
        </CardHeader>
        <CardContent>
          {latestPortfolioReview ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-xl font-semibold">{latestPortfolioReview.overallPortfolioScore == null ? "-" : `${Math.round(latestPortfolioReview.overallPortfolioScore)}/100`}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data Coverage</p>
                <p className="text-xl font-semibold">{formatPercent(latestPortfolioReview.confidenceScore / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Watch areas</p>
                <p className="text-xl font-semibold">{latestPortfolioReview.watchAreas.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Review date</p>
                <p className="text-xl font-semibold">{latestPortfolioReview.reviewDate}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No portfolio review has been run yet.</p>
          )}
        </CardContent>
      </Card>

      {hasMixedOrNonBaseCurrency ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Portfolio base currency is {portfolio.baseCurrency}, but your current cash/holding entries use{" "}
            {Array.from(allCurrencies).join(", ")}. Phase 2 MVP preserves native currencies and does not convert FX yet, so totals are shown as unconverted estimates.
          </CardContent>
        </Card>
      ) : null}

      <Suspense fallback={<LoadingCard title="Performance" />}>
        <PortfolioPerformanceSection portfolioId={portfolio.id} />
      </Suspense>
      <PortfolioAllocationSections dashboard={dashboard} latestPortfolioReview={latestPortfolioReview} />

    </PageContainer>
  );
}
