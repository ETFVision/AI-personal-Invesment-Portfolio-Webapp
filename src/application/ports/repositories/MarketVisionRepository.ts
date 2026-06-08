import type {
  MacroIndicator,
  ClassificationSummary,
  MarketVisionGenerationLog,
  MarketVisionGenerationStatus,
  MarketThemeEvent,
  MarketVisionReport,
  MarketVisionSourceType,
  MarketVisionStatus,
  PortfolioImplications
} from "@/domain/marketVision/types";

export type UpsertMarketVisionReportInput = {
  id?: string;
  reportDate: string;
  reportPeriodStart: string | null;
  reportPeriodEnd: string | null;
  title: string;
  executiveSummary: string;
  globalMarketSummary: string;
  equityView: string;
  bondView: string;
  goldView: string;
  cryptoView: string;
  ratesView: string;
  inflationView: string;
  growthView?: string;
  employmentView?: string;
  currencyView: string;
  geopoliticalRiskView: string;
  opportunities: string[];
  risks: string[];
  portfolioImplications: PortfolioImplications;
  classificationSummary?: ClassificationSummary;
  sourceType: MarketVisionSourceType;
  status: MarketVisionStatus;
  confidenceScore?: number | null;
  modelUsed?: string | null;
  promptVersion?: string | null;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
  sourceSnapshot?: Record<string, unknown>;
  marketVisionMetadata?: Record<string, unknown>;
  generationDurationMs?: number | null;
};

export type UpsertMacroIndicatorInput = Omit<MacroIndicator, "id" | "createdAt" | "updatedAt">;

export type UpsertMarketThemeEventInput = Omit<MarketThemeEvent, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type InsertMarketVisionGenerationLogInput = {
  reportId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  startedAt: string;
  completedAt?: string | null;
  status: MarketVisionGenerationStatus;
  modelUsed?: string | null;
  promptVersion?: string | null;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export interface MarketVisionRepository {
  listReports(limit?: number): Promise<MarketVisionReport[]>;
  getReportById(reportId: string): Promise<MarketVisionReport | null>;
  getLatestPublishedReport(): Promise<MarketVisionReport | null>;
  findGeneratedReportForPeriod(periodStart: string, periodEnd: string): Promise<MarketVisionReport | null>;
  upsertReport(input: UpsertMarketVisionReportInput): Promise<MarketVisionReport>;
  updateReportStatus(reportId: string, status: MarketVisionStatus): Promise<void>;
  listMacroIndicators(): Promise<MacroIndicator[]>;
  upsertMacroIndicators(input: UpsertMacroIndicatorInput[]): Promise<void>;
  listThemeEvents(reportId?: string): Promise<MarketThemeEvent[]>;
  upsertThemeEvents(input: UpsertMarketThemeEventInput[]): Promise<void>;
  insertGenerationLog(input: InsertMarketVisionGenerationLogInput): Promise<void>;
  listGenerationLogs(limit?: number): Promise<MarketVisionGenerationLog[]>;
}
