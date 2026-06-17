import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import {
  reclassifyPendingNewsAction,
  runDailyNewsIngestionAction,
  runGdeltNewsIngestionAction,
  runNewsDataNewsIngestionAction,
  runWeeklyNewsReconciliationAction
} from "@/server/actions/newsActions";
import { backfillMacroIndicatorsAction, refreshMacroIndicatorsAction } from "@/server/actions/macroActions";
import { refreshFundamentalsAction } from "@/server/actions/fundamentalsActions";
import { refreshEtfLookthroughExposureAction } from "@/server/actions/portfolioReviewActions";
import {
  backfillUniverseHistoryAction,
  refreshInstrumentDailyReturnsAction,
  refreshInstrumentMarketMetricsAction,
  refreshInstrumentMetadataAction,
  refreshInstrumentPricesAction,
  refreshPortfolioSummaryTablesAction,
  refreshInstrumentReturnAnchorsAction,
  refreshInstrumentRiskMetricsAction
} from "@/server/actions/dataRefreshActions";
import { seedUniverseAction } from "@/server/actions/universeActions";
import {
  createMarketVisionDraftAction,
  createMarketVisionDraftFromLatestNewsAction,
  generateAiMarketVisionDraftAction
} from "@/server/actions/marketVisionActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import { env } from "@/infrastructure/config/env";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import type { FundamentalsSummaryRow } from "@/domain/fundamentals/types";
import type { EtfCountryExposure, EtfSectorExposure, EtfTopHolding } from "@/domain/etfLookthrough/types";
import type { Instrument } from "@/domain/universe/types";
import type { JobRun } from "@/domain/jobs/types";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusLabel(enabled: boolean, configured = true) {
  if (!configured) return { label: "Missing key", className: "text-destructive" };
  if (!enabled) return { label: "Disabled", className: "text-amber-600" };
  return { label: "Ready", className: "text-emerald-600" };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
    timeZoneName: "short"
  }).format(new Date(value));
}

function statusTone(value?: string) {
  if (value === "success") return "text-emerald-600";
  if (value === "partial_success") return "text-amber-600";
  if (value === "failed") return "text-destructive";
  if (value === "Queued") return "text-amber-600";
  return "text-muted-foreground";
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function marketDataRunSummary(summary: Record<string, unknown>) {
  const message = summary.message;
  if (typeof message === "string" && message.trim()) return message;
  const pairs = Object.entries(summary)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 4);
  return pairs.length > 0 ? pairs.map(([key, value]) => `${key}: ${String(value)}`).join(" | ") : "No summary payload.";
}

