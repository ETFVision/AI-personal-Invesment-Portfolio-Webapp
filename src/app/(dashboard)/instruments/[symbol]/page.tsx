import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  LineChart,
  PiggyBank,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { createContainer } from "@/server/container";
import {
  InstrumentOverviewPanel,
  InstrumentTabs,
  KeyFactsCard,
  MarketVisionContextCard,
  NewsSummaryCard,
  PlaceholderPanel,
  RecommendationSummaryCard,
  ReturnCharacterCard,
  RiskSummaryCard,
  SummaryMetric,
  ThemesPanel
} from "@/components/instruments/instrument-cards";
import { InstrumentPriceChart } from "@/components/instruments/instrument-price-chart";
import { ScoreTrendPanel } from "@/components/instruments/score-trend-panel";
import { DataFreshnessBadge, InstrumentTypeBadge } from "@/components/instruments/instrument-badges";
import { riskUniverseVolatilityLabel, worstPeriodReturnFromSeries } from "@/components/instruments/instrument-risk-display";
import { instrumentTypeLabel, resolveInstrumentType, type CanonicalInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";
import { scoreBusinessQuality } from "@/application/services/recommendations/recommendationScoring";
import { CHARACTERISTICS_SCORE_BANDS, assessmentLabel, assessmentTone } from "@/application/services/recommendations/recommendationPresentation";
import type { FundamentalTrend, FundamentalTrendDirection, FundamentalsDetail } from "@/domain/fundamentals/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { BondProfile, Instrument, InstrumentMarketView, InstrumentRiskMetric, PriceSeriesPoint } from "@/domain/universe/types";
import type { OverviewKeyFacts, ReturnCharacterStats } from "@/components/instruments/instrument-cards";
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

function rollingOneYearStats(series: PriceSeriesPoint[]): Pick<ReturnCharacterStats, "bestRollingOneYear" | "worstRollingOneYear" | "positiveRollingOneYearWindows"> {
  const sorted = series
    .filter((point) => point.date && Number.isFinite(point.close) && point.close > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const returns: number[] = [];
  let baselineIndex = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const point = sorted[index];
    const pointDate = new Date(`${point.date}T00:00:00Z`);
    if (Number.isNaN(pointDate.getTime())) continue;
    pointDate.setUTCDate(pointDate.getUTCDate() - 365);
    const targetDate = pointDate.toISOString().slice(0, 10);
    while (baselineIndex + 1 < index && sorted[baselineIndex + 1].date <= targetDate) {
      baselineIndex += 1;
    }
    const baseline = sorted[baselineIndex];
    if (!baseline || baseline.date > targetDate || baseline.close <= 0) continue;
    returns.push(point.close / baseline.close - 1);
  }
  if (returns.length < 20) {
    return { bestRollingOneYear: null, worstRollingOneYear: null, positiveRollingOneYearWindows: null };
  }
  return {
    bestRollingOneYear: Math.max(...returns),
    worstRollingOneYear: Math.min(...returns),
    positiveRollingOneYearWindows: returns.filter((value) => value > 0).length / returns.length
  };
}

function worstWeekAllHistory(series: PriceSeriesPoint[]) {
  return worstPeriodReturnFromSeries(series, 7);
}

function returnCharacterStats(series: PriceSeriesPoint[], marketView: InstrumentMarketView, riskMetric: InstrumentRiskMetric | null): ReturnCharacterStats {
  const rolling = rollingOneYearStats(series);
  const belowHigh =
    marketView.latestPrice == null || marketView.fiftyTwoWeekHigh == null || marketView.fiftyTwoWeekHigh <= 0
      ? null
      : Math.max(0, (marketView.fiftyTwoWeekHigh - marketView.latestPrice) / marketView.fiftyTwoWeekHigh);
  return {
    ...rolling,
    belowFiftyTwoWeekHigh: belowHigh,
    deepestDrawdown: riskMetric?.maxDrawdown20y ?? riskMetric?.maxDrawdown ?? null,
    worstWeekAllHistory: worstWeekAllHistory(series)
  };
}

function universePercentileLabel(currentScore: number | null | undefined, rows: Array<{ instrumentId: string; overallScore: number | null }>, instrumentId: string) {
  if (currentScore == null || !Number.isFinite(currentScore)) return "—";
  const scoredRows = rows.filter((row) => row.overallScore != null && Number.isFinite(row.overallScore));
  const activeScore = scoredRows.find((row) => row.instrumentId === instrumentId)?.overallScore ?? currentScore;
  if (scoredRows.length === 0 || activeScore == null) return "—";
  const shareLower = scoredRows.filter((row) => (row.overallScore ?? -Infinity) < activeScore).length / scoredRows.length;
  const topPercent = Math.max(1, Math.min(100, Math.ceil((1 - shareLower) * 100)));
  return `Top ${topPercent}% vs universe`;
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

type FundamentalComponentKey = "growthScore" | "profitabilityScore" | "cashFlowScore" | "balanceSheetScore" | "qualityScore" | "valuationScore";

const FUNDAMENTAL_COMPONENTS: Array<{ key: FundamentalComponentKey; label: string; icon: typeof BarChart3 }> = [
  { key: "growthScore", label: "Growth", icon: TrendingUp },
  { key: "profitabilityScore", label: "Profitability", icon: BadgeDollarSign },
  { key: "cashFlowScore", label: "Cash flow", icon: CircleDollarSign },
  { key: "balanceSheetScore", label: "Balance sheet", icon: Scale },
  { key: "qualityScore", label: "Quality", icon: ShieldCheck },
  { key: "valuationScore", label: "Valuation", icon: PiggyBank }
];

const TREND_CATEGORIES = [
  { key: "growth", label: "Growth", descriptor: "Revenue & earnings growth", scoreKey: "growthTrendScore", icon: TrendingUp },
  { key: "margin", label: "Margins", descriptor: "Gross, operating, and net margins", scoreKey: "marginTrendScore", icon: LineChart },
  { key: "profitability", label: "Profitability", descriptor: "Returns and profit efficiency", scoreKey: "profitabilityTrendScore", icon: BadgeDollarSign },
  { key: "balance_sheet", label: "Balance Sheet", descriptor: "Leverage, liquidity, and capital structure", scoreKey: "balanceSheetTrendScore", icon: WalletCards },
  { key: "quality", label: "Quality", descriptor: "Earnings quality and cash conversion", scoreKey: "qualityTrendScore", icon: Sparkles }
] as const;

function scoreBand(scoreValue: number | null | undefined) {
  if (scoreValue == null || !Number.isFinite(scoreValue)) return { label: assessmentLabel("Insufficient Data"), tone: assessmentTone("Insufficient Data") };
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.excellent) return { label: "Excellent", tone: assessmentTone("Excellent") };
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.good) return { label: "Good", tone: assessmentTone("Good") };
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.neutral) return { label: "Neutral", tone: assessmentTone("Neutral") };
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.weak) return { label: "Weak", tone: assessmentTone("Weak") };
  return { label: "Poor", tone: assessmentTone("Poor") };
}

