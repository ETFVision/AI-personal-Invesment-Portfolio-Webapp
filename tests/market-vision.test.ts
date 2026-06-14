import test from "node:test";
import assert from "node:assert/strict";
import { MarketVisionService, emptyPortfolioImplications } from "../src/application/services/marketVision/MarketVisionService";
import { emptyMarketVisionMetadata, MarketVisionGenerationService, normalizeGeneratedText, validateMarketVisionGenerationOutput } from "../src/application/services/marketVision/MarketVisionGenerationService";
import { GenerateMarketVisionReportJob } from "../src/application/jobs/GenerateMarketVisionReportJob";
import { MacroIndicatorService } from "../src/application/services/marketVision/MacroIndicatorService";
import { MarketThemeService } from "../src/application/services/marketVision/MarketThemeService";
import type {
  MacroIndicator,
  MarketThemeEvent,
  MarketVisionReport,
  MarketVisionStatus,
  MarketVisionGenerationLog
} from "../src/domain/marketVision/types";
import type {
  MarketVisionRepository,
  UpsertMacroIndicatorInput,
  UpsertMarketThemeEventInput,
  UpsertMarketVisionReportInput
} from "../src/application/ports/repositories/MarketVisionRepository";
import type { NewsRepository } from "../src/application/ports/repositories/NewsRepository";
import type { MacroIndicatorRepository } from "../src/application/ports/repositories/MacroIndicatorRepository";
import type { AiMarketVisionInput, AiMarketVisionOutput, AiMarketVisionProvider } from "../src/application/ports/providers/AiMarketVisionProvider";
import type { WeeklyNewsReconciliation } from "../src/domain/news/types";
import type { MacroDashboard, MacroThemeSignal } from "../src/domain/macro/types";
import type { PortfolioDashboard } from "../src/domain/portfolio/types";

class FakeMarketVisionRepository implements MarketVisionRepository {
  reports: MarketVisionReport[] = [];
  indicators: MacroIndicator[] = [];
  events: MarketThemeEvent[] = [];
  logs: MarketVisionGenerationLog[] = [];

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
      growthView: input.growthView ?? existing?.growthView ?? "",
      employmentView: input.employmentView ?? existing?.employmentView ?? "",
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
      confidenceScore: input.confidenceScore ?? existing?.confidenceScore ?? null,
      modelUsed: input.modelUsed ?? existing?.modelUsed ?? null,
      promptVersion: input.promptVersion ?? existing?.promptVersion ?? null,
      tokenUsage: input.tokenUsage ?? existing?.tokenUsage ?? {},
      costEstimate: input.costEstimate ?? existing?.costEstimate ?? null,
      sourceSnapshot: input.sourceSnapshot ?? existing?.sourceSnapshot ?? {},
      marketVisionMetadata: (input.marketVisionMetadata as MarketVisionReport["marketVisionMetadata"] | undefined) ?? existing?.marketVisionMetadata ?? emptyMarketVisionMetadata(),
      generationDurationMs: input.generationDurationMs ?? existing?.generationDurationMs ?? null,
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

