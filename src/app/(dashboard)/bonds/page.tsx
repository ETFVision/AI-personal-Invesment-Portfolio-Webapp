import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createContainer } from "@/server/container";
import { saveBondProfileAction } from "@/server/actions/universeActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";
import type { AllocationItem } from "@/domain/portfolio/types";
import type { BondAnalyticsReport, BondHoldingExposure } from "@/application/services/bonds/BondTypes";

type BondsPageProps = {
  searchParams?: Promise<{ message?: string; error?: string }>;
};

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
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No exposure data yet.</p>
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
  return <MetricCard title={title} value={value} footer={description} />;
}

function ContextList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 text-sm md:grid-cols-2">
      {items.map((item) => <p key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">{item}</p>)}
    </div>
  );
}

function BondHoldingsTable({ report }: { report: BondAnalyticsReport }) {
  return (
    <div className="professional-table overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="text-left">
          <tr>
            <th className="p-3 font-medium">ETF</th>
            <th className="p-3 text-right font-medium">Value</th>
            <th className="p-3 text-right font-medium">Portfolio</th>
            <th className="p-3 text-right font-medium">Bond sleeve</th>
            <th className="p-3 font-medium">Duration</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Credit</th>
            <th className="p-3 text-right font-medium">SEC yield</th>
            <th className="p-3 text-right font-medium">Eff. duration</th>
            <th className="p-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {report.bondHoldings.map((holding) => (
            <tr key={holding.holdingId} className="">
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
              <td className="p-3 text-right">{holding.secYield == null ? "-" : formatPercent(holding.secYield)}</td>
              <td className="p-3 text-right">{holding.effectiveDuration == null ? "-" : formatNumber(holding.effectiveDuration, 2)}</td>
              <td className="p-3 text-muted-foreground">{titleCase(holding.liquidityRole)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioTable({ report }: { report: BondAnalyticsReport }) {
  return (
    <div className="professional-table overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left">
          <tr>
            <th className="p-3 font-medium">Scenario</th>
            <th className="p-3 text-right font-medium">Bond sleeve impact</th>
            <th className="p-3 text-right font-medium">Portfolio impact</th>
            <th className="p-3 font-medium">Logic</th>
          </tr>
        </thead>
        <tbody>
          {report.scenarioImpacts.map((scenario) => (
            <tr key={scenario.scenarioKey} className="">
              <td className="p-3 font-medium">{scenario.label}</td>
              <td className="p-3 text-right">{scenario.estimatedBondSleeveImpact == null ? "Needs data" : formatPercent(scenario.estimatedBondSleeveImpact)}</td>
              <td className="p-3 text-right">{scenario.estimatedPortfolioImpact == null ? "Needs data" : formatPercent(scenario.estimatedPortfolioImpact)}</td>
              <td className="p-3 text-muted-foreground">{scenario.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BondProfileEditor({ holdings }: { holdings: BondHoldingExposure[] }) {
  const editableHoldings = holdings.filter((holding) => holding.profileCanBeEdited);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bond profile admin</CardTitle>
        <CardDescription>Manual overrides for curated bond ETF fields. Percent inputs should be decimals, e.g. 0.045 for 4.5%.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editableHoldings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No curated bond ETF profile is available to edit. Add a seeded bond ETF from the universe to enable profile overrides.
          </p>
        ) : editableHoldings.map((holding) => (
          <form key={holding.holdingId} action={saveBondProfileAction} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
            <input type="hidden" name="instrumentId" value={holding.instrumentId} />
            <input type="hidden" name="symbol" value={holding.symbol} />
            <div className="space-y-2">
              <Label>{holding.symbol}</Label>
              <Input value={holding.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${holding.holdingId}-duration`}>Duration</Label>
              <Select id={`${holding.holdingId}-duration`} name="durationCategory" defaultValue={holding.durationCategory}>
                <option value="ultra-short">Ultra-short</option>
                <option value="short">Short</option>
                <option value="short/intermediate">Short/intermediate</option>
                <option value="intermediate">Intermediate</option>
                <option value="long">Long</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${holding.holdingId}-type`}>Type</Label>
              <Select id={`${holding.holdingId}-type`} name="treasuryClassification" defaultValue={holding.bondType}>
                <option value="treasury">Treasury</option>
                <option value="aggregate">Aggregate</option>
                <option value="corporate">Corporate</option>
                <option value="high yield">High yield</option>
                <option value="inflation-linked">Inflation-linked</option>
                <option value="international">International</option>
                <option value="cash-like">Cash-like</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${holding.holdingId}-credit`}>Credit</Label>
              <Select id={`${holding.holdingId}-credit`} name="creditQuality" defaultValue={holding.creditQuality}>
                <option value="government">Government</option>
                <option value="investment grade">Investment grade</option>
                <option value="mixed investment grade">Mixed investment grade</option>
                <option value="high yield">High yield</option>
                <option value="mixed">Mixed</option>
              </Select>
            </div>
            <input type="hidden" name="geoExposure" value={holding.geography} />
            <input type="hidden" name="currency" value={holding.currency} />
            <input type="hidden" name="rateSensitivity" value={holding.rateSensitivity} />
            <input type="hidden" name="inflationSensitivity" value={holding.inflationSensitivity} />
            <input type="hidden" name="recessionSensitivity" value={holding.recessionSensitivity} />
            <input type="hidden" name="liquidityRole" value={holding.liquidityRole} />
            <input type="hidden" name="inflationLinked" value={holding.inflationLinked ? "true" : "false"} />
            <NumberInput id={`${holding.holdingId}-sec`} label="SEC yield" name="secYield" value={holding.secYield} />
            <NumberInput id={`${holding.holdingId}-dist`} label="Dist. yield" name="distributionYield" value={holding.distributionYield} />
            <NumberInput id={`${holding.holdingId}-ytm`} label="YTM" name="yieldToMaturity" value={holding.yieldToMaturity} />
            <div className="space-y-2">
              <Label htmlFor={`${holding.holdingId}-yield-date`}>Yield date</Label>
              <Input id={`${holding.holdingId}-yield-date`} name="yieldAsOfDate" type="date" defaultValue={holding.yieldAsOfDate ?? ""} />
            </div>
            <NumberInput id={`${holding.holdingId}-duration-value`} label="Eff. duration" name="effectiveDuration" value={holding.effectiveDuration} />
            <NumberInput id={`${holding.holdingId}-maturity`} label="Avg maturity" name="averageMaturity" value={holding.averageMaturity} />
            <NumberInput id={`${holding.holdingId}-spread-duration`} label="Spread duration" name="spreadDuration" value={holding.spreadDuration} />
            <NumberInput id={`${holding.holdingId}-oas`} label="OAS" name="optionAdjustedSpread" value={holding.optionAdjustedSpread} />
            <NumberInput id={`${holding.holdingId}-expense`} label="Expense ratio" name="expenseRatio" value={holding.expenseRatio} />
            <div className="flex items-end">
              <SubmitButton pendingLabel="Saving...">Save profile</SubmitButton>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}

function NumberInput({ id, label, name, value }: { id: string; label: string; name: string; value: number | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="number" step="0.0001" defaultValue={value ?? ""} />
    </div>
  );
}

export default async function BondsPage({ searchParams }: BondsPageProps) {
  const params = await searchParams;
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

  const [dashboard, macroDashboard] = await Promise.all([
    container.portfolioService.getDashboard(portfolio.id),
    container.macroDashboardService.getDashboard()
  ]);
  const report = await container.bondService.getPortfolioBondAnalytics(dashboard);
  const macroContext = container.macroContextService.buildContext(macroDashboard);

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
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Fixed Income"
        description="Deterministic fixed-income analytics for bond ETF exposure, duration risk, credit risk, inflation sensitivity and recession-hedging role."
        meta={
          <>
            <StatusBadge tone="info">{report.bondHoldings.length} bond ETFs</StatusBadge>
            <StatusBadge tone={report.creditRiskExposure > 0.15 ? "warning" : "positive"}>Credit risk {formatPercent(report.creditRiskExposure)}</StatusBadge>
          </>
        }
      />

      {params?.message || params?.error ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-muted-foreground"}`}>
            {params.error ?? params.message}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Bond allocation" value={formatPercent(report.totalBondAllocation)} description={formatCurrencyWithCode(report.totalBondValue, portfolio.baseCurrency)} />
        <SummaryCard title="Treasury exposure" value={formatPercent(report.treasuryExposure)} description="Portfolio share in treasury or inflation-linked treasury ETFs." />
        <SummaryCard title="Credit-risk exposure" value={formatPercent(report.creditRiskExposure)} description="Corporate and high-yield bond ETF exposure." />
        <SummaryCard title="Inflation-linked" value={formatPercent(report.inflationLinkedExposure)} description="TIPS or inflation-linked bond ETF exposure." />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Bond-relevant macro context</CardTitle>
          <CardDescription>FRED regime inputs for rate, inflation, yield-curve, and liquidity context. No bond recommendations are generated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {macroContext.regimeCards.filter((card) => ["Rates", "Inflation", "Yield curve", "Liquidity"].includes(card.label)).map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-sm font-medium">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
          <ContextList items={macroContext.bondContext} />
          <div className="professional-table overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left">
                <tr>
                  <th className="p-3 font-medium">Indicator</th>
                  <th className="p-3 font-medium">Latest</th>
                  <th className="p-3 font-medium">1Y change</th>
                  <th className="p-3 font-medium">Direction</th>
                </tr>
              </thead>
              <tbody>
                {macroContext.keyIndicators.filter((indicator) => ["FEDFUNDS", "DGS10", "T10Y2Y", "CPIAUCSL", "PCEPILFE", "NFCI"].includes(indicator.code)).map((indicator) => (
                  <tr key={indicator.code} className="">
                    <td className="p-3">
                      <p className="font-medium">{indicator.code}</p>
                      <p className="text-xs text-muted-foreground">{indicator.name}</p>
                    </td>
                    <td className="p-3">{indicator.latestValue}</td>
                    <td className="p-3">{indicator.oneYearChange}</td>
                    <td className="p-3">{indicator.direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {report.warnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bond risk warnings</CardTitle>
            <CardDescription>Deterministic checks for duration and credit exposure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {report.warnings.map((warning) => (
              <div key={warning} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm text-sm">
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
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
            <CardDescription>Plain-language checks for the current bond sleeve.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.diagnostics.map((item) => <p key={item} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">{item}</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Allocation guidance inputs</CardTitle>
            <CardDescription>Deterministic notes that future allocation logic can consume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.allocationGuidance.map((item) => <p key={item} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">{item}</p>)}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Bond scenario impacts</CardTitle>
          <CardDescription>Foundation-level deterministic estimates using duration and credit-spread placeholders.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScenarioTable report={report} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bond ETF exposure table</CardTitle>
          <CardDescription>Seeded/manual classifications are used first; FMP metadata does not overwrite curated bond classifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <BondHoldingsTable report={report} />
        </CardContent>
      </Card>

      <BondProfileEditor holdings={report.bondHoldings} />
    </PageContainer>
  );
}
