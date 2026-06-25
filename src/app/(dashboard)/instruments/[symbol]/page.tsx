import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { createContainer } from "@/server/container";
import {
  InstrumentOverviewPanel,
  InstrumentTabs,
  MarketVisionContextCard,
  NewsSummaryCard,
  PlaceholderPanel,
  RecommendationSummaryCard,
  RiskSummaryCard,
  SummaryMetric,
  ThemesPanel
} from "@/components/instruments/instrument-cards";
import { InstrumentPriceChart } from "@/components/instruments/instrument-price-chart";
import { ScoreTrendPanel } from "@/components/instruments/score-trend-panel";
import { DataFreshnessBadge, InstrumentTypeBadge } from "@/components/instruments/instrument-badges";
import { instrumentTypeLabel, resolveInstrumentType, type CanonicalInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";
import { scoreBusinessQuality } from "@/application/services/recommendations/recommendationScoring";
import type { FundamentalsDetail } from "@/domain/fundamentals/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { BondProfile, Instrument, InstrumentMarketView, InstrumentRiskMetric } from "@/domain/universe/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";

type InstrumentDetailPageProps = {
  params: Promise<{ symbol: string }>;
};

function score(value: number | null | undefined) {
  return value == null ? "-" : `${Math.round(value)}/100`;
}

function ratio(value: number | null | undefined) {
  return value == null ? "-" : formatNumber(value);
}

function percent(value: number | null | undefined) {
  return value == null ? "-" : formatPercent(value);
}

function dailyChangeAmount(latestPrice: number | null | undefined, dailyReturn: number | null | undefined) {
  if (latestPrice == null || dailyReturn == null || !Number.isFinite(latestPrice) || !Number.isFinite(dailyReturn)) return null;
  const prior = latestPrice / (1 + dailyReturn);
  return latestPrice - prior;
}

function trendLabel(value: string | null | undefined) {
  if (value === "not_applicable") return "N/A";
  return value ? value.replaceAll("_", " ") : "-";
}

function displayPeriodLabel(value: string | null | undefined) {
  if (value === "annual") return "annual";
  if (value === "quarterly") return "quarterly";
  return "period";
}

function basisLabel(window: string | null | undefined, period: string | null | undefined) {
  if (!window || !period) return "-";
  if (window === "short_term" && period === "quarterly") return "YoY quarterly";
  if (window === "long_term" && period === "annual") return "Annual";
  return `${trendLabel(window)} ${displayPeriodLabel(period)}`;
}

function trendValue(value: number | null | undefined, metricName: string) {
  if (value == null) return "-";
  if (metricName.includes("margin") || metricName.includes("growth") || ["roe", "roic", "roa"].includes(metricName)) {
    return formatPercent(value);
  }
  return formatNumber(value);
}

function categoryLabel(value: string) {
  const labels: Record<string, string> = {
    growth: "Growth",
    margin: "Margins",
    profitability: "Profitability",
    balance_sheet: "Balance Sheet",
    quality: "Quality"
  };
  return labels[value] ?? value;
}

function FundamentalsPanel({ detail }: { detail: FundamentalsDetail | null }) {
  if (!detail) {
    return <PlaceholderPanel title="Fundamentals" description="No fundamentals are linked to this stock yet. Refresh fundamentals from Admin Data Sources." />;
  }
  const latestRatio = detail.latestRatio;
  const latestIncome = detail.statements.find((statement) => statement.statementType === "income_statement");
  const latestCashFlow = detail.statements.find((statement) => statement.statementType === "cash_flow");
  const latestBalance = detail.statements.find((statement) => statement.statementType === "balance_sheet");
  const sharesOutstanding = latestIncome?.sharesOutstanding ?? latestBalance?.sharesOutstanding ?? latestCashFlow?.sharesOutstanding ?? null;
  const currency = detail.profile?.currency ?? detail.instrument.currency ?? "USD";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Fundamental Scores</CardTitle>
          <CardDescription>Deterministic company fundamentals only. No buy/sell instructions are generated.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Business Quality" value={score(scoreBusinessQuality(detail.latestScore))} />
          <SummaryMetric label="Growth" value={score(detail.latestScore?.growthScore)} />
          <SummaryMetric label="Profitability" value={score(detail.latestScore?.profitabilityScore)} />
          <SummaryMetric label="Valuation" value={score(detail.latestScore?.valuationScore)} />
          <SummaryMetric label="Balance sheet" value={score(detail.latestScore?.balanceSheetScore)} />
          <SummaryMetric label="Cash flow" value={score(detail.latestScore?.cashFlowScore)} />
          <SummaryMetric label="Quality" value={score(detail.latestScore?.qualityScore)} />
          <SummaryMetric label="Confidence" value={detail.latestScore ? formatPercent(detail.latestScore.scoreConfidence / 100) : "-"} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>Normalized provider profile linked to the canonical instrument.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <SummaryMetric label="Sector" value={detail.profile?.sector ?? detail.instrument.canonicalSector ?? "-"} />
            <SummaryMetric label="Industry" value={detail.profile?.industry ?? detail.instrument.industry ?? "-"} />
            <SummaryMetric label="Market cap" value={detail.profile?.marketCap == null ? "-" : formatCurrencyWithCode(detail.profile.marketCap, currency)} />
            <SummaryMetric label="Shares outstanding" value={sharesOutstanding == null ? "-" : formatNumber(sharesOutstanding)} />
            <SummaryMetric label="Beta" value={ratio(detail.profile?.beta)} />
            <SummaryMetric label="Country" value={detail.profile?.country ?? "-"} />
            <SummaryMetric label="Last refreshed" value={detail.profile?.lastRefreshedAt?.slice(0, 10) ?? "-"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest Ratios</CardTitle>
            <CardDescription>Valuation, growth, profitability and leverage inputs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <SummaryMetric label="P/E" value={ratio(latestRatio?.peRatio)} />
            <SummaryMetric label="Price / sales" value={ratio(latestRatio?.priceToSales)} />
            <SummaryMetric label="Gross margin" value={percent(latestRatio?.grossMargin)} />
            <SummaryMetric label="Operating margin" value={percent(latestRatio?.operatingMargin)} />
            <SummaryMetric label="Revenue growth" value={percent(latestRatio?.revenueGrowth)} />
            <SummaryMetric label="EPS growth" value={percent(latestRatio?.epsGrowth)} />
            <SummaryMetric label="ROE" value={percent(latestRatio?.roe)} />
            <SummaryMetric label="Debt / equity" value={ratio(latestRatio?.debtToEquity)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statements Snapshot</CardTitle>
          <CardDescription>Latest normalized income, cash flow and balance sheet records.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Revenue" value={latestIncome?.revenue == null ? "-" : formatCurrencyWithCode(latestIncome.revenue, currency)} />
          <SummaryMetric label="Net income" value={latestIncome?.netIncome == null ? "-" : formatCurrencyWithCode(latestIncome.netIncome, currency)} />
          <SummaryMetric label="Diluted EPS" value={latestIncome?.dilutedEps == null ? "-" : formatNumber(latestIncome.dilutedEps)} />
          <SummaryMetric label="Shares outstanding" value={sharesOutstanding == null ? "-" : formatNumber(sharesOutstanding)} />
          <SummaryMetric label="Free cash flow" value={latestCashFlow?.freeCashFlow == null ? "-" : formatCurrencyWithCode(latestCashFlow.freeCashFlow, currency)} />
          <SummaryMetric label="Operating cash flow" value={latestCashFlow?.operatingCashFlow == null ? "-" : formatCurrencyWithCode(latestCashFlow.operatingCashFlow, currency)} />
          <SummaryMetric label="Cash" value={latestBalance?.cashAndEquivalents == null ? "-" : formatCurrencyWithCode(latestBalance.cashAndEquivalents, currency)} />
          <SummaryMetric label="Total debt" value={latestBalance?.totalDebt == null ? "-" : formatCurrencyWithCode(latestBalance.totalDebt, currency)} />
          <SummaryMetric label="Equity" value={latestBalance?.shareholdersEquity == null ? "-" : formatCurrencyWithCode(latestBalance.shareholdersEquity, currency)} />
          <SummaryMetric label="Warnings" value={detail.missingDataWarnings.length === 0 ? "-" : detail.missingDataWarnings.join("; ")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fundamental Trends</CardTitle>
          <CardDescription>Stored deterministic trend analysis from annual and quarterly fundamentals. No AI or investment recommendations are used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.trendSummary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryMetric label="Overall trend" value={trendLabel(detail.trendSummary.overallTrendDirection)} />
              <SummaryMetric label="Trend score" value={score(detail.trendSummary.overallTrendScore)} />
              <SummaryMetric label="Trend confidence" value={formatPercent(detail.trendSummary.overallConfidenceScore / 100)} />
              <SummaryMetric label="Metric mix" value={`+${detail.trendSummary.improvingMetricsCount} / -${detail.trendSummary.deterioratingMetricsCount}`} />
              <SummaryMetric label="Growth trend" value={score(detail.trendSummary.growthTrendScore)} />
              <SummaryMetric label="Margin trend" value={score(detail.trendSummary.marginTrendScore)} />
              <SummaryMetric label="Profitability trend" value={score(detail.trendSummary.profitabilityTrendScore)} />
              <SummaryMetric label="Balance trend" value={score(detail.trendSummary.balanceSheetTrendScore)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No stored trend summary yet. Refresh fundamentals from Admin Data Sources after applying the trend migration.</p>
          )}
          {detail.trendSummary?.warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {detail.trendSummary.warnings.join(" ")}
            </div>
          ) : null}
          {detail.trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Trend rows will appear after the next fundamentals refresh.</p>
          ) : (
            <details className="rounded-lg border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">Show detailed trend rows</summary>
              <div className="mt-4 space-y-5">
                {["growth", "margin", "profitability", "balance_sheet", "quality"].map((category) => {
                  const rows = detail.trends.filter((trend) => trend.metricCategory === category);
                  if (rows.length === 0) return null;
                  return (
                    <div key={category} className="space-y-2">
                      <h3 className="text-sm font-semibold">{categoryLabel(category)}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b uppercase text-muted-foreground">
                            <tr>
                              <th className="py-2 pr-3">Metric</th>
                              <th className="py-2 pr-3">Latest shown</th>
                              <th className="py-2 pr-3">Prior shown</th>
                              <th className="py-2 pr-3">Short term</th>
                              <th className="py-2 pr-3">Long term</th>
                              <th className="py-2 pr-3">Basis</th>
                              <th className="py-2 pr-3">Overall</th>
                              <th className="py-2 pr-3">Score</th>
                              <th className="py-2 pr-3">Confidence</th>
                              <th className="py-2 pr-3">Explanation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((trend) => (
                              <tr key={trend.metricName} className="border-b align-top last:border-0">
                                <td className="py-2 pr-3 font-medium capitalize">{trend.metricName.replaceAll("_", " ")}</td>
                                <td className="py-2 pr-3">
                                  {trendValue(trend.currentValue, trend.metricName)}
                                  <div className="text-[11px] text-muted-foreground">{displayPeriodLabel(trend.displayPeriod)}</div>
                                </td>
                                <td className="py-2 pr-3">
                                  {trendValue(trend.previousValue, trend.metricName)}
                                  <div className="text-[11px] text-muted-foreground">{displayPeriodLabel(trend.displayPeriod)}</div>
                                </td>
                                <td className="py-2 pr-3 capitalize">{trendLabel(trend.shortTermTrendDirection)} ({trend.shortTermPeriodsAnalyzed})</td>
                                <td className="py-2 pr-3 capitalize">{trendLabel(trend.longTermTrendDirection)} ({trend.longTermPeriodsAnalyzed})</td>
                                <td className="py-2 pr-3">{basisLabel(trend.displayWindow, trend.displayPeriod)}</td>
                                <td className="py-2 pr-3 capitalize">{trendLabel(trend.overallTrendDirection)}</td>
                                <td className="py-2 pr-3">{score(trend.overallTrendScore)}</td>
                                <td className="py-2 pr-3">{formatPercent(trend.overallConfidenceScore / 100)}</td>
                                <td className="max-w-md py-2 pr-3 text-muted-foreground">{trend.explanation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FundamentalsPanelFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fundamentals</CardTitle>
        <CardDescription>Loading stored fundamentals and trend detail...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-24 rounded-xl border border-dashed bg-slate-50" />
      </CardContent>
    </Card>
  );
}

function InstrumentPriceChartFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price chart</CardTitle>
        <CardDescription>Loading stored adjusted close history...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-44 animate-pulse rounded-lg border bg-muted/40" />
      </CardContent>
    </Card>
  );
}

async function AsyncInstrumentPriceChart({
  instrumentId,
  fromYears,
  fiftyTwoWeekLow,
  fiftyTwoWeekHigh
}: {
  instrumentId: string;
  fromYears: number;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
}) {
  const container = createContainer();
  const series = await measureRenderStep(`instrument-detail:${instrumentId}:price-series`, () =>
    container.universeRepository.getInstrumentPriceSeries(instrumentId, { fromYears })
  );
  return <InstrumentPriceChart series={series} fiftyTwoWeekLow={fiftyTwoWeekLow} fiftyTwoWeekHigh={fiftyTwoWeekHigh} />;
}

function ScoreTrendPanelFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Characteristics score trend</CardTitle>
        <CardDescription>Loading stored insight history...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />
      </CardContent>
    </Card>
  );
}

async function AsyncScoreTrendPanel({ instrumentId }: { instrumentId: string }) {
  const container = createContainer();
  const history = await measureRenderStep(`instrument-detail:${instrumentId}:score-history`, () =>
    container.recommendationService.getScoreHistory(instrumentId)
  );
  return <ScoreTrendPanel history={history} />;
}

async function AsyncFundamentalsPanel({ symbol }: { symbol: string }) {
  const container = createContainer();
  const detail = await measureRenderStep(`instrument-detail:${symbol}:fundamentals-detail-data`, () =>
    container.fundamentalsRepository.getDetailBySymbol(symbol)
  );
  return <FundamentalsPanel detail={detail} />;
}

function BondProfilePanel({ profile }: { profile: BondProfile | null }) {
  if (!profile) {
    return <PlaceholderPanel title="Bond Profile" description="No bond profile is linked to this instrument yet." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bond Profile</CardTitle>
        <CardDescription>Curated fixed-income classification used by bond and risk analytics.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Duration" value={profile.durationCategory ?? "-"} />
        <SummaryMetric label="Bond type" value={profile.treasuryClassification ?? "-"} />
        <SummaryMetric label="Credit quality" value={profile.creditQuality ?? "-"} />
        <SummaryMetric label="Geography" value={profile.geoExposure ?? "-"} />
        <SummaryMetric label="Rate sensitivity" value={profile.rateSensitivity ?? "-"} />
        <SummaryMetric label="Inflation sensitivity" value={profile.inflationSensitivity ?? "-"} />
        <SummaryMetric label="Recession sensitivity" value={profile.recessionSensitivity ?? "-"} />
        <SummaryMetric label="Liquidity role" value={profile.liquidityRole ?? "-"} />
        <SummaryMetric label="SEC yield" value={profile.secYield == null ? "-" : formatPercent(profile.secYield)} />
        <SummaryMetric label="Effective duration" value={profile.effectiveDuration == null ? "-" : `${profile.effectiveDuration.toFixed(2)} yrs`} />
      </CardContent>
    </Card>
  );
}

function tabsForType(
  type: CanonicalInstrumentType,
  instrument: Instrument,
  typeLabel: string,
  marketView: InstrumentMarketView,
  bondProfile: BondProfile | null,
  riskMetric: InstrumentRiskMetric | null,
  recommendation: InstrumentRecommendation | null,
  priceChart: ReactNode,
  scoreTrend: ReactNode
) {
  const common = {
    overview: <InstrumentOverviewPanel marketView={marketView} riskMetric={riskMetric} recommendation={recommendation} priceChart={priceChart} scoreTrend={scoreTrend} />,
    news: <NewsSummaryCard />,
    themes: <ThemesPanel instrument={instrument} />,
    risk: <RiskSummaryCard instrument={instrument} riskMetric={riskMetric} />,
    marketVision: <MarketVisionContextCard />,
    recommendations: <RecommendationSummaryCard recommendation={recommendation} />
  };

  if (type === "stock") {
    return [
      { label: "Overview", content: common.overview },
      {
        label: "Fundamentals",
        content: instrument.symbol ? (
          <Suspense fallback={<FundamentalsPanelFallback />}>
            <AsyncFundamentalsPanel symbol={instrument.symbol} />
          </Suspense>
        ) : (
          <FundamentalsPanel detail={null} />
        )
      },
      { label: "Risk", content: common.risk },
      { label: "Insights", content: common.recommendations },
      { label: "News", content: common.news },
      { label: "Themes", content: common.themes },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  if (type === "bond_etf") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Bond Profile", content: <BondProfilePanel profile={bondProfile} /> },
      { label: "Risk", content: common.risk },
      { label: "Insights", content: common.recommendations },
      { label: "News", content: common.news },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  if (type === "gold_etf") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Risk", content: common.risk },
      { label: "Insights", content: common.recommendations },
      { label: "News", content: common.news },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  if (type === "crypto") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Risk", content: common.risk },
      { label: "Insights", content: common.recommendations },
      { label: "News", content: common.news },
      { label: "Themes", content: common.themes },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  if (type === "benchmark") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  return [
    { label: "Overview", content: common.overview },
    { label: "Risk", content: common.risk },
    { label: "Insights", content: common.recommendations },
    { label: "Themes", content: common.themes },
    { label: "News", content: common.news },
    { label: "Market Vision Context", content: common.marketVision }
  ];
}

function StickyInstrumentIdentity({
  instrument,
  typeLabel,
  marketView
}: {
  instrument: Instrument;
  typeLabel: string;
  marketView: InstrumentMarketView;
}) {
  const currency = instrument.currency ?? "USD";
  const changeAmount = dailyChangeAmount(marketView.latestPrice, marketView.dailyReturn);
  const dailyIsPositive = (marketView.dailyReturn ?? 0) >= 0;
  const dailyClass = dailyIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="sticky top-16 z-30 rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link href="/instruments/universe" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
            Back to universe
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{instrument.symbol ?? "-"}</h1>
            <p className="min-w-0 text-sm text-muted-foreground">{instrument.name}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InstrumentTypeBadge label={typeLabel} />
            <DataFreshnessBadge label={marketView.freshnessLabel} tone={marketView.freshnessTone} />
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{instrument.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current price</p>
            <p className="mt-1 text-base font-semibold text-foreground">{marketView.latestPrice == null ? "-" : formatCurrencyWithCode(marketView.latestPrice, currency)}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Daily change</p>
            <p className={`mt-1 text-sm font-semibold ${dailyClass}`}>
              {marketView.dailyReturn == null ? "-" : `${dailyIsPositive ? "+" : ""}${changeAmount == null ? "" : formatCurrencyWithCode(changeAmount, currency)} (${formatPercent(marketView.dailyReturn)})`}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">1Y return</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{percent(marketView.oneYearReturn)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function InstrumentDetailPage({ params }: InstrumentDetailPageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  const container = createContainer();
  await container.authProvider.requireUser();

  const instrument = await measureRenderStep(`instrument-detail:${decodedSymbol}:instrument-lookup`, () =>
    container.instrumentService.getBySymbol(decodedSymbol)
  );
  if (!instrument) notFound();

  const type = resolveInstrumentType(instrument);
  const typeLabel = instrumentTypeLabel(type);
  const [marketViews, bondProfile, riskMetric, recommendation] = await measureRenderStep(
    `instrument-detail:${decodedSymbol}:detail-data`,
    () => Promise.all([
      container.instrumentMarketService.buildInstrumentMarketViews([instrument], { lookbackYears: 1 }),
      container.instrumentService.getBondProfile(instrument.id),
      container.instrumentRiskService.getInstrumentRiskMetric(instrument),
      container.recommendationService.getLatestForInstrument(instrument.id)
    ])
  );
  const marketView = marketViews[0];
  const priceChart = (
    <Suspense fallback={<InstrumentPriceChartFallback />}>
      <AsyncInstrumentPriceChart
        instrumentId={instrument.id}
        fromYears={20}
        fiftyTwoWeekLow={marketView.fiftyTwoWeekLow}
        fiftyTwoWeekHigh={marketView.fiftyTwoWeekHigh}
      />
    </Suspense>
  );
  const scoreTrend = (
    <Suspense fallback={<ScoreTrendPanelFallback />}>
      <AsyncScoreTrendPanel instrumentId={instrument.id} />
    </Suspense>
  );
  const tabs = tabsForType(type, instrument, typeLabel, marketView, bondProfile, riskMetric, recommendation, priceChart, scoreTrend);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/instruments/universe" className="hover:underline">Instruments</Link>
        <span>/</span>
        <span>{decodedSymbol}</span>
      </div>
      <StickyInstrumentIdentity instrument={instrument} typeLabel={typeLabel} marketView={marketView} />
      <InstrumentTabs tabs={tabs} />
    </div>
  );
}
