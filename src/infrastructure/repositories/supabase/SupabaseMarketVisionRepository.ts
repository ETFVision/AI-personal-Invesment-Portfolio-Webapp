import type {
  MacroIndicator,
  MarketThemeEvent,
  MarketVisionReport,
  PortfolioImplications
} from "@/domain/marketVision/types";
import type {
  MarketVisionRepository,
  UpsertMacroIndicatorInput,
  UpsertMarketThemeEventInput,
  UpsertMarketVisionReportInput
} from "@/application/ports/repositories/MarketVisionRepository";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingMarketVisionTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.message?.toLowerCase().includes("market_vision")));
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    currency_view: input.currencyView,
    geopolitical_risk_view: input.geopoliticalRiskView,
    opportunities: input.opportunities,
    risks: input.risks,
    portfolio_implications: input.portfolioImplications,
    classification_summary: {},
    source_type: input.sourceType,
    status: input.status
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export class SupabaseMarketVisionRepository implements MarketVisionRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listReports(limit = 20) {
    const { data, error } = await this.db
      .from("market_vision_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(limit);
    if (isMissingMarketVisionTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapReport);
  }

  async getReportById(reportId: string) {
    const { data, error } = await this.db.from("market_vision_reports").select("*").eq("id", reportId).maybeSingle();
    if (isMissingMarketVisionTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapReport(data) : null;
  }

  async getLatestPublishedReport() {
    const { data, error } = await this.db
      .from("market_vision_reports")
      .select("*")
      .eq("status", "published")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle();
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
    const { data, error } = await this.db.from("macro_indicators").select("*").order("category").order("indicator_name");
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
    let query = this.db.from("market_theme_events").select("*").order("severity_score", { ascending: false });
    if (reportId) query = query.eq("report_id", reportId);
    const { data, error } = await query;
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
}
