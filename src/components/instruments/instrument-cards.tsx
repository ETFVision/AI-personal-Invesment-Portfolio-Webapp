"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { Instrument, InstrumentMarketView, InstrumentRiskMetric } from "@/domain/universe/types";
import type { InstrumentRecommendation, RecommendationHistoryItem } from "@/domain/recommendations/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniRangeBar } from "@/components/ui/charts";
import { formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";
import { DataFreshnessBadge, InstrumentTypeBadge, ThemeBadgeList } from "./instrument-badges";
import { assessmentClassName, assessmentLabel, assessmentTone, businessQualityLabel } from "@/application/services/recommendations/recommendationPresentation";

export function InstrumentHeader({
  instrument,
  typeLabel,
  marketView
}: {
  instrument: Instrument;
  typeLabel: string;
  marketView: InstrumentMarketView;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-cyan-500 to-muted" />
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <InstrumentTypeBadge label={typeLabel} />
          <DataFreshnessBadge label={marketView.freshnessLabel} tone={marketView.freshnessTone} />
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{instrument.isActive ? "Active" : "Inactive"}</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Instrument detail</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{instrument.symbol ?? "-"} - {instrument.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {instrument.exchange ?? "No exchange"} - {instrument.currency ?? "No currency"} - {instrument.geography ?? "No geography"}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:mt-0 sm:min-w-80">
        <SummaryMetric label="Latest" value={marketView.latestPrice == null ? "-" : formatCurrencyWithCode(marketView.latestPrice, instrument.currency ?? "USD")} />
        <SummaryMetric label="Daily" value={marketView.dailyReturn == null ? "-" : formatPercent(marketView.dailyReturn)} />
      </div>
    </div>
  );
}

export function InstrumentSummaryCard({ marketView }: { marketView: InstrumentMarketView }) {
  const currency = marketView.instrument.currency ?? "USD";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Canonical instrument metadata and latest market context.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Asset class" value={marketView.instrument.assetClass.replaceAll("_", " ")} />
        <SummaryMetric label="Sector" value={marketView.instrument.canonicalSector ?? marketView.instrument.sector ?? "-"} />
        <SummaryMetric label="Risk category" value={marketView.instrument.riskCategory ?? "-"} />
        <SummaryMetric label="Volatility" value={marketView.instrument.volatilityBucket ?? "-"} />
        <SummaryMetric label="YTD return" value={marketView.ytdReturn == null ? "-" : formatPercent(marketView.ytdReturn)} />
        <SummaryMetric label="1Y return" value={marketView.oneYearReturn == null ? "-" : formatPercent(marketView.oneYearReturn)} />
        <SummaryMetric label="52W low" value={marketView.fiftyTwoWeekLow == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekLow, currency)} />
        <SummaryMetric label="52W high" value={marketView.fiftyTwoWeekHigh == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekHigh, currency)} />
        <div className="rounded-lg border bg-background p-3 shadow-sm sm:col-span-2 lg:col-span-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">52W position</p>
          <div className="mt-3">
            <MiniRangeBar
              current={marketView.latestPrice}
              low={marketView.fiftyTwoWeekLow}
              high={marketView.fiftyTwoWeekHigh}
              lowLabel={marketView.fiftyTwoWeekLow == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekLow, currency)}
              highLabel={marketView.fiftyTwoWeekHigh == null ? "-" : formatCurrencyWithCode(marketView.fiftyTwoWeekHigh, currency)}
            />
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
  return value == null ? "Insufficient history" : formatPercent(value);
}

function compactPercent(value: number | null | undefined) {
  return value == null ? "-" : formatPercent(value);
}

function rangeValue(marketView: InstrumentMarketView) {
  const currency = marketView.instrument.currency ?? "USD";
  if (marketView.fiftyTwoWeekLow == null || marketView.fiftyTwoWeekHigh == null) return "-";
  return `${formatCurrencyWithCode(marketView.fiftyTwoWeekLow, currency)} - ${formatCurrencyWithCode(marketView.fiftyTwoWeekHigh, currency)}`;
}

