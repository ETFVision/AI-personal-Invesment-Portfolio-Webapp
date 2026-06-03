import type { ReactNode } from "react";
import type { Instrument, InstrumentMarketView, InstrumentRiskMetric } from "@/domain/universe/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithCode, formatNumber, formatPercent } from "@/lib/utils";
import { DataFreshnessBadge, InstrumentTypeBadge, ThemeBadgeList } from "./instrument-badges";

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
    <div className="flex flex-col justify-between gap-4 rounded-md border p-4 sm:flex-row sm:items-start">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <InstrumentTypeBadge label={typeLabel} />
          <DataFreshnessBadge label={marketView.freshnessLabel} tone={marketView.freshnessTone} />
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{instrument.isActive ? "Active" : "Inactive"}</span>
        </div>
        <p className="text-sm text-muted-foreground">Instrument detail</p>
        <h1 className="text-2xl font-semibold">{instrument.symbol ?? "-"} - {instrument.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {instrument.exchange ?? "No exchange"} - {instrument.currency ?? "No currency"} - {instrument.geography ?? "No geography"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
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

function recommendationTone(label: string) {
  if (label === "Strong Buy" || label === "Buy") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (label === "Hold") return "border-blue-200 bg-blue-50 text-blue-900";
  if (label === "Watch") return "border-amber-200 bg-amber-50 text-amber-900";
  if (label === "Reduce" || label === "Sell") return "border-red-200 bg-red-50 text-red-900";
  return "border-border bg-muted text-muted-foreground";
}

export function RiskSummaryCard({ riskMetric }: { instrument: Instrument; riskMetric: InstrumentRiskMetric | null }) {
  if (!riskMetric) {
    return <PlaceholderPanel title="Risk" description="No sufficient stored price history is available for instrument risk metrics yet." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
        <CardDescription>Calculated from stored price history. Return, price and liquidity metrics stay in Performance.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Risk score" value={riskMetric.riskScore == null ? "-" : `${Math.round(riskMetric.riskScore)}/100`} />
        <SummaryMetric label="Risk bucket" value={riskLabel(riskMetric.riskBucket)} />
        <SummaryMetric label="Confidence" value={formatPercent(riskMetric.confidenceScore / 100)} />
        <SummaryMetric label="Vol trend" value={riskLabel(riskMetric.volatilityTrend)} />
        <SummaryMetric label="30D volatility" value={riskPercent(riskMetric.volatility30d)} />
        <SummaryMetric label="90D volatility" value={riskPercent(riskMetric.volatility90d)} />
        <SummaryMetric label="1Y volatility" value={riskPercent(riskMetric.volatility1y)} />
        <SummaryMetric label="Downside volatility" value={riskPercent(riskMetric.downsideVolatility)} />
        <SummaryMetric label="Current DD (1Y)" value={riskPercent(riskMetric.currentDrawdown1y)} />
        <SummaryMetric label="Max DD (1Y)" value={riskPercent(riskMetric.maxDrawdown1y)} />
        <SummaryMetric label="Max DD (3Y)" value={riskPercent(riskMetric.maxDrawdown3y)} />
        <SummaryMetric label="Max DD (5Y)" value={riskPercent(riskMetric.maxDrawdown5y)} />
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

export function RecommendationSummaryCard({ recommendation }: { recommendation: InstrumentRecommendation | null }) {
  if (!recommendation) {
    return <PlaceholderPanel title="Recommendations" description="No recommendation has been generated for this instrument yet. Run the deterministic recommendation engine from Research." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendation</CardTitle>
        <CardDescription>Deterministic V1 score with explainable drivers and guardrails. This does not place trades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs uppercase text-muted-foreground">Label</p>
            <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-sm font-medium ${recommendationTone(recommendation.recommendationLabel)}`}>
              {recommendation.recommendationLabel}
            </span>
          </div>
          <SummaryMetric label="Score" value={recommendation.overallScore == null ? "-" : `${Math.round(recommendation.overallScore)}/100`} />
          <SummaryMetric label="Confidence" value={formatPercent(recommendation.confidenceScore / 100)} />
          <SummaryMetric label="Risk level" value={recommendation.riskLevel.replaceAll("_", " ")} />
          <SummaryMetric label="Time horizon" value={recommendation.timeHorizon.replaceAll("_", " ")} />
          <SummaryMetric label="Last updated" value={recommendation.updatedAt?.slice(0, 10) ?? "-"} />
        </div>
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{recommendation.recommendationReasoningSummary}</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Positive drivers</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.positiveDrivers.length ? recommendation.positiveDrivers : ["-"]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase text-muted-foreground">Negative drivers</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {(recommendation.negativeDrivers.length ? recommendation.negativeDrivers : ["-"]).map((item) => <li key={item}>{item}</li>)}
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
        </div>
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
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-md border p-2">
        {tabs.map((tab) => (
          <a key={tab.label} href={`#${tab.label.toLowerCase().replaceAll(" ", "-")}`} className="whitespace-nowrap rounded-md bg-muted px-3 py-1.5 text-xs">
            {tab.label}
          </a>
        ))}
      </div>
      {tabs.map((tab) => (
        <section key={tab.label} id={tab.label.toLowerCase().replaceAll(" ", "-")}>
          {tab.content}
        </section>
      ))}
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
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Prepared for the next layer. No functionality is implemented in this phase.</p>
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
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
