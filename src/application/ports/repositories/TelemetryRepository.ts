import type {
  MarketVisionDirection,
  TelemetryDashboard,
  TelemetryFactorOutcome,
  TelemetryHorizon,
  TelemetryMarketVisionSnapshot,
  TelemetryOutcomeStatus,
  TelemetryPortfolioReviewSnapshot,
  TelemetryRecommendationOutcome,
  TelemetryRecommendationSnapshot
} from "@/domain/telemetry/types";

export type CreateTelemetryRecommendationSnapshotInput = {
  portfolioId: string | null;
  userId: string | null;
  instrumentId: string;
  symbol: string;
  recommendation: string;
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
};

export type UpsertTelemetryRecommendationOutcomeInput = {
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
};

export type UpsertTelemetryFactorOutcomeInput = {
  factorName: string;
  factorValue: string;
  factorDirection: string;
  horizon: TelemetryHorizon;
  observationCount: number;
  averageAssetReturn: number | null;
  averageBenchmarkReturn: number | null;
  averageExcessReturn: number | null;
  hitRate: number | null;
  confidenceBucket: string;
};

export type CreateTelemetryMarketVisionSnapshotInput = {
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
};

export type CreateTelemetryPortfolioReviewSnapshotInput = {
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
};

export type PricePoint = {
  date: string;
  closePrice: number;
};

export interface TelemetryRepository {
  createRecommendationSnapshots(input: CreateTelemetryRecommendationSnapshotInput[]): Promise<TelemetryRecommendationSnapshot[]>;
  createMarketVisionSnapshots(input: CreateTelemetryMarketVisionSnapshotInput[]): Promise<TelemetryMarketVisionSnapshot[]>;
  createPortfolioReviewSnapshot(input: CreateTelemetryPortfolioReviewSnapshotInput): Promise<TelemetryPortfolioReviewSnapshot | null>;
  listRecommendationSnapshots(limit?: number): Promise<TelemetryRecommendationSnapshot[]>;
  listMaturedRecommendationSnapshots(asOfDate: string, horizons: TelemetryHorizon[]): Promise<TelemetryRecommendationSnapshot[]>;
  listRecommendationOutcomes(): Promise<TelemetryRecommendationOutcome[]>;
  upsertRecommendationOutcomes(input: UpsertTelemetryRecommendationOutcomeInput[]): Promise<void>;
  upsertFactorOutcomes(input: UpsertTelemetryFactorOutcomeInput[]): Promise<void>;
  listFactorOutcomes(limit?: number): Promise<TelemetryFactorOutcome[]>;
  listMarketVisionSnapshots(limit?: number): Promise<TelemetryMarketVisionSnapshot[]>;
  listPortfolioReviewSnapshots(limit?: number): Promise<TelemetryPortfolioReviewSnapshot[]>;
  getInstrumentPriceOnOrAfter(instrumentId: string, targetDate: string): Promise<PricePoint | null>;
  getInstrumentPriceOnOrBefore(instrumentId: string, targetDate: string): Promise<PricePoint | null>;
  getBenchmarkPriceOnOrAfter(symbol: string, targetDate: string): Promise<PricePoint | null>;
  getBenchmarkPriceOnOrBefore(symbol: string, targetDate: string): Promise<PricePoint | null>;
  getDashboard(): Promise<TelemetryDashboard>;
}
