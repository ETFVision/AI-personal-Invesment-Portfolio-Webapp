import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";
import { upsertHoldingAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function HoldingsPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const dashboard = await container.portfolioService.getDashboard(portfolio.id);
  const holdings = dashboard.holdings;
  const editing = holdings.find((item) => item.id === params.edit);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Portfolio"
        title="Holdings"
        description="Maintain the current positions used by portfolio valuation, risk, insights and review analytics."
        meta={
          <>
            <StatusBadge tone={dashboard.latestPriceDate ? "positive" : "warning"}>
              Prices {dashboard.latestPriceDate ? `as of ${dashboard.latestPriceDate}` : "not refreshed"}
            </StatusBadge>
            <StatusBadge tone="info">{holdings.length} positions</StatusBadge>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Positions" value={holdings.length} description="Current holdings entered for this portfolio." />
        <MetricCard
          title="Holdings value"
          value={formatCurrency(dashboard.totalHoldingsMarketValue, portfolio.baseCurrency)}
          description="Latest stored prices where available."
        />
        <MetricCard
          title="Unrealised gain/loss"
          value={formatCurrency(dashboard.unrealizedGainLoss, portfolio.baseCurrency)}
          description={formatPercent(dashboard.unrealizedGainLossPercent)}
          tone={dashboard.unrealizedGainLoss < 0 ? "danger" : dashboard.unrealizedGainLoss > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          title="Latest price date"
          value={dashboard.latestPriceDate ?? "-"}
          description="Used for current market value and holding returns."
          tone={dashboard.latestPriceDate ? "positive" : "warning"}
        />
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{editing ? "Edit holding" : "Add holding"}</CardTitle>
          <CardDescription>Add or update position quantity, cost basis, account and purchase date.</CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}
          <form action={upsertHoldingAction} className="grid gap-4 md:grid-cols-3">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset type</Label>
              <Select id="assetType" name="assetType" defaultValue={editing?.assetType ?? "etf"}>
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="bond_etf">Bond ETF</option>
                <option value="gold_etf">Gold ETF</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" name="ticker" defaultValue={editing?.ticker ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetName">Asset name</Label>
              <Input id="assetName" name="assetName" required defaultValue={editing?.assetName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" step="0.000001" required defaultValue={editing?.quantity ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="averageCost">Average cost</Label>
              <Input id="averageCost" name="averageCost" type="number" step="0.0001" defaultValue={editing?.averageCost ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costCurrency">Currency</Label>
              <Input id="costCurrency" name="costCurrency" maxLength={3} required defaultValue={editing?.costCurrency ?? portfolio.baseCurrency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstPurchaseDate">Purchase date</Label>
              <Input id="firstPurchaseDate" name="firstPurchaseDate" type="date" defaultValue={editing?.firstPurchaseDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Broker/account name</Label>
              <Input id="accountName" name="accountName" defaultValue={editing?.accountName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerName">Broker</Label>
              <Input id="brokerName" name="brokerName" defaultValue={editing?.brokerName ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">{editing ? "Save changes" : "Add holding"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Holdings table</CardTitle>
          <CardDescription>Current positions with daily, weekly, monthly, 1Y, YTD, and since-inception performance.</CardDescription>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <EmptyState title="No holdings yet" description="Add ETFs, stocks, bond ETFs, gold ETFs, or crypto positions." />
          ) : (
            <HoldingsTable valuations={dashboard.holdingValuations} productPerformance={dashboard.productPerformance} />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
