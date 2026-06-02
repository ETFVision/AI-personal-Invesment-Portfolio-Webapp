import type { ReactNode } from "react";
import type { Instrument, InstrumentMarketView } from "@/domain/universe/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWithCode, formatPercent } from "@/lib/utils";
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

export function RiskSummaryCard({ instrument }: { instrument: Instrument }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
        <CardDescription>Risk attributes prepared for portfolio and future recommendation context.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryMetric label="Risk category" value={instrument.riskCategory ?? "-"} />
        <SummaryMetric label="Volatility bucket" value={instrument.volatilityBucket ?? "-"} />
        <SummaryMetric label="Rate sensitivity" value={instrument.rateSensitivity ?? "-"} />
        <SummaryMetric label="Inflation sensitivity" value={instrument.inflationSensitivity ?? "-"} />
        <SummaryMetric label="Recession sensitivity" value={instrument.recessionSensitivity ?? "-"} />
        <SummaryMetric label="Liquidity role" value={instrument.liquidityRole ?? "-"} />
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
