import Link from "next/link";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function PortfolioPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Portfolio dashboard</p>
          <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/cash">Add cash</Link>
          <Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/holdings">Add holding</Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total estimate</CardTitle>
            <CardDescription>Cash plus holding cost basis until price feeds are added.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(dashboard.totalValueEstimate, portfolio.baseCurrency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash</CardTitle>
            <CardDescription>Available balances entered manually.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(dashboard.totalCash, portfolio.baseCurrency)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>{dashboard.holdings.length} current manual positions.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(dashboard.totalHoldingsCost, portfolio.baseCurrency)}
          </CardContent>
        </Card>
      </section>

      <Card id="allocation">
        <CardHeader>
          <CardTitle>Allocation by asset type</CardTitle>
          <CardDescription>Phase 2 MVP uses cost basis estimates until daily prices are implemented.</CardDescription>
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
            <HoldingsTable holdings={dashboard.holdings.slice(0, 8)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
