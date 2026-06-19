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
  | "themeExposure"
  | "geography";

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
  candidateType?: string;
  recommendationScore?: number | null;
  confidenceScore?: number | null;
  relevanceScore?: number | null;
  diversificationBenefitScore?: number | null;
  macroFitScore?: number | null;
  diversificationType?: string | null;
  issueFitScore?: number | null;
  categoryRepresentativeScore?: number | null;
  overlapPenalty?: number | null;
  sharedCompanyCount: number | null;
  sharedCompanyWeight: number | null;
  topSharedSymbols: string[];
  primaryReason?: string;
  secondaryBenefit?: string;
  overlapWarning?: string | null;
  whyThisCandidate?: string;
  expectedPortfolioBenefit?: string;
  potentialTradeOff?: string;
  keyRisks?: string[];
  dataLimitations?: string[];
  source?: "recommendation_engine" | "seeded_universe" | "portfolio_review";
};

export type PortfolioImprovementIssueCategory =
  | "concentration_risk"
  | "sector_concentration"
  | "theme_concentration"
  | "insufficient_fixed_income"
  | "excessive_duration_risk"
  | "insufficient_cash_like_exposure"
  | "insufficient_inflation_hedge"
  | "insufficient_geopolitical_hedge"
  | "insufficient_international_exposure"
  | "insufficient_defensive_exposure"
  | "excessive_crypto_risk"
  | "high_correlation"
  | "weak_recommendation_alignment"
  | "macro_vulnerability"
  | "data_quality";

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
  issueAddressed?: string;
  issueCategory?: PortfolioImprovementIssueCategory;
  expectedPortfolioBenefit?: string;
  potentialTradeOff?: string;
  keyRisks?: string[];
  dataLimitations?: string[];
  source?: "deterministic_portfolio_review";
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
  geographyReview: PortfolioReviewSection;
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

export type PortfolioReviewReportListItem = Pick<
  PortfolioReviewReport,
  | "id"
  | "portfolioId"
  | "portfolioReviewRunId"
  | "reviewDate"
  | "periodStart"
  | "periodEnd"
  | "status"
  | "overallPortfolioScore"
  | "confidenceScore"
  | "createdAt"
  | "updatedAt"
>;

export type PortfolioReviewDashboard = {
  latestReport: PortfolioReviewReport | null;
  reports: PortfolioReviewReportListItem[];
  runs: PortfolioReviewRun[];
};
