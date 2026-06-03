import { createContainer } from "@/server/container";
import {
  duplicateOverrideAction,
  reclassifyPendingNewsAction,
  runDailyNewsIngestionAction,
  runGdeltNewsIngestionAction,
  runNewsDataNewsIngestionAction,
  runWeeklyNewsReconciliationAction
} from "@/server/actions/newsActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type NewsPageProps = {
  searchParams?: Promise<{
    q?: string;
    classification?: string;
    sentiment?: string;
    source?: string;
    message?: string;
    error?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function tone(score: number) {
  if (score >= 75) return "text-destructive";
  if (score >= 50) return "text-amber-600";
  return "text-muted-foreground";
}

function ReconciliationSection({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {value || "No summary available."}
      </p>
    </div>
  );
}

function coverageNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function bucketCount(metadata: Record<string, unknown>, key: string) {
  const buckets = typeof metadata.bucketCounts === "object" && metadata.bucketCounts !== null
    ? metadata.bucketCounts as Record<string, unknown>
    : {};
  const value = buckets[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatThemeConfidence(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value)}%`;
}

function trendTone(value?: string) {
  if (value === "Rising") return "text-emerald-600";
  if (value === "Declining") return "text-amber-600";
  if (value === "Low confidence trend" || value === "Insufficient history") return "text-muted-foreground";
  return "text-muted-foreground";
}

function statusTone(value?: string) {
  if (value === "success") return "text-emerald-600";
  if (value === "partial_success") return "text-amber-600";
  if (value === "failed") return "text-destructive";
  if (value === "Queued") return "text-amber-600";
  return "text-muted-foreground";
}

function sourceLabel(value: string) {
  if (value === "gdelt") return "GDELT";
  if (value === "newsdata") return "NewsData";
  if (value === "financial_modeling_prep") return "FMP";
  return value;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();
  const dashboard = await container.newsDashboardService.getDashboard({
    query: params?.q || undefined,
    classification: params?.classification || undefined,
    sentiment: params?.sentiment || undefined,
    sourceProvider: params?.source || undefined,
    includeDuplicates: true,
    limit: 60
  });

  const globalProviderNews = dashboard.latestNews.filter((item) => item.sourceProvider === "gdelt" || item.sourceProvider === "newsdata");
  const macroWorldNews = globalProviderNews.filter((item) => {
    const theme = item.classification?.primaryTheme;
    return theme === "Geopolitical" || theme === "Rates" || theme === "Inflation" || theme === "Energy" || theme === "Currency" || theme === "Trade / Supply Chain" || theme === "Credit";
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">News foundation</p>
          <h1 className="text-2xl font-semibold">News Intelligence</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={runDailyNewsIngestionAction}>
            <SubmitButton pendingLabel="Fetching FMP...">Refresh FMP</SubmitButton>
          </form>
          <form action={runNewsDataNewsIngestionAction}>
            <SubmitButton variant="secondary" pendingLabel="Fetching NewsData...">Refresh NewsData</SubmitButton>
          </form>
          <form action={runGdeltNewsIngestionAction}>
            <SubmitButton variant="outline" pendingLabel="Fetching next GDELT fallback batch...">Refresh GDELT fallback</SubmitButton>
          </form>
          <form action={reclassifyPendingNewsAction}>
            <SubmitButton variant="outline" pendingLabel="Classifying...">Classify backfill</SubmitButton>
          </form>
          <form action={runWeeklyNewsReconciliationAction}>
            <SubmitButton variant="secondary" pendingLabel="Reconciling...">Weekly reconcile</SubmitButton>
          </form>
        </div>
      </div>

      {params?.message || params?.error ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-muted-foreground"}`}>
            {params.error ?? params.message}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stored Articles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.stats.totalArticles}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Classified</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.stats.classifiedArticles}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Duplicates</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.stats.duplicateArticles}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly Reconciliations</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.stats.weeklyReconciliations}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Use this admin page to inspect ingestion quality before Market Vision generation is automated.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="q" placeholder="Search title" defaultValue={params?.q ?? ""} />
            <Input name="classification" placeholder="Classification" defaultValue={params?.classification ?? ""} />
            <Input name="sentiment" placeholder="Sentiment" defaultValue={params?.sentiment ?? ""} />
            <select name="source" defaultValue={params?.source ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All sources</option>
              <option value="financial_modeling_prep">FMP</option>
              <option value="newsdata">NewsData</option>
              <option value="gdelt">GDELT</option>
            </select>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macro / World News</CardTitle>
          <CardDescription>NewsData and GDELT are separate macro/world-news source refreshes for Market Vision input.</CardDescription>
        </CardHeader>
        <CardContent>
          {macroWorldNews.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No NewsData or GDELT macro/world-news articles are visible yet. Enable `ENABLE_NEWSDATA_INGESTION`, add `NEWSDATA_API_KEY`, apply migration 048, then run Refresh NewsData.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {macroWorldNews.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sourceName ?? sourceLabel(item.sourceProvider)} - {item.country ?? "Global"} - {formatDate(item.publishedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{item.classification?.primaryTheme ?? "Unmapped"}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.classification?.affectedMacroCategories.join(", ") || "No macro category"} - Severity {item.classification?.severityScore ?? 0}/100
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NewsData query-group status</CardTitle>
          <CardDescription>Primary macro/world-news provider. Uses the same macro, rates, inflation, currency, geopolitical, energy, credit, and trade query groups as GDELT.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dashboard.newsDataQueryStatuses.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No active NewsData query groups found. Apply migration 048, add `NEWSDATA_API_KEY`, set `ENABLE_NEWSDATA_INGESTION=true`, then refresh NewsData.
            </div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
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
                {dashboard.newsDataQueryStatuses.map(({ queryGroup, latestLog }) => {
                  const statusLabel = latestLog?.status ?? (queryGroup.nextRunAt ? "Queued" : "Not run");
                  return (
                    <tr key={queryGroup.id} className="border-t align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{queryGroup.queryName}</div>
                        <div className="text-xs text-muted-foreground">{queryGroup.queryKey}</div>
                      </td>
                      <td className="py-3 pr-3">{queryGroup.canonicalTheme}</td>
                      <td className={`py-3 pr-3 font-medium ${statusTone(statusLabel)}`}>{statusLabel}</td>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GDELT query-group status</CardTitle>
          <CardDescription>Fallback provider diagnostics for macro, rates, inflation, currency, geopolitical, energy, credit, and trade coverage.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dashboard.gdeltQueryStatuses.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              No active GDELT query groups found. Apply migrations 025 and 026, then refresh GDELT.
            </div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
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
                {dashboard.gdeltQueryStatuses.map(({ queryGroup, latestLog }) => {
                  const statusLabel = latestLog?.status ?? (queryGroup.nextRunAt ? "Queued" : "Not run");
                  return (
                    <tr key={queryGroup.id} className="border-t align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{queryGroup.queryName}</div>
                        <div className="text-xs text-muted-foreground">{queryGroup.queryKey}</div>
                      </td>
                      <td className="py-3 pr-3">{queryGroup.canonicalTheme}</td>
                      <td className={`py-3 pr-3 font-medium ${statusTone(statusLabel)}`}>{statusLabel}</td>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest fetched news</CardTitle>
          <CardDescription>Articles are normalized, deduplicated, linked to instruments, and classified without investment recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dashboard.latestNews.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No news has been ingested yet. Run Refresh news after applying migration 019 and adding FMP_API_KEY.</div>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Article</th>
                  <th className="py-2 pr-3">Published</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Linked</th>
                  <th className="py-2 pr-3">Theme</th>
                  <th className="py-2 pr-3">Classification</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Duplicate</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.latestNews.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="py-3 pr-3">
                      <div className="max-w-xl font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.sourceName ?? item.sourceProvider} {item.url ? "- linked source" : ""}</div>
                    </td>
                    <td className="py-3 pr-3">{formatDate(item.publishedAt)}</td>
                    <td className="py-3 pr-3">
                      <div>{sourceLabel(item.sourceProvider)}</div>
                      <div className="text-xs text-muted-foreground">{item.country ?? item.language ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{item.sourceQualityTier.replace("_", " ")} - {item.sourceQualityScore}/100</div>
                    </td>
                    <td className="py-3 pr-3">{item.tickers.length ? item.tickers.join(", ") : "Unlinked"}</td>
                    <td className="py-3 pr-3">
                      <div>{item.classification?.primaryTheme ?? "Unmapped"}</div>
                      <div className="text-xs text-muted-foreground">{formatThemeConfidence(item.classification?.themeConfidence ?? 0)}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{item.classification?.classification ?? "Pending"}</div>
                      <div className="text-xs text-muted-foreground">{item.classification?.sentiment ?? "-"}</div>
                    </td>
                    <td className={`py-3 pr-3 font-medium ${tone(item.classification?.severityScore ?? 0)}`}>
                      {item.classification ? `${item.classification.severityScore}/100` : "-"}
                    </td>
                    <td className="py-3 pr-3">
                      <div>{item.isDuplicate ? "Duplicate" : "Canonical"}</div>
                      {item.isDuplicate ? (
                        <form action={duplicateOverrideAction} className="mt-2">
                          <input type="hidden" name="newsItemId" value={item.id} />
                          <input type="hidden" name="duplicateOfId" value="" />
                          <Button type="submit" size="sm" variant="outline">Mark canonical</Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme Intelligence Summary</CardTitle>
          <CardDescription>Canonical themes run alongside asset-class buckets so future Market Vision and scoring can separate asset exposure from market drivers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {dashboard.themeSummary.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No theme summary yet. Run Weekly reconcile after articles are classified.</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.themeSummary.slice(0, 9).map((theme) => (
                  <div key={theme.theme} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{theme.theme}</p>
                        <p className="text-xs text-muted-foreground">{theme.categories?.join(" / ") ?? "Theme"} - {(theme.sources ?? ["News"]).join(" + ")}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{theme.count} signals</span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                      <span>Conf {formatThemeConfidence(theme.averageConfidence)}</span>
                      <span>Sev {theme.averageSeverity}/100</span>
                      <span>Persist {theme.averagePersistence}/100</span>
                      <span>Impact {theme.impactScore ?? 0}</span>
                      <span className={trendTone(theme.trend)}>{theme.trend ?? "Stable"}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      News {theme.newsItemCount ?? theme.count} - FRED signals {theme.macroSignalCount ?? 0}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {theme.topHeadlines.slice(0, 2).join("; ") || theme.topMacroSignals?.slice(0, 2).join("; ") || "No sample available."}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Emerging themes</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dashboard.themeIntelligence.emergingThemes.length
                      ? dashboard.themeIntelligence.emergingThemes.map((theme) => theme.theme).join(", ")
                      : "No rising theme signal yet."}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Persistent themes</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dashboard.themeIntelligence.persistentThemes.length
                      ? dashboard.themeIntelligence.persistentThemes.map((theme) => theme.theme).join(", ")
                      : "No persistent theme signal yet."}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Structural themes</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dashboard.themeIntelligence.structuralThemes.length
                      ? dashboard.themeIntelligence.structuralThemes.map((theme) => theme.theme).join(", ")
                      : "No structural theme signal yet."}
                  </p>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Classification review queue</p>
                  <span className="text-xs text-muted-foreground">{dashboard.themeIntelligence.reviewQueue.length} flagged</span>
                </div>
                {dashboard.themeIntelligence.reviewQueue.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No suspicious or low-confidence theme classifications in the current weekly set.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {dashboard.themeIntelligence.reviewQueue.slice(0, 5).map((item) => (
                      <div key={item.newsItemId} className="rounded-md bg-muted/40 p-2 text-sm">
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.primaryTheme ?? "Unmapped"} - {formatThemeConfidence(item.themeConfidence)} - {item.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly reconciliation</CardTitle>
            <CardDescription>Latest draft summary sections prepared for later Market Vision attachment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dashboard.weeklyReconciliations.length === 0 ? (
              <p className="text-muted-foreground">No weekly reconciliation has been created yet.</p>
            ) : (
              <div className="space-y-4">
                {dashboard.weeklyReconciliations.slice(0, 1).map((item) => (
                  <div key={item.id} className="space-y-3">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="font-medium">{item.periodStart} to {item.periodEnd} - {item.status}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Newest reconciliation shown. Older drafts remain stored below the latest entry count.</div>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-5">
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Classified in period</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "classifiedInPeriod")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Included</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "includedInReconciliation")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Excluded by quality</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "excludedByEligibility")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Excluded by limit</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "excludedByWeeklyLimit")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Equity items</p>
                        <p className="mt-1 text-xl font-semibold">{bucketCount(item.coverageMetadata, "equities")}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Asset Views</p>
                      </div>
                      <ReconciliationSection title="Equities" value={item.equitiesSummary} />
                      <ReconciliationSection title="Bonds" value={item.bondsSummary} />
                      <ReconciliationSection title="Gold / Commodities" value={item.goldSummary} />
                      <ReconciliationSection title="Crypto" value={item.cryptoSummary} />
                      <ReconciliationSection title="Macro" value={item.macroSummary} />
                      <ReconciliationSection title="Rates" value={item.ratesSummary} />
                      <ReconciliationSection title="Inflation" value={item.inflationSummary} />
                      <ReconciliationSection title="Currency" value={item.currencySummary} />
                      <ReconciliationSection title="Geopolitical" value={item.geopoliticalSummary} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Theme Views</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {dashboard.themeSummary.length === 0 ? (
                          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No theme views available for this draft.</div>
                        ) : dashboard.themeSummary.slice(0, 8).map((theme) => (
                          <div key={theme.theme} className="rounded-md border p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{theme.theme}</span>
                              <span className="text-xs text-muted-foreground">News {theme.newsItemCount ?? theme.count} - FRED {theme.macroSignalCount ?? 0} - Impact {theme.impactScore ?? 0}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{theme.topHeadlines.slice(0, 2).join("; ") || "No headline sample."}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingestion logs</CardTitle>
            <CardDescription>API usage and failure tracking for cron portability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dashboard.ingestionLogs.length === 0 ? (
              <p className="text-muted-foreground">No ingestion jobs have run yet.</p>
            ) : dashboard.ingestionLogs.map((log) => (
              <div key={log.id} className="rounded-md border p-3">
                <div className="font-medium">{log.jobName} - {log.status}</div>
                <div className="text-muted-foreground">
                  {log.articlesFetched} fetched, {log.articlesInserted} saved, {log.duplicatesDetected} duplicates
                </div>
                {log.errorMessage ? <div className="mt-1 text-destructive">{log.errorMessage}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
