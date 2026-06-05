import { deleteHoldingAction } from "@/server/actions/portfolioActions";
import { Button } from "@/components/ui/button";
import { Holding, HoldingValuation, ProductPerformance } from "@/domain/portfolio/types";
import { cn, formatAssetTypeLabel, formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";

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
  const performanceLabels = ["Daily", "Weekly", "Monthly", "1Y", "YTD", "Since inception"];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(220px,1.25fr)_0.55fr_0.65fr_0.65fr_0.75fr_0.85fr_minmax(290px,1.35fr)_auto] gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500 xl:grid">
        <span className="self-center">Asset</span>
        <span className="self-center">Type</span>
        <span className="self-center">Account</span>
        <span className="self-center text-right">Quantity</span>
        <span className="self-center text-right">Unit value</span>
        <span className="self-center text-right">Market value</span>
        <span className="self-center">Performance</span>
        <span className="self-center text-right">Actions</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const holding = row.holding;
          const performance = performanceByHoldingId.get(holding.id);
          const sinceInception = performance?.metrics.find((metric) => metric.label === "Since inception");
          return (
            <div
              key={holding.id}
              className="grid gap-4 px-5 py-4 text-sm transition-colors hover:bg-slate-50/70 xl:grid-cols-[minmax(220px,1.25fr)_0.55fr_0.65fr_0.65fr_0.75fr_0.85fr_minmax(290px,1.35fr)_auto]"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-950">{holding.ticker ?? holding.assetName}</div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {holding.assetName}
                  {row.valuationSource === "market_price" && row.priceDate ? ` | priced ${row.priceDate}` : ""}
                </div>
              </div>
              <div className="text-slate-700"><span className="text-xs text-slate-500 xl:hidden">Type </span>{formatAssetTypeLabel(holding.assetType)}</div>
              <div className="text-slate-700"><span className="text-xs text-slate-500 xl:hidden">Account </span>{holding.accountName ?? "Default"}</div>
              <div className="tabular-nums text-slate-900 xl:text-right"><span className="text-xs text-slate-500 xl:hidden">Quantity </span>{formatNumber(holding.quantity)}</div>
              <div className="tabular-nums text-slate-900 xl:text-right"><span className="text-xs text-slate-500 xl:hidden">Unit value </span>{formatCurrencyWithCode(row.unitPrice ?? 0, row.valueCurrency)}</div>
              <div className="font-semibold tabular-nums text-slate-950 xl:text-right"><span className="text-xs text-slate-500 xl:hidden">Market value </span>{formatCurrencyWithCode(row.value, row.valueCurrency)}</div>
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 xl:hidden">Performance</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {performanceLabels.map((label) => {
                    const metric = performance?.metrics.find((item) => item.label === label);
                    const isNegative = metric?.valueChange != null && metric.valueChange < 0;
                    return (
                      <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {label === "Since inception" ? "Inception" : label}
                        </div>
                        {metric?.percentChange == null ? (
                          <div className="mt-1 text-xs font-semibold text-slate-400">-</div>
                        ) : (
                          <div className={cn("mt-1 text-xs font-semibold tabular-nums", isNegative ? "text-red-700" : "text-emerald-700")}>
                            {formatPercent(metric.percentChange)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {sinceInception?.percentChange != null ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Total {formatCurrencyWithCode(performance?.totalGainLoss ?? 0, row.valueCurrency)}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-slate-500">Alloc {formatPercent(total === 0 ? 0 : row.value / total)}</div>
              </div>
              <div className="flex gap-2 xl:justify-end">
                <a className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href={`/holdings?edit=${holding.id}`}>
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
