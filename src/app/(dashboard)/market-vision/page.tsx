import { Archive, FilePenLine, Send } from "lucide-react";
import { createContainer } from "@/server/container";
import {
  archiveMarketVisionReportAction,
  createMarketVisionDraftFromLatestNewsAction,
  createMarketVisionDraftAction,
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
import type { MacroContextCard, MacroContextIndicator } from "@/application/services/macro/MacroContextService";
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

function ReportEditor({ report }: { report: MarketVisionReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit draft report</CardTitle>
        <CardDescription>Manual sections now; FMP, FRED, and OpenAI generation come later.</CardDescription>
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
  const latestGdeltNews = await container.newsRepository.listNewsWithClassifications({ sourceProvider: "gdelt", includeDuplicates: false, limit: 8 });
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
            Manual report structure today. FMP, FRED, and OpenAI summarisation are prepared as future integrations.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ReportSelector reports={dashboard.reports} selectedReport={report} />
          <form action={createMarketVisionDraftAction}>
            <SubmitButton>Create draft</SubmitButton>
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
          description="Create a draft report to start testing the weekly briefing structure before AI generation is added."
          action={<form action={createMarketVisionDraftAction}><Button type="submit">Create draft</Button></form>}
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
                <CardTitle className="text-sm">Theme events</CardTitle>
                <CardDescription>Classified manually/deterministically</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{dashboard.themeEvents.length}</CardContent>
            </Card>
          </section>

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
              <CardDescription>News Intelligence input prepared for manual Market Vision drafting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!latestWeeklyNews ? (
                <p className="text-muted-foreground">No weekly news reconciliation has been created yet.</p>
              ) : (
                <>
                  <p className="font-medium">{latestWeeklyNews.periodStart} to {latestWeeklyNews.periodEnd} · {latestWeeklyNews.status}</p>
                  <p className="text-muted-foreground">{latestWeeklyNews.macroSummary ?? latestWeeklyNews.equitiesSummary ?? "No summary available."}</p>
                  <form action={createMarketVisionDraftFromLatestNewsAction}>
                    <SubmitButton variant="outline" pendingLabel="Creating draft...">Create draft from news</SubmitButton>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GDELT macro / world-news input</CardTitle>
              <CardDescription>Global macro, geopolitical, currency, energy, trade, and credit stories prepared for manual Market Vision drafting.</CardDescription>
            </CardHeader>
            <CardContent>
              {latestGdeltNews.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No GDELT macro/world-news articles have been ingested yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {latestGdeltNews.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{item.classification?.primaryTheme ?? "Unmapped"}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.sourceName ?? "GDELT"} - {item.country ?? "Global"} - {item.publishedAt?.slice(0, 10) ?? "No date"}
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
              <CardDescription>Future AI will populate candidates; deterministic classification remains separate.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeTable events={dashboard.themeEvents} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio implications</CardTitle>
              <CardDescription>Manual fields reserved for future portfolio, risk, bond, and watchlist integration.</CardDescription>
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
          <CardTitle>Future AI integration placeholders</CardTitle>
          <CardDescription>Prepared but intentionally inactive in this phase.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border p-3">AI provider port: `AiMarketVisionProvider`</div>
          <div className="rounded-md border p-3">Prompt template placeholder: `MARKET_VISION_PROMPT_TEMPLATE`</div>
          <div className="rounded-md border p-3">Weekly job placeholder: `GenerateMarketVisionReportJob`</div>
        </CardContent>
      </Card>
    </div>
  );
}
