import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalExposureBars } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { formatAssetTypeLabel, formatPercent } from "@/lib/utils";
import type { AllocationItem } from "@/domain/portfolio/types";
import type { DrawdownPoint } from "@/application/services/risk/riskMath";
import { RISK_TAXONOMY_VERSION, type RiskAnalyticsReport } from "@/application/services/risk/RiskAnalyticsService";

type ChartPoint = {
  date: string;
  value: number;
};

function formatMaybePercent(value: number | null | undefined) {
  return value == null ? "Not enough data" : formatPercent(value);
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(`${value}T00:00:00Z`));
}

function makePolyline(points: ChartPoint[], width: number, height: number) {
  if (points.length < 2) return "";
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function LineChart({
  points,
  label,
  formatValue
}: {
  points: ChartPoint[];
  label: string;
  formatValue: (value: number) => string;
}) {
  if (points.length < 2) {
    return <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">More stored snapshots are needed for this chart.</div>;
  }

  const width = 720;
  const height = 220;
  const first = points[0];
  const last = points.at(-1) ?? first;
  const path = makePolyline(points, width, height);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full bg-background" role="img" aria-label={label}>
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} className="stroke-muted" strokeWidth="1" />
          <polyline points={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{compactDate(first.date)}</span>
        <span>{formatValue(last.value)}</span>
        <span>{compactDate(last.date)}</span>
      </div>
    </div>
  );
}

function AllocationTable({ title, items }: { title: string; items: AllocationItem[] }) {
  const visibleItems = items.slice(0, 6);
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <HorizontalExposureBars
        items={visibleItems.map((item) => ({
          label: item.label,
          value: item.percent,
          valueLabel: formatPercent(item.percent)
        }))}
        emptyText="No exposure data yet."
      />
    </div>
  );
}

