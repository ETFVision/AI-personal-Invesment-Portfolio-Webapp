import type { RecommendationLabel } from "@/domain/recommendations/types";

export type TelemetryHorizon = "1m" | "3m" | "6m" | "12m";
export type TelemetryOutcomeStatus = "pending" | "evaluated" | "insufficient_data" | "stale_price" | "benchmark_missing";
export type TelemetryEvidenceBucket = "insufficient_evidence" | "early_signal" | "moderate_evidence" | "stronger_evidence";
export type MarketVisionDirection = "bullish" | "neutral" | "bearish" | "mixed";

export type TelemetryRecommendationSnapshot = {
  id: string;
  portfolioId: string | null;
  userId: string | null;
  instrumentId: string;
  symbol: string;
  recommendation: RecommendationLabel | string;
  recommendationScore: number | null;
  confidenceScore: number;
  generatedAt: string;
  runId: string | null;
  benchmarkSymbol: string | null;
  priceAtRecommendation: number | null;
  priceDate: string | null;
  positiveDrivers: string[];
  negativeDrivers: string[];
  factorInputs: Record<string, unknown>;
  componentScores: unknown[];
  guardrails: string[];
  createdAt: string;
};

export type TelemetryRecommendationOutcome = {
  id: string;
  recommendationSnapshotId: string;
  horizon: TelemetryHorizon;
  evaluationDate: string;
  startPrice: number | null;
  endPrice: number | null;
  assetReturn: number | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;
  success: boolean | null;
  outcomeStatus: TelemetryOutcomeStatus;
  createdAt: string;
  updatedAt: string;
};

export type TelemetryFactorOutcome = {
  id: string;
  factorName: string;
  factorValue: string;
  factorDirection: string;
  horizon: TelemetryHorizon;
  observationCount: number;
  averageAssetReturn: number | null;
  averageBenchmarkReturn: number | null;
  averageExcessReturn: number | null;
  hitRate: number | null;
  confidenceBucket: TelemetryEvidenceBucket;
  createdAt: string;
  updatedAt: string;
};

export type TelemetryMarketVisionSnapshot = {
  id: string;
  reportId: string | null;
  reportPeriodStart: string | null;
  reportPeriodEnd: string | null;
  generatedAt: string;
  theme: string;
  direction: MarketVisionDirection;
  confidence: number;
  severity: number;
  supportingSignalCount: number;
  fredSignalCount: number;
  newsSignalCount: number;
  proxySymbol: string | null;
  createdAt: string;
};

export type TelemetryPortfolioReviewSnapshot = {
  id: string;
  portfolioId: string;
  userId: string | null;
  reviewId: string | null;
  generatedAt: string;
  portfolioScore: number | null;
  diversificationScore: number | null;
  concentrationScore: number | null;
  riskScore: number | null;
  fixedIncomeScore: number | null;
  macroFitScore: number | null;
  themeExposureSummary: Record<string, unknown>;
  topRisks: unknown[];
  improvementSuggestions: unknown[];
  allocationSnapshot: Record<string, unknown>;
  lookthroughSnapshot: Record<string, unknown>;
  createdAt: string;
};

export type TelemetryOverview = {
  recommendationSnapshots: number;
  recommendationOutcomes: number;
  evaluatedOutcomes: number;
  pendingOutcomes: number;
  marketVisionSnapshots: number;
  portfolioReviewSnapshots: number;
  latestEvaluationDate: string | null;
};

export type RecommendationTelemetrySummaryRow = {
  recommendation: string;
  horizon: TelemetryHorizon;
  observationCount: number;
  evaluatedCount: number;
  hitRate: number | null;
  averageAssetReturn: number | null;
  averageBenchmarkReturn: number | null;
  averageExcessReturn: number | null;
};

export type TelemetryDashboard = {
  overview: TelemetryOverview;
  recommendationSummary: RecommendationTelemetrySummaryRow[];
  factorOutcomes: TelemetryFactorOutcome[];
  marketVisionSnapshots: TelemetryMarketVisionSnapshot[];
  portfolioReviewSnapshots: TelemetryPortfolioReviewSnapshot[];
};
