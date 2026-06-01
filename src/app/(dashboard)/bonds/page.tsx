import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyWithCode, formatPercent } from "@/lib/utils";
import type { AllocationItem } from "@/domain/portfolio/types";
import type { BondAnalyticsReport } from "@/application/services/bonds/BondTypes";

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function BreakdownList({ title, items }: { title: string; items: AllocationItem[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No exposure data yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{titleCase(item.label)}</span>
                <span className="font-medium">{formatPercent(item.percent)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.percent * 100))}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function BondHoldingsTable({ report }: { report: BondAnalyticsReport }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="p-3 font-medium">ETF</th>
            <th className="p-3 text-right font-medium">Value</th>
            <th className="p-3 text-right font-medium">Portfolio</th>
            <th className="p-3 text-right font-medium">Bond sleeve</th>
            <th className="p-3 font-medium">Duration</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Credit</th>
            <th className="p-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {report.bondHoldings.map((holding) => (
            <tr key={holding.holdingId} className="border-t">
              <td className="p-3">
                <p className="font-medium">{holding.symbol}</p>
                <p className="text-xs text-muted-foreground">{holding.name}</p>
              </td>
              <td className="p-3 text-right">{formatCurrencyWithCode(holding.value, holding.currency)}</td>
              <td className="p-3 text-right">{formatPercent(holding.allocationPercent)}</td>
              <td className="p-3 text-right">{formatPercent(holding.bondAllocationPercent)}</td>
              <td className="p-3">{titleCase(holding.durationCategory)}</td>
              <td className="p-3">{titleCase(holding.bondType)}</td>
              <td className="p-3">{titleCase(holding.creditQuality)}</td>
              <td className="p-3 text-muted-foreground">{titleCase(holding.liquidityRole)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function BondsPage() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        description="Create your base portfolio before reviewing bond intelligence."
        action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/setup">Start setup</Link>}
      />
    );
  }

  const dashboard = await container.portfolioService.getDashboard(portfolio.id);
  const report = await container.bondService.getPortfolioBondAnalytics(dashboard);

  if (report.bondHoldings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Bond intelligence</p>
          <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fixed-income analytics for bond ETFs, duration, credit risk, inflation sensitivity, and recession-hedging role.
          </p>
        </div>
        <EmptyState
          title="No bond ETFs found"
          description="Add bond ETF holdings such as SGOV, BIL, SHY, IEF, TLT, BND, AGG, TIP, LQD, or HYG to activate this dashboard."
          action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/holdings">Go to holdings</Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Bond intelligence</p>
        <h1 className="text-2xl font-semibold">{portfolio.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deterministic fixed-income analytics for bond ETF exposure, duration risk, credit risk, inflation sensitivity, and recession-hedging role.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Bond allocation" value={formatPercent(report.totalBondAllocation)} description={formatCurrencyWithCode(report.totalBondValue, portfolio.baseCurrency)} />
        <SummaryCard title="Treasury exposure" value={formatPercent(report.treasuryExposure)} description="Portfolio share in treasury or inflation-linked treasury ETFs." />
        <SummaryCard title="Credit-risk exposure" value={formatPercent(report.creditRiskExposure)} description="Corporate and high-yield bond ETF exposure." />
        <SummaryCard title="Inflation-linked" value={formatPercent(report.inflationLinkedExposure)} description="TIPS or inflation-linked bond ETF exposure." />
      </section>

      {report.warnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bond risk warnings</CardTitle>
            <CardDescription>Deterministic checks for duration and credit exposure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {report.warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-md border p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{warning}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Duration profile</CardTitle>
            <CardDescription>Bond sleeve split by rate sensitivity bucket.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList title="Duration" items={report.byDuration} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bond type</CardTitle>
            <CardDescription>Treasury, aggregate, corporate, high yield, and inflation-linked exposure.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList title="Type" items={report.byBondType} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credit quality</CardTitle>
            <CardDescription>Government, investment-grade, mixed, and high-yield profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList title="Credit" items={report.byCreditQuality} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bond role summary</CardTitle>
            <CardDescription>How the current bond ETF sleeve behaves in the portfolio.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(report.roleSummary).map(([key, value]) => (
              <div key={key} className="rounded-md border p-3">
                <p className="text-sm font-medium">{titleCase(key)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exposure details</CardTitle>
            <CardDescription>Portfolio-level bond exposures before FX conversion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <BreakdownList title="Geography" items={report.byGeography} />
            <BreakdownList title="Currency" items={report.byCurrency} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Bond ETF exposure table</CardTitle>
          <CardDescription>Seeded/manual classifications are used first; FMP metadata does not overwrite curated bond classifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <BondHoldingsTable report={report} />
        </CardContent>
      </Card>
    </div>
  );
}
