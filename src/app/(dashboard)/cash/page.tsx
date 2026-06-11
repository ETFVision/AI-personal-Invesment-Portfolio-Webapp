import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { deleteCashBalanceAction, upsertCashBalanceAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { CashPerformancePanel } from "@/components/portfolio/analytics-panels";
import { formatCurrency } from "@/lib/utils";

export default async function CashPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const dashboard = await measureRenderStep(`cash:${portfolio.id}:dashboard-data`, () =>
    container.portfolioService.getDashboard(portfolio.id)
  );
  const cashBalances = dashboard.cashBalances;
  const editing = cashBalances.find((item) => item.id === params.edit);
  const currencies = Array.from(new Set(cashBalances.map((cash) => cash.currency)));
  const latestCashDate = cashBalances.map((cash) => cash.asOfDate).sort((a, b) => b.localeCompare(a))[0];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Portfolio"
        title="Cash balances"
        description="Track deployable cash by account and currency for allocation, portfolio review and return analytics."
        meta={
          <>
            <StatusBadge tone="info">{cashBalances.length} balances</StatusBadge>
            <StatusBadge tone={latestCashDate ? "positive" : "neutral"}>
              Latest {latestCashDate ?? "none"}
            </StatusBadge>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total cash"
          value={formatCurrency(dashboard.totalCash, portfolio.baseCurrency)}
          description="Native cash total displayed in portfolio base currency context."
        />
        <MetricCard title="Balances" value={cashBalances.length} description="Cash entries across broker accounts." />
        <MetricCard title="Currencies" value={currencies.length || "-"} description={currencies.length ? currencies.join(", ") : "No cash currencies entered."} />
        <MetricCard title="Latest as-of date" value={latestCashDate ?? "-"} description="Newest cash balance date." tone={latestCashDate ? "positive" : "neutral"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{editing ? "Edit cash balance" : "Add cash balance"}</CardTitle>
            <CardDescription>Track cash by currency and account before deploying it.</CardDescription>
          </CardHeader>
          <CardContent>
            {params.error ? <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}
            <form action={upsertCashBalanceAction} className="space-y-4">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Cash available</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={editing?.amount ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" maxLength={3} required defaultValue={editing?.currency ?? portfolio.baseCurrency} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Broker/account name</Label>
                  <Input id="accountName" name="accountName" defaultValue={editing?.accountName ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brokerName">Broker</Label>
                  <Input id="brokerName" name="brokerName" defaultValue={editing?.brokerName ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asOfDate">As-of date</Label>
                  <Input id="asOfDate" name="asOfDate" type="date" required defaultValue={editing?.asOfDate ?? new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
              <Button type="submit">{editing ? "Save changes" : "Add cash"}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Current cash</CardTitle>
              <CardDescription>Native currency balances. FX conversion will be added with market data.</CardDescription>
            </CardHeader>
            <CardContent>
              {cashBalances.length === 0 ? (
                <EmptyState title="No cash balances" description="Add your available cash so the allocation engine can identify deployable capital later." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="hidden grid-cols-[1fr_0.8fr_auto] gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid">
                    <span>Account</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {cashBalances.map((cash) => (
                      <div key={cash.id} className="grid gap-4 px-5 py-4 text-sm transition-colors hover:bg-slate-50/70 sm:grid-cols-[1fr_0.8fr_auto] sm:items-center">
                        <div>
                          <div className="font-semibold text-slate-950">{cash.accountName ?? "Default account"}</div>
                          <div className="mt-1 text-xs text-slate-500">{cash.asOfDate}</div>
                        </div>
                        <div className="font-semibold tabular-nums text-slate-950 sm:text-right">{formatCurrency(cash.amount, cash.currency)}</div>
                        <div className="flex gap-2 sm:justify-end">
                          <a className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href={`/cash?edit=${cash.id}`}>Edit</a>
                          <form action={deleteCashBalanceAction}>
                            <input type="hidden" name="id" value={cash.id} />
                            <Button type="submit" variant="ghost" size="sm">Delete</Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Cash performance</CardTitle>
              <CardDescription>Flow-adjusted daily, weekly, monthly, 1Y, YTD, and since-inception cash movement by account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {cashBalances.length === 0 ? (
                <EmptyState title="No cash performance" description="Add cash balances and refresh prices to create snapshots." />
              ) : (
                cashBalances.map((cash) => {
                  const performance = dashboard.cashPerformance.find((item) => item.cashBalanceId === cash.id);
                  return (
                    <section key={cash.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="font-semibold text-slate-950">{cash.accountName ?? "Default account"}</h3>
                          <p className="text-sm text-slate-500">{cash.currency} | {cash.asOfDate}</p>
                        </div>
                        <div className="text-sm font-semibold text-slate-950">{formatCurrency(cash.amount, cash.currency)}</div>
                      </div>
                      <CashPerformancePanel performance={performance} currency={cash.currency} />
                    </section>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}