  async findGeneratedReportForPeriod(periodStart: string, periodEnd: string) {
    return this.reports.find((report) =>
      report.sourceType === "generated" &&
      report.reportPeriodStart === periodStart &&
      report.reportPeriodEnd === periodEnd
    ) ?? null;
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

  async insertGenerationLog(input: any) {
    this.logs.unshift({
      id: `log-${this.logs.length + 1}`,
      reportId: input.reportId ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      startedAt: input.startedAt,
      completedAt: input.completedAt ?? null,
      status: input.status,
      modelUsed: input.modelUsed ?? null,
      promptVersion: input.promptVersion ?? null,
      tokenUsage: input.tokenUsage ?? {},
      costEstimate: input.costEstimate ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
      createdAt: "2026-06-01T00:00:00.000Z"
    });
  }

  async listGenerationLogs(limit = 20) {
    return this.logs.slice(0, limit);
  }
}

class FakeNewsRepository implements Partial<NewsRepository> {
  constructor(private readonly weekly: WeeklyNewsReconciliation | null) {}
  async getLatestWeeklyReconciliation() {
    return this.weekly;
  }
}

class FakeMacroRepository implements Partial<MacroIndicatorRepository> {
  async getDashboard(): Promise<MacroDashboard> {
    return { indicators: [], latestRegime: null, ingestionLogs: [] };
  }
  async listLatestMacroThemeSignals(): Promise<MacroThemeSignal[]> {
    return [];
  }
}

class FakeAiMarketVisionProvider implements AiMarketVisionProvider {
  calls: AiMarketVisionInput[] = [];
  constructor(private readonly output?: Partial<AiMarketVisionOutput>) {}
  async generateWeeklyBriefing(input: AiMarketVisionInput): Promise<AiMarketVisionOutput> {
    this.calls.push(input);
    return {
      title: "AI Market Vision",
      executiveSummary: "Markets were mixed as macro signals remained balanced.",
      globalMarketSummary: "Global markets reflected a mix of AI leadership and macro uncertainty.",
      topEmergingThemes: ["AI"],
      persistentThemes: ["Technology"],
      structuralThemes: ["AI"],
      equityOutlook: "Equity leadership remains concentrated around technology themes.",
      bondOutlook: "Bond context is shaped by rate sensitivity and duration.",
      goldOutlook: "Gold remains linked to inflation and geopolitical context.",
      cryptoOutlook: "Crypto remains liquidity-sensitive.",
      ratesOutlook: "Rates remain a central macro driver.",
      inflationOutlook: "Inflation signals are monitored for persistence.",
      growthOutlook: "Growth signals are mixed.",
      employmentOutlook: "Employment remains an important macro input.",
      currencyOutlook: "USD context matters for non-USD exposure.",
      geopoliticalOutlook: "Geopolitical risk remains a source of uncertainty.",
      keyRisks: ["Concentration risk could amplify volatility."],
      keyOpportunities: ["Structural AI themes remain visible."],
      portfolioImplications: {
        ...emptyPortfolioImplications,
        riskImplication: "Concentration and volatility context should be monitored."
      },
      marketVisionMetadata: marketVisionMetadataFixture(),
      confidenceScore: 78,
      tokenUsage: { input_tokens: 1000, output_tokens: 500 },
      costEstimate: 0.001,
      ...this.output
    };
  }
}

function marketVisionMetadataFixture(): MarketVisionReport["marketVisionMetadata"] {
  return {
    regimeScorecard: [
      { label: "Growth", regime: "mixed", supportingIndicators: ["weekly growth evidence mixed"], confidence: "Medium", explanation: "Growth evidence is mixed." },
      { label: "Inflation", regime: "cooling", supportingIndicators: ["inflation summary moderated"], confidence: "Medium", explanation: "Inflation evidence points to moderation." },
      { label: "Rates", regime: "restrictive", supportingIndicators: ["rates remained restrictive"], confidence: "Medium", explanation: "Rates remain a central macro driver." },
      { label: "Yield curve", regime: "mixed", supportingIndicators: ["stored curve inputs mixed"], confidence: "Low", explanation: "Curve evidence is limited." },
      { label: "Liquidity", regime: "neutral", supportingIndicators: ["crypto quiet"], confidence: "Low", explanation: "Liquidity evidence is limited." },
      { label: "USD", regime: "stable", supportingIndicators: ["USD was stable"], confidence: "Medium", explanation: "USD evidence is stable." },
      { label: "Commodities", regime: "mixed", supportingIndicators: ["gold reacted to uncertainty"], confidence: "Medium", explanation: "Commodity evidence is mixed." },
      { label: "Overall market", regime: "balanced", supportingIndicators: ["mixed cross-asset signals"], confidence: "Medium", explanation: "Overall evidence points to balance." }
    ],
    evidencePanels: [
      { section: "Equity Market View", view: "Mixed", confidence: "Medium", supportingIndicators: ["technology leadership"], conflictingIndicators: ["macro uncertainty"], evidenceGaps: [] },
      { section: "Bond Market View", view: "Neutral", confidence: "Medium", supportingIndicators: ["rates shaped bonds"], conflictingIndicators: [], evidenceGaps: [] },
      { section: "Gold / Commodities View", view: "Mixed", confidence: "Medium", supportingIndicators: ["gold reacted to macro uncertainty"], conflictingIndicators: [], evidenceGaps: [] },
      { section: "Crypto Market View", view: "Neutral", confidence: "Low", supportingIndicators: ["crypto quiet"], conflictingIndicators: [], evidenceGaps: ["Limited crypto evidence."] },
      { section: "Interest Rates", view: "Cautious", confidence: "Medium", supportingIndicators: ["rates restrictive"], conflictingIndicators: [], evidenceGaps: [] },
      { section: "Inflation", view: "Mixed", confidence: "Medium", supportingIndicators: ["inflation moderated"], conflictingIndicators: [], evidenceGaps: [] },
      { section: "Growth", view: "Mixed", confidence: "Low", supportingIndicators: ["growth mixed"], conflictingIndicators: [], evidenceGaps: ["Limited growth evidence."] },
      { section: "Employment", view: "Neutral", confidence: "Low", supportingIndicators: [], conflictingIndicators: [], evidenceGaps: ["Limited employment evidence."] },
      { section: "USD", view: "Neutral", confidence: "Medium", supportingIndicators: ["USD stable"], conflictingIndicators: [], evidenceGaps: [] },
      { section: "Geopolitical Risks", view: "Cautious", confidence: "Medium", supportingIndicators: ["geopolitical risks persisted"], conflictingIndicators: [], evidenceGaps: [] }
    ],
    structuralThemes: [{ id: "THEME_AI_INFRASTRUCTURE", displayName: "AI infrastructure", type: "structural", name: "AI infrastructure", evidence: ["AI theme visible"], persistence: "long", confidence: "Medium" }],
    tacticalThemes: [{ id: "TACTICAL_OTHER", displayName: "restrictive rates", type: "tactical", name: "restrictive rates", evidence: ["rates remained restrictive"], persistence: "short", confidence: "Medium" }],
    keyWatchItems: ["Inflation persistence", "Technology concentration"],
    evidenceGaps: ["Employment evidence is limited."],
    portfolioContextStatus: "missing",
    portfolioContextInputs: {},
    portfolioRelevance: { equity: "Low", bond: "Low", gold: "Low", crypto: "Low", cash: "Low", risk: "Low" },
    regimeTransitions: [],
    confidenceScores: [],
    crossCurrents: { positiveForces: [], negativeForces: [], neutralForces: [], netInterpretation: "Mixed" },
    portfolioImpactMatrix: [],
    telemetryMetadata: {
      overallRegime: "balanced",
      overallConfidence: "Medium",
      growthRegime: "mixed",
      growthConfidence: "Low",
      inflationRegime: "cooling",
      inflationConfidence: "Medium",
      ratesRegime: "restrictive",
      ratesConfidence: "Medium",
      yieldCurveRegime: "mixed",
      yieldCurveConfidence: "Low",
      liquidityRegime: "neutral",
      liquidityConfidence: "Low",
      usdRegime: "stable",
      usdConfidence: "Medium",
      commoditiesRegime: "mixed",
      commoditiesConfidence: "Medium",
      equityView: "Mixed",
      equityConfidence: "Medium",
      bondView: "Neutral",
      bondConfidence: "Medium",
      goldView: "Mixed",
      goldConfidence: "Medium",
      cryptoView: "Neutral",
      cryptoConfidence: "Low",
      keyWatchItems: ["Inflation persistence", "Technology concentration"],
      structuralThemeIds: ["THEME_AI_INFRASTRUCTURE"],
      tacticalThemeIds: ["TACTICAL_OTHER"],
      structuralThemes: ["AI infrastructure"],
      tacticalThemes: ["restrictive rates"],
      evidenceGaps: ["Employment evidence is limited."],
      portfolioContextStatus: "missing",
      portfolioContextInputs: {},
      portfolioRelevance: { equity: "Low", bond: "Low", gold: "Low", crypto: "Low", cash: "Low", risk: "Low" },
      regimeTransitions: [],
      confidenceScores: [],
      crossCurrents: { positiveForces: [], negativeForces: [], neutralForces: [], netInterpretation: "Mixed" },
      portfolioImpactMatrix: []
    }
  };
}

class FailingAiMarketVisionProvider implements AiMarketVisionProvider {
  async generateWeeklyBriefing(): Promise<AiMarketVisionOutput> {
    throw new Error("OpenAI Market Vision request failed: invalid model.");
  }
}

function weeklyReconciliation(): WeeklyNewsReconciliation {
  return {
    id: "weekly-1",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-07",
    status: "draft",
    equitiesSummary: "Equities were led by technology.",
    bondsSummary: "Bonds were shaped by rates.",
    goldSummary: "Gold reacted to macro uncertainty.",
    cryptoSummary: "Crypto was quiet.",
    macroSummary: "Macro signals were mixed.",
    ratesSummary: "Rates remained restrictive.",
    inflationSummary: "Inflation moderated.",
    currencySummary: "USD was stable.",
    geopoliticalSummary: "Geopolitical risks persisted.",
    keyRisks: ["Concentration"],
    keyOpportunities: ["AI"],
    portfolioImplications: {},
    coverageMetadata: { themeSummaries: [{ theme: "AI", impactScore: 120 }] },
    modelUsed: "deterministic_fallback",
    tokenUsage: {},
    costEstimate: null,
    createdAt: "",
    updatedAt: ""
  };
}

function equityOnlyDashboard(): PortfolioDashboard {
  return {
    portfolio: { id: "portfolio-1", userId: "user-1", name: "Default", baseCurrency: "USD", isDefault: true },
    cashBalances: [],
    holdings: [{
      id: "holding-1",
      portfolioId: "portfolio-1",
      assetId: "asset-1",
      assetType: "stock",
      ticker: "AAPL",
      assetName: "Apple",
      accountName: null,
      brokerName: null,
      quantity: 1,
      averageCost: 100,
      costCurrency: "USD",
      firstPurchaseDate: "2026-06-01",
      notes: null,
      sector: "Technology",
      country: "US",
      region: "US"
    }],
    holdingValuations: [],
    totalCash: 0,
    totalHoldingsCost: 100,
    totalHoldingsMarketValue: 120,
    totalValueEstimate: 120,
    investedAmount: 120,
    unrealizedGainLoss: 20,
    unrealizedGainLossPercent: 0.2,
    realizedGainLoss: 0,
    allocationByType: [{ label: "Stock", value: 120, percent: 1 }],
    allocationBySector: [{ label: "Technology", value: 120, percent: 1 }],
    allocationByGeography: [{ label: "US", value: 120, percent: 1 }],
    currencyExposure: [{ label: "USD", currency: "USD", value: 120, percent: 1 }],
    topWinners: [],
    topLosers: [],
    performance: [],
    productPerformance: [],
    cashPerformance: [],
    benchmarkComparisons: [],
    cashPercent: 0,
    investedPercent: 1,
    latestPriceDate: "2026-06-07"
  };
}

function macroSensitiveDashboard(): PortfolioDashboard {
  const dashboard = equityOnlyDashboard();
  return {
    ...dashboard,
    totalCash: 6.8,
    totalHoldingsMarketValue: 100,
    totalValueEstimate: 106.8,
    investedAmount: 100,
    allocationByType: [
      { label: "Equity", value: 99.54, percent: 0.932 },
      { label: "Gold / Commodities", value: 5.77, percent: 0.054 }
    ],
    allocationBySector: [
      { label: "Technology", value: 35, percent: 0.328 },
      { label: "Energy", value: 5, percent: 0.047 }
    ],
    allocationByGeography: [{ label: "International", value: 106.8, percent: 1 }],
    currencyExposure: [{ label: "USD", currency: "USD", value: 106.8, percent: 1 }],
    cashPercent: 0.068,
    investedPercent: 0.932
  };
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

test("AI Market Vision generation creates a generated draft with usage metadata", async () => {
  const repository = new FakeMarketVisionRepository();
  const ai = new FakeAiMarketVisionProvider();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    ai
  );

  const report = await service.generateWeeklyReport();

  assert.equal(report.sourceType, "generated");
  assert.equal(report.status, "draft");
  assert.equal(report.title, "AI Market Vision");
  assert.equal(report.growthView, "Growth signals are mixed.");
  assert.equal(report.confidenceScore, 78);
  assert.equal(report.costEstimate, 0.001);
  assert.equal(report.marketVisionMetadata.regimeScorecard[0]?.label, "Growth");
  assert.equal(report.marketVisionMetadata.evidencePanels.every((panel) => Boolean(panel.confidence)), true);
  assert.equal(report.marketVisionMetadata.telemetryMetadata.overallRegime, "balanced");
  assert.deepEqual(report.marketVisionMetadata.telemetryMetadata.structuralThemeIds, ["THEME_AI_INFRASTRUCTURE"]);
  assert.equal(report.marketVisionMetadata.regimeTransitions[0]?.status, "New Signal");
  assert.equal(report.marketVisionMetadata.confidenceScores.some((score) => score.section === "Equity Market View"), true);
  assert.equal(report.marketVisionMetadata.crossCurrents.netInterpretation, "Constructive");
  assert.equal(typeof report.marketVisionMetadata.telemetryMetadata.visionId, "string");
  assert.equal(typeof report.marketVisionMetadata.telemetryMetadata.generatedAt, "string");
  assert.equal(repository.logs[0]?.status, "success");
  assert.equal(ai.calls.length, 1);
});

test("AI Market Vision generation recalibrates overconfident mixed evidence and portfolio relevance", async () => {
  const metadata = marketVisionMetadataFixture();
  metadata.evidencePanels = metadata.evidencePanels.map((panel) => panel.section === "Equity Market View"
    ? { ...panel, confidence: "High", supportingIndicators: ["technology leadership"], conflictingIndicators: ["valuation pressure", "macro uncertainty"], evidenceGaps: [] }
    : panel
  );
  metadata.regimeScorecard = metadata.regimeScorecard.map((entry) => entry.label === "Yield curve"
    ? { ...entry, confidence: "High", supportingIndicators: [], explanation: "Evidence is limited." }
    : entry
  );
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider({ marketVisionMetadata: metadata }),
    { getPortfolioDashboard: async () => equityOnlyDashboard() }
  );

  const report = await service.generateWeeklyReport({ portfolioId: "portfolio-1" });
  const equityPanel = report.marketVisionMetadata.evidencePanels.find((panel) => panel.section === "Equity Market View");
  const yieldCurve = report.marketVisionMetadata.regimeScorecard.find((entry) => entry.label === "Yield curve");

  assert.equal(equityPanel?.confidence, "Low");
  assert.equal(yieldCurve?.confidence, "Low");
  assert.equal(report.marketVisionMetadata.portfolioRelevance.equity, "High");
  assert.equal(report.marketVisionMetadata.portfolioRelevance.crypto, "Low");
  assert.equal(report.marketVisionMetadata.telemetryMetadata.portfolioRelevance.equity, "High");
  assert.equal(report.marketVisionMetadata.portfolioImpactMatrix.find((item) => item.dimension === "Growth")?.relevance, "High");
  assert.equal(report.marketVisionMetadata.telemetryMetadata.portfolioImpactMatrix.find((item) => item.dimension === "Growth")?.relevance, "High");
});

