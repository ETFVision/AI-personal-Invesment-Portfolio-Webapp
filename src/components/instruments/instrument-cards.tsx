"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowRight,
  BarChart3,
  Building2,
  DollarSign,
  Droplet,
  Flame,
  Gem,
  Globe,
  LineChart,
  Percent,
  Puzzle,
  Scale,
  Shield,
  ShieldHalf,
  Spline,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Waves
} from "lucide-react";
import type { Instrument, InstrumentMarketView, InstrumentRiskMetric } from "@/domain/universe/types";
import type { InstrumentRecommendation, RecommendationHistoryItem } from "@/domain/recommendations/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniRangeBar } from "@/components/ui/charts";
import { formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";
import { ThemeBadgeList } from "./instrument-badges";
import {
  CHARACTERISTICS_SCORE_BANDS,
  assessmentClassName,
  assessmentLabel,
  assessmentTone,
  businessQualityLabel
} from "@/application/services/recommendations/recommendationPresentation";

const EMPTY_VALUE = "—";

export type OverviewKeyFacts = {
  assetClass: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  volatility1y: number | null;
  currency: string;
};

export type ReturnCharacterStats = {
  bestRollingOneYear: number | null;
  worstRollingOneYear: number | null;
  positiveRollingOneYearWindows: number | null;
  belowFiftyTwoWeekHigh: number | null;
  deepestDrawdown: number | null;
  worstWeekAllHistory: number | null;
};

export function InstrumentSummaryCard({
  marketView,
  riskMetric,
  recommendation
}: {
  marketView: InstrumentMarketView;
  riskMetric: InstrumentRiskMetric | null;
  recommendation: InstrumentRecommendation | null;
}) {
  const currency = marketView.instrument.currency ?? "USD";
  const canonicalSector = marketView.instrument.canonicalSector ?? marketView.instrument.sector ?? "-";
  const volatility = riskMetric?.volatility1y == null ? (marketView.instrument.volatilityBucket ?? "-") : formatPercent(riskMetric.volatility1y);
  const recommendationTone = recommendation ? assessmentTone(recommendation.recommendationLabel) : "neutral";
  const latestPriceLabel = marketView.latestPrice == null ? "-" : formatCurrencyWithCode(marketView.latestPrice, currency);
  const rangePosition = marketView.latestPrice == null || marketView.fiftyTwoWeekLow == null || marketView.fiftyTwoWeekHigh == null || marketView.fiftyTwoWeekHigh <= marketView.fiftyTwoWeekLow
    ? null
    : Math.min(100, Math.max(0, ((marketView.latestPrice - marketView.fiftyTwoWeekLow) / (marketView.fiftyTwoWeekHigh - marketView.fiftyTwoWeekLow)) * 100));
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Asset context, derived returns, and stored market quality signals.</CardDescription>
          </div>
          <a href="#characteristics-breakdown" className="rounded-lg border bg-background px-3 py-2 text-right shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Characteristics</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{recommendation?.overallScore == null ? "-" : `${Math.round(recommendation.overallScore)}/100`}</p>
            {recommendation ? <ToneChip label={assessmentLabel(recommendation.recommendationLabel)} tone={recommendationTone} /> : null}
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Asset class" value={marketView.instrument.assetClass.replaceAll("_", " ")} />
        <SummaryMetric label="Sector" value={canonicalSector} />
        <SummaryMetric label="Risk category" value={marketView.instrument.riskCategory ?? "-"} />
        <SummaryMetric label="Volatility" value={volatility} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryMetric label="YTD return" value={marketView.ytdReturn == null ? "-" : formatPercent(marketView.ytdReturn)} />
        <SummaryMetric label="1Y return" value={marketView.oneYearReturn == null ? "-" : formatPercent(marketView.oneYearReturn)} />
        <SummaryMetric label="5Y return" value={marketView.fiveYearReturn == null ? "-" : formatPercent(marketView.fiveYearReturn)} />
        </div>
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">52W position</p>
          <div className="mt-3 space-y-2">
            <MiniRangeBar
              current={marketView.latestPrice}
              low={marketView.fiftyTwoWeekLow}
              high={marketView.fiftyTwoWeekHigh}
              lowLabel={marketView.fiftyTwoWeekLow == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekLow, currency)}
              highLabel={marketView.fiftyTwoWeekHigh == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekHigh, currency)}
            />
            <div className="relative h-4 min-w-40">
              <span
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[0.68rem] font-medium text-muted-foreground"
                style={{ left: `${rangePosition ?? 50}%` }}
              >
                Current {latestPriceLabel}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function riskLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}

function riskPercent(value: number | null | undefined) {
  return value == null ? "-" : formatPercent(value);
}

function longWindowRiskPercent(value: number | null | undefined) {
  return value == null ? "Insufficient history" : formatPercent(value);
}

function scoreValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}/100` : "-";
}

function tabId(label: string) {
  return label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toneClassName(tone: string) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";
  return "border-border bg-muted text-muted-foreground";
}

function ToneChip({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${toneClassName(tone)}`}>{label}</span>;
}

function formatMaybePercent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? EMPTY_VALUE : formatPercent(value);
}

function formatMaybeNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? EMPTY_VALUE : formatNumber(value);
}

function formatMaybeCurrency(value: number | null | undefined, currency: string) {
  return value == null || !Number.isFinite(value) ? EMPTY_VALUE : formatCurrencyWithCode(value, currency);
}

