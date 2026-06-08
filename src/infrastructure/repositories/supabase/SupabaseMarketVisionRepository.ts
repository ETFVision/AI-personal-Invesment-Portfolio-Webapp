import type {
  MacroIndicator,
  MarketVisionGenerationLog,
  MarketVisionMetadata,
  MarketThemeEvent,
  MarketVisionReport,
  PortfolioImplications
} from "@/domain/marketVision/types";
import type {
  MarketVisionRepository,
  InsertMarketVisionGenerationLogInput,
  UpsertMacroIndicatorInput,
  UpsertMarketThemeEventInput,
  UpsertMarketVisionReportInput
} from "@/application/ports/repositories/MarketVisionRepository";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import { withSupabaseClockSkewRetry } from "./supabaseErrors";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingMarketVisionTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(
    error &&
      (error.code === "42P01" ||
        message.includes("market_vision") ||
        message.includes("market_vision_generation_logs") ||
        message.includes("macro_indicators") ||
        message.includes("market_theme_events"))
  );
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapPortfolioImplications(value: unknown): PortfolioImplications {
  const row = typeof value === "object" && value !== null ? value as Partial<PortfolioImplications> : {};
  return {
    equityAllocationImplication: row.equityAllocationImplication ?? "",
    bondAllocationImplication: row.bondAllocationImplication ?? "",
    goldImplication: row.goldImplication ?? "",
    cryptoImplication: row.cryptoImplication ?? "",
    cashImplication: row.cashImplication ?? "",
    riskImplication: row.riskImplication ?? "",
    watchlistImplication: row.watchlistImplication ?? ""
  };
}

