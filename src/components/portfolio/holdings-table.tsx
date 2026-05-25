import { deleteHoldingAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Holding } from "@/domain/portfolio/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const total = holdings.reduce((sum, holding) => sum + holding.quantity * (holding.averageCost ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] gap-3 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Asset</span>
        <span>Type</span>
        <span>Account</span>
        <span>Quantity</span>
        <span>Average cost</span>
        <span>Allocation</span>
        <span />
      </div>
      <div className="divide-y">
        {holdings.map((holding) => {
          const value = holding.quantity * (holding.averageCost ?? 0);
          return (
            <div
              key={holding.id}
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]"
            >
              <div>
                <div className="font-medium">{holding.ticker ?? holding.assetName}</div>
                <div className="text-xs text-muted-foreground">{holding.assetName}</div>
              </div>
              <div>{holding.assetType}</div>
              <div>{holding.accountName ?? "Default"}</div>
              <div>{formatNumber(holding.quantity)}</div>
              <div>{formatCurrency(holding.averageCost ?? 0, holding.costCurrency)}</div>
              <div>{formatPercent(total === 0 ? 0 : value / total)}</div>
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

