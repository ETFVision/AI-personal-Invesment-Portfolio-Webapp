import { PortfolioDashboard } from "@/domain/portfolio/types";
import { formatAssetTypeLabel, formatCurrencyWithCode, formatPercent } from "@/lib/utils";

function ExposureBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(Math.max(percent, 0) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

export function CashInvestedPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  return (
    <div className="space-y-3">
      <ExposureBar
        label="Cash"
        value={formatPercent(dashboard.cashPercent)}
        percent={dashboard.cashPercent}
      />
      <ExposureBar
        label="Invested"
        value={formatPercent(dashboard.investedPercent)}
        percent={dashboard.investedPercent}
      />
    </div>
  );
}

export function AllocationPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.allocationByType.length === 0) {
    return <p className="text-sm text-muted-foreground">Add cash or holdings to see allocation.</p>;
  }

  return (
    <div className="space-y-3">
      {dashboard.allocationByType.map((item) => (
        <ExposureBar
          key={item.label}
          label={formatAssetTypeLabel(item.label)}
          value={formatPercent(item.percent)}
          percent={item.percent}
        />
      ))}
    </div>
  );
}

export function CurrencyExposurePanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  if (dashboard.currencyExposure.length === 0) {
    return <p className="text-sm text-muted-foreground">Add cash or holdings to see currency exposure.</p>;
  }

  return (
    <div className="space-y-3">
      {dashboard.currencyExposure.map((item) => (
        <ExposureBar
          key={item.currency}
          label={item.currency}
          value={formatPercent(item.percent)}
          percent={item.percent}
        />
      ))}
    </div>
  );
}

export function WinnersLosersPanel({ dashboard }: { dashboard: PortfolioDashboard }) {
  const rows = [...dashboard.topWinners, ...dashboard.topLosers];

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Refresh prices to compare current market value against average cost.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Top winners</h3>
        {dashboard.topWinners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No positive unrealised gains yet.</p>
        ) : (
          dashboard.topWinners.map((row) => (
            <div key={row.valuation.holding.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{row.valuation.holding.ticker ?? row.valuation.holding.assetName}</span>
                <span className="text-emerald-600">{formatPercent(row.gainLossPercent)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatCurrencyWithCode(row.gainLoss, row.valuation.valueCurrency)}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Top losers</h3>
        {dashboard.topLosers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unrealised losses yet.</p>
        ) : (
          dashboard.topLosers.map((row) => (
            <div key={row.valuation.holding.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{row.valuation.holding.ticker ?? row.valuation.holding.assetName}</span>
                <span className="text-destructive">{formatPercent(row.gainLossPercent)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatCurrencyWithCode(row.gainLoss, row.valuation.valueCurrency)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
