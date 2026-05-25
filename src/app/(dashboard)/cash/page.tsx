import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";
import { deleteCashBalanceAction, upsertCashBalanceAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

export default async function CashPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const cashBalances = await container.portfolioRepository.listCashBalances(portfolio.id);
  const editing = cashBalances.find((item) => item.id === params.edit);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Manual ingestion</p>
          <h1 className="text-2xl font-semibold">Cash balances</h1>
        </div>
        <Card>
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
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current cash</CardTitle>
            <CardDescription>Native currency balances. FX conversion will be added with market data.</CardDescription>
          </CardHeader>
          <CardContent>
            {cashBalances.length === 0 ? (
              <EmptyState title="No cash balances" description="Add your available cash so the allocation engine can identify deployable capital later." />
            ) : (
              <div className="divide-y rounded-lg border">
                {cashBalances.map((cash) => (
                  <div key={cash.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{formatCurrency(cash.amount, cash.currency)}</div>
                      <div className="text-sm text-muted-foreground">{cash.accountName ?? "Default account"} · {cash.asOfDate}</div>
                    </div>
                    <div className="flex gap-2">
                      <a className="rounded-md border px-3 py-2 text-sm hover:bg-muted" href={`/cash?edit=${cash.id}`}>Edit</a>
                      <form action={deleteCashBalanceAction}>
                        <input type="hidden" name="id" value={cash.id} />
                        <Button type="submit" variant="ghost" size="sm">Delete</Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