function formatMaybeText(value: string | null | undefined) {
  return value && value.trim() ? value : EMPTY_VALUE;
}

const COMPONENT_DESCRIPTIONS: Record<string, string> = {
  business_quality: "Growth, profitability, cash flow, balance sheet strength, and earnings quality.",
  fundamentals: "Stored fundamental sub-scores across growth, profitability, cash flow, balance sheet, quality, and valuation.",
  valuation: "Valuation multiples and free cash flow yield from the latest annual fundamental inputs.",
  fundamental_trends: "Direction and confidence from stored fundamental trend calculations.",
  risk_analytics: "Price-history risk metrics including volatility, drawdown, downside behavior, and confidence.",
  market_vision_alignment: "Alignment between the instrument profile and the current Market Vision context.",
  theme_alignment: "Instrument taxonomy themes compared with active Market Vision themes.",
  momentum: "Recent price trend from YTD and latest daily return inputs.",
  macro_fit: "ETF category and sensitivity mapped against the current macro regime context.",
  benchmark_relative: "One-year excess return versus the mapped external asset-class benchmark.",
  theme_fit: "ETF category, role, and theme tags used for thematic classification.",
  duration_fit: "Bond duration profile compared with the current rate-regime context.",
  rate_regime: "Interest-rate regime context applied to the bond ETF profile.",
  inflation_regime: "Inflation-regime context applied to the bond ETF profile.",
  yield_curve: "Yield-curve context and the bond ETF profile's rate sensitivity.",
  credit_risk: "Credit-quality and high-yield exposure context for the bond ETF profile.",
  portfolio_stability: "Stability role from treasury, core bond, cash-like, or ballast characteristics.",
  inflation_hedge: "Gold and precious-metals exposure in the current inflation context.",
  geopolitical_hedge: "Gold hedge classification in the current market-stress context.",
  rates_context: "Gold exposure interpreted against the current rates context.",
  risk: "Stored price-history risk metrics for high-volatility instruments.",
  liquidity_regime: "Liquidity and market-regime context for the instrument profile.",
  macro_risk_appetite: "Macro risk-appetite context from the current Market Vision regime.",
  theme_score: "Crypto or digital-asset theme classification used in the component score."
};

function componentDescription(key: string) {
  return COMPONENT_DESCRIPTIONS[key];
}

const COMPONENT_ICONS: Record<string, LucideIcon> = {
  business_quality: Gem,
  fundamentals: Building2,
  valuation: DollarSign,
  fundamental_trends: LineChart,
  risk_analytics: AlertTriangle,
  market_vision_alignment: Target,
  theme_alignment: Puzzle,
  theme_fit: Puzzle,
  theme_score: Puzzle,
  momentum: Activity,
  macro_fit: Globe,
  benchmark_relative: Scale,
  duration_fit: Timer,
  rate_regime: Percent,
  rates_context: Percent,
  inflation_regime: Flame,
  yield_curve: Spline,
  credit_risk: ShieldHalf,
  portfolio_stability: Anchor,
  inflation_hedge: Shield,
  geopolitical_hedge: Globe,
  risk: AlertTriangle,
  liquidity_regime: Droplet,
  macro_risk_appetite: Waves
};

type ObservationTone = "positive" | "info" | "warning" | "danger" | "neutral";

type KeyObservation = {
  key: string;
  title: string;
  description: string;
  tone: ObservationTone;
  Icon: LucideIcon;
};

function componentDisplayLabel(key: string, fallback: string) {
  return fallback || key.replaceAll("_", " ");
}

function strengthObservation(component: { key: string; label: string; score: number }): KeyObservation {
  const Icon = COMPONENT_ICONS[component.key] ?? BarChart3;
  if (component.key === "business_quality") {
    return {
      key: component.key,
      title: component.score >= CHARACTERISTICS_SCORE_BANDS.excellent ? "Exceptional business quality" : "Strong business quality",
      description: "Strong profitability, cash flow and balance-sheet strength.",
      tone: "positive",
      Icon
    };
  }
  if (component.key === "theme_alignment" || component.key === "theme_fit" || component.key === "theme_score") {
    return {
      key: component.key,
      title: "Strong theme alignment",
      description: "Closely aligned with active Market Vision themes.",
      tone: "positive",
      Icon
    };
  }
  if (component.key === "market_vision_alignment") {
    return {
      key: component.key,
      title: "Supportive market alignment",
      description: "Current Market Vision context aligns with this instrument's profile.",
      tone: "positive",
      Icon
    };
  }
  if (component.key === "momentum") {
    return {
      key: component.key,
      title: "Positive price momentum",
      description: "Recent price trend inputs are above neutral thresholds.",
      tone: "positive",
      Icon
    };
  }
  if (component.key === "benchmark_relative") {
    return {
      key: component.key,
      title: "Positive benchmark-relative return",
      description: "One-year return is above the mapped asset-class benchmark.",
      tone: "positive",
      Icon
    };
  }
  if (component.key === "fundamental_trends") {
    return {
      key: component.key,
      title: "Improving fundamental trends",
      description: "Stored trend rows are above neutral thresholds.",
      tone: "positive",
      Icon
    };
  }
  return {
    key: component.key,
    title: `Strong ${componentDisplayLabel(component.key, component.label).toLowerCase()}`,
    description: componentDescription(component.key) ?? "Stored component score is above the Good threshold.",
    tone: "positive",
    Icon
  };
}

