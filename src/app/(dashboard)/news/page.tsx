import { createContainer } from "@/server/container";
import { duplicateOverrideAction, reclassifyPendingNewsAction, runDailyNewsIngestionAction, runWeeklyNewsReconciliationAction } from "@/server/actions/newsActions";
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly reconciliation</CardTitle>
            <CardDescription>Draft summaries prepared for later Market Vision attachment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dashboard.weeklyReconciliations.length === 0 ? (
              <p className="text-muted-foreground">No weekly reconciliation has been created yet.</p>
            ) : dashboard.weeklyReconciliations.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="font-medium">{item.periodStart} to {item.periodEnd} - {item.status}</div>
                <p className="mt-1 text-muted-foreground">{item.macroSummary ?? item.equitiesSummary ?? "No summary available."}</p>
              </div>
            ))}
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
