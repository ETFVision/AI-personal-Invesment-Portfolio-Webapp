import { Archive, FilePenLine, Send } from "lucide-react";
import { createContainer } from "@/server/container";
import {
  archiveMarketVisionReportAction,
  createMarketVisionDraftFromLatestNewsAction,
  createMarketVisionDraftAction,
  generateAiMarketVisionDraftAction,
  publishMarketVisionReportAction,
  saveMarketVisionDraftAction
} from "@/server/actions/marketVisionActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { NewsSummaryEligibilityService } from "@/application/services/news/NewsSummaryEligibilityService";
import type { MacroContextCard, MacroContextIndicator } from "@/application/services/macro/MacroContextService";
import type { NewsClassification, NewsItem } from "@/domain/news/types";
import type { MarketThemeEvent, MarketVisionReport } from "@/domain/marketVision/types";

type MarketVisionPageProps = {
  searchParams?: Promise<{ reportId?: string; message?: string; error?: string }>;
};

const reportSections: Array<{ key: keyof MarketVisionReport; title: string; description: string }> = [
  { key: "executiveSummary", title: "Executive Summary", description: "Top-level CIO-style readout." },
  { key: "globalMarketSummary", title: "Global Market Summary", description: "Cross-asset and regional backdrop." },
  { key: "equityView", title: "Equity Market View", description: "Equity tone, leadership, breadth, valuation, and style." },
  { key: "bondView", title: "Bond Market View", description: "Yield/rate outlook, duration preference, treasury versus corporate view, TIPS, and recession hedge role." },
  { key: "goldView", title: "Gold / Commodities View", description: "Gold, commodities, inflation hedge, and real-rate context." },
  { key: "cryptoView", title: "Crypto Market View", description: "Bitcoin/crypto trend, liquidity sensitivity, and risk appetite." },
  { key: "ratesView", title: "Interest Rates", description: "Central-bank stance and yield curve implications." },
  { key: "inflationView", title: "Inflation", description: "Inflation trend, expectations, and market sensitivity." },
  { key: "growthView", title: "Growth Outlook", description: "Growth, earnings, recession, and activity backdrop." },
  { key: "employmentView", title: "Employment Outlook", description: "Labor market, wage, and employment signals." },
  { key: "currencyView", title: "Currency / USD View", description: "USD trend and non-USD exposure context." },
  { key: "geopoliticalRiskView", title: "Geopolitical Risks", description: "Geopolitical risks and persistence assessment." }
];

const implicationFields = [
  ["equityAllocationImplication", "Equity allocation"] as const,
  ["bondAllocationImplication", "Bond allocation"] as const,
  ["goldImplication", "Gold"] as const,
  ["cryptoImplication", "Crypto"] as const,
  ["cashImplication", "Cash"] as const,
  ["riskImplication", "Risk"] as const,
  ["watchlistImplication", "Watchlist"] as const
];

function statusClass(status: string) {
  if (status === "published") return "bg-emerald-100 text-emerald-700";
  if (status === "archived") return "bg-muted text-muted-foreground";
  return "bg-amber-100 text-amber-700";
}

function ReportSelector({ reports, selectedReport }: { reports: MarketVisionReport[]; selectedReport: MarketVisionReport | null }) {
  return (
    <form className="flex flex-col gap-2 sm:flex-row" method="get">
      <Select name="reportId" defaultValue={selectedReport?.id ?? ""} className="sm:w-80">
        <option value="">Latest report</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>
            {report.reportDate} - {report.title} ({report.status})
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline">Open</Button>
    </form>
  );
}

function MacroIndicatorCards({ indicators }: { indicators: MacroContextIndicator[] }) {
  if (indicators.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">FRED indicator trends will appear after the Macro dashboard is backfilled.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicators.map((indicator) => (
        <div key={indicator.code} className="rounded-md border p-3">
          <p className="text-xs uppercase text-muted-foreground">{indicator.category}</p>
          <p className="mt-1 text-sm font-medium">{indicator.code}</p>
          <p className="text-xs text-muted-foreground">{indicator.name}</p>
          <p className="mt-2 text-2xl font-semibold">{indicator.latestValue}</p>
          <p className="mt-1 text-xs text-muted-foreground">1Y: {indicator.oneYearChange} · {indicator.direction} · {indicator.asOfDate}</p>
        </div>
      ))}
    </div>
  );
}

function MacroRegimeCards({ cards }: { cards: MacroContextCard[] }) {
  if (cards.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">FRED macro regimes will appear after the Macro dashboard is refreshed.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border p-3">
          <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-sm font-medium">{card.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

function MacroContextList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 text-sm md:grid-cols-2">
      {items.map((item) => <p key={item} className="rounded-md border p-3 text-muted-foreground">{item}</p>)}
    </div>
  );
}

