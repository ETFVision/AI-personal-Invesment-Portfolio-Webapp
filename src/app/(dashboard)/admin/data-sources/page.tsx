import { createContainer } from "@/server/container";
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
import { backfillUniverseHistoryAction, refreshAllDataAction } from "@/server/actions/dataRefreshActions";
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
import type { ReactNode } from "react";

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

function StatBox({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function OperationSection({
  title,
  description,
  whereUsed,
  actions,
  children
}: {
  title: string;
  description: string;
  whereUsed: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <p className="mt-2 text-xs text-muted-foreground">Used for: {whereUsed}</p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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
  }>;
};

export default async function DataSourcesPage({ searchParams }: DataSourcesPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const [newsDashboard, macroDashboard, fundamentalsLogs, etfExposureLogs, marketVisionDashboard, metadataLogs, instruments, jobRuns] = await Promise.all([
    container.newsDashboardService.getDashboard({ includeDuplicates: true, limit: 10 }),
    container.macroDashboardService.getDashboard(),
    container.fundamentalsRepository.listRefreshLogs(8),
    container.etfExposureRepository.listRefreshLogs(8),
    container.marketVisionService.getDashboard(),
    container.instrumentService.listMetadataRefreshLogs(8),
    container.instrumentService.listInstruments({ isActive: true }),
    container.jobRunService.listRecent(60)
  ]);
  const historyCoverage = await container.instrumentMarketService.getHistoryCoverageSummary(instruments, 12);
  const marketDataJobRuns = jobRuns.filter((run) => ["seed_universe", "refresh_market_data", "backfill_market_history"].includes(run.jobName)).slice(0, 8);

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

      {params?.message || params?.refreshMessage || params?.metadataMessage || params?.priceMessage ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.refreshError || params.metadataError || params.priceError ? "text-destructive" : "text-muted-foreground"}`}>
            {params.refreshError ?? params.metadataError ?? params.priceError ?? params.refreshMessage ?? params.metadataMessage ?? params.priceMessage ?? params.message}
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

      <OperationSection
        title="Market Data and ETF Look-Through"
        description="FMP-driven market metadata and ETF exposure refresh diagnostics."
        whereUsed="portfolio, holdings, universe, watchlist, risk, portfolio review, insights"
        actions={
          <>
            <form action={seedUniverseAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="outline" pendingLabel="Seeding universe...">Seed universe</SubmitButton>
            </form>
            <form action={refreshAllDataAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton pendingLabel="Refreshing market data...">Refresh market data</SubmitButton>
            </form>
            <form action={backfillUniverseHistoryAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Backfilling market and benchmark history...">Backfill market history</SubmitButton>
            </form>
            <form action={refreshEtfLookthroughExposureAction}>
              <input type="hidden" name="returnTo" value="/admin/data-sources" />
              <SubmitButton variant="secondary" pendingLabel="Refreshing ETF exposure...">Refresh ETF exposure</SubmitButton>
            </form>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <StatBox label="ETF exposure status" value={latestEtfLog?.status ?? "No run"} className={statusTone(latestEtfLog?.status)} />
          <StatBox label="ETF exposure latest run" value={formatDateTime(latestEtfLog?.completedAt ?? latestEtfLog?.startedAt)} />
          <StatBox label="ETFs refreshed" value={latestEtfLog ? `${latestEtfLog.etfsRefreshed}/${latestEtfLog.etfsRequested}` : "-"} />
          <StatBox label="Metadata latest run" value={formatDateTime(metadataLogs[0]?.completedAt ?? metadataLogs[0]?.createdAt)} />
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium">Market history coverage</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks whether active stocks and ETFs have enough 3Y/5Y history, plus up to 2Y crypto history where available.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-8">
            <StatBox label="Eligible" value={historyCoverage.totalEligible} />
            <StatBox label="5Y complete" value={historyCoverage.completeFiveYear} />
            <StatBox label="Need 5Y" value={historyCoverage.missingFiveYear} />
            <StatBox label="3Y complete" value={historyCoverage.completeThreeYear} />
            <StatBox label="Need 3Y" value={historyCoverage.missingThreeYear} />
            <StatBox label="Crypto eligible" value={historyCoverage.cryptoEligible} />
            <StatBox label="Crypto 2Y complete" value={historyCoverage.completeTwoYearCrypto} />
            <StatBox label="Need crypto 2Y" value={historyCoverage.missingTwoYearCrypto} />
            <StatBox label="Est. backfill runs" value={historyCoverage.estimatedBackfillClicks} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {historyCoverage.missingFiveYear === 0 && historyCoverage.missingTwoYearCrypto === 0
              ? "5Y history is complete for eligible non-crypto instruments, and crypto 2Y history is complete where available."
              : `${historyCoverage.missingFiveYear} eligible non-crypto instrument${historyCoverage.missingFiveYear === 1 ? "" : "s"} still need 5Y history; ${historyCoverage.missingTwoYearCrypto} crypto instrument${historyCoverage.missingTwoYearCrypto === 1 ? "" : "s"} still need up to 2Y history. Run Backfill market history again until both reach zero.`}
          </p>
        </div>
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">Market data operation logs</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recent manual runs for Seed Universe, Refresh market data and Backfill market history.
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
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
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
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Instrument metadata refresh logs</p>
            <div className="mt-3 space-y-2 text-sm">
              {metadataLogs.length === 0 ? <p className="text-muted-foreground">No metadata refresh has run yet.</p> : metadataLogs.map((log) => (
                <div key={log.id} className="rounded-md bg-muted/40 p-3">
                  <p className={`font-medium ${statusTone(log.status)}`}>{log.status} - {formatDateTime(log.completedAt ?? log.createdAt)}</p>
                  <p className="text-muted-foreground">{log.updatedCount}/{log.requestedCount} instruments updated, {log.missingCount} missing</p>
                  {log.message ? <p className="text-destructive">{log.message}</p> : null}
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
            <input type="hidden" name="force" value="true" />
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
