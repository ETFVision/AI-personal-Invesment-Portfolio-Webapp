import Link from "next/link";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AllocationDonutPanel,
  AllocationPanel,
  CashInvestedPanel,
  CurrencyExposurePanel,
  PerformancePanel,
  WinnersLosersPanel
} from "@/components/portfolio/analytics-panels";
import { formatAssetTypeLabel, formatCurrency, formatPercent } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/submit-button";
import { refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import type { AllocationItem } from "@/domain/portfolio/types";
import type { PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";

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
  return typed;
}

function allocationFromLookthrough(rows: PortfolioLookthroughReport["sectorExposures"]): AllocationItem[] {
  return rows.map((row) => ({
    label: row.exposureName,
    value: row.exposureWeight,
    percent: row.exposureWeight
  }));
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

  const dashboard = await container.portfolioService.getDashboard(portfolio.id);
  const portfolioReviewDashboard = await container.portfolioReviewService.getDashboard(portfolio.id);
  const latestPortfolioReview = portfolioReviewDashboard.latestReport;
  const lookthroughReport = lookthroughReportFromSnapshot(latestPortfolioReview?.inputsSnapshot?.lookthroughExposure);
  const sectorAllocation = lookthroughReport?.sectorExposures.length
    ? allocationFromLookthrough(lookthroughReport.sectorExposures)
    : dashboard.allocationBySector;
  const geographyAllocation = lookthroughReport?.countryExposures.length
    ? allocationFromLookthrough(lookthroughReport.countryExposures)
    : dashboard.allocationByGeography;
  const cashCurrencies = new Set(dashboard.cashBalances.map((cash) => cash.currency));
  const holdingCurrencies = new Set(dashboard.holdingValuations.map((valuation) => valuation.valueCurrency));
  const allCurrencies = new Set([...cashCurrencies, ...holdingCurrencies]);
  const hasMixedOrNonBaseCurrency = allCurrencies.size > 1 || (allCurrencies.size === 1 && !allCurrencies.has(portfolio.baseCurrency));
  const displayCurrency = hasMixedOrNonBaseCurrency ? undefined : portfolio.baseCurrency;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Portfolio dashboard</p>
          <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={refreshAllDataAction}>
            <input type="hidden" name="returnTo" value="/portfolio" />
            <SubmitButton variant="secondary" pendingLabel="Refreshing data...">
              Refresh data
            </SubmitButton>
          </form>
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/cash">Add cash</Link>
          <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/holdings">Add holding</Link>
        </div>
      </div>

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

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total portfolio value</CardTitle>
            <CardDescription>
              {hasMixedOrNonBaseCurrency
                ? "Native-currency sum shown until FX conversion is added."
                : dashboard.latestPriceDate
                  ? `Cash plus latest stored prices as of ${dashboard.latestPriceDate}.`
                  : "Cash plus holding cost basis until prices are refreshed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {displayCurrency ? formatCurrency(dashboard.totalValueEstimate, displayCurrency) : dashboard.totalValueEstimate.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash</CardTitle>
            <CardDescription>Available balances entered manually.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {displayCurrency ? formatCurrency(dashboard.totalCash, displayCurrency) : dashboard.totalCash.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              {dashboard.latestPriceDate
                ? `${dashboard.holdings.length} positions valued from latest stored prices where available.`
                : `${dashboard.holdings.length} current manual positions.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {displayCurrency ? formatCurrency(dashboard.totalHoldingsMarketValue, displayCurrency) : dashboard.totalHoldingsMarketValue.toLocaleString("en-US")}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Unrealised gain/loss</CardTitle>
            <CardDescription>Current market value versus average cost.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${dashboard.unrealizedGainLoss < 0 ? "text-destructive" : dashboard.unrealizedGainLoss > 0 ? "text-emerald-600" : ""}`}>
              {displayCurrency
                ? formatCurrency(dashboard.unrealizedGainLoss, displayCurrency)
                : dashboard.unrealizedGainLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatPercent(dashboard.unrealizedGainLossPercent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Realised gain/loss</CardTitle>
            <CardDescription>Calculated from buy/sell transactions where possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${dashboard.realizedGainLoss < 0 ? "text-destructive" : dashboard.realizedGainLoss > 0 ? "text-emerald-600" : ""}`}>
              {displayCurrency ? formatCurrency(dashboard.realizedGainLoss, displayCurrency) : dashboard.realizedGainLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
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
                Deterministic review across allocation, concentration, risk, macro, recommendations and themes.
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

      {hasMixedOrNonBaseCurrency ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Portfolio base currency is {portfolio.baseCurrency}, but your current cash/holding entries use{" "}
            {Array.from(allCurrencies).join(", ")}. Phase 2 MVP preserves native currencies and does not convert FX yet, so totals are shown as unconverted estimates.
          </CardContent>
        </Card>
      ) : null}

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

    </div>
  );
}
