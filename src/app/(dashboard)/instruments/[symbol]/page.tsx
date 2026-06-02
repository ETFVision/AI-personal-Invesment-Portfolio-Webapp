import Link from "next/link";
import { notFound } from "next/navigation";
import { createContainer } from "@/server/container";
import {
  InstrumentHeader,
  InstrumentSummaryCard,
  InstrumentTabs,
  MarketVisionContextCard,
  NewsSummaryCard,
  PlaceholderPanel,
  RiskSummaryCard,
  SummaryMetric,
  ThemesPanel
} from "@/components/instruments/instrument-cards";
import { instrumentTypeLabel, resolveInstrumentType, type CanonicalInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";
import type { BondProfile, Instrument, InstrumentMarketView } from "@/domain/universe/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

type InstrumentDetailPageProps = {
  params: Promise<{ symbol: string }>;
};

function detailId(label: string) {
  return label.toLowerCase().replaceAll(" ", "-");
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

function PerformancePanel({ marketView }: { marketView: InstrumentMarketView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardDescription>Directory-level market metrics. Benchmark comparison remains portfolio-level for now.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Daily" value={marketView.dailyReturn == null ? "-" : formatPercent(marketView.dailyReturn)} />
        <SummaryMetric label="YTD" value={marketView.ytdReturn == null ? "-" : formatPercent(marketView.ytdReturn)} />
        <SummaryMetric label="1Y" value={marketView.oneYearReturn == null ? "-" : formatPercent(marketView.oneYearReturn)} />
        <SummaryMetric label="5Y" value={marketView.fiveYearReturn == null ? "-" : formatPercent(marketView.fiveYearReturn)} />
      </CardContent>
    </Card>
  );
}

function tabsForType(type: CanonicalInstrumentType, instrument: Instrument, marketView: InstrumentMarketView, bondProfile: BondProfile | null) {
  const common = {
    overview: <InstrumentSummaryCard marketView={marketView} />,
    news: <NewsSummaryCard />,
    themes: <ThemesPanel instrument={instrument} />,
    risk: <RiskSummaryCard instrument={instrument} />,
    marketVision: <MarketVisionContextCard />,
    recommendations: <PlaceholderPanel title="Recommendations" description="Prepared for the future recommendation layer. No buy/sell logic is implemented." />
  };

  if (type === "stock") {
    return [
      { label: "Overview", content: common.overview },
      { label: "News", content: common.news },
      { label: "Themes", content: common.themes },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision },
      { label: "Fundamentals", content: <PlaceholderPanel title="Fundamentals" description="Reserved for the upcoming Fundamentals Layer." /> },
      { label: "Recommendations", content: common.recommendations },
      { label: "Telemetry", content: <PlaceholderPanel title="Telemetry" description="Reserved for future telemetry learning." /> }
    ];
  }

  if (type === "bond_etf") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Bond Profile", content: <BondProfilePanel profile={bondProfile} /> },
      { label: "Duration", content: <PlaceholderPanel title="Duration" description="Duration analytics are prepared here and remain calculated in the bond intelligence service." /> },
      { label: "Credit Quality", content: <PlaceholderPanel title="Credit Quality" description="Credit exposure context is prepared here for bond intelligence." /> },
      { label: "News", content: common.news },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision },
      { label: "Recommendations", content: common.recommendations }
    ];
  }

  if (type === "gold_etf") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Commodity Profile", content: <PlaceholderPanel title="Commodity Profile" description="Prepared for commodity and inflation-hedge context." /> },
      { label: "News", content: common.news },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision },
      { label: "Recommendations", content: common.recommendations }
    ];
  }

  if (type === "crypto") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Price Context", content: <PerformancePanel marketView={marketView} /> },
      { label: "News", content: common.news },
      { label: "Themes", content: common.themes },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision },
      { label: "Recommendations", content: common.recommendations }
    ];
  }

  if (type === "benchmark") {
    return [
      { label: "Overview", content: common.overview },
      { label: "Performance", content: <PerformancePanel marketView={marketView} /> },
      { label: "Relative Performance", content: <PlaceholderPanel title="Relative Performance" description="Benchmark-relative analytics remain portfolio-level for this phase." /> },
      { label: "Risk", content: common.risk },
      { label: "Market Vision Context", content: common.marketVision }
    ];
  }

  return [
    { label: "Overview", content: common.overview },
    { label: "ETF Exposure", content: <PlaceholderPanel title="ETF Exposure" description="Prepared for ETF exposure detail and future fundamentals support." /> },
    { label: "Holdings", content: <PlaceholderPanel title="Holdings" description="Prepared for ETF underlying holdings once provider support is added." /> },
    { label: "Themes", content: common.themes },
    { label: "News", content: common.news },
    { label: "Risk", content: common.risk },
    { label: "Market Vision Context", content: common.marketVision },
    { label: "Recommendations", content: common.recommendations }
  ];
}

export default async function InstrumentDetailPage({ params }: InstrumentDetailPageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  const container = createContainer();
  await container.authProvider.requireUser();

  const instruments = await container.instrumentService.listInstruments({ query: decodedSymbol });
  const instrument = instruments.find((item) => item.symbol?.toUpperCase() === decodedSymbol);
  if (!instrument) notFound();

  const [marketView] = await container.instrumentMarketService.buildInstrumentMarketViews([instrument], { lookbackYears: 1 });
  const [bondProfiles] = await Promise.all([container.instrumentService.listBondProfiles()]);
  const type = resolveInstrumentType(instrument);
  const typeLabel = instrumentTypeLabel(type);
  const bondProfile = bondProfiles.find((profile) => profile.instrumentId === instrument.id) ?? null;
  const tabs = tabsForType(type, instrument, marketView, bondProfile);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/instruments/universe" className="hover:underline">Instruments</Link>
        <span>/</span>
        <span>{decodedSymbol}</span>
      </div>
      <InstrumentHeader instrument={instrument} typeLabel={typeLabel} marketView={marketView} />
      <div className="flex gap-2 overflow-x-auto rounded-md border p-2">
        {tabs.map((tab) => (
          <a key={tab.label} href={`#${detailId(tab.label)}`} className="whitespace-nowrap rounded-md bg-muted px-3 py-1.5 text-xs">
            {tab.label}
          </a>
        ))}
      </div>
      <InstrumentTabs tabs={tabs} />
    </div>
  );
}
