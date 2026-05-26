import { deleteHoldingAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Holding } from "@/domain/portfolio/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const total = holdings.reduce((sum, holding) => sum + holding.quantity * (holding.averageCost ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.8fr_0.8fr_0.7fr_auto] gap-3 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Asset</span>
        <span>Type</span>
        <span>Account</span>
        <span>Quantity</span>
        <span>Average cost</span>
        <span>Estimated value</span>
        <span>Allocation</span>
        <span />
      </div>
      <div className="divide-y">
        {holdings.map((holding) => {
          const value = holding.quantity * (holding.averageCost ?? 0);
          return (
            <div
              key={holding.id}
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_0.7fr_0.8fr_0.7fr_0.8fr_0.8fr_0.7fr_auto]"
            >
              <div>
                <div className="font-medium">{holding.ticker ?? holding.assetName}</div>
                <div className="text-xs text-muted-foreground">{holding.assetName}</div>
              </div>
              <div><span className="text-xs text-muted-foreground md:hidden">Type </span>{holding.assetType}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Account </span>{holding.accountName ?? "Default"}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Quantity </span>{formatNumber(holding.quantity)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Average cost </span>{formatCurrency(holding.averageCost ?? 0, holding.costCurrency)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Estimated value </span>{formatCurrency(value, holding.costCurrency)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Allocation </span>{formatPercent(total === 0 ? 0 : value / total)}</div>
              <div className="flex gap-2 md:justify-end">
                <a className="rounded-md border px-3 py-2 text-xs hover:bg-muted" href={`/holdings?edit=${holding.id}`}>
                  Edit
                </a>
                <form action={deleteHoldingAction}>
                  <input type="hidden" name="id" value={holding.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