function watchObservation(component: { key: string; label: string; score: number }): KeyObservation {
  const Icon = COMPONENT_ICONS[component.key] ?? BarChart3;
  if (component.key === "risk_analytics" || component.key === "risk") {
    return {
      key: component.key,
      title: "Elevated risk",
      description: "High volatility and meaningful drawdown versus the broad market.",
      tone: "warning",
      Icon
    };
  }
  if (component.key === "valuation") {
    return {
      key: component.key,
      title: "Full valuation",
      description: "Trades at a premium on current fundamental inputs.",
      tone: "info",
      Icon
    };
  }
  if (component.key === "fundamental_trends") {
    return {
      key: component.key,
      title: "Weak fundamental trends",
      description: "Stored trend rows are below neutral thresholds.",
      tone: "warning",
      Icon
    };
  }
  if (component.key === "momentum") {
    return {
      key: component.key,
      title: "Weak price momentum",
      description: "Recent price trend inputs are below neutral thresholds.",
      tone: "warning",
      Icon
    };
  }
  if (component.key === "market_vision_alignment") {
    return {
      key: component.key,
      title: "Limited market alignment",
      description: "Current Market Vision context has limited alignment with this instrument.",
      tone: "info",
      Icon
    };
  }
  if (component.key === "theme_alignment" || component.key === "theme_fit" || component.key === "theme_score") {
    return {
      key: component.key,
      title: "Limited theme alignment",
      description: "Theme tags are below neutral alignment thresholds.",
      tone: "info",
      Icon
    };
  }
  return {
    key: component.key,
    title: `${componentDisplayLabel(component.key, component.label)} watch area`,
    description: componentDescription(component.key) ?? "Stored component score is below the Neutral threshold.",
    tone: "warning",
    Icon
  };
}

function keyObservations(recommendation: InstrumentRecommendation | null): KeyObservation[] {
  if (!recommendation) return [];
  const numeric = scoreComponents(recommendation)
    .map((component) => ({
      key: component.key,
      label: component.label,
      score: typeof component.score === "number" && Number.isFinite(component.score) ? component.score : null
    }))
    .filter((component): component is { key: string; label: string; score: number } => component.score != null);
  const seen = new Set<string>();
  const take = (component: { key: string; label: string; score: number }, kind: "strength" | "watch") => {
    if (seen.has(component.key)) return null;
    seen.add(component.key);
    return kind === "strength" ? strengthObservation(component) : watchObservation(component);
  };
  const observations: KeyObservation[] = [];
  const strengths = numeric.filter((component) => component.score >= CHARACTERISTICS_SCORE_BANDS.good).sort((a, b) => b.score - a.score);
  const watchAreas = numeric.filter((component) => component.score < CHARACTERISTICS_SCORE_BANDS.neutral).sort((a, b) => a.score - b.score);
  const riskWatch = watchAreas.find((component) => component.key === "risk_analytics" || component.key === "risk");
  for (const component of strengths.slice(0, 2)) {
    const observation = take(component, "strength");
    if (observation) observations.push(observation);
  }
  if (riskWatch) {
    const observation = take(riskWatch, "watch");
    if (observation) observations.push(observation);
  }
  for (const component of watchAreas) {
    if (observations.length >= 4) break;
    const observation = take(component, "watch");
    if (observation) observations.push(observation);
  }
  for (const component of numeric.slice().sort((a, b) => b.score - a.score)) {
    if (observations.length >= 4) break;
    const observation = take(component, component.score >= CHARACTERISTICS_SCORE_BANDS.neutral ? "strength" : "watch");
    if (observation) observations.push(observation);
  }
  return observations.slice(0, 4);
}

function componentScoreTone(score: number | null) {
  if (score == null) return "neutral";
  if (score >= CHARACTERISTICS_SCORE_BANDS.good) return "positive";
  if (score >= CHARACTERISTICS_SCORE_BANDS.neutral) return "warning";
  return "danger";
}

function componentBarClass(score: number | null) {
  if (score == null) return "bg-muted-foreground/40";
  if (score >= CHARACTERISTICS_SCORE_BANDS.good) return "bg-emerald-600";
  if (score >= CHARACTERISTICS_SCORE_BANDS.neutral) return "bg-amber-500";
  return "bg-red-600";
}

function scoreComponents(recommendation: InstrumentRecommendation) {
  const components = recommendation.scoringBreakdown.components;
  const rows = Array.isArray(components) ? components.map((component) => ({
    key: String((component as Record<string, unknown>).key ?? ""),
    label: String((component as Record<string, unknown>).label ?? ""),
    score: (component as Record<string, unknown>).score,
    weight: (component as Record<string, unknown>).weight,
    reason: String((component as Record<string, unknown>).reason ?? "")
  })).filter((component) => component.label) : [];

  if (!rows.some((component) => component.key === "market_vision_alignment")) {
    const type = recommendation.instrumentType.toLowerCase();
    const weight = type.includes("stock") ? 0.1 : type.includes("crypto") ? 0.03 : type.includes("etf") || type.includes("gold") ? 0.05 : 0.05;
    rows.push({
      key: "market_vision_alignment",
      label: "Market Vision Alignment",
      score: null,
      weight,
      reason: "Not stored in this insight run yet. Run insights again after the hardening migration."
    });
  }

  return rows;
}

function componentQualityLabel(component: { key: string; score: unknown }) {
  if (typeof component.score !== "number" || !Number.isFinite(component.score)) return null;
  if (!component.key.includes("fundamental") && !component.key.includes("business_quality")) return null;
  return businessQualityLabel(component.score);
}

