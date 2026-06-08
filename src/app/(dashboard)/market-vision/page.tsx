import { Archive, FilePenLine, Send } from "lucide-react";
import { createContainer } from "@/server/container";
import {
  archiveMarketVisionReportAction,
  publishMarketVisionReportAction,
  saveMarketVisionDraftAction
} from "@/server/actions/marketVisionActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard, PageContainer, PageHeader, StatusBadge } from "@/components/ui/professional";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { NewsSummaryEligibilityService } from "@/application/services/news/NewsSummaryEligibilityService";
import type { MacroContextCard, MacroContextIndicator } from "@/application/services/macro/MacroContextService";
import type { NewsClassification, NewsItem } from "@/domain/news/types";
import type { MarketThemeEvent, MarketVisionEvidencePanel, MarketVisionReport, MarketVisionThemeSummary } from "@/domain/marketVision/types";

type MarketVisionPageProps = {
  searchParams?: Promise<{ reportId?: string; message?: string; error?: string }>;
};

const reportSections: Array<{ key: keyof MarketVisionReport; title: string; description: string }> = [
  { key: "executiveSummary", title: "Executive Summary", description: "Top-level CIO-style readout." },
  { key: "globalMarketSummary", title: "Global Market Summary", description: "Cross-asset and regional backdrop." },
  { key: "equityView", title: "Equity Market View", description: "Equity tone, leadership, breadth, valuation, and style." },
  { key: "bondView", title: "Bond Market View", description: "Yield/rate context, duration sensitivity, treasury versus corporate conditions, TIPS, and recession hedge role." },
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
  ["equityAllocationImplication", "Equity context"] as const,
  ["bondAllocationImplication", "Bond context"] as const,
  ["goldImplication", "Gold"] as const,
  ["cryptoImplication", "Crypto"] as const,
  ["cashImplication", "Cash"] as const,
  ["riskImplication", "Risk"] as const,
  ["watchlistImplication", "Watch items"] as const
];

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

function confidenceTone(confidence: string) {
  if (confidence === "High") return "positive";
  if (confidence === "Medium") return "warning";
  return "neutral";
}

function EvidencePanel({ panel }: { panel: MarketVisionEvidencePanel | null }) {
  if (!panel) return null;
  return (
    <div className="mb-4 rounded-md border bg-muted/25 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">{panel.view}</StatusBadge>
        <StatusBadge tone={confidenceTone(panel.confidence)}>{panel.confidence} confidence</StatusBadge>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <p className="font-medium text-foreground">Supporting evidence</p>
          <p className="mt-1 text-muted-foreground">{panel.supportingIndicators.length ? panel.supportingIndicators.join("; ") : "Evidence is limited."}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Conflicting evidence</p>
          <p className="mt-1 text-muted-foreground">{panel.conflictingIndicators.length ? panel.conflictingIndicators.join("; ") : "No major conflict captured."}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Evidence gaps</p>
          <p className="mt-1 text-muted-foreground">{panel.evidenceGaps.length ? panel.evidenceGaps.join("; ") : "No major gap captured."}</p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description, value, evidencePanel }: { title: string; description: string; value: string; evidencePanel?: MarketVisionEvidencePanel | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <EvidencePanel panel={evidencePanel ?? null} />
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {value || "No manual notes yet."}
        </p>
      </CardContent>
    </Card>
  );
}