function daysBetween(dateIso: string | null | undefined, now = new Date()) {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

function estimateClicks(count: number, batchSize: number) {
  return Math.ceil(Math.max(0, count) / Math.max(1, batchSize));
}

function latestString(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function fundamentalsCoverageSummary(rows: FundamentalsSummaryRow[], batchSize: number, refreshFrequencyDays: number) {
  const completeRows = rows.filter((row) => row.profile && row.latestScore && row.latestTrendSummary);
  const missingComplete = rows.length - completeRows.length;
  const staleRows = rows.filter((row) => row.profile && daysBetween(row.profile.lastRefreshedAt) >= refreshFrequencyDays);
  const actionable = rows.filter((row) => {
    const complete = Boolean(row.profile && row.latestScore && row.latestTrendSummary);
    const stale = row.profile ? daysBetween(row.profile.lastRefreshedAt) >= refreshFrequencyDays : true;
    return !complete || stale;
  }).length;
  return {
    totalEligible: rows.length,
    completeCount: completeRows.length,
    missingComplete,
    staleCount: staleRows.length,
    latestRunDate: latestString(rows.map((row) => row.profile?.lastRefreshedAt)),
    batchSize,
    estimatedManualClicks: estimateClicks(actionable, batchSize)
  };
}

const ETF_LOOKTHROUGH_EXCLUDED_SECTORS = new Set(["Bonds / Fixed Income", "Commodities / Gold", "Crypto", "Cash / Money Market"]);

function etfLookthroughEligible(instruments: Instrument[]) {
  return instruments
    .filter((instrument) => instrument.assetClass === "etf" && instrument.symbol)
    .filter((instrument) => !ETF_LOOKTHROUGH_EXCLUDED_SECTORS.has(instrument.canonicalSector ?? ""));
}

function etfLookthroughCoverageSummary(
  eligibleEtfs: Instrument[],
  sectorExposures: EtfSectorExposure[],
  countryExposures: EtfCountryExposure[],
  topHoldings: EtfTopHolding[],
  batchSize: number,
  staleAfterDays: number
) {
  const latestSectorDateById = new Map<string, string>();
  for (const row of sectorExposures) {
    const latest = latestSectorDateById.get(row.etfInstrumentId);
    if (!latest || row.asOfDate > latest) latestSectorDateById.set(row.etfInstrumentId, row.asOfDate);
  }
  const staleCutoff = daysAgoIso(staleAfterDays);
  const sectorIds = new Set(latestSectorDateById.keys());
  const countryIds = new Set(countryExposures.map((row) => row.etfInstrumentId));
  const topHoldingIds = new Set(topHoldings.map((row) => row.etfInstrumentId));
  const missingSectorCount = eligibleEtfs.filter((instrument) => !sectorIds.has(instrument.id)).length;
  const staleSectorCount = eligibleEtfs.filter((instrument) => {
    const latest = latestSectorDateById.get(instrument.id);
    return Boolean(latest && latest < staleCutoff);
  }).length;
  return {
    totalEligible: eligibleEtfs.length,
    sectorCoverageCount: sectorIds.size,
    countryCoverageCount: countryIds.size,
    topHoldingCoverageCount: topHoldingIds.size,
    missingSectorCount,
    staleSectorCount,
    staleCutoff,
    latestExposureDate: latestString(sectorExposures.map((row) => row.asOfDate)),
    batchSize,
    estimatedManualClicks: estimateClicks(missingSectorCount + staleSectorCount, batchSize)
  };
}

function metadataCoverageSummary(instruments: Instrument[], batchSize: number, staleAfterDays: number) {
  const staleCutoffIso = daysAgoIso(staleAfterDays);
  const refreshed = instruments.filter((instrument) => Boolean(instrument.metadataLastRefreshedAt));
  const stale = refreshed.filter((instrument) => instrument.metadataLastRefreshedAt && instrument.metadataLastRefreshedAt.slice(0, 10) < staleCutoffIso);
  const neverRefreshed = instruments.length - refreshed.length;
  const actionable = stale.length + neverRefreshed;

  return {
    totalEligible: instruments.length,
    refreshedCount: refreshed.length,
    freshCount: refreshed.length - stale.length,
    staleCount: stale.length,
    neverRefreshed,
    latestRefresh: latestString(refreshed.map((instrument) => instrument.metadataLastRefreshedAt)),
    oldestRefresh: refreshed
      .map((instrument) => instrument.metadataLastRefreshedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(0) ?? null,
    staleCutoff: staleCutoffIso,
    batchSize,
    estimatedManualClicks: estimateClicks(actionable, batchSize)
  };
}

function sourceLabel(value: string) {
  if (value === "gdelt") return "GDELT";
  if (value === "newsdata") return "NewsData";
  if (value === "financial_modeling_prep") return "FMP";
  return value;
}

function queryStatusSummary(statuses: Array<{ latestLog: {
  status: string;
  articlesFetched: number;
  articlesInserted: number;
  duplicatesDetected: number;
  completedAt: string | null;
  startedAt: string;
  metadata: Record<string, unknown> | null;
} | null }>) {
  const logs = statuses.map((status) => status.latestLog).filter((log): log is NonNullable<typeof log> => Boolean(log));
  const latest = logs.map((log) => log.completedAt ?? log.startedAt).sort().at(-1) ?? null;
  return {
    fetched: logs.reduce((sum, log) => sum + log.articlesFetched, 0),
    saved: logs.reduce((sum, log) => sum + log.articlesInserted, 0),
    filtered: logs.reduce((sum, log) => sum + metadataNumber(log.metadata, "articlesFiltered"), 0),
    duplicates: logs.reduce((sum, log) => sum + log.duplicatesDetected, 0),
    failed: logs.filter((log) => log.status === "failed").length,
    latest
  };
}

function fmpFetchSummary(log: {
  articlesFetched: number;
  articlesInserted: number;
  duplicatesDetected: number;
  completedAt: string | null;
  startedAt: string;
  status: string;
  instrumentsRequested: number;
  metadata: Record<string, unknown> | null;
} | null | undefined) {
  const instrumentFetched = metadataNumber(log?.metadata, "instrumentArticlesFetched");
  const generalFetched = metadataNumber(log?.metadata, "generalArticlesFetched");
  const instrumentSaved = metadataNumber(log?.metadata, "instrumentArticlesSaved");
  const generalSaved = metadataNumber(log?.metadata, "generalArticlesSaved");
  return {
    status: log?.status ?? "Not run",
    fetched: log?.articlesFetched ?? 0,
    saved: log?.articlesInserted ?? 0,
    duplicates: log?.duplicatesDetected ?? 0,
    latest: log?.completedAt ?? log?.startedAt ?? null,
    instrumentsRequested: log?.instrumentsRequested ?? 0,
    groups: [
      {
        name: "Instrument news",
        description: `${log?.instrumentsRequested ?? 0} active instruments requested`,
        fetched: instrumentFetched || (log ? log.articlesFetched - generalFetched : 0),
        saved: instrumentSaved || (log ? log.articlesInserted - generalSaved : 0),
        limit: metadataNumber(log?.metadata, "maxArticlesPerInstrument")
      },
      {
        name: "General market news",
        description: "FMP general-latest fill after instrument news",
        fetched: generalFetched,
        saved: generalSaved,
        limit: 20
      }
    ]
  };
}

type SecurityMasterHealth = Record<string, unknown>;

function healthNumber(health: SecurityMasterHealth | null, key: string) {
  const value = health?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function healthRatio(health: SecurityMasterHealth | null, numeratorKey: string, denominatorKey: string) {
  const numerator = healthNumber(health, numeratorKey);
  const denominator = healthNumber(health, denominatorKey);
  return denominator > 0 ? `${numerator}/${denominator}` : "-";
}

async function getSecurityMasterHealthSnapshot(): Promise<SecurityMasterHealth | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc("get_security_master_health_snapshot");
  if (error?.code === "42883" || error?.code === "42P01" || error?.message?.toLowerCase().includes("security_master")) {
    return null;
  }
  if (error) throw new Error(error.message);
  return data && typeof data === "object" && !Array.isArray(data) ? data as SecurityMasterHealth : null;
}

function StatBox({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function MetricLayerCard({
  title,
  description,
  coverage
}: {
  title: string;
  description: string;
  coverage: {
    totalEligible: number;
    currentCount: number;
    staleCount: number;
    missingCount: number;
    latestExpectedDate: string;
    latestLayerDate: string | null;
    oldestLayerDate: string | null;
    batchSize: number;
    estimatedManualClicks: number;
  };
}) {
  const needsWork = coverage.staleCount + coverage.missingCount;
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${needsWork === 0 ? "text-emerald-600" : "text-amber-600"}`}>
          {needsWork === 0 ? "Current" : `${needsWork} due`}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label="Current" value={`${coverage.currentCount}/${coverage.totalEligible}`} />
        <StatBox label="Stale" value={coverage.staleCount} className={coverage.staleCount > 0 ? "text-amber-600" : undefined} />
        <StatBox label="Missing" value={coverage.missingCount} className={coverage.missingCount > 0 ? "text-destructive" : undefined} />
        <StatBox label="Expected date" value={coverage.latestExpectedDate} />
        <StatBox label="Latest layer date" value={coverage.latestLayerDate ?? "-"} />
        <StatBox label="Oldest layer date" value={coverage.oldestLayerDate ?? "-"} />
        <StatBox label="Batch size" value={coverage.batchSize} />
        <StatBox label="Est. clicks" value={coverage.estimatedManualClicks} />
      </div>
    </div>
  );
}

function OperationSection({
  title,
  description,
  whereUsed,
  actions,
  actionsFirst = false,
  children
}: {
  title: string;
  description: string;
  whereUsed: string;
  actions?: ReactNode;
  actionsFirst?: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        {actionsFirst ? (
          <div className="space-y-4">
            {actions ? <div className="flex flex-wrap justify-center gap-2">{actions}</div> : null}
            <div className="text-center">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
              <p className="mt-2 text-xs text-muted-foreground">Used for: {whereUsed}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
              <p className="mt-2 text-xs text-muted-foreground">Used for: {whereUsed}</p>
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
          </div>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function latestRunByName(jobRuns: JobRun[]) {
  const map = new Map<string, JobRun>();
  for (const run of jobRuns) {
    if (!map.has(run.jobName)) map.set(run.jobName, run);
  }
  return map;
}

function DailyJobStatusCard({
  label,
  scheduledTime,
  run
}: {
  label: string;
  scheduledTime: string;
  run: JobRun | undefined;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{scheduledTime} SGT</p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${statusTone(run?.status)}`}>{run?.status ?? "No run"}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Latest: {formatDateTime(run?.completedAt ?? run?.startedAt)}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run ? marketDataRunSummary(run.summary) : "No job log recorded yet."}</p>
      {run?.errorMessage ? <p className="mt-1 line-clamp-2 text-xs text-destructive">{run.errorMessage}</p> : null}
    </div>
  );
}

const dailyRefreshJobs = [
  { label: "Instrument prices", scheduledTime: "5:20-5:40 AM", jobName: "instrument-price-refresh" },
  { label: "Daily returns", scheduledTime: "5:45 AM", jobName: "instrument-daily-returns-refresh" },
  { label: "Return anchors", scheduledTime: "5:55 AM", jobName: "instrument-return-anchors-refresh" },
  { label: "Market metrics", scheduledTime: "6:05 AM", jobName: "instrument-market-metrics-refresh" },
  { label: "Risk metrics", scheduledTime: "6:15-6:25 AM", jobName: "refresh_instrument_risk_metrics" },
  { label: "Instrument metadata", scheduledTime: "6:35 AM", jobName: "instrument-metadata-refresh" },
  { label: "Benchmarks", scheduledTime: "6:45 AM", jobName: "benchmark-refresh" },
  { label: "Portfolio valuation", scheduledTime: "6:55 AM", jobName: "portfolio-valuation-refresh" },
  { label: "Portfolio summaries", scheduledTime: "7:05 AM", jobName: "portfolio-summary-refresh" },
  { label: "FRED macro", scheduledTime: "7:15 AM", jobName: "fred-refresh" },
  { label: "FMP news", scheduledTime: "7:25 AM", jobName: "fmp-news-ingestion" },
  { label: "NewsData", scheduledTime: "7:35 AM", jobName: "newsdata-news-ingestion" }
];

const providers = [
  {
    name: "Financial Modeling Prep",
    role: "Prices, metadata, fundamentals, ETF look-through and instrument news",
    status: statusLabel(Boolean(env.FMP_API_KEY), Boolean(env.FMP_API_KEY)),
    notes: "Server-side API key only."
  },
  {
    name: "FRED",
    role: "Macro indicators and macro theme signals",
    status: statusLabel(Boolean(env.FRED_API_KEY), Boolean(env.FRED_API_KEY)),
    notes: `${env.FRED_BACKFILL_YEARS}y backfill window.`
  },
  {
    name: "NewsData.io",
    role: "Primary macro and world-news stream",
    status: statusLabel(env.ENABLE_NEWSDATA_INGESTION, Boolean(env.NEWSDATA_API_KEY)),
    notes: `${env.NEWSDATA_MAX_QUERY_GROUPS} query groups/run, ${env.NEWSDATA_RUN_FREQUENCY_DAYS}d success cadence.`
  },
  {
    name: "GDELT",
    role: "Fallback macro and world-news stream",
    status: statusLabel(env.ENABLE_GDELT_INGESTION),
    notes: `${env.GDELT_MAX_QUERY_GROUPS_PER_RUN} query group/run with queue pacing.`
  },
  {
    name: "OpenAI",
    role: "Market Vision generation and optional news classification",
    status: statusLabel(Boolean(env.OPENAI_API_KEY), Boolean(env.OPENAI_API_KEY)),
    notes: `Market Vision model: ${env.MARKET_VISION_MODEL}.`
  }
];

type DataSourcesPageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    metadataMessage?: string;
    metadataError?: string;
    priceMessage?: string;
    priceError?: string;
    portfolioReviewMessage?: string;
    portfolioReviewError?: string;
    error?: string;
  }>;
};