function componentDisplayReason(component: { key: string; label: string; score: unknown; reason: string }) {
  if (typeof component.score === "number" && Number.isFinite(component.score)) {
    if (component.key === "risk_analytics") {
      if (component.score < 45) return "Instrument risk is elevated";
      if (component.score < 70) return "Instrument risk is moderate";
    }
    if (component.score < 45) return `${component.label} score is weak`;
    if (component.score < 70) return `${component.label} score is mixed`;
  }
  return component.reason || "-";
}

function scoringLabel(recommendation: InstrumentRecommendation, key: "baseLabel" | "finalLabel") {
  const value = recommendation.scoringBreakdown[key];
  return typeof value === "string" ? assessmentLabel(value) : "-";
}

function normalizeNegativeDriver(item: string) {
  const replacements: Record<string, string> = {
    "Strong overall fundamentals": "Weak overall fundamentals",
    "Improving fundamental trends": "Deteriorating fundamental trends",
    "Supportive valuation score": "Weak valuation score",
    "Market Vision context supports the instrument": "Market Vision context is cautious for the instrument",
    "Useful canonical theme alignment": "Limited canonical theme alignment",
    "Instrument risk is controlled": "Instrument risk is elevated",
    "Improves portfolio fit": "Weak portfolio fit",
    "Positive price momentum": "Weak price momentum"
  };
  return replacements[item] ?? item;
}

export function RiskSummaryCard({ riskMetric }: { instrument: Instrument; riskMetric: InstrumentRiskMetric | null }) {
  if (!riskMetric) {
    return <PlaceholderPanel title="Risk" description="No sufficient stored price history is available for instrument risk metrics yet." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
        <CardDescription>Calculated from stored price history. Long-horizon windows are display-only diagnostics.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Risk score" value={riskMetric.riskScore == null ? "-" : `${Math.round(riskMetric.riskScore)}/100`} />
        <SummaryMetric label="Risk bucket" value={riskLabel(riskMetric.riskBucket)} />
        <SummaryMetric label="Confidence" value={formatPercent(riskMetric.confidenceScore / 100)} />
        <SummaryMetric label="Vol trend" value={riskLabel(riskMetric.volatilityTrend)} />
        <SummaryMetric label="30D volatility" value={riskPercent(riskMetric.volatility30d)} />
        <SummaryMetric label="90D volatility" value={riskPercent(riskMetric.volatility90d)} />
        <SummaryMetric label="1Y volatility" value={riskPercent(riskMetric.volatility1y)} />
        <SummaryMetric label="5Y volatility" value={longWindowRiskPercent(riskMetric.volatility5y)} />
        <SummaryMetric label="10Y volatility" value={longWindowRiskPercent(riskMetric.volatility10y)} />
        <SummaryMetric label="15Y volatility" value={longWindowRiskPercent(riskMetric.volatility15y)} />
        <SummaryMetric label="20Y volatility" value={longWindowRiskPercent(riskMetric.volatility20y)} />
        <SummaryMetric label="Downside volatility" value={riskPercent(riskMetric.downsideVolatility)} />
        <SummaryMetric label="Current DD (1Y)" value={riskPercent(riskMetric.currentDrawdown1y)} />
        <SummaryMetric label="Max DD (1Y)" value={riskPercent(riskMetric.maxDrawdown1y)} />
        <SummaryMetric label="Max DD (3Y)" value={riskPercent(riskMetric.maxDrawdown3y)} />
        <SummaryMetric label="Max DD (5Y)" value={riskPercent(riskMetric.maxDrawdown5y)} />
        <SummaryMetric label="Max DD (10Y)" value={longWindowRiskPercent(riskMetric.maxDrawdown10y)} />
        <SummaryMetric label="Max DD (15Y)" value={longWindowRiskPercent(riskMetric.maxDrawdown15y)} />
        <SummaryMetric label="Max DD (20Y)" value={longWindowRiskPercent(riskMetric.maxDrawdown20y)} />
        <SummaryMetric label="Current DD (history)" value={riskPercent(riskMetric.currentDrawdown)} />
        <SummaryMetric label="Max DD (history)" value={riskPercent(riskMetric.maxDrawdown)} />
        <SummaryMetric label="History DD duration" value={`${riskMetric.drawdownDurationDays ?? 0}d`} />
        <SummaryMetric label="DD bucket" value={riskLabel(riskMetric.drawdownBucket)} />
        <SummaryMetric label="Negative day freq" value={riskPercent(riskMetric.negativeReturnFrequency)} />
        <SummaryMetric label="Worst day" value={riskPercent(riskMetric.worstDailyReturn)} />
        <SummaryMetric label="Worst 5D" value={riskPercent(riskMetric.worstWeeklyReturn)} />
        <SummaryMetric label="Risk observations" value={formatNumber(riskMetric.observationCount)} />
      </CardContent>
    </Card>
  );
}

function marketPercent(value: number | null | undefined) {
  return value == null ? EMPTY_VALUE : formatPercent(value);
}

