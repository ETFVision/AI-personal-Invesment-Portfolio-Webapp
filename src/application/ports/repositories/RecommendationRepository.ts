import type { InstrumentRecommendation, RecommendationRun, RecommendationRunStatus, RecommendationRunType } from "@/domain/recommendations/types";

export type CreateRecommendationRunInput = {
  runDate: string;
  runType: RecommendationRunType | string;
  status: RecommendationRunStatus;
  instrumentsEvaluated: number;
  recommendationsCreated: number;
  errorMessage?: string | null;
};

export type UpsertInstrumentRecommendationInput = Omit<InstrumentRecommendation, "id" | "createdAt" | "updatedAt">;

export interface RecommendationRepository {
  createRun(input: CreateRecommendationRunInput): Promise<RecommendationRun>;
  upsertRecommendations(input: UpsertInstrumentRecommendationInput[]): Promise<void>;
  insertHistory(input: UpsertInstrumentRecommendationInput[], runDate: string): Promise<void>;
  listRuns(limit?: number): Promise<RecommendationRun[]>;
  listLatestRecommendations(limit?: number): Promise<InstrumentRecommendation[]>;
  getLatestRecommendationForInstrument(instrumentId: string): Promise<InstrumentRecommendation | null>;
}