export default async function DataSourcesPage({ searchParams }: DataSourcesPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const [newsDashboard, macroDashboard, fundamentalsLogs, fundamentalsRows, etfExposureLogs, marketVisionDashboard, instruments, jobRuns] =
    await measureRenderStep("admin-data-sources:primary-data", () =>
      Promise.all([
        container.newsDashboardService.getDashboard({ includeDuplicates: true, limit: 10 }),
        container.macroDashboardService.getDashboard(),
        container.fundamentalsRepository.listRefreshLogs(8),
        container.fundamentalsRepository.listSummaryRows(),
        container.etfExposureRepository.listRefreshLogs(8),
        container.marketVisionService.getDashboard(),
        container.instrumentService.listInstruments({ isActive: true }),
        container.jobRunService.listRecent(60)
      ])
    );
  const eligibleLookthroughEtfs = etfLookthroughEligible(instruments);
  const eligibleLookthroughEtfIds = eligibleLookthroughEtfs.map((instrument) => instrument.id);
  const [etfSectorExposures, etfCountryExposures, etfTopHoldings] = eligibleLookthroughEtfIds.length > 0
    ? await measureRenderStep("admin-data-sources:etf-exposures", () =>
        Promise.all([
          container.etfExposureRepository.listLatestSectorExposures(eligibleLookthroughEtfIds),
          container.etfExposureRepository.listLatestCountryExposures(eligibleLookthroughEtfIds),
          container.etfExposureRepository.listLatestTopHoldings(eligibleLookthroughEtfIds)
        ])
      )
    : [[], [], []];
  const [latestPriceCoverage, historyCoverage, metricLayerCoverage] = await measureRenderStep("admin-data-sources:market-coverage", () =>
    Promise.all([
      container.instrumentMarketService.getLatestPriceCoverageSummary(instruments, 75),
      container.instrumentMarketService.getHistoryCoverageSummary(instruments, 8),
      container.instrumentMarketService.getMetricLayerCoverageSummary(instruments, {
        dailyReturnsBatchSize: 350,
        returnAnchorsBatchSize: 350,
        marketMetricsBatchSize: 350,
        riskMetricsBatchSize: 200
      })
    ])
  );
  const securityMasterHealth = await measureRenderStep("admin-data-sources:security-master-health", () => getSecurityMasterHealthSnapshot());
  const fundamentalsCoverage = fundamentalsCoverageSummary(fundamentalsRows, env.FUNDAMENTALS_MAX_STOCKS_PER_REFRESH, env.FUNDAMENTALS_REFRESH_FREQUENCY_DAYS);
  const etfCoverage = etfLookthroughCoverageSummary(
    eligibleLookthroughEtfs,
    etfSectorExposures,
    etfCountryExposures,
    etfTopHoldings,
    env.ETF_LOOKTHROUGH_MAX_ETFS_PER_RUN,
    env.ETF_LOOKTHROUGH_STALE_AFTER_DAYS
  );
  const metadataCoverage = metadataCoverageSummary(instruments, 25, 30);
  const latestJobRunByName = latestRunByName(jobRuns);
  const summaryJobRuns = jobRuns
    .filter((run) =>
      [
        "portfolio-summary-refresh",
        "portfolio-dashboard-summary-refresh",
        "portfolio-performance-summary-refresh",
        "portfolio-valuation-refresh"
      ].includes(run.jobName)
    )
    .slice(0, 8);
  const marketDataJobRuns = jobRuns
    .filter((run) =>
      [
        "seed_universe",
        "refresh_market_data",
        "instrument-price-refresh",
        "instrument-daily-returns-refresh",
        "instrument-return-anchors-refresh",
        "backfill_market_history",
        "instrument-market-metrics-refresh",
        "refresh_instrument_risk_metrics",
        "instrument-metadata-refresh",
        "portfolio-summary-refresh"
      ].includes(run.jobName)
    )
    .slice(0, 12);

  const latestFmpLog = newsDashboard.ingestionLogs.find((log) => log.sourceProvider === "financial_modeling_prep" && log.jobName === "daily-news-ingestion") ?? null;
  const fmpSummary = fmpFetchSummary(latestFmpLog);
  const newsDataSummary = queryStatusSummary(newsDashboard.newsDataQueryStatuses);
  const gdeltSummary = queryStatusSummary(newsDashboard.gdeltQueryStatuses);
  const latestMacroLog = macroDashboard.ingestionLogs[0] ?? null;
  const latestFundamentalsLog = fundamentalsLogs[0] ?? null;
  const latestEtfLog = etfExposureLogs[0] ?? null;
  const latestWeeklyNews = newsDashboard.weeklyReconciliations[0] ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Data Sources"
        description="Operational data-source health, ingestion diagnostics and refresh controls."
        meta={<StatusBadge tone="info">{providers.length} providers</StatusBadge>}
      />

      {params?.message ||
      params?.refreshMessage ||
      params?.metadataMessage ||
      params?.priceMessage ||
      params?.portfolioReviewMessage ||
      params?.refreshError ||
      params?.metadataError ||
      params?.priceError ||
      params?.portfolioReviewError ||
      params?.error ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.refreshError || params.metadataError || params.priceError || params.portfolioReviewError || params.error ? "text-destructive" : "text-muted-foreground"}`}>
            {params.refreshError ??
              params.metadataError ??
              params.priceError ??
              params.portfolioReviewError ??
              params.error ??
              params.refreshMessage ??
              params.metadataMessage ??
              params.priceMessage ??
              params.portfolioReviewMessage ??
              params.message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Provider configuration</CardTitle>
          <CardDescription>Provider keys remain server-side environment variables. Operational logs are centralized here so research pages stay focused on insights.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.name} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{provider.role}</p>
                </div>
                <span className={`shrink-0 text-sm font-medium ${provider.status.className}`}>{provider.status.label}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{provider.notes}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Refresh Status</CardTitle>
          <CardDescription>
            Latest job status for the daily scheduled chain. Times are Singapore time and reflect the current Supabase cron plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dailyRefreshJobs.map((job) => (
              <DailyJobStatusCard
                key={job.jobName}
                label={job.label}
                scheduledTime={job.scheduledTime}
                run={latestJobRunByName.get(job.jobName)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <OperationSection
        title="Security Master QA"
        description="Canonical security, issuer, ETF holding mapping, lifecycle and provider reconciliation coverage."
        whereUsed="portfolio review, hidden overlap, assistant context, insights history, telemetry, future corporate-action handling"
      >
        {securityMasterHealth ? (
          <>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatBox label="Selectable mapped" value={healthRatio(securityMasterHealth, "selectableWithSecurityId", "selectableInstruments")} />
              <StatBox label="Active securities" value={healthNumber(securityMasterHealth, "securityMasterRecords")} />
              <StatBox label="Issuer records" value={healthNumber(securityMasterHealth, "issuerRecords")} />
              <StatBox label="Linked securities" value={healthNumber(securityMasterHealth, "linkedSecurities")} />
              <StatBox label="ISIN coverage" value={healthRatio(securityMasterHealth, "selectableWithIsin", "selectableInstruments")} />
              <StatBox label="CUSIP coverage" value={healthRatio(securityMasterHealth, "selectableWithCusip", "selectableInstruments")} />
              <StatBox label="ETF holdings mapped" value={healthRatio(securityMasterHealth, "etfTopHoldingsMapped", "etfTopHoldingRows")} />
              <StatBox label="ETF holdings unmapped" value={healthNumber(securityMasterHealth, "etfTopHoldingsUnmapped")} className={healthNumber(securityMasterHealth, "etfTopHoldingsUnmapped") > 0 ? "text-amber-600" : undefined} />
              <StatBox label="Ambiguous holdings" value={healthNumber(securityMasterHealth, "etfTopHoldingsAmbiguous")} className={healthNumber(securityMasterHealth, "etfTopHoldingsAmbiguous") > 0 ? "text-destructive" : undefined} />
              <StatBox label="Issuer dupes open" value={healthNumber(securityMasterHealth, "issuerDuplicateCandidatesOpen")} className={healthNumber(securityMasterHealth, "issuerDuplicateCandidatesOpen") > 0 ? "text-amber-600" : undefined} />
              <StatBox label="Mapping gap rows" value={healthNumber(securityMasterHealth, "mappingGapRows")} className={healthNumber(securityMasterHealth, "mappingGapRows") > 0 ? "text-amber-600" : undefined} />
              <StatBox label="Stale identifiers" value={healthNumber(securityMasterHealth, "staleIdentifierRefreshes")} className={healthNumber(securityMasterHealth, "staleIdentifierRefreshes") > 0 ? "text-amber-600" : undefined} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatBox label="Latest insights identity" value={healthRatio(securityMasterHealth, "recommendationsWithSecurityId", "recommendationsTotal")} />
              <StatBox label="History identity" value={healthRatio(securityMasterHealth, "recommendationHistoryWithSecurityId", "recommendationHistoryTotal")} />
              <StatBox label="Telemetry identity" value={healthRatio(securityMasterHealth, "telemetryRecommendationSnapshotsWithSecurityId", "telemetryRecommendationSnapshotsTotal")} />
              <StatBox label="Portfolio reports phase5" value={healthRatio(securityMasterHealth, "portfolioReviewPhase5Reports", "portfolioReviewReports")} />
              <StatBox label="Corporate actions" value={healthNumber(securityMasterHealth, "corporateActionRows")} />
              <StatBox label="Provider conflicts open" value={healthNumber(securityMasterHealth, "providerOpenConflictRows")} className={healthNumber(securityMasterHealth, "providerOpenConflictRows") > 0 ? "text-destructive" : undefined} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Export detailed Security Master issues from the `security_master_mapping_gap_report` view in Supabase. Phase 6 and 7 tables are readiness layers until provider reconciliation and corporate-action ingestion are automated.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Security Master health snapshot is not available yet. Apply migrations through `103_security_master_phase8_monitoring.sql` or later to enable this card.
          </p>
        )}
      </OperationSection>

      <OperationSection
        title="Portfolio Summary Read Models"
        description="Stored portfolio dashboard and performance summaries used to speed up portfolio, holdings and cash pages."
        whereUsed="portfolio dashboard, holdings, cash, performance chart"
        actions={
          <form action={refreshPortfolioSummaryTablesAction}>
            <input type="hidden" name="returnTo" value="/admin/data-sources" />
            <SubmitButton pendingLabel="Refreshing summaries...">Refresh portfolio summaries</SubmitButton>
          </form>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <StatBox
            label="Summary refresh latest run"
            value={formatDateTime(latestJobRunByName.get("portfolio-summary-refresh")?.completedAt ?? latestJobRunByName.get("portfolio-summary-refresh")?.startedAt)}
          />
          <StatBox
            label="Summary refresh status"
            value={latestJobRunByName.get("portfolio-summary-refresh")?.status ?? "No run"}
            className={statusTone(latestJobRunByName.get("portfolio-summary-refresh")?.status)}
          />
          <StatBox
            label="Portfolio valuation latest run"
            value={formatDateTime(latestJobRunByName.get("portfolio-valuation-refresh")?.completedAt ?? latestJobRunByName.get("portfolio-valuation-refresh")?.startedAt)}
          />
        </div>
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">Portfolio summary refresh logs</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent combined and legacy summary refresh runs. The combined job refreshes dashboard and performance summaries together.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {summaryJobRuns.length === 0 ? (
              <p className="text-muted-foreground">No portfolio summary refresh logs have been recorded yet.</p>
            ) : summaryJobRuns.map((run) => (
              <div key={run.id} className="rounded-md bg-muted/40 p-3">
                <p className={`font-medium ${statusTone(run.status)}`}>{run.jobName.replaceAll("-", " ")} - {run.status}</p>
                <p className="text-muted-foreground">{formatDateTime(run.completedAt ?? run.startedAt)} - {marketDataRunSummary(run.summary)}</p>
                {run.errorMessage ? <p className="text-destructive">{run.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </OperationSection>

      <OperationSection
        title="Market Data and ETF Look-Through"
        description="FMP-driven market metadata and ETF exposure refresh diagnostics."
        whereUsed="portfolio, holdings, universe, watchlist, risk, portfolio review, insights"
        actionsFirst
        actions={
          <>
            <form action={seedUniverseAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="outline" pendingLabel="Seeding universe...">Seed universe</SubmitButton>
            </form>
            <form action={refreshInstrumentPricesAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton pendingLabel="Refreshing prices...">1. Refresh prices</SubmitButton>
            </form>
            <form action={refreshInstrumentDailyReturnsAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing daily returns...">2. Daily returns</SubmitButton>
            </form>
            <form action={refreshInstrumentReturnAnchorsAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing anchors...">3. Return anchors</SubmitButton>
            </form>
            <form action={refreshInstrumentMarketMetricsAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing market metrics...">4. Market metrics</SubmitButton>
            </form>
            <form action={refreshInstrumentRiskMetricsAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing risk metrics...">5. Risk metrics</SubmitButton>
            </form>
            <form action={refreshInstrumentMetadataAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing metadata...">6. Instrument metadata</SubmitButton>
            </form>
            <form action={backfillUniverseHistoryAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Backfilling market history...">Backfill market history</SubmitButton>
            </form>
            <form action={refreshEtfLookthroughExposureAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing ETF exposure...">Refresh ETF exposure</SubmitButton>
            </form>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <StatBox label="ETF exposure status" value={latestEtfLog?.status ?? "No run"} className={statusTone(latestEtfLog?.status)} />
          <StatBox label="ETF exposure latest run" value={formatDateTime(latestEtfLog?.completedAt ?? latestEtfLog?.startedAt)} />
          <StatBox label="ETFs refreshed" value={latestEtfLog ? `${latestEtfLog.etfsRefreshed}/${latestEtfLog.etfsRequested}` : "-"} />
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">Instrument metadata coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks FMP profile metadata stored on active instruments, including name, exchange, currency, geography, sector, industry and normalized taxonomy inputs.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-8">
            <StatBox label="Active instruments" value={metadataCoverage.totalEligible} />
            <StatBox label="Metadata refreshed" value={metadataCoverage.refreshedCount} />
            <StatBox label="Fresh 30D" value={metadataCoverage.freshCount} />
            <StatBox label="Stale 30D" value={metadataCoverage.staleCount} className={metadataCoverage.staleCount > 0 ? "text-amber-600" : undefined} />
            <StatBox label="Never refreshed" value={metadataCoverage.neverRefreshed} className={metadataCoverage.neverRefreshed > 0 ? "text-destructive" : undefined} />
            <StatBox label="Latest refresh" value={formatDateTime(metadataCoverage.latestRefresh)} />
            <StatBox label="Batch size" value={metadataCoverage.batchSize} />
            <StatBox label="Est. manual clicks" value={metadataCoverage.estimatedManualClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {metadataCoverage.staleCount === 0 && metadataCoverage.neverRefreshed === 0
              ? "Instrument metadata is fresh for all active instruments."
              : `${metadataCoverage.staleCount} instrument${metadataCoverage.staleCount === 1 ? "" : "s"} have metadata older than ${metadataCoverage.staleCutoff}; ${metadataCoverage.neverRefreshed} instrument${metadataCoverage.neverRefreshed === 1 ? "" : "s"} have never had metadata refreshed. Run Instrument metadata until both counts reach zero.`}
          </p>
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">ETF look-through coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks equity ETF sector look-through coverage, with country and top holdings shown as data-quality detail. Bond, commodity, crypto and cash-like ETFs are excluded from equity look-through.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-9">
            <StatBox label="Eligible ETFs" value={etfCoverage.totalEligible} />
            <StatBox label="Sector covered" value={etfCoverage.sectorCoverageCount} />
            <StatBox label="Missing sector" value={etfCoverage.missingSectorCount} />
            <StatBox label="Stale sector" value={etfCoverage.staleSectorCount} />
            <StatBox label="Country covered" value={etfCoverage.countryCoverageCount} />
            <StatBox label="Top holdings covered" value={etfCoverage.topHoldingCoverageCount} />
            <StatBox label="Latest exposure date" value={etfCoverage.latestExposureDate ?? "-"} />
            <StatBox label="Batch size" value={etfCoverage.batchSize} />
            <StatBox label="Est. manual clicks" value={etfCoverage.estimatedManualClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {etfCoverage.missingSectorCount === 0 && etfCoverage.staleSectorCount === 0
              ? "ETF sector look-through coverage is complete for eligible equity ETFs."
              : `${etfCoverage.missingSectorCount} eligible ETF${etfCoverage.missingSectorCount === 1 ? "" : "s"} still need sector look-through data and ${etfCoverage.staleSectorCount} ETF${etfCoverage.staleSectorCount === 1 ? "" : "s"} are older than ${etfCoverage.staleCutoff}. Run Refresh ETF exposure until missing and stale sector counts reach zero.`}
          </p>
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">Latest market data coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks whether active instruments have latest stored prices through the expected latest trading day. Use the numbered buttons above in order for the full daily refresh chain.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-7">
            <StatBox label="Eligible" value={latestPriceCoverage.totalEligible} />
            <StatBox label="Fresh" value={latestPriceCoverage.freshCount} />
            <StatBox label="Stale" value={latestPriceCoverage.staleCount} />
            <StatBox label="Never priced" value={latestPriceCoverage.neverPricedCount} />
            <StatBox label="Expected latest" value={latestPriceCoverage.latestExpectedPriceDate} />
            <StatBox label="Oldest latest date" value={latestPriceCoverage.oldestLatestPriceDate ?? "-"} />
            <StatBox label="Est. manual clicks" value={latestPriceCoverage.estimatedManualClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {latestPriceCoverage.staleCount === 0 && latestPriceCoverage.neverPricedCount === 0
              ? "Latest market data is fresh for all eligible instruments."
              : `${latestPriceCoverage.staleCount} instrument${latestPriceCoverage.staleCount === 1 ? "" : "s"} are stale and ${latestPriceCoverage.neverPricedCount} instrument${latestPriceCoverage.neverPricedCount === 1 ? "" : "s"} have no price yet. Run Refresh market data until stale and never priced reach zero.`}
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Derived metric layer freshness</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tracks the split refresh pipeline after raw prices are stored. Daily returns feed anchors, anchors feed market metrics, and risk metrics use the same return base.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <MetricLayerCard
              title="Daily returns"
              description="Precomputed daily and weekly returns built from instrument_prices."
              coverage={metricLayerCoverage.dailyReturns}
            />
            <MetricLayerCard
              title="Return anchors"
              description="Cached baselines, 52-week range and latest return anchors used by market metrics."
              coverage={metricLayerCoverage.returnAnchors}
            />
            <MetricLayerCard
              title="Market metrics"
              description="Stored price, daily return, YTD, 1Y, 3Y, 5Y and 52-week metrics used by universe, watchlist and holdings."
              coverage={metricLayerCoverage.marketMetrics}
            />
            <MetricLayerCard
              title="Risk metrics"
              description="Stored volatility, drawdown and risk scores used by instrument pages, recommendations and portfolio review."
              coverage={metricLayerCoverage.riskMetrics}
            />
          </div>
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">Market history coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks whether active stocks and ETFs have enough 3Y/5Y history, plus up to 2Y crypto history where available.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-9">
            <StatBox label="Eligible" value={historyCoverage.totalEligible} />
            <StatBox label="5Y complete" value={historyCoverage.completeFiveYear} />
            <StatBox label="Available complete" value={historyCoverage.availableHistoryComplete} />
            <StatBox label="Need history" value={historyCoverage.missingFiveYear} />
            <StatBox label="3Y complete" value={historyCoverage.completeThreeYear} />
            <StatBox label="Stale history" value={historyCoverage.staleHistory} />
            <StatBox label="Crypto eligible" value={historyCoverage.cryptoEligible} />
            <StatBox label="Crypto 2Y complete" value={historyCoverage.completeTwoYearCrypto} />
            <StatBox label="Crypto available" value={historyCoverage.availableCryptoHistoryComplete} />
            <StatBox label="Need crypto history" value={historyCoverage.missingTwoYearCrypto} />
            <StatBox label="Stale crypto" value={historyCoverage.staleCryptoHistory} />
            <StatBox label="Est. manual clicks" value={historyCoverage.estimatedBackfillClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {historyCoverage.missingFiveYear === 0 &&
            historyCoverage.missingTwoYearCrypto === 0 &&
            historyCoverage.staleHistory === 0 &&
            historyCoverage.staleCryptoHistory === 0
              ? "Available market history is complete and current for active instruments. Some newer instruments may not have full 5Y or 2Y history because they launched more recently."
              : `${historyCoverage.missingFiveYear} eligible non-crypto instrument${historyCoverage.missingFiveYear === 1 ? "" : "s"} still need usable market history; ${historyCoverage.staleHistory} non-crypto instrument${historyCoverage.staleHistory === 1 ? "" : "s"} have stale recent history; ${historyCoverage.missingTwoYearCrypto} crypto instrument${historyCoverage.missingTwoYearCrypto === 1 ? "" : "s"} still need usable crypto history; ${historyCoverage.staleCryptoHistory} crypto instrument${historyCoverage.staleCryptoHistory === 1 ? "" : "s"} have stale recent history. Run Backfill market history again until these actionable counts reach zero.`}
          </p>
        </div>
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">Market data operation logs</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent manual and scheduled runs for the market-data refresh chain. Benchmark history runs after instrument history is complete.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {marketDataJobRuns.length === 0 ? (
              <p className="text-muted-foreground">No market data operation logs have been recorded yet.</p>
            ) : marketDataJobRuns.map((run) => (
              <div key={run.id} className="rounded-md bg-muted/40 p-3">
                <p className={`font-medium ${statusTone(run.status)}`}>{run.jobName.replaceAll("_", " ")} - {run.status}</p>
                <p className="text-muted-foreground">{formatDateTime(run.completedAt ?? run.startedAt)} - {marketDataRunSummary(run.summary)}</p>
                {run.errorMessage ? <p className="text-destructive">{run.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">ETF exposure refresh logs</p>
            <div className="mt-3 space-y-2 text-sm">
              {etfExposureLogs.length === 0 ? <p className="text-muted-foreground">No ETF exposure refresh has run yet.</p> : etfExposureLogs.map((log) => (
                <div key={log.id} className="rounded-md bg-muted/40 p-3">
                  <p className={`font-medium ${statusTone(log.status)}`}>{log.status} - {formatDateTime(log.completedAt ?? log.startedAt)}</p>
                  <p className="text-muted-foreground">{log.etfsRefreshed}/{log.etfsRequested} ETFs, {log.sectorRows} sector rows, {log.countryRows} country rows, {log.topHoldingRows} top holding rows</p>
                  {log.errorMessage ? <p className="text-destructive">{log.errorMessage}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </OperationSection>

      <OperationSection
        title="Fundamentals"
        description="FMP fundamentals refresh status for stock profiles, statements, ratios, scores and trend metrics."
        whereUsed="fundamentals overview, instrument detail pages, insights"
        actions={
            <form action={refreshFundamentalsAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton pendingLabel="Refreshing fundamentals...">Refresh fundamentals</SubmitButton>
            </form>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <StatBox label="Latest status" value={latestFundamentalsLog?.status ?? "No run"} className={statusTone(latestFundamentalsLog?.status)} />
          <StatBox label="Latest run" value={formatDateTime(latestFundamentalsLog?.completedAt ?? latestFundamentalsLog?.startedAt)} />
          <StatBox label="Profiles updated" value={latestFundamentalsLog?.profilesUpdated ?? "-"} />
          <StatBox label="Scores updated" value={latestFundamentalsLog?.scoresUpdated ?? "-"} />
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">Fundamentals coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks whether active stock instruments have profiles, statements, scores and trend summaries. The Admin refresh advances through due or incomplete stocks by batch.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-7">
            <StatBox label="Eligible stocks" value={fundamentalsCoverage.totalEligible} />
            <StatBox label="Complete" value={fundamentalsCoverage.completeCount} />
            <StatBox label="Incomplete" value={fundamentalsCoverage.missingComplete} />
            <StatBox label="Stale" value={fundamentalsCoverage.staleCount} />
            <StatBox label="Latest profile refresh" value={formatDateTime(fundamentalsCoverage.latestRunDate)} />
            <StatBox label="Batch size" value={fundamentalsCoverage.batchSize} />
            <StatBox label="Est. manual clicks" value={fundamentalsCoverage.estimatedManualClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {fundamentalsCoverage.missingComplete === 0 && fundamentalsCoverage.staleCount === 0
              ? "Fundamentals coverage is complete and current for eligible stocks."
              : `${fundamentalsCoverage.missingComplete} stock${fundamentalsCoverage.missingComplete === 1 ? "" : "s"} are incomplete and ${fundamentalsCoverage.staleCount} stock${fundamentalsCoverage.staleCount === 1 ? "" : "s"} are stale. Run Refresh fundamentals until incomplete and stale reach zero.`}
          </p>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {fundamentalsLogs.length === 0 ? <p className="text-muted-foreground">No fundamentals refresh has run yet.</p> : fundamentalsLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <p className={`font-medium ${statusTone(log.status)}`}>{log.status} - {formatDateTime(log.completedAt ?? log.startedAt)}</p>
              <p className="text-muted-foreground">{log.stocksRequested} requested, {log.profilesUpdated} profiles, {log.scoresUpdated} scores, {log.statementsUpdated} statements</p>
              {log.errorMessage ? <p className="text-destructive">{log.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </OperationSection>

      <OperationSection
        title="Macro Data"
        description="FRED indicator ingestion, backfill and macro regime diagnostics."
        whereUsed="macro dashboard, Market Vision, bonds, risk, insights, theme intelligence"
        actions={
          <>
            <form action={refreshMacroIndicatorsAction}>
              <SubmitButton pendingLabel="Refreshing FRED...">Refresh FRED</SubmitButton>
            </form>
            <form action={backfillMacroIndicatorsAction}>
              <SubmitButton variant="outline" pendingLabel="Backfilling FRED...">Backfill FRED history</SubmitButton>
            </form>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <StatBox label="Indicators" value={macroDashboard.indicators.length} />
          <StatBox label="Latest status" value={latestMacroLog?.status ?? "No run"} className={statusTone(latestMacroLog?.status)} />
          <StatBox label="Latest run" value={formatDateTime(latestMacroLog?.completedAt ?? latestMacroLog?.startedAt)} />
          <StatBox label="Regime date" value={macroDashboard.latestRegime?.snapshotDate ?? "-"} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {macroDashboard.ingestionLogs.length === 0 ? <p className="text-muted-foreground">No FRED ingestion jobs have run yet.</p> : macroDashboard.ingestionLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <p className={`font-medium ${statusTone(log.status)}`}>{log.jobName} - {log.status}</p>
              <p className="text-muted-foreground">{log.indicatorsSuccessful}/{log.indicatorsRequested} indicators, {log.observationsInserted} inserted, {log.observationsUpdated} updated</p>
              {log.errorMessage ? <p className="text-destructive">{log.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </OperationSection>

      <OperationSection
        title="News Sources"
        description="FMP instrument news plus NewsData and GDELT macro/world-news queues."
        whereUsed="News & Themes, Market Vision, insights, portfolio review"
        actions={
          <>
            <form action={runDailyNewsIngestionAction}>
              <SubmitButton pendingLabel="Fetching FMP...">Refresh FMP</SubmitButton>
            </form>
            <form action={runNewsDataNewsIngestionAction}>
              <SubmitButton variant="secondary" pendingLabel="Fetching NewsData...">Refresh NewsData</SubmitButton>
            </form>
            <form action={runGdeltNewsIngestionAction}>
              <SubmitButton variant="outline" pendingLabel="Fetching GDELT...">Refresh GDELT fallback</SubmitButton>
            </form>
            <form action={reclassifyPendingNewsAction}>
              <SubmitButton variant="outline" pendingLabel="Classifying...">Classify backfill</SubmitButton>
            </form>
            <form action={runWeeklyNewsReconciliationAction}>
              <SubmitButton variant="secondary" pendingLabel="Reconciling...">Weekly reconcile</SubmitButton>
            </form>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <StatBox label="Stored articles" value={newsDashboard.stats.totalArticles} />
          <StatBox label="Classified" value={newsDashboard.stats.classifiedArticles} />
          <StatBox label="Duplicates" value={newsDashboard.stats.duplicateArticles} />
          <StatBox label="Weekly reconciliations" value={newsDashboard.stats.weeklyReconciliations} />
        </div>

        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">FMP fetch summary</p>
          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <StatBox label="Status" value={fmpSummary.status} className={statusTone(fmpSummary.status)} />
            <StatBox label="Fetched" value={fmpSummary.fetched} />
            <StatBox label="Saved" value={fmpSummary.saved} />
            <StatBox label="Duplicates" value={fmpSummary.duplicates} />
            <StatBox label="Instruments" value={fmpSummary.instrumentsRequested} />
            <StatBox label="Latest run" value={formatDateTime(fmpSummary.latest)} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Group</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Fetched</th>
                  <th className="py-2 pr-3">Saved</th>
                  <th className="py-2 pr-3">Limit</th>
                </tr>
              </thead>
              <tbody>
                {fmpSummary.groups.map((group) => (
                  <tr key={group.name} className="border-t">
                    <td className="py-3 pr-3 font-medium">{group.name}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{group.description}</td>
                    <td className="py-3 pr-3">{group.fetched}</td>
                    <td className="py-3 pr-3">{group.saved}</td>
                    <td className="py-3 pr-3">{group.limit || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <QueryGroupTable title="NewsData query-group status" summary={newsDataSummary} statuses={newsDashboard.newsDataQueryStatuses} />
          <QueryGroupTable title="GDELT query-group status" summary={gdeltSummary} statuses={newsDashboard.gdeltQueryStatuses} />
        </div>

        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">News ingestion logs</p>
          <div className="mt-3 space-y-2 text-sm">
            {newsDashboard.ingestionLogs.length === 0 ? <p className="text-muted-foreground">No news ingestion jobs have run yet.</p> : newsDashboard.ingestionLogs.map((log) => (
              <div key={log.id} className="rounded-md bg-muted/40 p-3">
                <p className={`font-medium ${statusTone(log.status)}`}>{log.jobName} - {sourceLabel(log.sourceProvider)} - {log.status}</p>
                <p className="text-muted-foreground">{log.articlesFetched} fetched, {log.articlesInserted} saved, {log.duplicatesDetected} duplicates</p>
                {log.errorMessage ? <p className="text-destructive">{log.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </OperationSection>

      <OperationSection
        title="AI and Generated Outputs"
        description="Market Vision draft creation, AI generation logs and cost/status tracking."
        whereUsed="Market Vision, insights, future portfolio assistant"
        actions={
          <>
            <form action={createMarketVisionDraftAction}>
              <SubmitButton>Create Market Vision draft</SubmitButton>
            </form>
            <form action={createMarketVisionDraftFromLatestNewsAction}>
              <SubmitButton variant="outline" pendingLabel="Creating draft...">Create draft from news</SubmitButton>
            </form>
            <form action={generateAiMarketVisionDraftAction}>
              <SubmitButton variant="secondary" pendingLabel="Generating...">Generate AI draft</SubmitButton>
            </form>
          </>
        }
      >
        <div className="mb-4 rounded-md border p-3 text-sm">
          <p className="font-medium">Latest weekly news reconciliation</p>
          {!latestWeeklyNews ? (
            <p className="mt-2 text-muted-foreground">No weekly news reconciliation has been created yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-muted-foreground">{latestWeeklyNews.periodStart} to {latestWeeklyNews.periodEnd} - {latestWeeklyNews.status}</p>
              <p className="leading-6 text-muted-foreground">{latestWeeklyNews.macroSummary ?? latestWeeklyNews.equitiesSummary ?? "No summary available."}</p>
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          {marketVisionDashboard.generationLogs.length === 0 ? (
            <p className="text-muted-foreground">No AI Market Vision generation has run yet.</p>
          ) : marketVisionDashboard.generationLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <p className={`font-medium ${statusTone(log.status)}`}>{log.periodStart ?? "-"} to {log.periodEnd ?? "-"} - {log.status}</p>
              <p className="text-muted-foreground">
                {log.modelUsed ?? "No model"} - {log.promptVersion ?? "No prompt"} - {log.status === "skipped" ? "No new AI call" : log.costEstimate == null ? "Cost not configured" : `$${log.costEstimate.toFixed(6)}`}
              </p>
              {log.errorMessage ? <p className="text-destructive">{log.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      </OperationSection>
    </PageContainer>
  );
}

function QueryGroupTable({
  title,
  summary,
  statuses
}: {
  title: string;
  summary: ReturnType<typeof queryStatusSummary>;
  statuses: Array<{
    queryGroup: {
      id: string;
      queryName: string;
      queryKey: string;
      canonicalTheme: string;
      nextRunAt: string | null;
      failureCount: number;
      lastError: string | null;
    };
    latestLog: {
      status: string;
      articlesFetched: number;
      articlesInserted: number;
      duplicatesDetected: number;
      completedAt: string | null;
      startedAt: string;
      errorMessage: string | null;
      metadata: Record<string, unknown> | null;
    } | null;
  }>;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <StatBox label="Fetched" value={summary.fetched} />
        <StatBox label="Saved" value={summary.saved} />
        <StatBox label="Filtered" value={summary.filtered} />
        <StatBox label="Duplicates" value={summary.duplicates} />
        <StatBox label="Failed groups" value={summary.failed} />
        <StatBox label="Latest run" value={formatDateTime(summary.latest)} />
      </div>
      <div className="mt-3 overflow-x-auto">
        {statuses.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No active query groups found.</p>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Query group</th>
                <th className="py-2 pr-3">Theme</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Fetched</th>
                <th className="py-2 pr-3">Saved</th>
                <th className="py-2 pr-3">Filtered</th>
                <th className="py-2 pr-3">Duplicates</th>
                <th className="py-2 pr-3">Last run</th>
                <th className="py-2 pr-3">Next run</th>
                <th className="py-2 pr-3">Failures</th>
                <th className="py-2 pr-3">Last error</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map(({ queryGroup, latestLog }) => {
                const label = latestLog?.status ?? (queryGroup.nextRunAt ? "Queued" : "Not run");
                return (
                  <tr key={queryGroup.id} className="border-t align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{queryGroup.queryName}</div>
                      <div className="text-xs text-muted-foreground">{queryGroup.queryKey}</div>
                    </td>
                    <td className="py-3 pr-3">{queryGroup.canonicalTheme}</td>
                    <td className={`py-3 pr-3 font-medium ${statusTone(label)}`}>{label}</td>
                    <td className="py-3 pr-3">{latestLog?.articlesFetched ?? 0}</td>
                    <td className="py-3 pr-3">{latestLog?.articlesInserted ?? 0}</td>
                    <td className="py-3 pr-3">{metadataNumber(latestLog?.metadata, "articlesFiltered")}</td>
                    <td className="py-3 pr-3">{latestLog?.duplicatesDetected ?? 0}</td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">{formatDateTime(latestLog?.completedAt ?? latestLog?.startedAt)}</td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">{formatDateTime(queryGroup.nextRunAt)}</td>
                    <td className="py-3 pr-3">{queryGroup.failureCount}</td>
                    <td className="max-w-sm py-3 pr-3 text-xs text-muted-foreground">{latestLog?.errorMessage ?? queryGroup.lastError ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