function toneClassName(tone: string) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";
  return "border-border bg-muted text-muted-foreground";
}

function ScoreChip({ scoreValue }: { scoreValue: number | null | undefined }) {
  const band = scoreBand(scoreValue);
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${toneClassName(band.tone)}`}>{band.label}</span>;
}

function scoreBarClass(scoreValue: number | null | undefined) {
  if (scoreValue == null) return "bg-muted-foreground/40";
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.good) return "bg-emerald-600";
  if (scoreValue >= CHARACTERISTICS_SCORE_BANDS.neutral) return "bg-amber-500";
  return "bg-red-600";
}

function trendDirectionTone(direction: FundamentalTrendDirection | string | null | undefined) {
  if (direction === "accelerating" || direction === "improving" || direction === "rebounding") return "positive";
  if (direction === "decelerating" || direction === "deteriorating") return "danger";
  if (direction === "volatile" || direction === "mixed") return "warning";
  if (direction === "stable") return "neutral";
  return "neutral";
}

function TrendChip({ direction }: { direction: FundamentalTrendDirection | string | null | undefined }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${toneClassName(trendDirectionTone(direction))}`}>{trendLabel(direction)}</span>;
}

function aggregateTrendDirection(rows: FundamentalTrend[]): FundamentalTrendDirection {
  const improving = rows.filter((trend) => ["accelerating", "improving", "rebounding"].includes(trend.overallTrendDirection)).length;
  const deteriorating = rows.filter((trend) => ["decelerating", "deteriorating"].includes(trend.overallTrendDirection)).length;
  if (improving > deteriorating) return "improving";
  if (deteriorating > improving) return "deteriorating";
  return "stable";
}