export function LongHorizonBlock({ marketView, riskMetric }: { marketView: InstrumentMarketView; riskMetric: InstrumentRiskMetric | null }) {
  const annualizedReturn = (totalReturn: number | null | undefined, years: number) => {
    if (totalReturn == null || !Number.isFinite(totalReturn) || totalReturn < -1) return null;
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  };
  const periods = [
    {
      label: "1Y",
      annualizedReturn: marketView.oneYearReturn,
      volatility: riskMetric?.volatility1y,
      maxDrawdown: riskMetric?.maxDrawdown1y
    },
    {
      label: "5Y",
      annualizedReturn: annualizedReturn(marketView.fiveYearReturn, 5),
      volatility: null,
      maxDrawdown: riskMetric?.maxDrawdown5y
    },
    {
      label: "10Y",
      annualizedReturn: annualizedReturn(marketView.tenYearReturn, 10),
      volatility: riskMetric?.volatility10y,
      maxDrawdown: riskMetric?.maxDrawdown10y
    },
    {
      label: "15Y",
      annualizedReturn: annualizedReturn(marketView.fifteenYearReturn, 15),
      volatility: riskMetric?.volatility15y,
      maxDrawdown: riskMetric?.maxDrawdown15y
    },
    {
      label: "20Y",
      annualizedReturn: annualizedReturn(marketView.twentyYearReturn, 20),
      volatility: riskMetric?.volatility20y,
      maxDrawdown: riskMetric?.maxDrawdown20y
    }
  ];
  const rows = [
    {
      label: "Annualised return",
      values: periods.map((period) => period.annualizedReturn)
    },
    {
      label: "Volatility",
      values: periods.map((period) => period.volatility)
    },
    {
      label: "Max drawdown",
      values: periods.map((period) => period.maxDrawdown)
    }
  ];
  const barPeriods = periods.filter((period): period is typeof period & { annualizedReturn: number } => period.annualizedReturn != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Long-Horizon Returns</CardTitle>
        <CardDescription>Annualised (CAGR) by period · display only, not used in scoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground" aria-label="Metric" />
                {periods.map((period) => (
                  <th key={period.label} className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${periods[index].label}`} className="py-2 pr-4 text-muted-foreground">{marketPercent(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {barPeriods.length > 0 ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            {barPeriods.map((period) => {
              const width = Math.min(100, Math.abs(period.annualizedReturn) * 100);
              const barClass =
                period.annualizedReturn > 0.2
                  ? "bg-emerald-600"
                  : period.annualizedReturn > 0
                    ? "bg-amber-500"
                    : period.annualizedReturn < 0
                      ? "bg-red-600"
                      : "bg-muted-foreground/40";
              return (
                <div key={period.label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{period.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right font-medium text-foreground">{formatPercent(period.annualizedReturn)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Annualised return = (1 + total return)^(1/years) − 1. Figures are backward-looking and do not predict future performance.</p>
          <p>Display-only context; not used in scoring or guardrails.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LongHorizonReturnsCard({ marketView }: { marketView: InstrumentMarketView }) {
  const annualizedReturn = (totalReturn: number | null | undefined, years: number) => {
    if (totalReturn == null || !Number.isFinite(totalReturn) || totalReturn < -1) return null;
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  };
  const periods = [
    { label: "1Y", annualizedReturn: marketView.oneYearReturn },
    { label: "5Y", annualizedReturn: annualizedReturn(marketView.fiveYearReturn, 5) },
    { label: "10Y", annualizedReturn: annualizedReturn(marketView.tenYearReturn, 10) },
    { label: "15Y", annualizedReturn: annualizedReturn(marketView.fifteenYearReturn, 15) },
    { label: "20Y", annualizedReturn: annualizedReturn(marketView.twentyYearReturn, 20) }
  ];
  const returnPeriods = periods.filter((period): period is typeof period & { annualizedReturn: number } => period.annualizedReturn != null);
  const returnScale = Math.max(...returnPeriods.map((period) => Math.abs(period.annualizedReturn)), 0);
  const scaledWidth = (value: number, scale: number) => (scale > 0 ? Math.min(100, (Math.abs(value) / scale) * 100) : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Long-horizon returns</CardTitle>
        <CardDescription>Annualised (CAGR) by period; display-only context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {returnPeriods.length > 0 ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            {returnPeriods.map((period) => {
              const width = scaledWidth(period.annualizedReturn, returnScale);
              const barClass = period.annualizedReturn >= 0 ? "bg-emerald-600" : "bg-red-600";
              return (
                <div key={period.label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{period.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right font-medium text-foreground">{formatPercent(period.annualizedReturn)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Annualised return = (1 + total return)^(1/years) - 1. Figures are backward-looking and do not predict future performance.</p>
      </CardContent>
    </Card>
  );
}

export function LongHorizonRiskCard({ riskMetric }: { riskMetric: InstrumentRiskMetric | null }) {
  const periods = [
    { label: "1Y", volatility: riskMetric?.volatility1y, maxDrawdown: riskMetric?.maxDrawdown1y },
    { label: "5Y", volatility: riskMetric?.volatility5y, maxDrawdown: riskMetric?.maxDrawdown5y },
    { label: "10Y", volatility: riskMetric?.volatility10y, maxDrawdown: riskMetric?.maxDrawdown10y },
    { label: "15Y", volatility: riskMetric?.volatility15y, maxDrawdown: riskMetric?.maxDrawdown15y },
    { label: "20Y", volatility: riskMetric?.volatility20y, maxDrawdown: riskMetric?.maxDrawdown20y }
  ];
  const volatilityPeriods = periods.filter((period): period is typeof period & { volatility: number } => period.volatility != null);
  const drawdownPeriods = periods.filter((period): period is typeof period & { maxDrawdown: number } => period.maxDrawdown != null);
  const volatilityScale = Math.max(...volatilityPeriods.map((period) => Math.abs(period.volatility)), 0);
  const drawdownScale = Math.max(...drawdownPeriods.map((period) => Math.abs(period.maxDrawdown)), 0);
  const scaledWidth = (value: number, scale: number) => (scale > 0 ? Math.min(100, (Math.abs(value) / scale) * 100) : 0);
  const volatilityTrend = riskMetric?.volatilityTrend ?? null;
  const TrendIcon = volatilityTrend === "rising" ? TrendingUp : volatilityTrend === "falling" ? TrendingDown : volatilityTrend === "stable" ? ArrowRight : null;
  const trendTone = volatilityTrend === "rising" ? "danger" : volatilityTrend === "falling" ? "positive" : volatilityTrend === "stable" ? "neutral" : "muted";
  const trendLabel = volatilityTrend && volatilityTrend !== "insufficient_data" ? riskLabel(volatilityTrend) : EMPTY_VALUE;
  const currentDrawdownValue = formatMaybePercent(riskMetric?.currentDrawdown);
  const currentDrawdownClass = riskMetric?.currentDrawdown == null
    ? "text-muted-foreground"
    : riskMetric.currentDrawdown < 0
      ? "text-red-600"
      : "text-foreground";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Long-horizon risk</CardTitle>
        <CardDescription>Stored volatility and drawdown windows; display-only context.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current drawdown</p>
            <p className={`mt-2 text-sm font-semibold ${currentDrawdownClass}`}>{currentDrawdownValue}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Downside vol (1Y)</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{formatMaybePercent(riskMetric?.downsideVolatility)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Volatility trend</p>
            {TrendIcon ? (
              <span className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${toneClassName(trendTone)}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                {trendLabel}
              </span>
            ) : (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{EMPTY_VALUE}</p>
            )}
          </div>
        </div>
        {volatilityPeriods.length > 0 ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Volatility</p>
            {volatilityPeriods.map((period) => {
              const width = scaledWidth(period.volatility, volatilityScale);
              return (
                <div key={period.label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{period.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right font-medium text-foreground">{formatPercent(period.volatility)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        {drawdownPeriods.length > 0 ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max drawdown</p>
            {drawdownPeriods.map((period) => {
              const width = scaledWidth(period.maxDrawdown, drawdownScale);
              return (
                <div key={period.label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">{period.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-red-600" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right font-medium text-red-600">{formatPercent(period.maxDrawdown)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">Display-only context; not used in scoring or guardrails.</p>
      </CardContent>
    </Card>
  );
}

function CharacteristicsBreakdown({ recommendation }: { recommendation: InstrumentRecommendation | null }) {
  if (!recommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Characteristics breakdown</CardTitle>
          <CardDescription>No instrument insight has been generated for this instrument yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const components = scoreComponents(recommendation);
  const finalTone = assessmentTone(recommendation.recommendationLabel);

  return (
    <Card id="characteristics-breakdown" className="scroll-mt-32">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Characteristics breakdown</CardTitle>
            <CardDescription>Stored scoring components and weights from the latest deterministic insight.</CardDescription>
          </div>
          <ToneChip label={assessmentLabel(recommendation.recommendationLabel)} tone={finalTone} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground lg:col-span-2">No component breakdown stored.</p>
        ) : (
          components.map((component) => {
            const score = typeof component.score === "number" && Number.isFinite(component.score) ? Math.round(component.score) : null;
            const quality = componentQualityLabel(component);
            const scoreTone = componentScoreTone(score);
            const barClass = componentBarClass(score);
            const description = componentDescription(component.key);
            const Icon = COMPONENT_ICONS[component.key] ?? BarChart3;
            return (
              <div key={component.key || component.label} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                    <p className="font-medium">{score != null && score < CHARACTERISTICS_SCORE_BANDS.weak ? <span className="mr-1 text-amber-600" aria-label="Low component score">{"\u26a0"}</span> : null}{component.label}</p>
                    {description ? <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p> : null}
                    <p className="text-xs text-muted-foreground">Weight {typeof component.weight === "number" ? formatPercent(component.weight) : "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {quality ? <ToneChip label={quality.label} tone={quality.tone} /> : null}
                    <ToneChip label={score == null ? "-" : `${score}/100`} tone={scoreTone} />
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function KeyObservationsGrid({ recommendation }: { recommendation: InstrumentRecommendation | null }) {
  const observations = keyObservations(recommendation);
  if (observations.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-4">
        <p className="text-sm font-semibold">Key observations</p>
        <p className="mt-2 text-sm text-muted-foreground">No stored component observations are available yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {observations.map((observation) => {
        const Icon = observation.Icon;
        return (
          <div key={observation.key} className={`rounded-xl border p-3 ${toneClassName(observation.tone)}`}>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/60" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{observation.title}</p>
                <p className="mt-1 text-xs opacity-85">{observation.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerdictHero({
  marketView,
  recommendation,
  universePercentile
}: {
  marketView: InstrumentMarketView;
  recommendation: InstrumentRecommendation | null;
  universePercentile: ReactNode;
}) {
  const score = recommendation?.overallScore;
  const scoreLabel = recommendation ? assessmentLabel(recommendation.recommendationLabel) : "No insight";
  const scoreTone = recommendation ? assessmentTone(recommendation.recommendationLabel) : "neutral";
  const confidence = recommendation?.confidenceScore ?? null;
  const confidenceWidth = confidence == null ? 0 : Math.max(0, Math.min(100, confidence));
  const updatedAt = recommendation?.updatedAt?.slice(0, 10) ?? EMPTY_VALUE;
  const priceDate = marketView.latestPriceDate ?? EMPTY_VALUE;

  return (
    <Card className="h-full">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Characteristics score</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="text-4xl font-semibold tracking-tight">{score == null ? EMPTY_VALUE : `${Math.round(score)}`}</p>
              <span className="pb-1 text-sm font-medium text-muted-foreground">/100</span>
              <ToneChip label={scoreLabel} tone={scoreTone} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Universe percentile</p>
              <div className="mt-1 text-sm font-semibold text-foreground">{universePercentile}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Confidence</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{confidence == null ? EMPTY_VALUE : formatPercent(confidence / 100)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${confidenceWidth}%` }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Characteristics updated {updatedAt} · end-of-day prices as of {priceDate}.
          </p>
          <a href="/methodology" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            How this is calculated
          </a>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Key observations</p>
              <p className="text-sm text-muted-foreground">Deterministic component highlights from the latest insight.</p>
            </div>
          </div>
          <KeyObservationsGrid recommendation={recommendation} />
        </div>
      </CardContent>
    </Card>
  );
}

export function KeyFactsCard({ facts }: { facts: OverviewKeyFacts | null }) {
  if (!facts) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Key facts</CardTitle>
          <CardDescription>Loading profile and ratio fields...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44 animate-pulse rounded-lg border bg-muted/40" />
        </CardContent>
      </Card>
    );
  }
  return (
      <Card className="h-full">
      <CardHeader>
        <CardTitle>Key facts</CardTitle>
        <CardDescription>Profile, valuation, and stored risk context.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <SummaryMetric label="Asset class" value={facts.assetClass} />
        <SummaryMetric label="Sector" value={formatMaybeText(facts.sector)} />
        <SummaryMetric label="Industry" value={formatMaybeText(facts.industry)} />
        <SummaryMetric label="Exchange" value={formatMaybeText(facts.exchange)} />
        <SummaryMetric label="Market cap" value={formatMaybeCurrency(facts.marketCap, facts.currency)} />
        <SummaryMetric label="P/E (TTM)" value={formatMaybeNumber(facts.peRatio)} />
        <SummaryMetric label="Dividend yield" value={formatMaybePercent(facts.dividendYield)} />
        <SummaryMetric label="1Y volatility" value={formatMaybePercent(facts.volatility1y)} />
      </CardContent>
    </Card>
  );
}