test("AI Market Vision generation derives portfolio macro impact from actual exposure context", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider(),
    { getPortfolioDashboard: async () => macroSensitiveDashboard() }
  );

  const report = await service.generateWeeklyReport({ portfolioId: "portfolio-1" });
  const impact = (dimension: string) => report.marketVisionMetadata.portfolioImpactMatrix.find((item) => item.dimension === dimension);

  assert.equal(report.marketVisionMetadata.portfolioContextStatus, "available");
  assert.equal(impact("Growth")?.relevance, "High");
  assert.equal(impact("Liquidity")?.relevance, "High");
  assert.equal(impact("USD")?.relevance, "High");
  assert.equal(impact("Commodities")?.relevance, "Medium");
  assert.doesNotMatch(impact("Growth")?.reason ?? "", /No portfolio context available/i);
  assert.equal(report.marketVisionMetadata.telemetryMetadata.portfolioContextStatus, "available");
});

test("AI Market Vision generation marks missing portfolio context as not assessed", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider()
  );

  const report = await service.generateWeeklyReport();

  assert.equal(report.marketVisionMetadata.portfolioContextStatus, "missing");
  assert.equal(report.marketVisionMetadata.portfolioRelevance.equity, "Not assessed");
  assert.equal(report.marketVisionMetadata.portfolioImpactMatrix.every((item) => item.relevance === "Not assessed"), true);
});

