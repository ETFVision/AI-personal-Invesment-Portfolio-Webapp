import { deleteHoldingAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Holding, HoldingValuation, ProductPerformance } from "@/domain/portfolio/types";
import { formatAssetTypeLabel, formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";

type HoldingsTableProps =
  | { holdings: Holding[]; valuations?: never; productPerformance?: ProductPerformance[] }
  | { holdings?: never; valuations: HoldingValuation[]; productPerformance?: ProductPerformance[] };

export function HoldingsTable({ holdings, valuations, productPerformance = [] }: HoldingsTableProps) {
  const rows = valuations ?? holdings.map((holding) => ({
    holding,
    unitPrice: holding.averageCost,
    value: holding.quantity * (holding.averageCost ?? 0),
    valueCurrency: holding.costCurrency,
    priceDate: null,
    priceProvider: null,
    valuationSource: "cost_basis" as const
  }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const performanceByHoldingId = new Map(productPerformance.map((item) => [item.holdingId, item]));

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[1.2fr_0.6fr_0.65fr_0.6fr_0.7fr_0.75fr_0.9fr_auto] gap-3 bg-muted px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
        <span>Asset</span>
        <span>Type</span>
        <span>Account</span>
        <span>Quantity</span>
        <span>Unit value</span>
        <span>Market value</span>
        <span>Performance</span>
        <span />
      </div>
      <div className="divide-y">
        {rows.map((row) => {
          const holding = row.holding;
          const performance = performanceByHoldingId.get(holding.id);
          const sinceInception = performance?.metrics.find((metric) => metric.label === "Since inception");
          return (
            <div
              key={holding.id}
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_0.6fr_0.65fr_0.6fr_0.7fr_0.75fr_0.9fr_auto]"
            >
              <div>
                <div className="font-medium">{holding.ticker ?? holding.assetName}</div>
                <div className="text-xs text-muted-foreground">
                  {holding.assetName}
                  {row.valuationSource === "market_price" && row.priceDate ? ` | priced ${row.priceDate}` : ""}
                </div>
              </div>
              <div><span className="text-xs text-muted-foreground md:hidden">Type </span>{formatAssetTypeLabel(holding.assetType)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Account </span>{holding.accountName ?? "Default"}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Quantity </span>{formatNumber(holding.quantity)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Unit value </span>{formatCurrencyWithCode(row.unitPrice ?? 0, row.valueCurrency)}</div>
              <div><span className="text-xs text-muted-foreground md:hidden">Market value </span>{formatCurrencyWithCode(row.value, row.valueCurrency)}</div>
              <div>
                <span className="text-xs text-muted-foreground md:hidden">Performance </span>
                {sinceInception?.percentChange == null ? (
                  <span className="text-muted-foreground">Needs history</span>
                ) : (
                  <div>
                    <div className={sinceInception.valueChange != null && sinceInception.valueChange < 0 ? "text-destructive" : "text-emerald-600"}>
                      {formatPercent(sinceInception.percentChange)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrencyWithCode(performance?.totalGainLoss ?? 0, row.valueCurrency)}
                    </div>
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">Alloc {formatPercent(total === 0 ? 0 : row.value / total)}</div>
              </div>
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
