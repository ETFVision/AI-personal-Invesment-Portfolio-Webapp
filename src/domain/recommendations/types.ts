export type RecommendationLabel =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Watch"
  | "Reduce"
  | "Sell"
  | "Insufficient Data"
  | "Not Applicable";

export type RecommendationRunStatus = "success" | "partial_success" | "failed";
export type RecommendationRunType = "manual" | "scheduled" | "single_instrument";
export type RecommendationTimeHorizon = "short_term" | "medium_term" | "long_term";

export type RecommendationRun = {
  id: string;
  runDate: string;
  runType: RecommendationRunType | string;
  status: RecommendationRunStatus;
  instrumentsEvaluated: number;
  recommendationsCreated: number;
  errorMessage: string | null;
  createdAt: string;
};

export type InstrumentRecommendation = {
  id: string;
  recommendationRunId: string | null;
  instrumentId: string;
  securityId?: string | null;
  issuerId?: string | null;
  symbol: string;
  instrumentType: string;
  recommendationLabel: RecommendationLabel;
  overallScore: number | null;
  confidenceScore: number;
  riskLevel: string;
  timeHorizon: RecommendationTimeHorizon | string;
  recommendationReasoningSummary: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  guardrailsApplied: string[];
  dataLimitations: string[];
  recommendationChangeTriggers: {
    upgrade: string[];
    downgrade: string[];
  };
  inputsSnapshot: Record<string, unknown>;
  scoringBreakdown: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationHistoryItem = {
  id: string;
  instrumentId: string;
  securityId?: string | null;
  issuerId?: string | null;
  symbol: string;
  recommendationLabel: RecommendationLabel;
  overallScore: number | null;
  confidenceScore: number;
  runDate: string;
  createdAt: string;
};

export type RecommendationDashboard = {
  latestRun: RecommendationRun | null;
  recommendations: InstrumentRecommendation[];
  portfolioRecommendations: InstrumentRecommendation[];
  watchlistRecommendations: InstrumentRecommendation[];
  universeOpportunities: InstrumentRecommendation[];
};