function LongHorizonBlock({ marketView, riskMetric }: { marketView: InstrumentMarketView; riskMetric: InstrumentRiskMetric | null }) {
  const rows = [
    {
      label: "Total return",
      values: [marketView.tenYearReturn, marketView.fifteenYearReturn, marketView.twentyYearReturn]
    },
    {
      label: "Volatility",
      values: [riskMetric?.volatility10y, riskMetric?.volatility15y, riskMetric?.volatility20y]
    },
    {
      label: "Max drawdown",
      values: [riskMetric?.maxDrawdown10y, riskMetric?.maxDrawdown15y, riskMetric?.maxDrawdown20y]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Long-horizon - display only</CardTitle>
        <CardDescription>These diagnostics are shown for context and do not feed scoring or guardrails.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">10Y</th>
              <th className="py-2 pr-4">15Y</th>
              <th className="py-2 pr-4">20Y</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.label}</td>
                {row.values.map((value, index) => (
                  <td key={`${row.label}-${index}`} className="py-2 pr-4 text-muted-foreground">{marketPercent(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Characteristics breakdown</CardTitle>
            <CardDescription>Stored scoring components and weights from the latest deterministic insight.</CardDescription>
          </div>
          <ToneChip label={assessmentLabel(recommendation.recommendationLabel)} tone={finalTone} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">No component breakdown stored.</p>
        ) : (
          components.map((component) => {
            const score = typeof component.score === "number" && Number.isFinite(component.score) ? Math.round(component.score) : null;
            const quality = componentQualityLabel(component);
            return (
              <div key={component.key || component.label} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{component.label}</p>
                    <p className="text-xs text-muted-foreground">Weight {typeof component.weight === "number" ? formatPercent(component.weight) : "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quality ? <ToneChip label={quality.label} tone={quality.tone} /> : null}
                    <ToneChip label={score == null ? "-" : `${score}/100`} tone={score == null ? "neutral" : score >= 70 ? "positive" : score >= 45 ? "info" : "warning"} />
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function InstrumentOverviewPanel({
  instrument,
  typeLabel,
  marketView,
  riskMetric,
  recommendation,
  priceChart,
  scoreTrend
}: {
  instrument: Instrument;
  typeLabel: string;
  marketView: InstrumentMarketView;
  riskMetric: InstrumentRiskMetric | null;
  recommendation: InstrumentRecommendation | null;
  priceChart: ReactNode;
  scoreTrend: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div id="instrument-price-chart-slot">
        {/* instrument-price-chart-slot */}
        {priceChart}
      </div>
      <InstrumentHeader instrument={instrument} typeLabel={typeLabel} marketView={marketView} />
      <InstrumentSummaryCard marketView={marketView} />
      <Card>
        <CardHeader>
          <CardTitle>Key returns</CardTitle>
          <CardDescription>Stored derived market metrics for quick orientation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="YTD" value={compactPercent(marketView.ytdReturn)} />
          <SummaryMetric label="1Y" value={compactPercent(marketView.oneYearReturn)} />
          <SummaryMetric label="5Y" value={compactPercent(marketView.fiveYearReturn)} />
          <SummaryMetric label="52W range" value={rangeValue(marketView)} />
        </CardContent>
      </Card>
      <LongHorizonBlock marketView={marketView} riskMetric={riskMetric} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {scoreTrend}
        <CharacteristicsBreakdown recommendation={recommendation} />
      </div>
      <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        Data quality: liquidity {marketView.liquidity}; freshness {marketView.freshnessLabel}; history start {marketView.priceHistoryStart ?? "-"}; observations {formatNumber(marketView.priceObservationCount)}.
      </p>
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        Analytical classifications only; not investment advice or a recommendation to buy, sell, or hold.
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