test("scheduled Market Vision job resolves the default portfolio before generation", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider(),
    { getPortfolioDashboard: async () => equityOnlyDashboard() }
  );
  const job = new GenerateMarketVisionReportJob(service, undefined, async () => "portfolio-1");

  const result = await job.run();

  assert.equal(result.metadata.portfolioId, "portfolio-1");
  assert.equal(result.metadata.portfolioContextStatus, "available");
  assert.equal(repository.reports[0]?.marketVisionMetadata.portfolioRelevance.equity, "High");
});

test("AI Market Vision generation stores regime transitions against prior generated reports", async () => {
  const repository = new FakeMarketVisionRepository();
  const previousMetadata = marketVisionMetadataFixture();
  previousMetadata.regimeScorecard = previousMetadata.regimeScorecard.map((entry) => {
    if (entry.label === "Inflation") return { ...entry, regime: "reaccelerating", explanation: "Prior inflation evidence was reaccelerating." };
    if (entry.label === "Growth") return { ...entry, regime: "Weakening", explanation: "Prior growth evidence was weakening." };
    if (entry.label === "Rates") return { ...entry, regime: "falling rate support", explanation: "Prior rates evidence had falling rate support." };
    return entry;
  });
  const currentMetadata = marketVisionMetadataFixture();
  currentMetadata.regimeScorecard = currentMetadata.regimeScorecard.map((entry) => {
    if (entry.label === "Inflation") return { ...entry, regime: "high_and_sticky", explanation: "Inflation remains high and sticky." };
    if (entry.label === "Growth") return { ...entry, regime: "Strengthening", explanation: "Growth evidence is strengthening." };
    if (entry.label === "Rates") return { ...entry, regime: "falling_rate_support", explanation: "Rates evidence still points to falling rate support." };
    return entry;
  });
  await repository.upsertReport({
    reportDate: "2026-05-31",
    reportPeriodStart: "2026-05-25",
    reportPeriodEnd: "2026-05-31",
    title: "Prior Market Vision",
    executiveSummary: "",
    globalMarketSummary: "",
    equityView: "",
    bondView: "",
    goldView: "",
    cryptoView: "",
    ratesView: "",
    inflationView: "",
    currencyView: "",
    geopoliticalRiskView: "",
    opportunities: [],
    risks: [],
    portfolioImplications: emptyPortfolioImplications,
    sourceType: "generated",
    status: "draft",
    marketVisionMetadata: previousMetadata
  });
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider({ marketVisionMetadata: currentMetadata })
  );

  const report = await service.generateWeeklyReport();
  const inflationTransition = report.marketVisionMetadata.regimeTransitions.find((item) => item.dimension === "Inflation");
  const growthTransition = report.marketVisionMetadata.regimeTransitions.find((item) => item.dimension === "Growth");
  const ratesTransition = report.marketVisionMetadata.regimeTransitions.find((item) => item.dimension === "Rates");

  assert.equal(inflationTransition?.previousCanonical, "inflation_reaccelerating");
  assert.equal(inflationTransition?.currentCanonical, "inflation_high_and_sticky");
  assert.equal(inflationTransition?.status, "Minor Classification Change");
  assert.equal(growthTransition?.status, "Regime Shift Detected");
  assert.equal(ratesTransition?.status, "No Change");
});