function TrendGlyph({ direction }: { direction: FundamentalTrendDirection | string | null | undefined }) {
  const tone = trendDirectionTone(direction);
  const stroke = tone === "positive" ? "#1D9E75" : tone === "danger" ? "#E24B4A" : "#378ADD";
  const points = tone === "positive" ? "2,20 18,13 34,6" : tone === "danger" ? "2,6 18,13 34,20" : "2,13 18,13 34,13";
  return (
    <svg viewBox="0 0 36 26" className="h-8 w-12" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ direction, periods }: { direction: FundamentalTrendDirection; periods: number }) {
  const tone = trendDirectionTone(direction);
  const Icon = tone === "positive" ? ArrowUp : tone === "danger" ? ArrowDown : ArrowRight;
  const color = tone === "positive" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-muted-foreground";
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-[10px] text-muted-foreground">{periods}</span>
    </span>
  );
}

function FundamentalsPanel({ detail }: { detail: FundamentalsDetail | null }) {
  if (!detail) {
    return <PlaceholderPanel title="Fundamentals" description="No fundamentals are linked to this stock yet. Refresh fundamentals from Admin Data Sources." />;
  }
  const latestRatio = detail.latestRatio;
  const annualRatio = detail.ratios
    .filter((ratio) => ratio.period === "annual")
    .slice()
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))[0] ?? detail.latestRatio;
  const latestQuarter = detail.ratios
    .filter((ratio) => ratio.period === "quarterly" && ratio.revenueGrowth != null)
    .slice()
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))[0] ?? null;
  const latestIncome = detail.statements.find((statement) => statement.statementType === "income_statement");
  const latestCashFlow = detail.statements.find((statement) => statement.statementType === "cash_flow");
  const latestBalance = detail.statements.find((statement) => statement.statementType === "balance_sheet");
  const currency = detail.profile?.currency ?? detail.instrument.currency ?? "USD";
  const businessQualityScore = scoreBusinessQuality(detail.latestScore);
  const confidence = detail.latestScore?.scoreConfidence ?? null;
  const confidenceLabel = confidence == null ? "Insufficient data" : confidence >= 80 ? "High" : confidence >= 50 ? "Med" : "Low";
  const componentScores = FUNDAMENTAL_COMPONENTS
    .map((component) => ({ ...component, value: detail.latestScore?.[component.key] ?? null }))
    .filter((component) => component.value != null);
  const highest = componentScores.length ? componentScores.reduce((best, current) => (current.value! > best.value! ? current : best)) : null;
  const lowest = componentScores.length ? componentScores.reduce((weakest, current) => (current.value! < weakest.value! ? current : weakest)) : null;
  const freshnessBasis = latestRatio?.period === "annual" ? "Annual" : displayPeriodLabel(latestRatio?.period);
  const fiscalLabel = latestRatio?.fiscalYear == null ? detail.latestScore?.asOfDate?.slice(0, 10) ?? "-" : `FY ${latestRatio.fiscalYear}`;
  const updatedLabel = detail.profile?.lastRefreshedAt?.slice(0, 10) ?? "-";
  const trendRowsByCategory = (category: string) => detail.trends.filter((trend) => trend.metricCategory === category);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Business quality</CardTitle>
              <CardDescription>Growth, profitability, cash flow, balance sheet strength, and earnings quality.</CardDescription>
            </div>
            <ScoreChip scoreValue={businessQualityScore} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business quality score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold text-foreground">{businessQualityScore == null ? "-" : Math.round(businessQualityScore)}</span>
                <span className="pb-1 text-sm font-medium text-muted-foreground">/100</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {highest && lowest ? `Highest component: ${highest.label} (${Math.round(highest.value!)}) | Lowest component: ${lowest.label} (${Math.round(lowest.value!)})` : "Component range: Insufficient data"}
              </p>
            </div>
            <div className="space-y-4 rounded-xl border bg-background p-4">
              <div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">Score confidence</span>
                  <span className="text-muted-foreground">{confidence == null ? "-" : `${confidenceLabel} (${formatPercent(confidence / 100)})`}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${confidence == null ? 0 : Math.max(0, Math.min(100, confidence))}%` }} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Freshness: {freshnessBasis} | {fiscalLabel} | updated {updatedLabel}</p>
              <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">Deterministic company fundamentals - not investment advice or a trade instruction.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fundamental sub-scores</CardTitle>
          <CardDescription>Current level / strength of each component - higher means stronger fundamentals today. Business Quality is summarized above.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {FUNDAMENTAL_COMPONENTS.map((component) => {
            const Icon = component.icon;
            const value = detail.latestScore?.[component.key] ?? null;
            return (
              <div key={component.key} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-muted p-2 text-muted-foreground"><Icon className="h-4 w-4" /></span>
                    <span className="text-sm font-semibold text-foreground">{component.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{score(value)}</span>
                    <ScoreChip scoreValue={value} />
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${scoreBarClass(value)}`} style={{ width: `${value == null ? 0 : Math.max(0, Math.min(100, value))}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Key ratios</CardTitle>
            <CardDescription>Valuation, profitability, growth, and leverage | Annual | FY{annualRatio?.fiscalYear ?? "-"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <SummaryMetric label="P/E" value={ratio(annualRatio?.peRatio)} />
              <SummaryMetric label="Price / sales" value={ratio(annualRatio?.priceToSales)} />
              <SummaryMetric label="Gross margin" value={percent(annualRatio?.grossMargin)} />
              <SummaryMetric label="Operating margin" value={percent(annualRatio?.operatingMargin)} />
              <SummaryMetric label="Revenue growth" value={percent(annualRatio?.revenueGrowth)} />
              <SummaryMetric label="EPS growth" value={percent(annualRatio?.epsGrowth)} />
              <SummaryMetric label="ROE" value={percent(annualRatio?.roe)} />
              <SummaryMetric label="Debt / equity" value={ratio(annualRatio?.debtToEquity)} />
            </div>
            {latestQuarter ? (
              <p className="text-xs text-muted-foreground">
                Latest quarter (YoY) | Q{latestQuarter.fiscalQuarter} FY{latestQuarter.fiscalYear ?? "-"}: revenue {percent(latestQuarter.revenueGrowth)} | EPS {percent(latestQuarter.epsGrowth)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Financial snapshot</CardTitle>
            <CardDescription>Latest normalized statements in {currency}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <SummaryMetric label="Revenue" value={latestIncome?.revenue == null ? "-" : formatCurrencyWithCode(latestIncome.revenue, currency)} />
            <SummaryMetric label="Net income" value={latestIncome?.netIncome == null ? "-" : formatCurrencyWithCode(latestIncome.netIncome, currency)} />
            <SummaryMetric label="Diluted EPS" value={latestIncome?.dilutedEps == null ? "-" : formatNumber(latestIncome.dilutedEps)} />
            <SummaryMetric label="Free cash flow" value={latestCashFlow?.freeCashFlow == null ? "-" : formatCurrencyWithCode(latestCashFlow.freeCashFlow, currency)} />
            <SummaryMetric label="Operating CF" value={latestCashFlow?.operatingCashFlow == null ? "-" : formatCurrencyWithCode(latestCashFlow.operatingCashFlow, currency)} />
            <SummaryMetric label="Cash" value={latestBalance?.cashAndEquivalents == null ? "-" : formatCurrencyWithCode(latestBalance.cashAndEquivalents, currency)} />
            <SummaryMetric label="Total debt" value={latestBalance?.totalDebt == null ? "-" : formatCurrencyWithCode(latestBalance.totalDebt, currency)} />
            <SummaryMetric label="Equity" value={latestBalance?.shareholdersEquity == null ? "-" : formatCurrencyWithCode(latestBalance.shareholdersEquity, currency)} />
          </CardContent>
          {detail.missingDataWarnings.length ? (
            <div className="px-6 pb-6">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                {detail.missingDataWarnings.join(" ")}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Fundamental trends</CardTitle>
              <CardDescription>Direction of change over time (trajectory) - whether each area is improving or cooling, not its current level. A strong business can still show a cooling trend.</CardDescription>
            </div>
            {detail.trendSummary ? (
              <div className="flex flex-wrap items-center gap-2">
                <TrendChip direction={detail.trendSummary.overallTrendDirection} />
                <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium">{score(detail.trendSummary.overallTrendScore)}</span>
                <span className="text-xs text-muted-foreground">+{detail.trendSummary.improvingMetricsCount} / -{detail.trendSummary.deterioratingMetricsCount}</span>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!detail.trendSummary ? (
            <p className="text-sm text-muted-foreground">No stored trend summary yet. Refresh fundamentals from Admin Data Sources after applying the trend migration.</p>
          ) : null}
          {detail.trendSummary?.warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {detail.trendSummary.warnings.join(" ")}
            </div>
          ) : null}
          {detail.trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Trend rows will appear after the next fundamentals refresh.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {TREND_CATEGORIES.map((category) => {
                  const rows = trendRowsByCategory(category.key);
                  const direction = rows.length ? aggregateTrendDirection(rows) : "insufficient_data";
                  const trendScore = detail.trendSummary?.[category.scoreKey] ?? null;
                  const Icon = category.icon;
                  return (
                    <div key={category.key} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-muted p-2 text-muted-foreground"><Icon className="h-4 w-4" /></span>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{category.label}</h3>
                            <p className="text-xs text-muted-foreground">{category.descriptor}</p>
                          </div>
                        </div>
                        <TrendGlyph direction={direction} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Trend score {score(trendScore)}</span>
                        <TrendChip direction={direction} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Glyphs are illustrative of stored trend direction, not an actual time series, and are not predictive.</p>
                <p>Sub-scores measure current level; trends measure trajectory - the two can diverge (e.g. strong growth that is decelerating).</p>
              </div>
              <details className="rounded-lg border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold">Show metric-level detail</summary>
              <div className="mt-4 space-y-5">
                {["growth", "margin", "profitability", "balance_sheet", "quality"].map((category) => {
                  const rows = detail.trends.filter((trend) => trend.metricCategory === category);
                  if (rows.length === 0) return null;
                  const direction = aggregateTrendDirection(rows);
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{categoryLabel(category)}</h3>
                        <TrendChip direction={direction} />
                      </div>
                      <div className="space-y-2">
                        {rows.map((trend) => (
                          <div key={trend.metricName} className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm lg:grid-cols-[minmax(0,1.3fr)_0.8fr_0.8fr_0.5fr]">
                            <div>
                              <p className="font-medium capitalize text-foreground">{trend.metricName.replaceAll("_", " ")}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">{trend.explanation}</p>
                            </div>
                            <div>
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Latest</p>
                              <p className="mt-1 font-medium text-foreground">{trendValue(trend.currentValue, trend.metricName)}</p>
                              <p className="text-[11px] text-muted-foreground">{displayPeriodLabel(trend.displayPeriod)}</p>
                            </div>
                            <div>
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prior</p>
                              <p className="mt-1 font-medium text-muted-foreground">{trendValue(trend.previousValue, trend.metricName)}</p>
                            </div>
                            <div>
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">ST/LT</p>
                              <div className="mt-1 flex items-center gap-3">
                                <TrendArrow direction={trend.shortTermTrendDirection} periods={trend.shortTermPeriodsAnalyzed} />
                                <TrendArrow direction={trend.longTermTrendDirection} periods={trend.longTermPeriodsAnalyzed} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">Deterministic trend analysis from stored annual and quarterly fundamentals. Backward-looking; not a forecast.</p>
              </div>
              </details>
            </>
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
  priceSeriesPromise,
  fiftyTwoWeekLow,
  fiftyTwoWeekHigh,
  oneYearReturn,
  fiveYearReturn,
  twentyYearReturn
}: {
  priceSeriesPromise: Promise<PriceSeriesPoint[]>;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  oneYearReturn: number | null;
  fiveYearReturn: number | null;
  twentyYearReturn: number | null;
}) {
  const series = await priceSeriesPromise;
  return (
    <InstrumentPriceChart
      series={series}
      fiftyTwoWeekLow={fiftyTwoWeekLow}
      fiftyTwoWeekHigh={fiftyTwoWeekHigh}
      oneYearReturn={oneYearReturn}
      fiveYearReturn={fiveYearReturn}
      twentyYearReturn={twentyYearReturn}
    />
  );
}

function KeyFactsFallback() {
  return <KeyFactsCard facts={null} />;
}

async function AsyncKeyFactsCard({
  instrument,
  riskMetric
}: {
  instrument: Instrument;
  riskMetric: InstrumentRiskMetric | null;
}) {
  const container = createContainer();
  const detail = instrument.symbol
    ? await measureRenderStep(`instrument-detail:${instrument.symbol}:overview-key-facts`, () =>
        container.fundamentalsRepository.getDetailBySymbol(instrument.symbol ?? "")
      )
    : null;
  const facts: OverviewKeyFacts = {
    assetClass: instrument.assetClass.replaceAll("_", " "),
    sector: instrument.canonicalSector ?? instrument.sector,
    industry: detail?.profile?.industry ?? instrument.industry,
    exchange: detail?.profile?.exchange ?? instrument.exchange,
    marketCap: detail?.profile?.marketCap ?? null,
    peRatio: detail?.latestRatio?.peRatio ?? null,
    dividendYield: null,
    volatility1y: riskMetric?.volatility1y ?? null,
    currency: detail?.profile?.currency ?? instrument.currency ?? "USD"
  };
  return <KeyFactsCard facts={facts} />;
}

function UniversePercentileFallback() {
  return <span>—</span>;
}

async function AsyncUniversePercentile({
  instrumentId,
  currentScore
}: {
  instrumentId: string;
  currentScore: number | null | undefined;
}) {
  const container = createContainer();
  const rows = await measureRenderStep(`instrument-detail:${instrumentId}:score-percentile`, () =>
    container.recommendationService.listLatestRecommendationScores(1_000)
  );
  return <span>{universePercentileLabel(currentScore, rows, instrumentId)}</span>;
}

function ReturnCharacterFallback() {
  return <ReturnCharacterCard stats={null} />;
}

async function AsyncReturnCharacterCard({
  priceSeriesPromise,
  marketView,
  riskMetric
}: {
  priceSeriesPromise: Promise<PriceSeriesPoint[]>;
  marketView: InstrumentMarketView;
  riskMetric: InstrumentRiskMetric | null;
}) {
  const series = await priceSeriesPromise;
  return <ReturnCharacterCard stats={returnCharacterStats(series, marketView, riskMetric)} />;
}

function RiskPanelFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
        <CardDescription>Loading stored risk diagnostics...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 animate-pulse rounded-lg border bg-muted/40" />
      </CardContent>
    </Card>
  );
}

async function AsyncRiskPanel({
  instrumentId,
  riskMetric,
  priceSeriesPromise
}: {
  instrumentId: string;
  riskMetric: InstrumentRiskMetric | null;
  priceSeriesPromise: Promise<PriceSeriesPoint[]>;
}) {
  const container = createContainer();
  const [series, riskRows] = await Promise.all([
    priceSeriesPromise,
    measureRenderStep(`instrument-detail:${instrumentId}:risk-universe-percentile`, () =>
      container.universeRepository.listInstrumentRiskMetrics()
    )
  ]);
  const latestByInstrument = new Map<string, InstrumentRiskMetric>();
  for (const row of riskRows) {
    const existing = latestByInstrument.get(row.instrumentId);
    if (!existing || row.metricDate > existing.metricDate) latestByInstrument.set(row.instrumentId, row);
  }
  const universeVolatilityLabel = riskUniverseVolatilityLabel(
    riskMetric?.volatility1y,
    Array.from(latestByInstrument.values()).map((row) => ({ instrumentId: row.instrumentId, volatility1y: row.volatility1y })),
    instrumentId
  );
  return (
    <RiskSummaryCard
      riskMetric={riskMetric}
      universeVolatilityLabel={universeVolatilityLabel}
      worstWeekAllHistory={worstPeriodReturnFromSeries(series, 7)}
      worstMonthAllHistory={worstPeriodReturnFromSeries(series, 30)}
    />
  );
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
  scoreTrend: ReactNode,
  keyFacts: ReactNode,
  universePercentile: ReactNode,
  returnCharacter: ReactNode,
  riskPanel: ReactNode
) {
  const common = {
    overview: (
      <InstrumentOverviewPanel
        marketView={marketView}
        riskMetric={riskMetric}
        recommendation={recommendation}
        priceChart={priceChart}
        scoreTrend={scoreTrend}
        keyFacts={keyFacts}
        universePercentile={universePercentile}
        returnCharacter={returnCharacter}
      />
    ),
    news: <NewsSummaryCard />,
    themes: <ThemesPanel instrument={instrument} />,
    risk: riskPanel,
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
  const priceSeriesPromise = measureRenderStep(`instrument-detail:${instrument.id}:price-series`, () =>
    container.universeRepository.getInstrumentPriceSeries(instrument.id, { fromYears: 20 })
  );
  const priceChart = (
    <Suspense fallback={<InstrumentPriceChartFallback />}>
      <AsyncInstrumentPriceChart
        priceSeriesPromise={priceSeriesPromise}
        fiftyTwoWeekLow={marketView.fiftyTwoWeekLow}
        fiftyTwoWeekHigh={marketView.fiftyTwoWeekHigh}
        oneYearReturn={marketView.oneYearReturn}
        fiveYearReturn={marketView.fiveYearReturn}
        twentyYearReturn={marketView.twentyYearReturn}
      />
    </Suspense>
  );
  const keyFacts = (
    <Suspense fallback={<KeyFactsFallback />}>
      <AsyncKeyFactsCard instrument={instrument} riskMetric={riskMetric} />
    </Suspense>
  );
  const universePercentile = (
    <Suspense fallback={<UniversePercentileFallback />}>
      <AsyncUniversePercentile instrumentId={instrument.id} currentScore={recommendation?.overallScore} />
    </Suspense>
  );
  const scoreTrend = (
    <Suspense fallback={<ScoreTrendPanelFallback />}>
      <AsyncScoreTrendPanel instrumentId={instrument.id} />
    </Suspense>
  );
  const returnCharacter = (
    <Suspense fallback={<ReturnCharacterFallback />}>
      <AsyncReturnCharacterCard priceSeriesPromise={priceSeriesPromise} marketView={marketView} riskMetric={riskMetric} />
    </Suspense>
  );
  const riskPanel = (
    <Suspense fallback={<RiskPanelFallback />}>
      <AsyncRiskPanel instrumentId={instrument.id} riskMetric={riskMetric} priceSeriesPromise={priceSeriesPromise} />
    </Suspense>
  );
  const tabs = tabsForType(
    type,
    instrument,
    typeLabel,
    marketView,
    bondProfile,
    riskMetric,
    recommendation,
    priceChart,
    scoreTrend,
    keyFacts,
    universePercentile,
    returnCharacter,
    riskPanel
  );

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
