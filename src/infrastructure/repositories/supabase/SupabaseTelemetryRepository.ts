import type {
  CreateTelemetryMarketVisionSnapshotInput,
  CreateTelemetryPortfolioReviewSnapshotInput,
  CreateTelemetryRecommendationSnapshotInput,
  PricePoint,
  TelemetryRepository,
  UpsertTelemetryFactorOutcomeInput,
  UpsertTelemetryRecommendationOutcomeInput
} from "@/application/ports/repositories/TelemetryRepository";
import type {
  RecommendationTelemetrySummaryRow,
  TelemetryDashboard,
  TelemetryFactorOutcome,
  TelemetryMarketVisionSnapshot,
  TelemetryPortfolioReviewSnapshot,
  TelemetryRecommendationOutcome,
  TelemetryRecommendationSnapshot
} from "@/domain/telemetry/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingTelemetryTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.message?.toLowerCase().includes("telemetry_") ||
        error.message?.toLowerCase().includes("schema cache"))
  );
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function mapRecommendationSnapshot(row: any): TelemetryRecommendationSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    userId: row.user_id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    recommendation: row.recommendation,
    recommendationScore: numberOrNull(row.recommendation_score),
    confidenceScore: Number(row.confidence_score ?? 0),
    generatedAt: row.generated_at,
    runId: row.run_id,
    benchmarkSymbol: row.benchmark_symbol,
    priceAtRecommendation: numberOrNull(row.price_at_recommendation),
    priceDate: row.price_date,
    positiveDrivers: toStringArray(row.positive_drivers),
    negativeDrivers: toStringArray(row.negative_drivers),
    factorInputs: toObject(row.factor_inputs),
    componentScores: toUnknownArray(row.component_scores),
    guardrails: toStringArray(row.guardrails),
    createdAt: row.created_at
  };
}

