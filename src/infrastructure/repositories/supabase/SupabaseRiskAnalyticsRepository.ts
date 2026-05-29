import { RiskAnalyticsRepository, StoredRiskReport } from "@/application/ports/repositories/RiskAnalyticsRepository";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingRiskReportTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("portfolio_risk_reports") && error.message?.toLowerCase().includes("does not exist")))
  );
}

function mapStoredRiskReport(row: any): StoredRiskReport {
  return {
    portfolioId: row.portfolio_id,
    asOfDate: row.as_of_date,
    report: row.report,
    updatedAt: row.updated_at
  };
}

export class SupabaseRiskAnalyticsRepository implements RiskAnalyticsRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async getLatestRiskReport(portfolioId: string) {
    const { data, error } = await this.db
      .from("portfolio_risk_reports")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isMissingRiskReportTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapStoredRiskReport(data) : null;
  }

  async upsertRiskReport(input: {
    portfolioId: string;
    asOfDate: string;
    report: unknown;
    source?: string;
  }) {
    const { error } = await this.db.from("portfolio_risk_reports").upsert(
      {
        portfolio_id: input.portfolioId,
        as_of_date: input.asOfDate,
        report: input.report,
        source: input.source ?? "application_service"
      },
      { onConflict: "portfolio_id,as_of_date" }
    );
    if (isMissingRiskReportTable(error)) return;
    if (error) throw new Error(error.message);
  }
}