function ReturnCharacterTile({ label, value, tone }: { label: string; value: string; tone: ObservationTone }) {
  return (
    <div className={`rounded-lg border p-3 ${toneClassName(tone)}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function ReturnCharacterCard({ stats }: { stats: ReturnCharacterStats | null }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Return character</CardTitle>
        <CardDescription>Rolling-window and drawdown context from stored price history.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ReturnCharacterTile label="Best rolling 1Y" value={formatMaybePercent(stats?.bestRollingOneYear)} tone="positive" />
        <ReturnCharacterTile label="Worst rolling 1Y" value={formatMaybePercent(stats?.worstRollingOneYear)} tone="danger" />
        <ReturnCharacterTile label="Positive 1Y windows" value={formatMaybePercent(stats?.positiveRollingOneYearWindows)} tone="positive" />
        <ReturnCharacterTile label="Below 52W high" value={formatMaybePercent(stats?.belowFiftyTwoWeekHigh)} tone="neutral" />
        <ReturnCharacterTile label="Deepest drawdown" value={formatMaybePercent(stats?.deepestDrawdown)} tone="danger" />
        <ReturnCharacterTile label="Worst week" value={formatMaybePercent(stats?.worstWeekAllHistory)} tone="danger" />
      </CardContent>
    </Card>
  );
}

export function InstrumentOverviewPanel({
  marketView,
  riskMetric,
  recommendation,
  priceChart,
  scoreTrend,
  keyFacts,
  universePercentile,
  returnCharacter
}: {
  marketView: InstrumentMarketView;
  riskMetric: InstrumentRiskMetric | null;
  recommendation: InstrumentRecommendation | null;
  priceChart: ReactNode;
  scoreTrend: ReactNode;
  keyFacts: ReactNode;
  universePercentile: ReactNode;
  returnCharacter: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <VerdictHero marketView={marketView} recommendation={recommendation} universePercentile={universePercentile} />
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
      <div id="instrument-price-chart-slot" className="h-full">
        {/* instrument-price-chart-slot */}
        {priceChart}
      </div>
      {keyFacts}
      </div>
      <CharacteristicsBreakdown recommendation={recommendation} />
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <LongHorizonReturnsCard marketView={marketView} />
          <div className="flex flex-1 flex-col">{scoreTrend}</div>
        </div>
        <LongHorizonRiskCard riskMetric={riskMetric} />
      </div>
      <div>{returnCharacter}</div>
      <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        Data quality: liquidity {marketView.liquidity}; freshness {marketView.freshnessLabel}; history start {marketView.priceHistoryStart ?? EMPTY_VALUE}; observations {formatNumber(marketView.priceObservationCount)}. Peer comparison and assessment sensitivity live in the Insights tab.
      </p>
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        Analytical classifications only; not investment advice or a trade instruction.
      </p>
    </div>
  );
}

export function RecommendationSummaryCard({ recommendation, history }: { recommendation: InstrumentRecommendation | null; history?: RecommendationHistoryItem[] }) {
  if (!recommendation) {
    return <PlaceholderPanel title="Insights" description="No instrument insight has been generated for this instrument yet. Run the deterministic insights engine from Research." />;
  }
  const components = scoreComponents(recommendation);
  const historyRows = history ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instrument Insights</CardTitle>
        <CardDescription>Deterministic characteristics assessment with explainable drivers and guardrails. This is not investment advice or a trade instruction.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">Assessment</p>
            <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-sm font-medium ${assessmentClassName(recommendation.recommendationLabel)}`}>
              {assessmentLabel(recommendation.recommendationLabel)}
            </span>
          </div>
          <SummaryMetric label="Characteristics score" value={recommendation.overallScore == null ? "-" : `${Math.round(recommendation.overallScore)}/100`} />
          <SummaryMetric label="Confidence" value={formatPercent(recommendation.confidenceScore / 100)} />
          <SummaryMetric label="Risk level" value={recommendation.riskLevel.replaceAll("_", " ")} />
          <SummaryMetric label="Time horizon" value={recommendation.timeHorizon.replaceAll("_", " ")} />
          <SummaryMetric label="Last updated" value={recommendation.updatedAt?.slice(0, 10) ?? "-"} />
          <SummaryMetric label="Base assessment" value={scoringLabel(recommendation, "baseLabel")} />
          <SummaryMetric label="Final assessment" value={scoringLabel(recommendation, "finalLabel")} />
        </div>
        <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          ETFVision explains instrument characteristics and portfolio fit. It does not tell you to buy, sell, add, reduce or size a position.
        </p>
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{recommendation.recommendationReasoningSummary}</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Positive characteristics</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.positiveDrivers.length ? recommendation.positiveDrivers : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Concern areas</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.negativeDrivers.length ? recommendation.negativeDrivers : ["-"]).map((item) => <li key={item}>{normalizeNegativeDriver(item)}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Guardrails</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.guardrailsApplied.length ? recommendation.guardrailsApplied : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Data limitations</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.dataLimitations.length ? recommendation.dataLimitations : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Improvement triggers</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.recommendationChangeTriggers.upgrade.length ? recommendation.recommendationChangeTriggers.upgrade : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Deterioration triggers</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.recommendationChangeTriggers.downgrade.length ? recommendation.recommendationChangeTriggers.downgrade : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs uppercase text-muted-foreground">Characteristics breakdown</p>
          {components.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No component breakdown stored.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Component</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((component) => (
                    <tr key={component.key || component.label} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{component.label}</td>
                      <td className="py-2 pr-3">{scoreValue(component.score)}</td>
                      <td className="py-2 pr-3">{typeof component.weight === "number" ? formatPercent(component.weight) : "-"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{componentDisplayReason(component)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {history ? (
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Insight history</p>
            {historyRows.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No historical insight runs stored yet.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {historyRows.map((item) => (
                  <div key={item.id} className="rounded-md border bg-background p-2 text-sm">
                    <p className="text-xs text-muted-foreground">{item.runDate}</p>
                    <p className="font-medium">{assessmentLabel(item.recommendationLabel)}</p>
                    <p className="text-xs text-muted-foreground">{item.overallScore == null ? "No score" : `${Math.round(item.overallScore)}/100`} - {formatPercent(item.confidenceScore / 100)} confidence</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function NewsSummaryCard() {
  return (
    <PlaceholderPanel
      title="News"
      description="Instrument-linked news will appear here from News Intelligence."
    />
  );
}

export function MarketVisionContextCard() {
  return (
    <PlaceholderPanel
      title="Market Vision Context"
      description="Market Vision links will connect this instrument to weekly themes and macro context."
    />
  );
}

export function InstrumentTabs({ tabs }: { tabs: Array<{ label: string; content: ReactNode }> }) {
  const ids = useMemo(() => tabs.map((tab) => tabId(tab.label)), [tabs]);
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const selectFromHash = () => {
      const hash = window.location.hash.slice(1);
      const index = ids.indexOf(hash);
      if (index >= 0) setActiveIndex(index);
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [ids]);

  function activate(index: number, focus = false) {
    setActiveIndex(index);
    const id = ids[index];
    if (id) window.history.replaceState(null, "", `#${id}`);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    activate((index + delta + tabs.length) % tabs.length, true);
  }

  const activeTab = tabs[activeIndex] ?? tabs[0];
  const activeId = ids[activeIndex] ?? ids[0] ?? "overview";

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Instrument detail sections" className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2 shadow-sm">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${ids[index]}-tab`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`${ids[index]}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => activate(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
              index === activeIndex
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-border bg-background text-muted-foreground hover:border-teal-300 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section id={`${activeId}-panel`} role="tabpanel" aria-labelledby={`${activeId}-tab`}>
        {activeTab?.content}
      </section>
    </div>
  );
}

export function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-lg border border-dashed bg-muted/70 p-4 text-sm text-muted-foreground">Prepared for the next layer. No functionality is implemented in this phase.</p>
      </CardContent>
    </Card>
  );
}

export function ThemesPanel({ instrument }: { instrument: Instrument }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Themes</CardTitle>
        <CardDescription>Canonical themes and curated tags.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ThemeBadgeList themes={instrument.canonicalThemes} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryMetric label="Benchmark tags" value={instrument.benchmarkTags.join(", ") || "-"} />
          <SummaryMetric label="Thematic tags" value={instrument.thematicTags.join(", ") || "-"} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}