function mapRecommendationOutcome(row: any): TelemetryRecommendationOutcome {
  return {
    id: row.id,
    recommendationSnapshotId: row.recommendation_snapshot_id,
    horizon: row.horizon,
    evaluationDate: row.evaluation_date,
    startPrice: numberOrNull(row.start_price),
    endPrice: numberOrNull(row.end_price),
    assetReturn: numberOrNull(row.asset_return),
    benchmarkReturn: numberOrNull(row.benchmark_return),
    excessReturn: numberOrNull(row.excess_return),
    success: row.success,
    outcomeStatus: row.outcome_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFactorOutcome(row: any): TelemetryFactorOutcome {
  return {
    id: row.id,
    factorName: row.factor_name,
    factorValue: row.factor_value,
    factorDirection: row.factor_direction,
    horizon: row.horizon,
    observationCount: Number(row.observation_count ?? 0),
    averageAssetReturn: numberOrNull(row.average_asset_return),
    averageBenchmarkReturn: numberOrNull(row.average_benchmark_return),
    averageExcessReturn: numberOrNull(row.average_excess_return),
    hitRate: numberOrNull(row.hit_rate),
    confidenceBucket: row.confidence_bucket,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMarketVisionSnapshot(row: any): TelemetryMarketVisionSnapshot {
  return {
    id: row.id,
    reportId: row.report_id,
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    generatedAt: row.generated_at,
    theme: row.theme,
    direction: row.direction,
    confidence: Number(row.confidence ?? 0),
    severity: Number(row.severity ?? 0),
    supportingSignalCount: Number(row.supporting_signal_count ?? 0),
    fredSignalCount: Number(row.fred_signal_count ?? 0),
    newsSignalCount: Number(row.news_signal_count ?? 0),
    proxySymbol: row.proxy_symbol,
    createdAt: row.created_at
  };
}

function mapPortfolioReviewSnapshot(row: any): TelemetryPortfolioReviewSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    userId: row.user_id,
    reviewId: row.review_id,
    generatedAt: row.generated_at,
    portfolioScore: numberOrNull(row.portfolio_score),
    diversificationScore: numberOrNull(row.diversification_score),
    concentrationScore: numberOrNull(row.concentration_score),
    riskScore: numberOrNull(row.risk_score),
    fixedIncomeScore: numberOrNull(row.fixed_income_score),
    macroFitScore: numberOrNull(row.macro_fit_score),
    themeExposureSummary: toObject(row.theme_exposure_summary),
    topRisks: toUnknownArray(row.top_risks),
    improvementSuggestions: toUnknownArray(row.improvement_suggestions),
    allocationSnapshot: toObject(row.allocation_snapshot),
    lookthroughSnapshot: toObject(row.lookthrough_snapshot),
    createdAt: row.created_at
  };
}

export class SupabaseTelemetryRepository implements TelemetryRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async createRecommendationSnapshots(input: CreateTelemetryRecommendationSnapshotInput[]) {
    if (input.length === 0) return [];
    const { data, error } = await this.db.from("telemetry_recommendation_snapshots").insert(input.map((item) => ({
      portfolio_id: item.portfolioId,
      user_id: item.userId,
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      recommendation: item.recommendation,
      recommendation_score: item.recommendationScore,
      confidence_score: item.confidenceScore,
      generated_at: item.generatedAt,
      run_id: item.runId,
      benchmark_symbol: item.benchmarkSymbol,
      price_at_recommendation: item.priceAtRecommendation,
      price_date: item.priceDate,
      positive_drivers: item.positiveDrivers,
      negative_drivers: item.negativeDrivers,
      factor_inputs: item.factorInputs,
      component_scores: item.componentScores,
      guardrails: item.guardrails
    }))).select("*");
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRecommendationSnapshot);
  }

  async createMarketVisionSnapshots(input: CreateTelemetryMarketVisionSnapshotInput[]) {
    if (input.length === 0) return [];
    const { data, error } = await this.db.from("telemetry_market_vision_snapshots").insert(input.map((item) => ({
      report_id: item.reportId,
      report_period_start: item.reportPeriodStart,
      report_period_end: item.reportPeriodEnd,
      generated_at: item.generatedAt,
      theme: item.theme,
      direction: item.direction,
      confidence: item.confidence,
      severity: item.severity,
      supporting_signal_count: item.supportingSignalCount,
      fred_signal_count: item.fredSignalCount,
      news_signal_count: item.newsSignalCount,
      proxy_symbol: item.proxySymbol
    }))).select("*");
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMarketVisionSnapshot);
  }

  async createPortfolioReviewSnapshot(input: CreateTelemetryPortfolioReviewSnapshotInput) {
    const { data, error } = await this.db.from("telemetry_portfolio_review_snapshots").insert({
      portfolio_id: input.portfolioId,
      user_id: input.userId,
      review_id: input.reviewId,
      generated_at: input.generatedAt,
      portfolio_score: input.portfolioScore,
      diversification_score: input.diversificationScore,
      concentration_score: input.concentrationScore,
      risk_score: input.riskScore,
      fixed_income_score: input.fixedIncomeScore,
      macro_fit_score: input.macroFitScore,
      theme_exposure_summary: input.themeExposureSummary,
      top_risks: input.topRisks,
      improvement_suggestions: input.improvementSuggestions,
      allocation_snapshot: input.allocationSnapshot,
      lookthrough_snapshot: input.lookthroughSnapshot
    }).select("*").maybeSingle();
    if (isMissingTelemetryTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapPortfolioReviewSnapshot(data) : null;
  }

  async listRecommendationSnapshots(limit = 500) {
    const { data, error } = await this.db
      .from("telemetry_recommendation_snapshots")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(limit);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRecommendationSnapshot);
  }

  async listMaturedRecommendationSnapshots(asOfDate: string, horizons: Array<"1m" | "3m" | "6m" | "12m">) {
    const snapshots = await this.listRecommendationSnapshots(2000);
    return snapshots.filter((snapshot) => horizons.some((horizon) => isMatured(snapshot.generatedAt.slice(0, 10), asOfDate, horizon)));
  }

  async listRecommendationOutcomes() {
    const { data, error } = await this.db
      .from("telemetry_recommendation_outcomes")
      .select("*")
      .order("evaluation_date", { ascending: false })
      .limit(5000);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRecommendationOutcome);
  }

  async upsertRecommendationOutcomes(input: UpsertTelemetryRecommendationOutcomeInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("telemetry_recommendation_outcomes").upsert(input.map((item) => ({
      recommendation_snapshot_id: item.recommendationSnapshotId,
      horizon: item.horizon,
      evaluation_date: item.evaluationDate,
      start_price: item.startPrice,
      end_price: item.endPrice,
      asset_return: item.assetReturn,
      benchmark_return: item.benchmarkReturn,
      excess_return: item.excessReturn,
      success: item.success,
      outcome_status: item.outcomeStatus
    })), { onConflict: "recommendation_snapshot_id,horizon" });
    if (isMissingTelemetryTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertFactorOutcomes(input: UpsertTelemetryFactorOutcomeInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("telemetry_factor_outcomes").upsert(input.map((item) => ({
      factor_name: item.factorName,
      factor_value: item.factorValue,
      factor_direction: item.factorDirection,
      horizon: item.horizon,
      observation_count: item.observationCount,
      average_asset_return: item.averageAssetReturn,
      average_benchmark_return: item.averageBenchmarkReturn,
      average_excess_return: item.averageExcessReturn,
      hit_rate: item.hitRate,
      confidence_bucket: item.confidenceBucket
    })), { onConflict: "factor_name,factor_value,factor_direction,horizon" });
    if (isMissingTelemetryTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listFactorOutcomes(limit = 100) {
    const { data, error } = await this.db
      .from("telemetry_factor_outcomes")
      .select("*")
      .order("observation_count", { ascending: false })
      .order("average_excess_return", { ascending: false })
      .limit(limit);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFactorOutcome);
  }

  async listMarketVisionSnapshots(limit = 100) {
    const { data, error } = await this.db.from("telemetry_market_vision_snapshots").select("*").order("generated_at", { ascending: false }).limit(limit);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMarketVisionSnapshot);
  }

  async listPortfolioReviewSnapshots(limit = 100) {
    const { data, error } = await this.db.from("telemetry_portfolio_review_snapshots").select("*").order("generated_at", { ascending: false }).limit(limit);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPortfolioReviewSnapshot);
  }

  async getInstrumentPriceOnOrAfter(instrumentId: string, targetDate: string) {
    const { data, error } = await this.db
      .from("instrument_prices")
      .select("price_date,close_price")
      .eq("instrument_id", instrumentId)
      .gte("price_date", targetDate)
      .gt("close_price", 0)
      .order("price_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data ? mapPricePoint(data) : null;
  }

  async getInstrumentPriceOnOrBefore(instrumentId: string, targetDate: string) {
    const { data, error } = await this.db
      .from("instrument_prices")
      .select("price_date,close_price")
      .eq("instrument_id", instrumentId)
      .lte("price_date", targetDate)
      .gt("close_price", 0)
      .order("price_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data ? mapPricePoint(data) : null;
  }

  async getBenchmarkPriceOnOrAfter(symbol: string, targetDate: string) {
    return this.getBenchmarkPrice(symbol, targetDate, "after");
  }

  async getBenchmarkPriceOnOrBefore(symbol: string, targetDate: string) {
    return this.getBenchmarkPrice(symbol, targetDate, "before");
  }

  async getDashboard(): Promise<TelemetryDashboard> {
    const [snapshots, outcomes, factors, marketVisionSnapshots, portfolioReviewSnapshots] = await Promise.all([
      this.listRecommendationSnapshots(2000),
      this.listRecommendationOutcomes(),
      this.listFactorOutcomes(100),
      this.listMarketVisionSnapshots(50),
      this.listPortfolioReviewSnapshots(50)
    ]);
    const evaluated = outcomes.filter((item) => item.outcomeStatus === "evaluated");
    const latestEvaluationDate = outcomes.map((item) => item.evaluationDate).sort().at(-1) ?? null;
    return {
      overview: {
        recommendationSnapshots: snapshots.length,
        recommendationOutcomes: outcomes.length,
        evaluatedOutcomes: evaluated.length,
        pendingOutcomes: outcomes.filter((item) => item.outcomeStatus === "pending").length,
        marketVisionSnapshots: marketVisionSnapshots.length,
        portfolioReviewSnapshots: portfolioReviewSnapshots.length,
        latestEvaluationDate
      },
      recommendationSummary: summarizeRecommendations(snapshots, outcomes),
      factorOutcomes: factors,
      marketVisionSnapshots,
      portfolioReviewSnapshots
    };
  }

  private async getBenchmarkPrice(symbol: string, targetDate: string, direction: "after" | "before"): Promise<PricePoint | null> {
    let query = this.db
      .from("benchmark_snapshots")
      .select("snapshot_date,close_price,level_value,benchmarks!inner(symbol)")
      .eq("benchmarks.symbol", symbol);
    query = direction === "after"
      ? query.gte("snapshot_date", targetDate).order("snapshot_date", { ascending: true })
      : query.lte("snapshot_date", targetDate).order("snapshot_date", { ascending: false });
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return null;
    if (!data) return null;
    return {
      date: data.snapshot_date,
      closePrice: Number(data.close_price ?? data.level_value)
    };
  }
}

function mapPricePoint(row: any): PricePoint {
  return {
    date: row.price_date,
    closePrice: Number(row.close_price)
  };
}

function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + months);
  return parsed.toISOString().slice(0, 10);
}