function RegimeScorecard({ report }: { report: MarketVisionReport }) {
  const scorecard = report.marketVisionMetadata.regimeScorecard;
  if (scorecard.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regime Scorecard</CardTitle>
        <CardDescription>Structured macro regime classification derived from stored FRED, news, theme, risk and portfolio inputs.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scorecard.map((item) => (
          <div key={item.label} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold">{item.regime}</p>
              </div>
              <StatusBadge tone={confidenceTone(item.confidence)}>{item.confidence}</StatusBadge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.explanation}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.supportingIndicators.length ? item.supportingIndicators.join("; ") : "Evidence is limited."}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RegimeTransitionTracker({ report }: { report: MarketVisionReport }) {
  const transitions = report.marketVisionMetadata.regimeTransitions;
  if (transitions.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regime Transition Tracker</CardTitle>
        <CardDescription>Compares the current generated briefing against the prior generated Market Vision report.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {transitions.map((transition) => (
          <div key={transition.dimension} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <div>
              <p className="font-medium">{transition.dimension}</p>
              <p className="text-xs text-muted-foreground">
                {transition.previous ?? "No prior signal"} -&gt; {transition.current}
              </p>
            </div>
            <StatusBadge tone={transition.changed ? "warning" : transition.status === "New Signal" ? "info" : "neutral"}>
              {transition.status}
            </StatusBadge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CrossCurrentsCard({ report }: { report: MarketVisionReport }) {
  const currents = report.marketVisionMetadata.crossCurrents;
  const rows = [
    ["Positive forces", currents.positiveForces, "positive"] as const,
    ["Negative forces", currents.negativeForces, "warning"] as const,
    ["Neutral forces", currents.neutralForces, "neutral"] as const
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Cross-Currents</CardTitle>
            <CardDescription>Separates supportive and conflicting macro forces before the narrative summary.</CardDescription>
          </div>
          <StatusBadge tone={currents.netInterpretation === "Constructive" ? "positive" : currents.netInterpretation === "Cautious" || currents.netInterpretation === "Defensive" ? "warning" : "info"}>
            {currents.netInterpretation}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {rows.map(([label, items, tone]) => (
          <div key={label} className="rounded-md border p-3">
            <StatusBadge tone={tone}>{label}</StatusBadge>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {items.length ? items.join("; ") : "No signal captured."}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConfidenceScorecard({ report }: { report: MarketVisionReport }) {
  const scores = report.marketVisionMetadata.confidenceScores;
  if (scores.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Confidence Scores</CardTitle>
        <CardDescription>Numeric confidence is derived from supporting evidence, conflicting evidence, and evidence gaps.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-medium">Section</th>
                <th className="p-3 text-right font-medium">Score</th>
                <th className="p-3 font-medium">Label</th>
                <th className="p-3 text-right font-medium">Support</th>
                <th className="p-3 text-right font-medium">Conflict</th>
                <th className="p-3 text-right font-medium">Gaps</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.section} className="border-t">
                  <td className="p-3 font-medium">{score.section}</td>
                  <td className="p-3 text-right">{score.confidenceScore}/100</td>
                  <td className="p-3"><StatusBadge tone={confidenceTone(score.confidenceLabel)}>{score.confidenceLabel}</StatusBadge></td>
                  <td className="p-3 text-right">{score.supportingCount}</td>
                  <td className="p-3 text-right">{score.conflictingCount}</td>
                  <td className="p-3 text-right">{score.gapCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PortfolioImpactMatrix({ report }: { report: MarketVisionReport }) {
  const impacts = report.marketVisionMetadata.portfolioImpactMatrix;
  if (impacts.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Macro Impact Matrix</CardTitle>
        <CardDescription>Maps macro factors to portfolio relevance without producing allocation recommendations.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {impacts.map((impact) => (
          <div key={impact.dimension} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{impact.dimension}</p>
              <StatusBadge tone={confidenceTone(impact.relevance)}>{impact.relevance}</StatusBadge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{impact.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ThemeSummaryCard({ title, themes }: { title: string; themes: MarketVisionThemeSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Evidence-tagged themes prepared for Market Vision telemetry.</CardDescription>
      </CardHeader>
      <CardContent>
        {themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No themes captured yet.</p>
        ) : (
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme.name} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{theme.displayName || theme.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{theme.id}</p>
                </div>
                  <div className="flex gap-2">
                    <StatusBadge tone="info">{theme.persistence}</StatusBadge>
                    <StatusBadge tone={confidenceTone(theme.confidence)}>{theme.confidence}</StatusBadge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{theme.evidence.length ? theme.evidence.join("; ") : "Evidence is limited."}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function relevanceForKey(report: MarketVisionReport, key: keyof MarketVisionReport["portfolioImplications"]) {
  const relevance = report.marketVisionMetadata.portfolioRelevance;
  if (key === "equityAllocationImplication") return relevance.equity;
  if (key === "bondAllocationImplication") return relevance.bond;
  if (key === "goldImplication") return relevance.gold;
  if (key === "cryptoImplication") return relevance.crypto;
  if (key === "cashImplication") return relevance.cash;
  return relevance.risk;
}

function evidenceFor(report: MarketVisionReport, title: string) {
  return report.marketVisionMetadata.evidencePanels.find((panel) =>
    panel.section.toLowerCase() === title.toLowerCase() ||
    title.toLowerCase().includes(panel.section.toLowerCase()) ||
    panel.section.toLowerCase().includes(title.toLowerCase())
  ) ?? null;
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
              <Label htmlFor="opportunities">Market themes to monitor</Label>
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
                <Label htmlFor={key}>{label}</Label>
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
  const [dashboard, latestGlobalNews, macroDashboard] = await Promise.all([
    container.marketVisionService.getDashboard(params?.reportId),
    Promise.all([
      container.newsRepository.listNewsWithClassifications({ sourceProvider: "newsdata", includeDuplicates: false, limit: 40 }),
      container.newsRepository.listNewsWithClassifications({ sourceProvider: "gdelt", includeDuplicates: false, limit: 40 })
    ]).then(([newsDataRows, gdeltRows]) => eligibleGdeltInput([...newsDataRows, ...gdeltRows]).slice(0, 8)),
    container.macroDashboardService.getDashboard()
  ]);
  const macroContext = container.macroContextService.buildContext(macroDashboard);
  const report = dashboard.selectedReport;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Market Vision"
        title="Weekly CIO-style briefing"
        description="CIO-style synthesis from News Intelligence, FRED macro signals, portfolio analytics, risk, bonds, and benchmarks."
        meta={
          <>
            <StatusBadge tone={report ? "positive" : "neutral"}>{report ? report.status : "No report yet"}</StatusBadge>
            {report ? <StatusBadge tone="info">{report.reportDate}</StatusBadge> : null}
          </>
        }
        actions={
        <div className="flex flex-col gap-2 sm:flex-row">
          <ReportSelector reports={dashboard.reports} selectedReport={report} />
        </div>
        }
      />

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
          description="Create a manual or AI draft from Admin Data Sources after the latest weekly news reconciliation is ready."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Status" value={<StatusBadge tone={report.status === "published" ? "positive" : report.status === "archived" ? "neutral" : "warning"}>{report.status}</StatusBadge>} footer="Manual workflow state" />
            <MetricCard title="Report date" value={report.reportDate} footer="Briefing date" />
            <MetricCard title="Source" value={<span className="capitalize">{report.sourceType}</span>} footer="Generation mode" />
            <MetricCard title="Confidence" value={report.confidenceScore == null ? "-" : `${report.confidenceScore}%`} footer="Generated report score" />
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

          <RegimeScorecard report={report} />

          <section className="grid gap-4 xl:grid-cols-2">
            <RegimeTransitionTracker report={report} />
            <CrossCurrentsCard report={report} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ConfidenceScorecard report={report} />
            <PortfolioImpactMatrix report={report} />
          </section>

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
                evidencePanel={evidenceFor(report, section.title)}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ListCard title="Market Themes To Monitor" items={report.opportunities} emptyText="No themes entered yet." />
            <ListCard title="Key Risks" items={report.risks} emptyText="No risks entered yet." />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ThemeSummaryCard title="Structural Themes" themes={report.marketVisionMetadata.structuralThemes} />
            <ThemeSummaryCard title="Tactical Themes" themes={report.marketVisionMetadata.tacticalThemes} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ListCard title="Watch Items" items={report.marketVisionMetadata.keyWatchItems} emptyText="No watch items captured yet." />
            <ListCard title="Evidence Gaps" items={report.marketVisionMetadata.evidenceGaps} emptyText="No evidence gaps captured yet." />
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
              <CardTitle>Portfolio Context</CardTitle>
              <CardDescription>Generated context explains relevance only; it does not recommend trades or allocation changes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {implicationFields.map(([key, label]) => (
                <div key={key} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{label}</p>
                    <StatusBadge tone={confidenceTone(relevanceForKey(report, key))}>{relevanceForKey(report, key)} relevance</StatusBadge>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {report.portfolioImplications[key] || "No implication entered yet."}
                  </p>
                </div>
              ))}
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
                        <p className="text-sm font-medium">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{item.title}</a>
                          ) : item.title}
                        </p>
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

          {report.status === "draft" ? <ReportEditor report={report} /> : null}
        </>
      )}
    </PageContainer>
  );
}