function mapMarketVisionMetadata(value: unknown): MarketVisionMetadata {
  const row = typeof value === "object" && value !== null ? value as Partial<MarketVisionMetadata> : {};
  const telemetry = typeof row.telemetryMetadata === "object" && row.telemetryMetadata !== null
    ? row.telemetryMetadata
    : {};
  const relevance = typeof row.portfolioRelevance === "object" && row.portfolioRelevance !== null
    ? row.portfolioRelevance as Record<string, unknown>
    : {};
  const telemetryRelevance = typeof (telemetry as Record<string, unknown>).portfolioRelevance === "object" && (telemetry as Record<string, unknown>).portfolioRelevance !== null
    ? (telemetry as Record<string, unknown>).portfolioRelevance as Record<string, unknown>
    : {};
  const mapRelevance = (source: Record<string, unknown>) => ({
    equity: (source.equity as MarketVisionMetadata["portfolioRelevance"]["equity"]) ?? "Low",
    bond: (source.bond as MarketVisionMetadata["portfolioRelevance"]["bond"]) ?? "Low",
    gold: (source.gold as MarketVisionMetadata["portfolioRelevance"]["gold"]) ?? "Low",
    crypto: (source.crypto as MarketVisionMetadata["portfolioRelevance"]["crypto"]) ?? "Low",
    cash: (source.cash as MarketVisionMetadata["portfolioRelevance"]["cash"]) ?? "Low",
    risk: (source.risk as MarketVisionMetadata["portfolioRelevance"]["risk"]) ?? "Low"
  });
  const portfolioRelevance = mapRelevance(relevance);
  return {
    regimeScorecard: Array.isArray(row.regimeScorecard) ? row.regimeScorecard as MarketVisionMetadata["regimeScorecard"] : [],
    evidencePanels: Array.isArray(row.evidencePanels) ? row.evidencePanels as MarketVisionMetadata["evidencePanels"] : [],
    structuralThemes: Array.isArray(row.structuralThemes) ? row.structuralThemes as MarketVisionMetadata["structuralThemes"] : [],
    tacticalThemes: Array.isArray(row.tacticalThemes) ? row.tacticalThemes as MarketVisionMetadata["tacticalThemes"] : [],
    keyWatchItems: toStringArray(row.keyWatchItems),
    evidenceGaps: toStringArray(row.evidenceGaps),
    portfolioRelevance,
    telemetryMetadata: {
      overallRegime: String((telemetry as Record<string, unknown>).overallRegime ?? ""),
      overallConfidence: ((telemetry as Record<string, unknown>).overallConfidence as MarketVisionMetadata["telemetryMetadata"]["overallConfidence"]) ?? "Low",
      growthRegime: String((telemetry as Record<string, unknown>).growthRegime ?? ""),
      growthConfidence: ((telemetry as Record<string, unknown>).growthConfidence as MarketVisionMetadata["telemetryMetadata"]["growthConfidence"]) ?? "Low",
      inflationRegime: String((telemetry as Record<string, unknown>).inflationRegime ?? ""),
      inflationConfidence: ((telemetry as Record<string, unknown>).inflationConfidence as MarketVisionMetadata["telemetryMetadata"]["inflationConfidence"]) ?? "Low",
      ratesRegime: String((telemetry as Record<string, unknown>).ratesRegime ?? ""),
      ratesConfidence: ((telemetry as Record<string, unknown>).ratesConfidence as MarketVisionMetadata["telemetryMetadata"]["ratesConfidence"]) ?? "Low",
      yieldCurveRegime: String((telemetry as Record<string, unknown>).yieldCurveRegime ?? ""),
      yieldCurveConfidence: ((telemetry as Record<string, unknown>).yieldCurveConfidence as MarketVisionMetadata["telemetryMetadata"]["yieldCurveConfidence"]) ?? "Low",
      liquidityRegime: String((telemetry as Record<string, unknown>).liquidityRegime ?? ""),
      liquidityConfidence: ((telemetry as Record<string, unknown>).liquidityConfidence as MarketVisionMetadata["telemetryMetadata"]["liquidityConfidence"]) ?? "Low",
      usdRegime: String((telemetry as Record<string, unknown>).usdRegime ?? ""),
      usdConfidence: ((telemetry as Record<string, unknown>).usdConfidence as MarketVisionMetadata["telemetryMetadata"]["usdConfidence"]) ?? "Low",
      commoditiesRegime: String((telemetry as Record<string, unknown>).commoditiesRegime ?? ""),
      commoditiesConfidence: ((telemetry as Record<string, unknown>).commoditiesConfidence as MarketVisionMetadata["telemetryMetadata"]["commoditiesConfidence"]) ?? "Low",
      equityView: String((telemetry as Record<string, unknown>).equityView ?? ""),
      equityConfidence: ((telemetry as Record<string, unknown>).equityConfidence as MarketVisionMetadata["telemetryMetadata"]["equityConfidence"]) ?? "Low",
      bondView: String((telemetry as Record<string, unknown>).bondView ?? ""),
      bondConfidence: ((telemetry as Record<string, unknown>).bondConfidence as MarketVisionMetadata["telemetryMetadata"]["bondConfidence"]) ?? "Low",
      goldView: String((telemetry as Record<string, unknown>).goldView ?? ""),
      goldConfidence: ((telemetry as Record<string, unknown>).goldConfidence as MarketVisionMetadata["telemetryMetadata"]["goldConfidence"]) ?? "Low",
      cryptoView: String((telemetry as Record<string, unknown>).cryptoView ?? ""),
      cryptoConfidence: ((telemetry as Record<string, unknown>).cryptoConfidence as MarketVisionMetadata["telemetryMetadata"]["cryptoConfidence"]) ?? "Low",
      keyWatchItems: toStringArray((telemetry as Record<string, unknown>).keyWatchItems),
      structuralThemeIds: toStringArray((telemetry as Record<string, unknown>).structuralThemeIds),
      tacticalThemeIds: toStringArray((telemetry as Record<string, unknown>).tacticalThemeIds),
      structuralThemes: toStringArray((telemetry as Record<string, unknown>).structuralThemes),
      tacticalThemes: toStringArray((telemetry as Record<string, unknown>).tacticalThemes),
      evidenceGaps: toStringArray((telemetry as Record<string, unknown>).evidenceGaps),
      portfolioRelevance: mapRelevance(telemetryRelevance)
    }
  };
}