function CorrelationHeatmap({
  matrix,
  emptyText
}: {
  matrix: RiskAnalyticsReport["correlations"]["matrix"];
  emptyText: string;
}) {
  const symbols = Array.from(new Set(matrix.flatMap((cell) => [cell.left, cell.right]))).slice(0, 8);
  if (symbols.length < 2) {
    return <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">{emptyText}</div>;
  }
  const valueFor = (row: string, column: string) => {
    if (row === column) return 1;
    return matrix.find((cell) => cell.left === row && cell.right === column)?.value ?? null;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-16"></th>
            {symbols.map((symbol) => <th key={symbol} className="p-1 text-muted-foreground">{symbol}</th>)}
          </tr>
        </thead>
        <tbody>
          {symbols.map((row) => (
            <tr key={row}>
              <th className="p-1 text-left text-muted-foreground">{row}</th>
              {symbols.map((column) => {
                const value = valueFor(row, column);
                const intensity = value == null ? 0 : Math.max(0, Math.min(1, (value + 1) / 2));
                return (
                  <td
                    key={`${row}-${column}`}
                    className="h-9 min-w-12 rounded text-center"
                    style={{ backgroundColor: `rgba(14, 165, 233, ${0.12 + intensity * 0.55})` }}
                  >
                    {value == null ? "-" : value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskContributorTable({ report }: { report: RiskAnalyticsReport }) {
  const rows = report.riskContributors.slice(0, 8);
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="p-3 font-medium">Instrument</th>
            <th className="p-3 font-medium">Class</th>
            <th className="p-3 text-right font-medium">Allocation</th>
            <th className="p-3 text-right font-medium">Own vol</th>
            <th className="p-3 text-right font-medium">Risk share</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-muted-foreground">No holdings yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.label} className="border-t">
                <td className="p-3 font-medium">{row.label}</td>
                <td className="p-3 text-muted-foreground">{formatAssetTypeLabel(row.assetClass)}</td>
                <td className="p-3 text-right">{formatPercent(row.allocation)}</td>
                <td className="p-3 text-right">{row.annualizedVolatility == null ? "-" : formatPercent(row.annualizedVolatility)}</td>
                <td className="p-3 text-right">{formatPercent(row.riskContribution)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContextList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 text-sm md:grid-cols-2">
      {items.map((item) => <p key={item} className="rounded-md border p-3 text-muted-foreground">{item}</p>)}
    </div>
  );
}

export default async function RiskPage() {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (!portfolio) {
    return (
      <EmptyState
        title="No portfolio yet"
        description="Create your base portfolio before reviewing risk analytics."
        action={<Link className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="/setup">Start setup</Link>}
      />
    );
  }

  const dashboard = await container.portfolioService.getDashboard(portfolio.id);
  const bondReport = await container.bondService.getPortfolioBondAnalytics(dashboard);
  const macroDashboard = await container.macroDashboardService.getDashboard();
  const macroContext = container.macroContextService.buildContext(macroDashboard);
  const cachedRiskReport = await container.riskAnalyticsRepository.getLatestRiskReport(portfolio.id);
  const cachedReport = cachedRiskReport?.report as Partial<RiskAnalyticsReport> | null | undefined;
  const canUseCachedReport = cachedReport?.taxonomyVersion === RISK_TAXONOMY_VERSION;
  const report = canUseCachedReport
    ? cachedReport as RiskAnalyticsReport
    : await container.riskAnalyticsDataService.buildReport(portfolio.id, dashboard);
  if (!canUseCachedReport) {
    await container.riskAnalyticsRepository.upsertRiskReport({
      portfolioId: portfolio.id,
      asOfDate: report.asOfDate,
      report
    });
  }
  const volatilityPoints: ChartPoint[] = report.volatility.trend.map((point) => ({
    date: point.date,
    value: point.volatility ?? 0
  })).filter((point) => point.value > 0);
  const drawdownPoints: ChartPoint[] = report.drawdown.points.map((point: DrawdownPoint) => ({
    date: point.date,
    value: point.drawdown
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Risk"
        description="Deterministic portfolio risk metrics from stored snapshots, prices, metadata and benchmark history."
        meta={
          <>
            <StatusBadge tone="info">As of {report.asOfDate}</StatusBadge>
            <StatusBadge tone={report.diversification.score >= 70 ? "positive" : report.diversification.score >= 45 ? "warning" : "danger"}>
              Diversification {report.diversification.score}/100
            </StatusBadge>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Diversification score</CardTitle>
            <CardDescription>{report.diversification.label}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{report.diversification.score}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>30D volatility</CardTitle>
            <CardDescription>Annualised using sqrt(252).</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatMaybePercent(report.volatility.metrics[0]?.value)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current drawdown</CardTitle>
            <CardDescription>From portfolio snapshot peak.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatMaybePercent(report.drawdown.currentDrawdown)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top holding risk</CardTitle>
            <CardDescription>Share of invested holdings.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatPercent(report.concentration.topHoldingConcentration)}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estimated max drawdown</CardTitle>
            <CardDescription>Current weights replayed over available instrument history.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.estimatedDrawdown?.maxDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.estimatedDrawdown
                ? `${report.estimatedDrawdown.observationCount} overlapping return days, ${formatPercent(report.estimatedDrawdown.coverage)} coverage.`
                : "Needs overlapping historical price data for current holdings."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated current drawdown</CardTitle>
            <CardDescription>Where the current-weight backtest sits versus its prior peak.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.estimatedDrawdown?.currentDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.estimatedDrawdown?.startDate && report.estimatedDrawdown?.endDate
                ? `${compactDate(report.estimatedDrawdown.startDate)} to ${compactDate(report.estimatedDrawdown.endDate)}`
                : "No synthetic history available yet."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Snapshot max drawdown</CardTitle>
            <CardDescription>Actual drawdown since portfolio snapshots began.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMaybePercent(report.drawdown.maxDrawdown)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {report.drawdown.drawdownDurationDays ?? 0} current drawdown day{report.drawdown.drawdownDurationDays === 1 ? "" : "s"}.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bond volatility role</CardTitle>
            <CardDescription>Current bond ETF risk contribution and allocation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatPercent(report.riskByAssetClass.find((item) => item.label === "bond_etf")?.percent ?? 0)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Bond ETFs are {formatPercent(bondReport.totalBondAllocation)} of the portfolio by current value.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bond duration exposure</CardTitle>
            <CardDescription>Long-duration and cash-like bond sleeve exposure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatPercent(bondReport.longDurationExposure)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatPercent(bondReport.cashLikeExposure)} is classified as cash-like bond ETF exposure.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bond credit risk</CardTitle>
            <CardDescription>Corporate and high-yield bond ETF exposure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatPercent(bondReport.creditRiskExposure)}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              High-yield exposure is {formatPercent(bondReport.highYieldExposure)}.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Macro risk context</CardTitle>
          <CardDescription>FRED regimes provide context for rate, inflation, recession/yield-curve, and liquidity sensitivity. Portfolio risk math is unchanged.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {macroContext.regimeCards.filter((card) => ["Rates", "Inflation", "Yield curve", "Liquidity"].includes(card.label)).map((card) => (
              <div key={card.label} className="rounded-md border p-3">
                <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-sm font-medium">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
          <ContextList items={macroContext.riskContext} />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-medium">Indicator</th>
                  <th className="p-3 font-medium">Latest</th>
                  <th className="p-3 font-medium">1Y change</th>
                  <th className="p-3 text-right font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {macroContext.keyIndicators.slice().sort((a, b) => b.severityScore - a.severityScore).slice(0, 6).map((indicator) => (
                  <tr key={indicator.code} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{indicator.code}</p>
                      <p className="text-xs text-muted-foreground">{indicator.name}</p>
                    </td>
                    <td className="p-3">{indicator.latestValue}</td>
                    <td className="p-3">{indicator.oneYearChange}</td>
                    <td className="p-3 text-right">{indicator.severityScore}/100</td>
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
            <CardTitle>Warnings and insights</CardTitle>
            <CardDescription>Simple deterministic checks for early risk review.</CardDescription>
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volatility trend</CardTitle>
            <CardDescription>Rolling 30-day annualised portfolio volatility.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart points={volatilityPoints} label="Rolling portfolio volatility" formatValue={formatPercent} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Snapshot drawdown trend</CardTitle>
            <CardDescription>Actual portfolio decline from the latest stored snapshot peak.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart points={drawdownPoints} label="Portfolio drawdown" formatValue={formatPercent} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Concentration</CardTitle>
            <CardDescription>Current invested exposure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Top 5 holdings</span>
              <span className="font-medium">{formatPercent(report.concentration.topFiveConcentration)}</span>
            </div>
            <AllocationTable title="Asset class" items={report.concentration.byAssetClass} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exposure profile</CardTitle>
            <CardDescription>Sector and geography spread.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AllocationTable title="Sector" items={report.concentration.bySector} />
            <AllocationTable title="Geography" items={report.concentration.byGeography} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Currency exposure</CardTitle>
            <CardDescription>Native currency concentration before FX conversion.</CardDescription>
          </CardHeader>
          <CardContent>
            <AllocationTable title="Currency" items={report.concentration.byCurrency} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Correlation heatmap</CardTitle>
            <CardDescription>Product-level correlations from holding snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="mb-3 text-sm font-medium">Holdings</h3>
              <CorrelationHeatmap
                matrix={report.correlations.matrix}
                emptyText="More product-level price history is needed for holding correlations."
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Asset classes</h3>
              <CorrelationHeatmap
                matrix={report.assetClassCorrelations.matrix}
                emptyText="More multi-asset history is needed for asset-class correlations."
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top risk contributors</CardTitle>
            <CardDescription>
              {report.riskContributionMethod === "covariance"
                ? `Covariance-based, ${report.riskContributionObservationCount} overlapping return days.`
                : "Proxy estimate until enough overlapping daily price history exists."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Method</p>
                <p className="mt-1 font-medium">{report.riskContributionMethod === "covariance" ? "Covariance-based" : "Proxy estimate"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">History coverage</p>
                <p className="mt-1 font-medium">{formatPercent(report.riskContributionCoverage)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Risk model vol</p>
                <p className="mt-1 font-medium">{report.riskContributionVolatility == null ? "-" : formatPercent(report.riskContributionVolatility)}</p>
              </div>
            </div>
            <RiskContributorTable report={report} />
            <AllocationTable title="Volatility contribution by asset class" items={report.riskByAssetClass} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark drawdown comparison</CardTitle>
          <CardDescription>Portfolio snapshot drawdown versus full benchmark history where available.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-medium">Benchmark</th>
                  <th className="p-3 text-right font-medium">Portfolio max drawdown</th>
                  <th className="p-3 text-right font-medium">Benchmark max drawdown</th>
                  <th className="p-3 text-right font-medium">Gap</th>
                  <th className="p-3 text-right font-medium">History</th>
                </tr>
              </thead>
              <tbody>
                {report.benchmarkDrawdowns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-muted-foreground">Refresh benchmark history to compare drawdowns.</td>
                  </tr>
                ) : (
                  report.benchmarkDrawdowns.map((row) => (
                    <tr key={row.benchmarkKey} className="border-t">
                      <td className="p-3 font-medium">{row.benchmarkName}</td>
                      <td className="p-3 text-right">{formatMaybePercent(row.portfolioMaxDrawdown)}</td>
                      <td className="p-3 text-right">{formatMaybePercent(row.benchmarkMaxDrawdown)}</td>
                      <td className="p-3 text-right">
                        {row.portfolioMaxDrawdown == null || row.benchmarkMaxDrawdown == null
                          ? "Not enough data"
                          : formatPercent(row.portfolioMaxDrawdown - row.benchmarkMaxDrawdown)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.benchmarkObservationCount > 0 ? `${row.benchmarkObservationCount} rows` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Values are in {portfolio.baseCurrency}; cash is included in portfolio-level volatility and drawdown because it affects total account risk.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
