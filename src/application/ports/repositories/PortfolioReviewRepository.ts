import type {
  PortfolioReviewReport,
  PortfolioReviewRun,
  PortfolioReviewRunStatus,
  PortfolioReviewRunType,
  PortfolioReviewStatus
} from "@/domain/portfolioReview/types";

export type CreatePortfolioReviewRunInput = {
  portfolioId: string | null;
  runDate: string;
  runType: PortfolioReviewRunType;
  status: PortfolioReviewRunStatus;
  errorMessage?: string | null;
};

export type UpsertPortfolioReviewReportInput = Omit<PortfolioReviewReport, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  status?: PortfolioReviewStatus;
};

export interface PortfolioReviewRepository {
  createRun(input: CreatePortfolioReviewRunInput): Promise<PortfolioReviewRun>;
  updateRunStatus(runId: string, status: PortfolioReviewRunStatus, errorMessage?: string | null): Promise<void>;
  upsertReport(input: UpsertPortfolioReviewReportInput): Promise<PortfolioReviewReport>;
  listReports(portfolioId: string, limit?: number): Promise<PortfolioReviewReport[]>;
  getLatestReport(portfolioId: string): Promise<PortfolioReviewReport | null>;
  listRuns(portfolioId: string, limit?: number): Promise<PortfolioReviewRun[]>;
}
