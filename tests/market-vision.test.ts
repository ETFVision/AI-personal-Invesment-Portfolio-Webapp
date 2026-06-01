import test from "node:test";
import assert from "node:assert/strict";
import { MarketVisionService, emptyPortfolioImplications } from "../src/application/services/marketVision/MarketVisionService";
import { MacroIndicatorService } from "../src/application/services/marketVision/MacroIndicatorService";
import { MarketThemeService } from "../src/application/services/marketVision/MarketThemeService";
import type {
  MacroIndicator,
  MarketThemeEvent,
  MarketVisionReport,
  MarketVisionStatus
} from "../src/domain/marketVision/types";
import type {
  MarketVisionRepository,
  UpsertMacroIndicatorInput,
  UpsertMarketThemeEventInput,
  UpsertMarketVisionReportInput
} from "../src/application/ports/repositories/MarketVisionRepository";

class FakeMarketVisionRepository implements MarketVisionRepository {
  reports: MarketVisionReport[] = [];
  indicators: MacroIndicator[] = [];
  events: MarketThemeEvent[] = [];

  async listReports(limit = 20) {
    return this.reports.slice(0, limit);
  }

  async getReportById(reportId: string) {
    return this.reports.find((report) => report.id === reportId) ?? null;
  }

  async getLatestPublishedReport() {
    return this.reports.find((report) => report.status === "published") ?? null;
  }

  async upsertReport(input: UpsertMarketVisionReportInput) {
    const existingIndex = input.id ? this.reports.findIndex((report) => report.id === input.id) : -1;
    const now = "2026-06-01T00:00:00.000Z";
    const existing = existingIndex >= 0 ? this.reports[existingIndex] : null;
    const report: MarketVisionReport = {
      id: input.id ?? `report-${this.reports.length + 1}`,
      reportDate: input.reportDate,
      reportPeriodStart: input.reportPeriodStart,
      reportPeriodEnd: input.reportPeriodEnd,
      title: input.title,
      executiveSummary: input.executiveSummary,
      globalMarketSummary: input.globalMarketSummary,
      equityView: input.equityView,
      bondView: input.bondView,
      goldView: input.goldView,
      cryptoView: input.cryptoView,
      ratesView: input.ratesView,
      inflationView: input.inflationView,
      currencyView: input.currencyView,
      geopoliticalRiskView: input.geopoliticalRiskView,
      opportunities: input.opportunities,
      risks: input.risks,
      portfolioImplications: input.portfolioImplications,
      classificationSummary: input.classificationSummary ??
        existing?.classificationSummary ??
        { shortTermNoise: 0, mediumTermThemes: 0, structuralLongTermShifts: 0 },
      sourceType: input.sourceType,
      status: input.status,
      createdAt: now,
      updatedAt: now
    };
    if (existingIndex >= 0) this.reports[existingIndex] = report;
    else this.reports.unshift(report);
    return report;
  }

  async updateReportStatus(reportId: string, status: MarketVisionStatus) {
    this.reports = this.reports.map((report) => report.id === reportId ? { ...report, status } : report);
  }

  async listMacroIndicators() {
    return this.indicators;
  }

  async upsertMacroIndicators(input: UpsertMacroIndicatorInput[]) {
    this.indicators = input.map((indicator, index) => ({
      ...indicator,
      id: `indicator-${index}`,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }));
  }

  async listThemeEvents(reportId?: string) {
    return reportId ? this.events.filter((event) => event.reportId === reportId) : this.events;
  }

  async upsertThemeEvents(input: UpsertMarketThemeEventInput[]) {
    this.events = input.map((event, index) => ({
      ...event,
      id: event.id ?? `event-${index}`,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }));
  }
}

test("creates, edits, publishes, archives, and retrieves Market Vision reports", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionService(repository);

  const draft = await service.createDraft({ title: "Weekly Market Vision", reportDate: "2026-06-01" });
  assert.equal(draft.status, "draft");
  assert.equal(draft.sourceType, "manual");

  const saved = await service.saveDraft({
    ...draft,
    id: draft.id,
    executiveSummary: "Markets are mixed.",
    opportunities: ["Duration may help if rates fall."],
    risks: ["Credit spreads could widen."],
    portfolioImplications: {
      ...emptyPortfolioImplications,
      bondAllocationImplication: "Review duration exposure."
    },
    sourceType: "manual",
    status: "draft"
  });
  assert.equal(saved.executiveSummary, "Markets are mixed.");

  await service.publishReport(saved.id);
  assert.equal((await repository.getLatestPublishedReport())?.id, saved.id);

  await service.archiveReport(saved.id);
  assert.equal((await repository.getReportById(saved.id))?.status, "archived");
});

test("macro indicator service formats display state", () => {
  const service = new MacroIndicatorService();
  const views = service.buildIndicatorViews([
    {
      id: "fed",
      indicatorCode: "FEDFUNDS",
      indicatorName: "Federal Funds Rate",
      sourceProvider: "manual",
      latestValue: 5.25,
      previousValue: 5,
      changeValue: 0.25,
      changePercent: 0.05,
      observationDate: "2026-05-31",
      category: "interest_rates",
      unit: "percent",
      metadata: {},
      createdAt: "",
      updatedAt: ""
    }
  ]);

  assert.equal(views[0]?.direction, "up");
  assert.equal(views[0]?.displayValue, "5.25%");
  assert.equal(views[0]?.displayChange, "0.25%");
});

test("market theme classification model is deterministic", () => {
  const service = new MarketThemeService();

  assert.equal(service.classify({ severityScore: 0.2, persistenceScore: 0.1, confidenceScore: 0.9 }), "short_term_noise");
  assert.equal(service.classify({ severityScore: 0.6, persistenceScore: 0.5, confidenceScore: 0.5 }), "medium_term_theme");
  assert.equal(service.classify({ severityScore: 0.7, persistenceScore: 0.8, confidenceScore: 0.7 }), "structural_long_term_shift");
});

test("dashboard supports empty-state handling when no reports exist", async () => {
  const service = new MarketVisionService(new FakeMarketVisionRepository());
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.selectedReport, null);
  assert.equal(dashboard.latestPublishedReport, null);
  assert.deepEqual(dashboard.themeEvents, []);
});

test("saving a draft preserves existing classification summary when not supplied", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionService(repository);

  const draft = await service.createDraft({
    title: "Classification Summary",
    reportDate: "2026-06-01",
    classificationSummary: { shortTermNoise: 1, mediumTermThemes: 2, structuralLongTermShifts: 3 }
  });

  const saved = await service.saveDraft({
    ...draft,
    id: draft.id,
    title: "Updated Classification Summary",
    classificationSummary: undefined,
    sourceType: "manual",
    status: "draft"
  });

  assert.deepEqual(saved.classificationSummary, {
    shortTermNoise: 1,
    mediumTermThemes: 2,
    structuralLongTermShifts: 3
  });
});
