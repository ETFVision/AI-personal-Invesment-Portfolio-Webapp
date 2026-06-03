import type {
  CreateRecommendationRunInput,
  RecommendationRepository,
  UpsertInstrumentRecommendationInput
} from "@/application/ports/repositories/RecommendationRepository";
import type { InstrumentRecommendation, RecommendationRun } from "@/domain/recommendations/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingRecommendationsTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || (error?.message ?? "").toLowerCase().includes("recommendation");
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function mapRun(row: any): RecommendationRun {
  return {
    id: row.id,
    runDate: row.run_date,
    runType: row.run_type,
    status: row.status,
    instrumentsEvaluated: Number(row.instruments_evaluated ?? 0),
    recommendationsCreated: Number(row.recommendations_created ?? 0),
    errorMessage: row.error_message,
    createdAt: row.created_at
  };
}

function mapRecommendation(row: any): InstrumentRecommendation {
  return {
    id: row.id,
    recommendationRunId: row.recommendation_run_id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    instrumentType: row.instrument_type,
    recommendationLabel: row.recommendation_label,
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    confidenceScore: Number(row.confidence_score ?? 0),
    riskLevel: row.risk_level,
    timeHorizon: row.time_horizon,
    recommendationReasoningSummary: row.recommendation_reasoning_summary,
    positiveDrivers: toStringArray(row.positive_drivers),
    negativeDrivers: toStringArray(row.negative_drivers),
    guardrailsApplied: toStringArray(row.guardrails_applied),
    dataLimitations: toStringArray(row.data_limitations),
    inputsSnapshot: row.inputs_snapshot ?? {},
    scoringBreakdown: row.scoring_breakdown ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SupabaseRecommendationRepository implements RecommendationRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async createRun(input: CreateRecommendationRunInput) {
    const { data, error } = await this.db
      .from("recommendation_runs")
      .insert({
        run_date: input.runDate,
        run_type: input.runType,
        status: input.status,
        instruments_evaluated: input.instrumentsEvaluated,
        recommendations_created: input.recommendationsCreated,
        error_message: input.errorMessage ?? null
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRun(data);
  }

  async upsertRecommendations(input: UpsertInstrumentRecommendationInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("instrument_recommendations").upsert(
      input.map((item) => ({
        recommendation_run_id: item.recommendationRunId,
        instrument_id: item.instrumentId,
        symbol: item.symbol,
        instrument_type: item.instrumentType,
        recommendation_label: item.recommendationLabel,
        overall_score: item.overallScore,
        confidence_score: item.confidenceScore,
        risk_level: item.riskLevel,
        time_horizon: item.timeHorizon,
        recommendation_reasoning_summary: item.recommendationReasoningSummary,
        positive_drivers: item.positiveDrivers,
        negative_drivers: item.negativeDrivers,
        guardrails_applied: item.guardrailsApplied,
        data_limitations: item.dataLimitations,
        inputs_snapshot: item.inputsSnapshot,
        scoring_breakdown: item.scoringBreakdown
      })),
      { onConflict: "recommendation_run_id,instrument_id" }
    );
    if (error) throw new Error(error.message);
  }

  async insertHistory(input: UpsertInstrumentRecommendationInput[], runDate: string) {
    if (input.length === 0) return;
    const { error } = await this.db.from("recommendation_history").insert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      recommendation_label: item.recommendationLabel,
      overall_score: item.overallScore,
      confidence_score: item.confidenceScore,
      run_date: runDate
    })));
    if (error) throw new Error(error.message);
  }

  async listRuns(limit = 20) {
    const { data, error } = await this.db.from("recommendation_runs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (isMissingRecommendationsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRun);
  }

  async listLatestRecommendations(limit = 500) {
    const { data, error } = await this.db
      .from("instrument_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingRecommendationsTable(error)) return [];
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    return (data ?? []).map(mapRecommendation).filter((item) => {
      if (seen.has(item.instrumentId)) return false;
      seen.add(item.instrumentId);
      return true;
    });
  }

  async getLatestRecommendationForInstrument(instrumentId: string) {
    const { data, error } = await this.db
      .from("instrument_recommendations")
      .select("*")
      .eq("instrument_id", instrumentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isMissingRecommendationsTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapRecommendation(data) : null;
  }
}