test("AI Market Vision validation provides structured metadata defaults and evidence gaps", () => {
  const validated = validateMarketVisionGenerationOutput({
    title: "Sparse report",
    executiveSummary: "Evidence is limited.",
    portfolioImplications: {},
    confidenceScore: 20
  });

  assert.equal(validated.marketVisionMetadata.regimeScorecard.length, 8);
  assert.equal(validated.marketVisionMetadata.evidencePanels.length, 10);
  assert.equal(validated.marketVisionMetadata.evidenceGaps[0], "Evidence is limited.");
  assert.equal(validated.marketVisionMetadata.telemetryMetadata.equityConfidence, "Low");
  assert.deepEqual(validated.marketVisionMetadata.telemetryMetadata.tacticalThemeIds, []);
  assert.deepEqual(validated.marketVisionMetadata.crossCurrents.negativeForces, []);
  assert.deepEqual(validated.marketVisionMetadata.telemetryMetadata.portfolioImpactMatrix, []);
});

test("AI Market Vision validation normalizes smart and mojibake punctuation", () => {
  const text = normalizeGeneratedText("The week\u00e2\u20ac\u2122s report \u00e2\u20ac\u201d draft \u00c2\u00b7 section");
  assert.equal(text, "The week's report - draft - section");
});

test("AI Market Vision generation skips duplicate weekly report unless forced", async () => {
  const repository = new FakeMarketVisionRepository();
  const ai = new FakeAiMarketVisionProvider();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    ai
  );

  const first = await service.generateWeeklyReport();
  const second = await service.generateWeeklyReport();

  assert.equal(second.id, first.id);
  assert.equal(repository.logs[0]?.status, "skipped");
  assert.equal(ai.calls.length, 1);
});

