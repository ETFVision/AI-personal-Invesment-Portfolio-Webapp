import { createContainer } from "@/server/container";
import {
  duplicateOverrideAction,
  reclassifyLatestDeterministicNewsAction,
  reclassifyPendingNewsAction,
  runDailyNewsIngestionAction,
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
    message?: string;
    error?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
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

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();
  const dashboard = await container.newsDashboardService.getDashboard({
    query: params?.q || undefined,
    classification: params?.classification || undefined,
    sentiment: params?.sentiment || undefined,
    includeDuplicates: true,
    limit: 60
  });

  const classifiedCount = dashboard.latestNews.filter((item) => item.classification).length;
  const duplicateCount = dashboard.latestNews.filter((item) => item.isDuplicate).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">News foundation</p>
          <h1 className="text-2xl font-semibold">News Intelligence</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={runDailyNewsIngestionAction}>
            <SubmitButton pendingLabel="Fetching news...">Refresh news</SubmitButton>
          </form>
          <form action={reclassifyPendingNewsAction}>
            <SubmitButton variant="outline" pendingLabel="Classifying...">Classify pending</SubmitButton>
          </form>
          <form action={reclassifyLatestDeterministicNewsAction}>
            <SubmitButton variant="outline" pendingLabel="Reclassifying...">Reclassify latest</SubmitButton>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Latest Articles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.latestNews.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Classified</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{classifiedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Duplicates</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{duplicateCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly Reconciliations</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.weeklyReconciliations.length}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Use this admin page to inspect ingestion quality before Market Vision generation is automated.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Search title" defaultValue={params?.q ?? ""} />
            <Input name="classification" placeholder="Classification" defaultValue={params?.classification ?? ""} />
            <Input name="sentiment" placeholder="Sentiment" defaultValue={params?.sentiment ?? ""} />
            <Button type="submit" variant="outline">Apply</Button>
          </form>
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
          <CardTitle>Top themes this week</CardTitle>
          <CardDescription>Canonical themes run alongside asset-class buckets so future Market Vision and scoring can separate “what asset class” from “what driver.”</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.themeSummary.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No theme summary yet. Run Weekly reconcile after articles are classified.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.themeSummary.slice(0, 9).map((theme) => (
                <div key={theme.theme} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{theme.theme}</p>
                    <span className="text-sm text-muted-foreground">{theme.count} items</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Conf {formatThemeConfidence(theme.averageConfidence)}</span>
                    <span>Sev {theme.averageSeverity}/100</span>
                    <span>Persist {theme.averagePersistence}/100</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{theme.topHeadlines.slice(0, 2).join("; ")}</p>
                </div>
              ))}
            </div>
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
                    <div className="grid gap-3 text-sm md:grid-cols-4">
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Classified in period</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "classifiedInPeriod")}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Included</p>
                        <p className="mt-1 text-xl font-semibold">{coverageNumber(item.coverageMetadata, "includedInReconciliation")}</p>
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
                              <span className="text-xs text-muted-foreground">{theme.count} items</span>
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
