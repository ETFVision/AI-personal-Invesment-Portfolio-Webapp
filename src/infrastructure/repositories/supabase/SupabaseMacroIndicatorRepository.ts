import type {
  InsertMacroIngestionLogInput,
  MacroIndicatorRepository,
  UpsertMacroObservationInput,
  UpsertMacroRegimeSnapshotInput,
  UpsertMacroThemeSignalInput,
  UpsertMacroTrendInput
} from "@/application/ports/repositories/MacroIndicatorRepository";
import type {
  MacroIndicatorDefinition,
  MacroIngestionLog,
  MacroObservation,
  MacroRegimeSnapshot,
  MacroThemeSignal,
  MacroTrend
} from "@/domain/macro/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function toNumber(value: unknown) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function missing(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(error && (error.code === "42P01" || message.includes("macro_")));
}

function mapIndicator(row: any): MacroIndicatorDefinition {
  return {
    id: row.id,
    indicatorCode: row.indicator_code,
    indicatorName: row.indicator_name,
    sourceProvider: row.source_provider,
    category: row.category,
    unit: row.unit,
    frequency: row.frequency,
    description: row.description,
    isActive: Boolean(row.is_active),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapObservation(row: any): MacroObservation {
  return {
    id: row.id,
    indicatorId: row.indicator_id,
    observationDate: row.observation_date,
    value: toNumber(row.value),
    sourceProvider: row.source_provider,
    providerMetadata: row.provider_metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTrend(row: any): MacroTrend {
  return {
    id: row.id,
    indicatorId: row.indicator_id,
    asOfDate: row.as_of_date,
    latestValue: toNumber(row.latest_value),
    previousValue: toNumber(row.previous_value),
    changeValue: toNumber(row.change_value),
    changePercent: toNumber(row.change_percent),
    oneMonthChange: toNumber(row.one_month_change),
    threeMonthChange: toNumber(row.three_month_change),
    sixMonthChange: toNumber(row.six_month_change),
    oneYearChange: toNumber(row.one_year_change),
    direction: row.direction,
    acceleration: row.acceleration,
    persistenceScore: Number(row.persistence_score ?? 0),
    severityScore: Number(row.severity_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRegime(row: any): MacroRegimeSnapshot {
  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    ratesRegime: row.rates_regime,
    inflationRegime: row.inflation_regime,
    growthRegime: row.growth_regime,
    employmentRegime: row.employment_regime,
    yieldCurveRegime: row.yield_curve_regime,
    liquidityRegime: row.liquidity_regime,
    dollarRegime: row.dollar_regime,
    commoditiesRegime: row.commodities_regime,
    overallMacroSummary: row.overall_macro_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMacroThemeSignal(row: any): MacroThemeSignal {
  return {
    id: row.id,
    signalDate: row.signal_date,
    sourceProvider: row.source_provider,
    sourceIndicatorCode: row.source_indicator_code,
    theme: row.theme,
    themeCategory: row.theme_category,
    direction: row.direction,
    regimeLabel: row.regime_label,
    severityScore: Number(row.severity_score ?? 0),
    persistenceScore: Number(row.persistence_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    explanation: row.explanation ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLog(row: any): MacroIngestionLog {
  return {
    id: row.id,
    jobName: row.job_name,
    sourceProvider: row.source_provider,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    indicatorsRequested: Number(row.indicators_requested ?? 0),
    indicatorsSuccessful: Number(row.indicators_successful ?? 0),
    indicatorsFailed: Number(row.indicators_failed ?? 0),
    observationsInserted: Number(row.observations_inserted ?? 0),
    observationsUpdated: Number(row.observations_updated ?? 0),
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

export class SupabaseMacroIndicatorRepository implements MacroIndicatorRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listIndicators(filters?: { isActive?: boolean; sourceProvider?: string }) {
    let query = this.db.from("macro_indicators").select("*").order("category").order("indicator_code");
    if (filters?.isActive !== undefined) query = query.eq("is_active", filters.isActive);
    if (filters?.sourceProvider) query = query.eq("source_provider", filters.sourceProvider);
    const { data, error } = await query;
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapIndicator);
  }

  async listObservations(indicatorId: string, limit = 260) {
    const { data, error } = await this.db
      .from("macro_observations")
      .select("*")
      .eq("indicator_id", indicatorId)
      .order("observation_date", { ascending: false })
      .limit(limit);
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapObservation).reverse();
  }

  async listObservationsForIndicators(indicatorIds: string[], limitPerIndicator = 260) {
    const output = new Map<string, MacroObservation[]>();
    for (const indicatorId of indicatorIds) {
      output.set(indicatorId, await this.listObservations(indicatorId, limitPerIndicator));
    }
    return output;
  }

  async upsertObservations(input: UpsertMacroObservationInput[]) {
    if (input.length === 0) return { inserted: 0, updated: 0 };
    const existing = await this.listObservationsForIndicators(Array.from(new Set(input.map((item) => item.indicatorId))), 5000);
    const existingKeys = new Set(Array.from(existing.values()).flat().map((item) => `${item.indicatorId}|${item.observationDate}`));
    const inserted = input.filter((item) => !existingKeys.has(`${item.indicatorId}|${item.observationDate}`)).length;
    const updated = input.length - inserted;
    const { error } = await this.db.from("macro_observations").upsert(
      input.map((item) => ({
        indicator_id: item.indicatorId,
        observation_date: item.observationDate,
        value: item.value,
        source_provider: item.sourceProvider,
        provider_metadata: item.providerMetadata
      })),
      { onConflict: "indicator_id,observation_date" }
    );
    if (error) throw new Error(error.message);
    return { inserted, updated };
  }

  async upsertTrend(input: UpsertMacroTrendInput) {
    const { data, error } = await this.db.from("macro_trends").upsert({
      indicator_id: input.indicatorId,
      as_of_date: input.asOfDate,
      latest_value: input.latestValue,
      previous_value: input.previousValue,
      change_value: input.changeValue,
      change_percent: input.changePercent,
      one_month_change: input.oneMonthChange,
      three_month_change: input.threeMonthChange,
      six_month_change: input.sixMonthChange,
      one_year_change: input.oneYearChange,
      direction: input.direction,
      acceleration: input.acceleration,
      persistence_score: input.persistenceScore,
      severity_score: input.severityScore,
      confidence_score: input.confidenceScore
    }, { onConflict: "indicator_id,as_of_date" }).select("*").single();
    if (error) throw new Error(error.message);
    return mapTrend(data);
  }

  async listLatestTrends(indicatorIds?: string[]) {
    let query = this.db.from("macro_trends").select("*").order("as_of_date", { ascending: false });
    if (indicatorIds?.length) query = query.in("indicator_id", indicatorIds);
    const { data, error } = await query.limit(500);
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    const byIndicator = new Map<string, MacroTrend>();
    for (const row of (data ?? []).map(mapTrend)) {
      if (!byIndicator.has(row.indicatorId)) byIndicator.set(row.indicatorId, row);
    }
    return Array.from(byIndicator.values());
  }

  async upsertRegimeSnapshot(input: UpsertMacroRegimeSnapshotInput) {
    const { data, error } = await this.db.from("macro_regime_snapshots").upsert({
      snapshot_date: input.snapshotDate,
      rates_regime: input.ratesRegime,
      inflation_regime: input.inflationRegime,
      growth_regime: input.growthRegime,
      employment_regime: input.employmentRegime,
      yield_curve_regime: input.yieldCurveRegime,
      liquidity_regime: input.liquidityRegime,
      dollar_regime: input.dollarRegime,
      commodities_regime: input.commoditiesRegime,
      overall_macro_summary: input.overallMacroSummary
    }, { onConflict: "snapshot_date" }).select("*").single();
    if (error) throw new Error(error.message);
    return mapRegime(data);
  }

  async getLatestRegimeSnapshot() {
    const { data, error } = await this.db
      .from("macro_regime_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (missing(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapRegime(data) : null;
  }

  async upsertMacroThemeSignals(input: UpsertMacroThemeSignalInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("macro_theme_signals").upsert(
      input.map((item) => ({
        signal_date: item.signalDate,
        source_provider: item.sourceProvider,
        source_indicator_code: item.sourceIndicatorCode,
        theme: item.theme,
        theme_category: item.themeCategory,
        direction: item.direction,
        regime_label: item.regimeLabel,
        severity_score: item.severityScore,
        persistence_score: item.persistenceScore,
        confidence_score: item.confidenceScore,
        explanation: item.explanation
      })),
      { onConflict: "signal_date,source_provider,source_indicator_code,theme" }
    );
    if (missing(error)) return;
    if (error) throw new Error(error.message);
  }

  async listMacroThemeSignalsForPeriod(periodStart: string, periodEnd: string) {
    const { data, error } = await this.db
      .from("macro_theme_signals")
      .select("*")
      .gte("signal_date", periodStart)
      .lte("signal_date", periodEnd)
      .order("signal_date", { ascending: false });
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMacroThemeSignal);
  }

  async insertIngestionLog(input: InsertMacroIngestionLogInput) {
    const { error } = await this.db.from("macro_ingestion_logs").insert({
      job_name: input.jobName,
      source_provider: input.sourceProvider,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: input.status,
      indicators_requested: input.indicatorsRequested,
      indicators_successful: input.indicatorsSuccessful,
      indicators_failed: input.indicatorsFailed,
      observations_inserted: input.observationsInserted,
      observations_updated: input.observationsUpdated,
      error_message: input.errorMessage,
      metadata: input.metadata
    });
    if (error) throw new Error(error.message);
  }

  async listIngestionLogs(limit = 10) {
    const { data, error } = await this.db.from("macro_ingestion_logs").select("*").order("started_at", { ascending: false }).limit(limit);
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLog);
  }

  async getDashboard() {
    const [indicators, trends, latestRegime, logs] = await Promise.all([
      this.listIndicators({ sourceProvider: "fred" }),
      this.listLatestTrends(),
      this.getLatestRegimeSnapshot(),
      this.listIngestionLogs(8)
    ]);
    const trendByIndicator = new Map(trends.map((trend) => [trend.indicatorId, trend]));
    const observationsByIndicator = await this.listObservationsForIndicators(indicators.map((item) => item.id), 120);
    return {
      indicators: indicators.map((indicator) => {
        const observations = observationsByIndicator.get(indicator.id) ?? [];
        return {
          ...indicator,
          latestTrend: trendByIndicator.get(indicator.id) ?? null,
          latestObservation: observations.at(-1) ?? null,
          observations
        };
      }),
      latestRegime,
      ingestionLogs: logs
    };
  }
}
