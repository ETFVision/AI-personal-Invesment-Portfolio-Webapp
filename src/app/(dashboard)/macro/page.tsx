import { backfillMacroIndicatorsAction, refreshMacroIndicatorsAction } from "@/server/actions/macroActions";
import { createContainer } from "@/server/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/charts";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import type { MacroDashboardIndicator } from "@/domain/macro/types";

type MacroPageProps = {
  searchParams?: Promise<{ message?: string; error?: string }>;
};

function formatNumber(value: number | null, unit: string | null) {
  if (value == null) return "-";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  if (unit === "percent") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatChange(value: number | null, unit: string | null) {
  if (value == null) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, unit)}`;
}

function miniPath(indicator: MacroDashboardIndicator) {
  const points = indicator.observations.filter((item) => item.value != null).slice(-24);
  if (points.length < 2) return "";
  const values = points.map((item) => item.value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return points.map((point, index) => {
    const x = (index / (points.length - 1)) * 180;
    const y = 60 - (((point.value as number) - min) / range) * 60;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function RegimeCard({ title, value }: { title: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-medium capitalize">{(value ?? "insufficient_data").replaceAll("_", " ")}</p>
    </div>
  );
}

export default async function MacroPage({ searchParams }: MacroPageProps) {
  const params = await searchParams;
  const container = createContainer();
  const dashboard = await container.macroDashboardService.getDashboard();
  const latestLog = dashboard.ingestionLogs[0];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="Macro"
        description="FRED indicators for Market Vision, bonds, risk context and future intelligence layers."
        meta={
          <>
            <StatusBadge tone="info">{dashboard.indicators.length} indicators</StatusBadge>
            <StatusBadge tone={latestLog?.status === "success" ? "positive" : latestLog ? "warning" : "neutral"}>{latestLog?.status ?? "Not run"}</StatusBadge>
          </>
        }
        actions={
        <div className="flex flex-wrap gap-2">
          <form action={refreshMacroIndicatorsAction}>
            <SubmitButton pendingLabel="Refreshing...">Refresh FRED</SubmitButton>
          </form>
          <form action={backfillMacroIndicatorsAction}>
            <SubmitButton variant="outline" pendingLabel="Backfilling...">Backfill history</SubmitButton>
          </form>
        </div>
        }
      />

      {params?.message || params?.error ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-muted-foreground"}`}>
            {params.error ?? params.message}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Indicators" value={dashboard.indicators.length} footer="Active FRED series" />
        <MetricCard title="Last refresh" value={latestLog?.completedAt?.slice(0, 10) ?? "Not run"} footer="Most recent ingestion completion" />
        <MetricCard title="Latest status" value={<span className="capitalize">{latestLog?.status ?? "Not run"}</span>} footer="Refresh job outcome" />
        <MetricCard title="Regime date" value={dashboard.latestRegime?.snapshotDate ?? "No regime yet"} footer="Latest macro regime snapshot" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Macro regime snapshot</CardTitle>
          <CardDescription>Deterministic classifications from stored FRED trends. No recommendations are generated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RegimeCard title="Rates" value={dashboard.latestRegime?.ratesRegime} />
            <RegimeCard title="Inflation" value={dashboard.latestRegime?.inflationRegime} />
            <RegimeCard title="Growth" value={dashboard.latestRegime?.growthRegime} />
            <RegimeCard title="Employment" value={dashboard.latestRegime?.employmentRegime} />
            <RegimeCard title="Yield curve" value={dashboard.latestRegime?.yieldCurveRegime} />
            <RegimeCard title="Liquidity" value={dashboard.latestRegime?.liquidityRegime} />
            <RegimeCard title="Dollar" value={dashboard.latestRegime?.dollarRegime} />
            <RegimeCard title="Commodities" value={dashboard.latestRegime?.commoditiesRegime} />
          </div>
          <p className="text-sm text-muted-foreground">{dashboard.latestRegime?.overallMacroSummary ?? "Run a FRED refresh or backfill to create a regime snapshot."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indicator table</CardTitle>
          <CardDescription>Latest value and trend windows by active FRED indicator.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dashboard.indicators.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Apply migration 024 to seed the FRED indicator universe.</div>
          ) : (
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Indicator</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Latest</th>
                  <th className="py-2 pr-3">Direction</th>
                  <th className="py-2 pr-3">1M</th>
                  <th className="py-2 pr-3">3M</th>
                  <th className="py-2 pr-3">6M</th>
                  <th className="py-2 pr-3">1Y</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">History</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.indicators.map((indicator) => {
                  const trend = indicator.latestTrend;
                  const path = miniPath(indicator);
                  return (
                    <tr key={indicator.id} className="border-t align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{indicator.indicatorCode}</div>
                        <div className="text-xs text-muted-foreground">{indicator.indicatorName}</div>
                      </td>
                      <td className="py-3 pr-3">{indicator.category.replace("_", " ")}</td>
                      <td className="py-3 pr-3">
                        <div>{formatNumber(trend?.latestValue ?? null, indicator.unit)}</div>
                        <div className="text-xs text-muted-foreground">{trend?.asOfDate ?? indicator.latestObservation?.observationDate ?? "-"}</div>
                      </td>
                      <td className="py-3 pr-3 capitalize">{trend?.direction?.replaceAll("_", " ") ?? "insufficient data"}</td>
                      <td className="py-3 pr-3">{formatChange(trend?.oneMonthChange ?? null, indicator.unit)}</td>
                      <td className="py-3 pr-3">{formatChange(trend?.threeMonthChange ?? null, indicator.unit)}</td>
                      <td className="py-3 pr-3">{formatChange(trend?.sixMonthChange ?? null, indicator.unit)}</td>
                      <td className="py-3 pr-3">{formatChange(trend?.oneYearChange ?? null, indicator.unit)}</td>
                      <td className="py-3 pr-3">{trend?.confidenceScore ?? 0}/100</td>
                      <td className="py-3 pr-3">
                        {path ? (
                          <Sparkline points={path} />
                        ) : <span className="text-muted-foreground">Needs data</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FRED ingestion logs</CardTitle>
          <CardDescription>Refresh and backfill status for cron portability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {dashboard.ingestionLogs.length === 0 ? (
            <p className="text-muted-foreground">No FRED ingestion jobs have run yet.</p>
          ) : dashboard.ingestionLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <div className="font-medium">{log.jobName} - {log.status}</div>
              <div className="text-muted-foreground">
                {log.indicatorsSuccessful}/{log.indicatorsRequested} indicators, {log.observationsInserted} inserted, {log.observationsUpdated} updated
              </div>
              {log.errorMessage ? <div className="mt-1 text-destructive">{log.errorMessage}</div> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
