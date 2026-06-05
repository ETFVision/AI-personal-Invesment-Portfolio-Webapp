import { duplicateOverrideAction } from "@/server/actions/newsActions";
import { createContainer } from "@/server/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";

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

function tone(score: number) {
  if (score >= 75) return "text-destructive";
  if (score >= 50) return "text-amber-600";
  return "text-muted-foreground";
}

function ReconciliationSection({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{value || "No summary available."}</p>
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

function trendTone(value?: string) {
  if (value === "Rising") return "text-emerald-600";
  if (value === "Declining") return "text-amber-600";
  return "text-muted-foreground";
}

function sourceLabel(value: string) {
  if (value === "gdelt") return "GDELT";
  if (value === "newsdata") return "NewsData";
  if (value === "financial_modeling_prep") return "FMP";
  return value;
}

function latestSourceDate(items: Array<{ publishedAt: string | null }>) {
  return items.map((item) => item.publishedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
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

  const latestNewsDate = latestSourceDate(dashboard.latestNews);
  const latestWeekly = dashboard.weeklyReconciliations[0] ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Research"
        title="News & Themes"
        description="Normalized market news, canonical themes and weekly reconciliation output for Market Vision."
        meta={
          <>
            <StatusBadge tone="info">{dashboard.stats.classifiedArticles} classified</StatusBadge>
            <StatusBadge tone={latestWeekly ? "positive" : "neutral"}>{latestWeekly ? `Week ${latestWeekly.periodEnd}` : "No weekly reconciliation"}</StatusBadge>
          </>
        }
      />

      {params?.message || params?.error ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.error ? "text-destructive" : "text-muted-foreground"}`}>
            {params.error ?? params.message}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Stored articles" value={dashboard.stats.totalArticles} footer="All normalized articles" />
        <MetricCard title="Classified" value={dashboard.stats.classifiedArticles} footer="Article-level classification complete" />
        <MetricCard title="Latest article" value={formatDate(latestNewsDate)} footer="Newest visible article date" />
        <MetricCard title="Weekly summaries" value={dashboard.stats.weeklyReconciliations} footer="Draft or published reconciliations" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter the latest normalized articles. Provider diagnostics and refresh controls are under Admin.</CardDescription>
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
          <CardTitle>Latest fetched news</CardTitle>
          <CardDescription>Latest normalized articles. Headlines open the original article in a new tab when a source URL is available.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[680px] overflow-auto">
          {dashboard.latestNews.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No news has been ingested yet.</div>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 bg-background text-left text-xs uppercase text-muted-foreground">
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
                      <div className="max-w-xl font-medium">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{item.title}</a>
                        ) : item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.sourceName ?? item.sourceProvider}</div>
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

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly reconciliation</CardTitle>
            <CardDescription>Latest weekly summary sections prepared for Market Vision attachment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!latestWeekly ? (
              <p className="text-muted-foreground">No weekly reconciliation has been created yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="font-medium">{latestWeekly.periodStart} to {latestWeekly.periodEnd} - {latestWeekly.status}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Newest reconciliation shown. Older drafts remain stored in the database.</div>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Classified</p>
                    <p className="mt-1 text-xl font-semibold">{coverageNumber(latestWeekly.coverageMetadata, "classifiedInPeriod")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Included</p>
                    <p className="mt-1 text-xl font-semibold">{coverageNumber(latestWeekly.coverageMetadata, "includedInReconciliation")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Excluded</p>
                    <p className="mt-1 text-xl font-semibold">{coverageNumber(latestWeekly.coverageMetadata, "excludedByEligibility")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase text-muted-foreground">Equity items</p>
                    <p className="mt-1 text-xl font-semibold">{bucketCount(latestWeekly.coverageMetadata, "equities")}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ReconciliationSection title="Equities" value={latestWeekly.equitiesSummary} />
                  <ReconciliationSection title="Bonds" value={latestWeekly.bondsSummary} />
                  <ReconciliationSection title="Gold / Commodities" value={latestWeekly.goldSummary} />
                  <ReconciliationSection title="Crypto" value={latestWeekly.cryptoSummary} />
                  <ReconciliationSection title="Macro" value={latestWeekly.macroSummary} />
                  <ReconciliationSection title="Rates" value={latestWeekly.ratesSummary} />
                  <ReconciliationSection title="Inflation" value={latestWeekly.inflationSummary} />
                  <ReconciliationSection title="Currency" value={latestWeekly.currencySummary} />
                  <ReconciliationSection title="Geopolitical" value={latestWeekly.geopoliticalSummary} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme Intelligence Summary</CardTitle>
            <CardDescription>Canonical themes run alongside asset-class buckets so Market Vision and scoring can separate asset exposure from market drivers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {dashboard.themeSummary.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No theme summary yet. Run weekly reconciliation from Admin after articles are classified.</div>
            ) : (
              <>
                <div className="grid gap-3">
                  {dashboard.themeSummary.slice(0, 9).map((theme) => (
                    <div key={theme.theme} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
                      <p className="mt-2 text-xs text-muted-foreground">News {theme.newsItemCount ?? theme.count} - FRED signals {theme.macroSignalCount ?? 0}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{theme.topHeadlines.slice(0, 2).join("; ") || theme.topMacroSignals?.slice(0, 2).join("; ") || "No sample available."}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium">Emerging themes</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dashboard.themeIntelligence.emergingThemes.length ? dashboard.themeIntelligence.emergingThemes.map((theme) => theme.theme).join(", ") : "No rising theme signal yet."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium">Persistent themes</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dashboard.themeIntelligence.persistentThemes.length ? dashboard.themeIntelligence.persistentThemes.map((theme) => theme.theme).join(", ") : "No persistent theme signal yet."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium">Structural themes</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dashboard.themeIntelligence.structuralThemes.length ? dashboard.themeIntelligence.structuralThemes.map((theme) => theme.theme).join(", ") : "No structural theme signal yet."}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
      </section>
    </PageContainer>
  );
}