function horizonMonths(horizon: string) {
  if (horizon === "1m") return 1;
  if (horizon === "3m") return 3;
  if (horizon === "6m") return 6;
  return 12;
}

function isMatured(startDate: string, asOfDate: string, horizon: string) {
  return addMonths(startDate, horizonMonths(horizon)) <= asOfDate;
}

function summarizeRecommendations(
  snapshots: TelemetryRecommendationSnapshot[],
  outcomes: TelemetryRecommendationOutcome[]
): RecommendationTelemetrySummaryRow[] {
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const groups = new Map<string, TelemetryRecommendationOutcome[]>();
  for (const outcome of outcomes) {
    const snapshot = snapshotById.get(outcome.recommendationSnapshotId);
    if (!snapshot) continue;
    const key = `${snapshot.recommendation}|${outcome.horizon}`;
    groups.set(key, [...(groups.get(key) ?? []), outcome]);
  }
  return Array.from(groups.entries()).map(([key, rows]) => {
    const [recommendation, horizon] = key.split("|") as [string, any];
    const evaluated = rows.filter((row) => row.outcomeStatus === "evaluated");
    const average = (values: Array<number | null>) => {
      const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      return numeric.length === 0 ? null : numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    };
    return {
      recommendation,
      horizon,
      observationCount: rows.length,
      evaluatedCount: evaluated.length,
      hitRate: evaluated.length === 0 ? null : evaluated.filter((row) => row.success).length / evaluated.length,
      averageAssetReturn: average(evaluated.map((row) => row.assetReturn)),
      averageBenchmarkReturn: average(evaluated.map((row) => row.benchmarkReturn)),
      averageExcessReturn: average(evaluated.map((row) => row.excessReturn))
    };
  }).sort((a, b) => a.recommendation.localeCompare(b.recommendation) || a.horizon.localeCompare(b.horizon));
}