function SectionCard({ title, description, value }: { title: string; description: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {value || "No manual notes yet."}
        </p>
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => <li key={item} className="rounded-md border p-3">{item}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ThemeTable({ events }: { events: MarketThemeEvent[] }) {
  if (events.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No market theme events have been added yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="p-3 font-medium">Theme</th>
            <th className="p-3 font-medium">Category</th>
            <th className="p-3 font-medium">Classification</th>
            <th className="p-3 text-right font-medium">Severity</th>
            <th className="p-3 text-right font-medium">Persistence</th>
            <th className="p-3 text-right font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t">
              <td className="p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.description}</p>
              </td>
              <td className="p-3">{event.themeCategory}</td>
              <td className="p-3">{event.classification.replaceAll("_", " ")}</td>
              <td className="p-3 text-right">{event.severityScore.toFixed(2)}</td>
              <td className="p-3 text-right">{event.persistenceScore.toFixed(2)}</td>
              <td className="p-3 text-right">{event.confidenceScore.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function eligibleGdeltInput(items: Array<NewsItem & { classification?: NewsClassification | null }>) {
  const eligibilityService = new NewsSummaryEligibilityService();
  return items
    .filter((item): item is NewsItem & { classification: NewsClassification } => Boolean(item.classification))
    .filter((item) => eligibilityService.isEligible(item));
}

function ReportEditor({ report }: { report: MarketVisionReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit draft report</CardTitle>
        <CardDescription>Manual edits remain available for draft reports, including generated drafts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveMarketVisionDraftAction} className="grid gap-4">
          <input type="hidden" name="reportId" value={report.id} />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={report.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDate">Report date</Label>
              <Input id="reportDate" name="reportDate" type="date" defaultValue={report.reportDate} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reportPeriodStart">Period start</Label>
                <Input id="reportPeriodStart" name="reportPeriodStart" type="date" defaultValue={report.reportPeriodStart ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportPeriodEnd">Period end</Label>
                <Input id="reportPeriodEnd" name="reportPeriodEnd" type="date" defaultValue={report.reportPeriodEnd ?? ""} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {reportSections.map((section) => (
              <div key={section.key} className="space-y-2">
                <Label htmlFor={section.key}>{section.title}</Label>
                <Textarea id={section.key} name={section.key} defaultValue={String(report[section.key] ?? "")} />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opportunities">Key opportunities</Label>
              <Textarea id="opportunities" name="opportunities" defaultValue={report.opportunities.join("\n")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risks">Key risks</Label>
              <Textarea id="risks" name="risks" defaultValue={report.risks.join("\n")} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {implicationFields.map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label} implication</Label>
                <Textarea id={key} name={key} defaultValue={report.portfolioImplications[key]} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Saving...">
              <FilePenLine className="h-4 w-4" />
              Save draft
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReportActions({ report }: { report: MarketVisionReport }) {
  return (
    <div className="flex flex-wrap gap-2">
      {report.status === "draft" ? (
        <form action={publishMarketVisionReportAction}>
          <input type="hidden" name="reportId" value={report.id} />
          <SubmitButton pendingLabel="Publishing...">
            <Send className="h-4 w-4" />
            Publish
          </SubmitButton>
        </form>
      ) : null}
      {report.status !== "archived" ? (
        <form action={archiveMarketVisionReportAction}>
          <input type="hidden" name="reportId" value={report.id} />
          <SubmitButton variant="outline" pendingLabel="Archiving...">
            <Archive className="h-4 w-4" />
            Archive
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export default async function MarketVisionPage({ searchParams }: MarketVisionPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();
  const dashboard = await container.marketVisionService.getDashboard(params?.reportId);
  const latestWeeklyNews = await container.newsRepository.getLatestWeeklyReconciliation();
  const latestGlobalNews = eligibleGdeltInput([
    ...await container.newsRepository.listNewsWithClassifications({ sourceProvider: "newsdata", includeDuplicates: false, limit: 40 }),
    ...await container.newsRepository.listNewsWithClassifications({ sourceProvider: "gdelt", includeDuplicates: false, limit: 40 })
  ]).slice(0, 8);
  const macroDashboard = await container.macroDashboardService.getDashboard();
  const macroContext = container.macroContextService.buildContext(macroDashboard);
  const report = dashboard.selectedReport;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Market Vision</p>
          <h1 className="text-2xl font-semibold">Weekly CIO-style briefing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CIO-style synthesis from News Intelligence, FRED macro signals, portfolio analytics, risk, bonds, and benchmarks.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ReportSelector reports={dashboard.reports} selectedReport={report} />
          <form action={createMarketVisionDraftAction}>
            <SubmitButton>Create draft</SubmitButton>
          </form>
          <form action={generateAiMarketVisionDraftAction}>
            <SubmitButton variant="secondary" pendingLabel="Generating...">Generate AI draft</SubmitButton>
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

      {!report ? (
        <EmptyState
          title="No Market Vision report yet"
          description="Create a manual draft or generate an AI draft from the latest weekly reconciliation."
          action={<div className="flex gap-2"><form action={createMarketVisionDraftAction}><Button type="submit">Create draft</Button></form><form action={generateAiMarketVisionDraftAction}><Button type="submit" variant="secondary">Generate AI draft</Button></form></div>}
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status</CardTitle>
                <CardDescription>Manual workflow state</CardDescription>
              </CardHeader>
              <CardContent>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass(report.status)}`}>{report.status}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Report date</CardTitle>
                <CardDescription>Briefing date</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{report.reportDate}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Source</CardTitle>
                <CardDescription>Generation mode</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold capitalize">{report.sourceType}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Confidence</CardTitle>
                <CardDescription>Generated report score</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{report.confidenceScore == null ? "-" : `${report.confidenceScore}%`}</CardContent>
            </Card>
          </section>

          {report.sourceType === "generated" ? (
            <Card>
              <CardHeader>
                <CardTitle>Generation metadata</CardTitle>
                <CardDescription>Model, prompt and usage tracking for auditability.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Model</p>
                  <p className="mt-1 font-medium">{report.modelUsed ?? "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Prompt</p>
                  <p className="mt-1 font-medium">{report.promptVersion ?? "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Cost</p>
                  <p className="mt-1 font-medium">{report.costEstimate == null ? "Not configured" : `$${report.costEstimate.toFixed(6)}`}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase text-muted-foreground">Duration</p>
                  <p className="mt-1 font-medium">{report.generationDurationMs == null ? "-" : `${report.generationDurationMs}ms`}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">{report.title}</h2>
              <p className="text-sm text-muted-foreground">
                {report.reportPeriodStart ?? "No period start"} to {report.reportPeriodEnd ?? "No period end"}
              </p>
            </div>
            <ReportActions report={report} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Latest weekly news reconciliation</CardTitle>
              <CardDescription>News Intelligence input prepared for Market Vision generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!latestWeeklyNews ? (
                <p className="text-muted-foreground">No weekly news reconciliation has been created yet.</p>
              ) : (
                <>
                  <p className="font-medium">{latestWeeklyNews.periodStart} to {latestWeeklyNews.periodEnd} · {latestWeeklyNews.status}</p>
                  <p className="text-muted-foreground">{latestWeeklyNews.macroSummary ?? latestWeeklyNews.equitiesSummary ?? "No summary available."}</p>
                  <div className="flex flex-wrap gap-2">
                    <form action={createMarketVisionDraftFromLatestNewsAction}>
                      <SubmitButton variant="outline" pendingLabel="Creating draft...">Create draft from news</SubmitButton>
                    </form>
                    <form action={generateAiMarketVisionDraftAction}>
                      <SubmitButton variant="secondary" pendingLabel="Generating...">Generate AI draft</SubmitButton>
                    </form>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Macro / world-news input</CardTitle>
              <CardDescription>NewsData primary plus GDELT fallback macro, geopolitical, currency, energy, trade, and credit stories prepared for manual Market Vision drafting.</CardDescription>
            </CardHeader>
            <CardContent>
              {latestGlobalNews.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No NewsData or GDELT macro/world-news articles have been ingested yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {latestGlobalNews.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{item.classification?.primaryTheme ?? "Unmapped"}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.sourceName ?? (item.sourceProvider === "newsdata" ? "NewsData" : "GDELT")} - {item.country ?? "Global"} - {item.publishedAt?.slice(0, 10) ?? "No date"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FRED macro context</CardTitle>
              <CardDescription>Stored macro trends prepared for Market Vision drafting. No investment recommendations are generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MacroRegimeCards cards={macroContext.regimeCards} />
              <MacroContextList items={macroContext.marketVisionContext} />
              <MacroIndicatorCards indicators={macroContext.keyIndicators} />
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            {reportSections.map((section) => (
              <SectionCard
                key={section.key}
                title={section.title}
                description={section.description}
                value={String(report[section.key] ?? "")}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ListCard title="Key Opportunities" items={report.opportunities} emptyText="No opportunities entered yet." />
            <ListCard title="Key Risks" items={report.risks} emptyText="No risks entered yet." />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Market theme classification</CardTitle>
              <CardDescription>Theme events remain deterministic/manual and separate from AI narrative generation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeTable events={dashboard.themeEvents} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio implications</CardTitle>
              <CardDescription>Generated implications explain context only; they do not recommend trades or allocation changes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {implicationFields.map(([key, label]) => (
                <div key={key} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {report.portfolioImplications[key] || "No implication entered yet."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {report.status === "draft" ? <ReportEditor report={report} /> : null}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generation logs</CardTitle>
          <CardDescription>Weekly job and manual generation outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {dashboard.generationLogs.length === 0 ? (
            <p className="text-muted-foreground">No AI Market Vision generation has run yet.</p>
          ) : dashboard.generationLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3">
              <div className="font-medium">{log.periodStart ?? "-"} to {log.periodEnd ?? "-"} - {log.status}</div>
              <div className="text-muted-foreground">
                {log.modelUsed ?? "No model"} - {log.promptVersion ?? "No prompt"} - {log.costEstimate == null ? "Cost not configured" : `$${log.costEstimate.toFixed(6)}`}
              </div>
              {log.errorMessage ? <div className="mt-1 text-destructive">{log.errorMessage}</div> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
