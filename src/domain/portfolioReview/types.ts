import type { RecommendationLabel } from "@/domain/recommendations/types";

export type PortfolioReviewStatus = "draft" | "final";
export type PortfolioReviewRunStatus = "success" | "partial_success" | "failed";
export type PortfolioReviewRunType = "manual" | "scheduled";

export type PortfolioReviewScoreKey =
  | "allocation"
  | "concentration"
  | "diversification"
  | "risk"
  | "macroFit"
  | "recommendationAlignment"
  | "fixedIncome"
  | "themeExposure";

export type PortfolioReviewScoreComponent = {
  key: PortfolioReviewScoreKey;
  label: string;
  score: number;
  weight: number;
  reason: string;
};

export type PortfolioReviewFinding = {
  severity: "info" | "watch" | "attention";
  title: string;
  detail: string;
};

export type PortfolioReviewCandidate = {
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: string;
  recommendationLabel: RecommendationLabel | string;
  score: number | null;
  reason: string;
};

export type PortfolioImprovementSuggestion = {
  category:
    | "allocation"
    | "concentration"
    | "diversification"
    | "risk"
    | "macro_fit"
    | "fixed_income"
    | "theme_exposure"
    | "data_quality";
  priority: "low" | "medium" | "high";
  title: string;
  rationale: string;
  candidateInstruments: PortfolioReviewCandidate[];
};

export type PortfolioPotentialAction = {
  actionType: "monitor" | "review" | "diversify" | "risk_check" | "data_check" | "rebalance_consideration";
  title: string;
  detail: string;
  candidateInstruments: PortfolioReviewCandidate[];
};

export type PortfolioReviewSection = {
  score: number;
  summary: string;
  findings: PortfolioReviewFinding[];
  metrics: Record<string, unknown>;
};

export type PortfolioReviewReport = {
  id: string;
  portfolioId: string;
  portfolioReviewRunId: string | null;
  reviewDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: PortfolioReviewStatus;
  executiveSummary: string;
  allocationReview: PortfolioReviewSection;
  concentrationReview: PortfolioReviewSection;
  diversificationReview: PortfolioReviewSection;
  riskReview: PortfolioReviewSection;
  macroFitReview: PortfolioReviewSection;
  recommendationAlignmentReview: PortfolioReviewSection;
  fixedIncomeReview: PortfolioReviewSection;
  themeExposureReview: PortfolioReviewSection;
  watchAreas: PortfolioReviewFinding[];
  portfolioImprovementSuggestions: PortfolioImprovementSuggestion[];
  potentialActions: PortfolioPotentialAction[];
  dataLimitations: string[];
  overallPortfolioScore: number | null;
  confidenceScore: number;
  inputsSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioReviewRun = {
  id: string;
  portfolioId: string | null;
  runDate: string;
  runType: PortfolioReviewRunType;
  status: PortfolioReviewRunStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioReviewDashboard = {
  latestReport: PortfolioReviewReport | null;
  reports: PortfolioReviewReport[];
  runs: PortfolioReviewRun[];
};
