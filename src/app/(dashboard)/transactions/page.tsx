import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";
import { deleteTransactionAction, upsertTransactionAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ edit?: string; error?: string }> }) {
  const params = await searchParams;
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const transactions = await container.portfolioRepository.listTransactions(portfolio.id);
  const editing = transactions.find((item) => item.id === params.edit);
  const buySellCount = transactions.filter((item) => item.transactionType === "buy" || item.transactionType === "sell").length;
  const cashMovementCount = transactions.filter((item) => item.transactionType.includes("cash")).length;
  const latestTransactionDate = transactions.map((item) => item.transactionDate).sort((a, b) => b.localeCompare(a))[0];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Portfolio"
        title="Transactions"
        description="Audit trail for buys, sells, cash flows, dividends, fees and manual adjustments."
        meta={
          <>
            <StatusBadge tone="info">{transactions.length} ledger rows</StatusBadge>
            <StatusBadge tone={latestTransactionDate ? "positive" : "neutral"}>
              Latest {latestTransactionDate ?? "none"}
            </StatusBadge>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Transactions" value={transactions.length} description="Total records in the manual ledger." />
        <MetricCard title="Buys / sells" value={buySellCount} description="Investment transactions used by return logic." />
        <MetricCard title="Cash movements" value={cashMovementCount} description="Deposits, withdrawals and cash income rows." />
        <MetricCard title="Latest date" value={latestTransactionDate ?? "-"} description="Most recent ledger record." tone={latestTransactionDate ? "positive" : "neutral"} />
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>{editing ? "Edit transaction" : "Add transaction"}</CardTitle>
          <CardDescription>Record buys, sells, cash movements, fees, and manual adjustments.</CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</div> : null}
          <form action={upsertTransactionAction} className="grid gap-4 md:grid-cols-3">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction type</Label>
              <Select id="transactionType" name="transactionType" defaultValue={editing?.transactionType ?? "buy"}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
                <option value="deposit_cash">Deposit cash</option>
                <option value="withdraw_cash">Withdraw cash</option>
                <option value="interest_cash">Interest cash</option>
                <option value="dividend">Dividend</option>
                <option value="fee">Fee</option>
                <option value="manual_adjustment">Manual adjustment</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset type</Label>
              <Select id="assetType" name="assetType" defaultValue={editing?.assetType ?? "etf"}>
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="bond_etf">Bond ETF</option>
                <option value="gold_etf">Gold ETF</option>
                <option value="crypto">Crypto</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input id="ticker" name="ticker" defaultValue={editing?.ticker ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetName">Asset name</Label>
              <Input id="assetName" name="assetName" defaultValue={editing?.assetName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" step="0.000001" defaultValue={editing?.quantity ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price / cash amount</Label>
              <Input id="price" name="price" type="number" step="0.0001" defaultValue={editing?.price ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input id="fees" name="fees" type="number" step="0.01" defaultValue={editing?.fees ?? 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" maxLength={3} required defaultValue={editing?.currency ?? portfolio.baseCurrency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Transaction date</Label>
              <Input id="transactionDate" name="transactionDate" type="date" required defaultValue={editing?.transactionDate ?? new Date().toISOString().slice(0, 10)} />
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
              <Button type="submit">{editing ? "Save changes" : "Add transaction"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Transaction ledger</CardTitle>
          <CardDescription>Manual transaction history for auditability.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState title="No transactions" description="Add a buy, sell, cash movement, fee, or manual adjustment." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_auto] gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
                <span>Type / account</span>
                <span className="text-right">Quantity</span>
                <span className="text-right">Price</span>
                <span className="text-right">Net amount</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="grid gap-4 px-5 py-4 text-sm transition-colors hover:bg-slate-50/70 md:grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_auto]">
                    <div className="min-w-0">
                      <div className="font-semibold capitalize text-slate-950">{transaction.transactionType.replaceAll("_", " ")}</div>
                      <div className="mt-1 text-xs text-slate-500">{transaction.transactionDate} | {transaction.accountName ?? "Default account"}</div>
                    </div>
                    <div className="tabular-nums text-slate-900 md:text-right">
                      <span className="text-xs text-slate-500 md:hidden">Qty </span>
                      {transaction.quantity == null ? "-" : formatNumber(transaction.quantity)}
                    </div>
                    <div className="tabular-nums text-slate-900 md:text-right">
                      <span className="text-xs text-slate-500 md:hidden">Price </span>
                      {transaction.price == null ? "No price" : formatCurrency(transaction.price, transaction.currency)}
                    </div>
                    <div className="font-semibold tabular-nums text-slate-950 md:text-right">
                      <span className="text-xs text-slate-500 md:hidden">Net </span>
                      {transaction.netAmount == null ? "Manual" : formatCurrency(transaction.netAmount, transaction.currency)}
                    </div>
                    <div className="flex gap-2 md:justify-end">
                      <a className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href={`/transactions?edit=${transaction.id}`}>Edit</a>
                      <form action={deleteTransactionAction}>
                        <input type="hidden" name="id" value={transaction.id} />
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
    </PageContainer>
  );
}