function mapReport(row: any): MarketVisionReport {
  const summary = row.classification_summary ?? {};
  return {
    id: row.id,
    reportDate: row.report_date,
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    title: row.title,
    executiveSummary: row.executive_summary ?? "",
    globalMarketSummary: row.global_market_summary ?? "",
    equityView: row.equity_view ?? "",
    bondView: row.bond_view ?? "",
    goldView: row.gold_view ?? "",
    cryptoView: row.crypto_view ?? "",
    ratesView: row.rates_view ?? "",
    inflationView: row.inflation_view ?? "",
    growthView: row.growth_view ?? "",
    employmentView: row.employment_view ?? "",
    currencyView: row.currency_view ?? "",
    geopoliticalRiskView: row.geopolitical_risk_view ?? "",
    opportunities: toStringArray(row.opportunities),
    risks: toStringArray(row.risks),
    portfolioImplications: mapPortfolioImplications(row.portfolio_implications),
    classificationSummary: {
      shortTermNoise: Number(summary.shortTermNoise ?? summary.short_term_noise ?? 0),
      mediumTermThemes: Number(summary.mediumTermThemes ?? summary.medium_term_themes ?? 0),
      structuralLongTermShifts: Number(summary.structuralLongTermShifts ?? summary.structural_long_term_shifts ?? 0)
    },
    sourceType: row.source_type,
    status: row.status,
    confidenceScore: row.confidence_score == null ? null : Number(row.confidence_score),
    modelUsed: row.model_used ?? null,
    promptVersion: row.prompt_version ?? null,
    tokenUsage: row.token_usage ?? {},
    costEstimate: row.cost_estimate == null ? null : Number(row.cost_estimate),
    sourceSnapshot: row.source_snapshot ?? {},
    marketVisionMetadata: mapMarketVisionMetadata(row.market_vision_metadata),
    generationDurationMs: row.generation_duration_ms == null ? null : Number(row.generation_duration_ms),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGenerationLog(row: any): MarketVisionGenerationLog {
  return {
    id: row.id,
    reportId: row.report_id ?? null,
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
    status: row.status,
    modelUsed: row.model_used ?? null,
    promptVersion: row.prompt_version ?? null,
    tokenUsage: row.token_usage ?? {},
    costEstimate: row.cost_estimate == null ? null : Number(row.cost_estimate),
    errorMessage: row.error_message ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

function mapMacroIndicator(row: any): MacroIndicator {
  return {
    id: row.id,
    indicatorCode: row.indicator_code,
    indicatorName: row.indicator_name,
    sourceProvider: row.source_provider,
    latestValue: row.latest_value == null ? null : Number(row.latest_value),
    previousValue: row.previous_value == null ? null : Number(row.previous_value),
    changeValue: row.change_value == null ? null : Number(row.change_value),
    changePercent: row.change_percent == null ? null : Number(row.change_percent),
    observationDate: row.observation_date,
    category: row.category,
    unit: row.unit,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapThemeEvent(row: any): MarketThemeEvent {
  return {
    id: row.id,
    reportId: row.report_id,
    title: row.title,
    description: row.description ?? "",
    themeCategory: row.theme_category,
    affectedAssetClasses: toStringArray(row.affected_asset_classes),
    affectedSectors: toStringArray(row.affected_sectors),
    affectedThemes: toStringArray(row.affected_themes),
    severityScore: Number(row.severity_score ?? 0),
    persistenceScore: Number(row.persistence_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    classification: row.classification,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function reportPayload(input: UpsertMarketVisionReportInput) {
  const payload = {
    id: input.id,
    report_date: input.reportDate,
    report_period_start: input.reportPeriodStart,
    report_period_end: input.reportPeriodEnd,
    title: input.title,
    executive_summary: input.executiveSummary,
    global_market_summary: input.globalMarketSummary,
    equity_view: input.equityView,
    bond_view: input.bondView,
    gold_view: input.goldView,
    crypto_view: input.cryptoView,
    rates_view: input.ratesView,
    inflation_view: input.inflationView,
    growth_view: input.growthView,
    employment_view: input.employmentView,
    currency_view: input.currencyView,
    geopolitical_risk_view: input.geopoliticalRiskView,
    opportunities: input.opportunities,
    risks: input.risks,
    portfolio_implications: input.portfolioImplications,
    classification_summary: input.classificationSummary,
    source_type: input.sourceType,
    status: input.status,
    confidence_score: input.confidenceScore,
    model_used: input.modelUsed,
    prompt_version: input.promptVersion,
    token_usage: input.tokenUsage,
    cost_estimate: input.costEstimate,
    source_snapshot: input.sourceSnapshot,
    market_vision_metadata: input.marketVisionMetadata,
    generation_duration_ms: input.generationDurationMs
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export class SupabaseMarketVisionRepository implements MarketVisionRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listReports(limit = 20) {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db
        .from("market_vision_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(limit)
    );
    if (isMissingMarketVisionTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapReport);
  }

  async getReportById(reportId: string) {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db.from("market_vision_reports").select("*").eq("id", reportId).maybeSingle()
    );
    if (isMissingMarketVisionTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapReport(data) : null;
  }

  async getLatestPublishedReport() {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db
        .from("market_vision_reports")
        .select("*")
        .eq("status", "published")
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (isMissingMarketVisionTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapReport(data) : null;
  }

  async findGeneratedReportForPeriod(periodStart: string, periodEnd: string) {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db
        .from("market_vision_reports")
        .select("*")
        .eq("source_type", "generated")
        .eq("report_period_start", periodStart)
        .eq("report_period_end", periodEnd)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (isMissingMarketVisionTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapReport(data) : null;
  }

  async upsertReport(input: UpsertMarketVisionReportInput) {
    const { data, error } = await this.db
      .from("market_vision_reports")
      .upsert(reportPayload(input), { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapReport(data);
  }

  async updateReportStatus(reportId: string, status: MarketVisionReport["status"]) {
    const { error } = await this.db.from("market_vision_reports").update({ status }).eq("id", reportId);
    if (error) throw new Error(error.message);
  }

  async listMacroIndicators() {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db.from("macro_indicators").select("*").order("category").order("indicator_name")
    );
    if (isMissingMarketVisionTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMacroIndicator);
  }

  async upsertMacroIndicators(input: UpsertMacroIndicatorInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("macro_indicators").upsert(
      input.map((item) => ({
        indicator_code: item.indicatorCode,
        indicator_name: item.indicatorName,
        source_provider: item.sourceProvider,
        latest_value: item.latestValue,
        previous_value: item.previousValue,
        change_value: item.changeValue,
        change_percent: item.changePercent,
        observation_date: item.observationDate,
        category: item.category,
        unit: item.unit,
        metadata: item.metadata
      })),
      { onConflict: "indicator_code,source_provider" }
    );
    if (error) throw new Error(error.message);
  }

  async listThemeEvents(reportId?: string) {
    const runQuery = () => {
      let query = this.db.from("market_theme_events").select("*").order("severity_score", { ascending: false });
      if (reportId) query = query.eq("report_id", reportId);
      return query;
    };
    const { data, error } = await withSupabaseClockSkewRetry(runQuery);
    if (isMissingMarketVisionTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapThemeEvent);
  }

  async upsertThemeEvents(input: UpsertMarketThemeEventInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("market_theme_events").upsert(
      input.map((item) => ({
        id: item.id,
        report_id: item.reportId,
        title: item.title,
        description: item.description,
        theme_category: item.themeCategory,
        affected_asset_classes: item.affectedAssetClasses,
        affected_sectors: item.affectedSectors,
        affected_themes: item.affectedThemes,
        severity_score: item.severityScore,
        persistence_score: item.persistenceScore,
        confidence_score: item.confidenceScore,
        classification: item.classification
      })),
      { onConflict: "id" }
    );
    if (error) throw new Error(error.message);
  }

  async insertGenerationLog(input: InsertMarketVisionGenerationLogInput) {
    const { error } = await this.db.from("market_vision_generation_logs").insert({
      report_id: input.reportId ?? null,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      started_at: input.startedAt,
      completed_at: input.completedAt ?? null,
      status: input.status,
      model_used: input.modelUsed ?? null,
      prompt_version: input.promptVersion ?? null,
      token_usage: input.tokenUsage ?? {},
      cost_estimate: input.costEstimate ?? null,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {}
    });
    if (isMissingMarketVisionTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listGenerationLogs(limit = 20) {
    const { data, error } = await withSupabaseClockSkewRetry(() =>
      this.db
        .from("market_vision_generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
    );
    if (isMissingMarketVisionTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapGenerationLog);
  }
}