test("AI Market Vision generation tightens unsupported exposure and curve language", async () => {
  const repository = new FakeMarketVisionRepository();
  const ai = new FakeAiMarketVisionProvider({
    executiveSummary: "For a portfolio with equities, bonds, gold, crypto, and cash allowed as exposures, the current mix appears centered on broad equity exposure with meaningful bond, crypto, gold, and cash components.",
    globalMarketSummary: "The 2-year yield fell while the 30-year rose, and the curve flattened modestly.",
    bondOutlook: "The bond sleeve's intermediate-duration mix sits in a mixed environment.",
    ratesOutlook: "The front end fell and the long end rose, so the curve flattened.",
    cryptoOutlook: "The portfolio context shows meaningful crypto exposure.",
    portfolioImplications: {
      ...emptyPortfolioImplications,
      cryptoImplication: "The portfolio's crypto sleeve can respond strongly to liquidity."
    }
  });
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    ai,
    { getPortfolioDashboard: async () => equityOnlyDashboard() }
  );

  const report = await service.generateWeeklyReport({ portfolioId: "portfolio-1" });

  assert.match(report.executiveSummary, /relevant cross-asset market context/i);
  assert.match(report.executiveSummary, /portfolio context provided/i);
  assert.doesNotMatch(report.executiveSummary, /allowed as exposures/i);
  assert.doesNotMatch(report.executiveSummary, /meaningful bond, crypto, gold, and cash components/i);
  assert.match(report.globalMarketSummary, /yield-curve signals were mixed/i);
  assert.doesNotMatch(report.globalMarketSummary, /flatten/i);
  assert.match(report.bondView, /bond market context/i);
  assert.doesNotMatch(report.bondView, /bond sleeve/i);
  assert.match(report.cryptoView, /crypto market context/i);
  assert.doesNotMatch(report.cryptoView, /portfolio context shows meaningful crypto exposure/i);
  assert.match(String(report.portfolioImplications.cryptoImplication), /crypto market context/i);
});

test("AI Market Vision generation requires weekly reconciliation", async () => {
  const service = new MarketVisionGenerationService(
    new FakeMarketVisionRepository(),
    new FakeNewsRepository(null) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FakeAiMarketVisionProvider()
  );

  await assert.rejects(() => service.generateWeeklyReport(), /No weekly news reconciliation/);
});

test("AI Market Vision generation logs provider failures", async () => {
  const repository = new FakeMarketVisionRepository();
  const service = new MarketVisionGenerationService(
    repository,
    new FakeNewsRepository(weeklyReconciliation()) as unknown as NewsRepository,
    new FakeMacroRepository() as unknown as MacroIndicatorRepository,
    new FailingAiMarketVisionProvider()
  );

  await assert.rejects(() => service.generateWeeklyReport(), /invalid model/);
  assert.equal(repository.logs[0]?.status, "failed");
  assert.match(repository.logs[0]?.errorMessage ?? "", /invalid model/);
});

test("AI Market Vision validation rejects recommendation language", () => {
  assert.throws(() => validateMarketVisionGenerationOutput({
    title: "Bad report",
    executiveSummary: "Buy NVDA because AI is strong.",
    portfolioImplications: {},
    confidenceScore: 80
  }), /recommendation language/);
});
