import type {
  CreatePortfolioReviewRunInput,
  PortfolioReviewRepository,
  UpsertPortfolioReviewReportInput
} from "@/application/ports/repositories/PortfolioReviewRepository";
import type {
  PortfolioPotentialAction,
  PortfolioReviewFinding,
  PortfolioReviewReport,
  PortfolioReviewRun,
  PortfolioReviewSection,
  PortfolioImprovementSuggestion
} from "@/domain/portfolioReview/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingPortfolioReviewTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || (error?.message ?? "").toLowerCase().includes("portfolio_review");
}

const emptySection: PortfolioReviewSection = {
  score: 0,
  summary: "",
  findings: [],
  metrics: {}
};

function section(value: unknown): PortfolioReviewSection {
  if (!value || typeof value !== "object") return emptySection;
  return value as PortfolioReviewSection;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function mapRun(row: any): PortfolioReviewRun {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    runDate: row.run_date,
    runType: row.run_type,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReport(row: any): PortfolioReviewReport {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    portfolioReviewRunId: row.portfolio_review_run_id,
    reviewDate: row.review_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    executiveSummary: row.executive_summary,
    allocationReview: section(row.allocation_review),
    concentrationReview: section(row.concentration_review),
    diversificationReview: section(row.diversification_review),
    riskReview: section(row.risk_review),
    macroFitReview: section(row.macro_fit_review),
    recommendationAlignmentReview: section(row.recommendation_alignment_review),
    fixedIncomeReview: section(row.fixed_income_review),
    themeExposureReview: section(row.theme_exposure_review),
    watchAreas: arrayValue<PortfolioReviewFinding>(row.watch_areas),
    portfolioImprovementSuggestions: arrayValue<PortfolioImprovementSuggestion>(row.portfolio_improvement_suggestions),
    potentialActions: arrayValue<PortfolioPotentialAction>(row.potential_actions),
    dataLimitations: arrayValue<string>(row.data_limitations),
    overallPortfolioScore: row.overall_portfolio_score == null ? null : Number(row.overall_portfolio_score),
    confidenceScore: Number(row.confidence_score ?? 0),
    inputsSnapshot: row.inputs_snapshot ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function reportPayload(input: UpsertPortfolioReviewReportInput) {
  return {
    id: input.id,
    portfolio_id: input.portfolioId,
    portfolio_review_run_id: input.portfolioReviewRunId,
    review_date: input.reviewDate,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    status: input.status ?? "draft",
    executive_summary: input.executiveSummary,
    allocation_review: input.allocationReview,
    concentration_review: input.concentrationReview,
    diversification_review: input.diversificationReview,
    risk_review: input.riskReview,
    macro_fit_review: input.macroFitReview,
    recommendation_alignment_review: input.recommendationAlignmentReview,
    fixed_income_review: input.fixedIncomeReview,
    theme_exposure_review: input.themeExposureReview,
    watch_areas: input.watchAreas,
    portfolio_improvement_suggestions: input.portfolioImprovementSuggestions,
    potential_actions: input.potentialActions,
    data_limitations: input.dataLimitations,
    overall_portfolio_score: input.overallPortfolioScore,
    confidence_score: input.confidenceScore,
    inputs_snapshot: input.inputsSnapshot
  };
}

export class SupabasePortfolioReviewRepository implements PortfolioReviewRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async createRun(input: CreatePortfolioReviewRunInput) {
    const { data, error } = await this.db
      .from("portfolio_review_runs")
      .insert({
        portfolio_id: input.portfolioId,
        run_date: input.runDate,
        run_type: input.runType,
        status: input.status,
        error_message: input.errorMessage ?? null
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRun(data);
  }

  async updateRunStatus(runId: string, status: CreatePortfolioReviewRunInput["status"], errorMessage?: string | null) {
    const { error } = await this.db
      .from("portfolio_review_runs")
      .update({ status, error_message: errorMessage ?? null })
      .eq("id", runId);
    if (error) throw new Error(error.message);
  }

  async upsertReport(input: UpsertPortfolioReviewReportInput) {
    const { data, error } = await this.db
      .from("portfolio_review_reports")
      .upsert(reportPayload(input))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapReport(data);
  }

  async listReports(portfolioId: string, limit = 10) {
    const { data, error } = await this.db
      .from("portfolio_review_reports")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("review_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingPortfolioReviewTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapReport);
  }

  async getLatestReport(portfolioId: string) {
    const { data, error } = await this.db
      .from("portfolio_review_reports")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("review_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isMissingPortfolioReviewTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapReport(data) : null;
  }

  async listRuns(portfolioId: string, limit = 10) {
    const { data, error } = await this.db
      .from("portfolio_review_runs")
      .select("*")
      .or(`portfolio_id.eq.${portfolioId},portfolio_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingPortfolioReviewTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRun);
  }
}
