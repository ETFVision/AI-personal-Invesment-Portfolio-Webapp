import Link from "next/link";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { refreshPricesAction } from "@/server/actions/portfolioActions";

type PortfolioPageProps = {
  searchParams?: Promise<{
    priceMessage?: string;
    priceError?: string;
  }>;
};

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
          <form action={refreshPricesAction}>
            <Button type="submit" variant="secondary">
              Refresh prices
            </Button>
          </form>
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/cash">Add cash</Link>
          <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/holdings">Add holding</Link>
        </div>
      </div>

      {resolvedSearchParams?.priceMessage ? (
        <Card>
          <CardContent className="p-4 text-sm">
            <span className={resolvedSearchParams.priceError ? "text-destructive" : "text-muted-foreground"}>
              {resolvedSearchParams.priceError ?? resolvedSearchParams.priceMessage}
            </span>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total estimate</CardTitle>
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
        <CardContent className="space-y-3">
          {dashboard.allocationByType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add cash or holdings to see allocation.</p>
          ) : (
            dashboard.allocationByType.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize">{item.label.replace("_", " ")}</span>
                  <span>{formatPercent(item.percent)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(item.percent * 100, 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top holdings</CardTitle>
          <CardDescription>Manual holdings table with edit and delete actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.holdings.length === 0 ? (
            <EmptyState title="No holdings" description="Add holdings manually to start tracking your portfolio." />
          ) : (
            <HoldingsTable valuations={dashboard.holdingValuations.slice(0, 8)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
