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
import { HoldingPerformancePanel } from "@/components/portfolio/analytics-panels";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { formatCurrencyWithCode } from "@/lib/utils";

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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manual ingestion</p>
        <h1 className="text-2xl font-semibold">Holdings</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit holding" : "Add holding"}</CardTitle>
          <CardDescription>Add current positions with average cost. Daily pricing comes in a later milestone.</CardDescription>
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
      <Card>
        <CardHeader>
          <CardTitle>Holdings table</CardTitle>
          <CardDescription>Current manually tracked positions.</CardDescription>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <EmptyState title="No holdings yet" description="Add ETFs, stocks, bond ETFs, gold ETFs, or crypto positions." />
          ) : (
            <HoldingsTable valuations={dashboard.holdingValuations} productPerformance={dashboard.productPerformance} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Product performance</CardTitle>
          <CardDescription>Flow-adjusted daily, weekly, monthly, YTD, and since-inception return by holding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {dashboard.holdingValuations.length === 0 ? (
            <EmptyState title="No product performance" description="Add holdings and refresh prices to calculate product-level performance." />
          ) : (
            dashboard.holdingValuations.map((valuation) => {
              const performance = dashboard.productPerformance.find((item) => item.holdingId === valuation.holding.id);
              return (
                <section key={valuation.holding.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-medium">{valuation.holding.ticker ?? valuation.holding.assetName}</h3>
                      <p className="text-sm text-muted-foreground">{valuation.holding.assetName}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Value {formatCurrencyWithCode(valuation.value, valuation.valueCurrency)}
                    </div>
                  </div>
                  <HoldingPerformancePanel performance={performance} currency={valuation.valueCurrency} />
                </section>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
