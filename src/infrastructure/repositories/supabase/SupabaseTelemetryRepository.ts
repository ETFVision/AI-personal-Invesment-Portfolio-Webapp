import type {
  CreateTelemetryMarketVisionSnapshotInput,
  CreateTelemetryPortfolioReviewSnapshotInput,
  CreateTelemetryRecommendationSnapshotInput,
  PricePoint,
  PortfolioValuePoint,
  TelemetryRepository,
  UpsertTelemetryFactorOutcomeInput,
  UpsertTelemetryMarketVisionOutcomeInput,
  UpsertTelemetryPortfolioReviewOutcomeInput,
  UpsertTelemetryRecommendationOutcomeInput
} from "@/application/ports/repositories/TelemetryRepository";
import type {
  ConfidenceCalibrationRow,
  RecommendationTelemetrySummaryRow,
  TelemetryDashboard,
  TelemetryFactorOutcome,
  TelemetryMarketVisionOutcome,
  TelemetryMarketVisionSnapshot,
  TelemetryPortfolioReviewOutcome,
  TelemetryPortfolioReviewSnapshot,
  TelemetryRecommendationOutcome,
  TelemetryRecommendationSnapshot,
  TelemetryCoverageMetrics
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

function mapMarketVisionOutcome(row: any): TelemetryMarketVisionOutcome {
  return {
    id: row.id,
    marketVisionSnapshotId: row.market_vision_snapshot_id,
    horizon: row.horizon,
    evaluationDate: row.evaluation_date,
    proxySymbol: row.proxy_symbol,
    proxyReturn: numberOrNull(row.proxy_return),
    benchmarkReturn: numberOrNull(row.benchmark_return),
    excessReturn: numberOrNull(row.excess_return),
    success: row.success,
    outcomeStatus: row.outcome_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPortfolioReviewOutcome(row: any): TelemetryPortfolioReviewOutcome {
  return {
    id: row.id,
    portfolioReviewSnapshotId: row.portfolio_review_snapshot_id,
    horizon: row.horizon,
    evaluationDate: row.evaluation_date,
    portfolioReturn: numberOrNull(row.portfolio_return),
    benchmarkReturn: numberOrNull(row.benchmark_return),
    excessReturn: numberOrNull(row.excess_return),
    volatilityChange: numberOrNull(row.volatility_change),
    drawdownChange: numberOrNull(row.drawdown_change),
    diversificationScoreChange: numberOrNull(row.diversification_score_change),
    concentrationScoreChange: numberOrNull(row.concentration_score_change),
    riskScoreChange: numberOrNull(row.risk_score_change),
    portfolioScoreChange: numberOrNull(row.portfolio_score_change),
    effectivenessClassification: row.effectiveness_classification,
    outcomeStatus: row.outcome_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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

  async listMarketVisionOutcomes() {
    const { data, error } = await this.db
      .from("telemetry_market_vision_outcomes")
      .select("*")
      .order("evaluation_date", { ascending: false })
      .limit(5000);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMarketVisionOutcome);
  }

  async upsertMarketVisionOutcomes(input: UpsertTelemetryMarketVisionOutcomeInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("telemetry_market_vision_outcomes").upsert(input.map((item) => ({
      market_vision_snapshot_id: item.marketVisionSnapshotId,
      horizon: item.horizon,
      evaluation_date: item.evaluationDate,
      proxy_symbol: item.proxySymbol,
      proxy_return: item.proxyReturn,
      benchmark_return: item.benchmarkReturn,
      excess_return: item.excessReturn,
      success: item.success,
      outcome_status: item.outcomeStatus
    })), { onConflict: "market_vision_snapshot_id,horizon" });
    if (isMissingTelemetryTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listPortfolioReviewSnapshots(limit = 100) {
    const { data, error } = await this.db.from("telemetry_portfolio_review_snapshots").select("*").order("generated_at", { ascending: false }).limit(limit);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPortfolioReviewSnapshot);
  }

  async listPortfolioReviewOutcomes() {
    const { data, error } = await this.db
      .from("telemetry_portfolio_review_outcomes")
      .select("*")
      .order("evaluation_date", { ascending: false })
      .limit(5000);
    if (isMissingTelemetryTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPortfolioReviewOutcome);
  }

  async upsertPortfolioReviewOutcomes(input: UpsertTelemetryPortfolioReviewOutcomeInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("telemetry_portfolio_review_outcomes").upsert(input.map((item) => ({
      portfolio_review_snapshot_id: item.portfolioReviewSnapshotId,
      horizon: item.horizon,
      evaluation_date: item.evaluationDate,
      portfolio_return: item.portfolioReturn,
      benchmark_return: item.benchmarkReturn,
      excess_return: item.excessReturn,
      volatility_change: item.volatilityChange,
      drawdown_change: item.drawdownChange,
      diversification_score_change: item.diversificationScoreChange,
      concentration_score_change: item.concentrationScoreChange,
      risk_score_change: item.riskScoreChange,
      portfolio_score_change: item.portfolioScoreChange,
      effectiveness_classification: item.effectivenessClassification,
      outcome_status: item.outcomeStatus
    })), { onConflict: "portfolio_review_snapshot_id,horizon" });
    if (isMissingTelemetryTable(error)) return;
    if (error) throw new Error(error.message);
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

  async getInstrumentPriceBySymbolOnOrAfter(symbol: string, targetDate: string) {
    return this.getInstrumentPriceBySymbol(symbol, targetDate, "after");
  }

  async getInstrumentPriceBySymbolOnOrBefore(symbol: string, targetDate: string) {
    return this.getInstrumentPriceBySymbol(symbol, targetDate, "before");
  }

  async getPortfolioValueOnOrAfter(portfolioId: string, targetDate: string) {
    return this.getPortfolioValue(portfolioId, targetDate, "after");
  }

  async getPortfolioValueOnOrBefore(portfolioId: string, targetDate: string) {
    return this.getPortfolioValue(portfolioId, targetDate, "before");
  }

  async getBenchmarkPriceOnOrAfter(symbol: string, targetDate: string) {
    return this.getBenchmarkPrice(symbol, targetDate, "after");
  }

  async getBenchmarkPriceOnOrBefore(symbol: string, targetDate: string) {
    return this.getBenchmarkPrice(symbol, targetDate, "before");
  }

  async getDashboard(): Promise<TelemetryDashboard> {
    const [snapshots, outcomes, factors, marketVisionSnapshots, marketVisionOutcomes, portfolioReviewSnapshots, portfolioReviewOutcomes] = await Promise.all([
      this.listRecommendationSnapshots(2000),
      this.listRecommendationOutcomes(),
      this.listFactorOutcomes(100),
      this.listMarketVisionSnapshots(50),
      this.listMarketVisionOutcomes(),
      this.listPortfolioReviewSnapshots(50),
      this.listPortfolioReviewOutcomes()
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
        latestEvaluationDate,
        coverage: calculateCoverage(snapshots, outcomes, marketVisionSnapshots, marketVisionOutcomes, portfolioReviewSnapshots, portfolioReviewOutcomes)
      },
      recommendationSummary: summarizeRecommendations(snapshots, outcomes),
      factorOutcomes: factors,
      bestFactors: factors.filter((item) => item.observationCount >= 10 && item.averageExcessReturn != null).slice().sort((a, b) => (b.averageExcessReturn ?? -Infinity) - (a.averageExcessReturn ?? -Infinity)).slice(0, 10),
      worstFactors: factors.filter((item) => item.observationCount >= 10 && item.averageExcessReturn != null).slice().sort((a, b) => (a.averageExcessReturn ?? Infinity) - (b.averageExcessReturn ?? Infinity)).slice(0, 10),
      confidenceCalibration: summarizeConfidenceCalibration(snapshots, outcomes),
      marketVisionOutcomes,
      portfolioReviewOutcomes,
      marketVisionSnapshots,
      portfolioReviewSnapshots
    };
  }

  private async getInstrumentPriceBySymbol(symbol: string, targetDate: string, direction: "after" | "before"): Promise<PricePoint | null> {
    let query = this.db
      .from("instrument_prices")
      .select("price_date,close_price,instruments!inner(symbol)")
      .eq("instruments.symbol", symbol.toUpperCase())
      .gt("close_price", 0);
    query = direction === "after"
      ? query.gte("price_date", targetDate).order("price_date", { ascending: true })
      : query.lte("price_date", targetDate).order("price_date", { ascending: false });
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return null;
    return data ? mapPricePoint(data) : null;
  }

  private async getPortfolioValue(portfolioId: string, targetDate: string, direction: "after" | "before"): Promise<PortfolioValuePoint | null> {
    let query = this.db
      .from("portfolio_snapshots")
      .select("snapshot_date,total_value")
      .eq("portfolio_id", portfolioId)
      .gt("total_value", 0);
    query = direction === "after"
      ? query.gte("snapshot_date", targetDate).order("snapshot_date", { ascending: true })
      : query.lte("snapshot_date", targetDate).order("snapshot_date", { ascending: false });
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return null;
    return data ? { date: data.snapshot_date, totalValue: Number(data.total_value) } : null;
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

const telemetryHorizons = ["1m", "3m", "6m", "12m"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function maturedObservationCount(snapshots: Array<{ generatedAt: string }>, asOfDate = today()) {
  return snapshots.reduce((sum, snapshot) => {
    const startDate = snapshot.generatedAt.slice(0, 10);
    return sum + telemetryHorizons.filter((horizon) => isMatured(startDate, asOfDate, horizon)).length;
  }, 0);
}

function coveragePercent(evaluated: number, matured: number) {
  return matured === 0 ? null : evaluated / matured;
}

function calculateCoverage(
  recommendationSnapshots: TelemetryRecommendationSnapshot[],
  recommendationOutcomes: TelemetryRecommendationOutcome[],
  marketVisionSnapshots: TelemetryMarketVisionSnapshot[],
  marketVisionOutcomes: TelemetryMarketVisionOutcome[],
  portfolioReviewSnapshots: TelemetryPortfolioReviewSnapshot[],
  portfolioReviewOutcomes: TelemetryPortfolioReviewOutcome[]
): TelemetryCoverageMetrics {
  const maturedRecommendationObservations = maturedObservationCount(recommendationSnapshots);
  const maturedMarketVisionObservations = maturedObservationCount(marketVisionSnapshots);
  const maturedPortfolioReviewObservations = maturedObservationCount(portfolioReviewSnapshots);
  const evaluatedRecommendationObservations = recommendationOutcomes.filter((item) => item.outcomeStatus === "evaluated").length;
  const evaluatedMarketVisionObservations = marketVisionOutcomes.filter((item) => item.outcomeStatus === "evaluated").length;
  const evaluatedPortfolioReviewObservations = portfolioReviewOutcomes.filter((item) => item.outcomeStatus === "evaluated").length;
  const allOutcomes = [...recommendationOutcomes, ...marketVisionOutcomes, ...portfolioReviewOutcomes];
  return {
    recommendationCoverage: coveragePercent(evaluatedRecommendationObservations, maturedRecommendationObservations),
    marketVisionCoverage: coveragePercent(evaluatedMarketVisionObservations, maturedMarketVisionObservations),
    portfolioReviewCoverage: coveragePercent(evaluatedPortfolioReviewObservations, maturedPortfolioReviewObservations),
    maturedRecommendationObservations,
    evaluatedRecommendationObservations,
    maturedMarketVisionObservations,
    evaluatedMarketVisionObservations,
    maturedPortfolioReviewObservations,
    evaluatedPortfolioReviewObservations,
    missingDataOutcomes: allOutcomes.filter((item) => item.outcomeStatus === "insufficient_data" || item.outcomeStatus === "stale_price").length,
    benchmarkMissingOutcomes: allOutcomes.filter((item) => item.outcomeStatus === "benchmark_missing").length
  };
}

function confidenceBucket(value: number) {
  if (value < 50) return "0-49";
  if (value < 60) return "50-59";
  if (value < 70) return "60-69";
  if (value < 80) return "70-79";
  if (value < 90) return "80-89";
  return "90+";
}

function average(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numeric.length === 0 ? null : numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function summarizeConfidenceCalibration(
  snapshots: TelemetryRecommendationSnapshot[],
  outcomes: TelemetryRecommendationOutcome[]
): ConfidenceCalibrationRow[] {
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const groups = new Map<string, TelemetryRecommendationOutcome[]>();
  for (const outcome of outcomes.filter((item) => item.outcomeStatus === "evaluated")) {
    const snapshot = snapshotById.get(outcome.recommendationSnapshotId);
    if (!snapshot) continue;
    const bucket = confidenceBucket(snapshot.confidenceScore);
    const key = `${bucket}|${outcome.horizon}`;
    groups.set(key, [...(groups.get(key) ?? []), outcome]);
  }
  return Array.from(groups.entries()).map(([key, rows]) => {
    const [bucket, horizon] = key.split("|") as [string, any];
    return {
      bucket,
      horizon,
      observationCount: rows.length,
      hitRate: rows.length === 0 ? null : rows.filter((row) => row.success).length / rows.length,
      averageExcessReturn: average(rows.map((row) => row.excessReturn))
    };
  }).sort((a, b) => a.horizon.localeCompare(b.horizon) || a.bucket.localeCompare(b.bucket));
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
