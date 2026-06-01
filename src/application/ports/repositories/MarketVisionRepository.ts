import type {
  MacroIndicator,
  ClassificationSummary,
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
  currencyView: string;
  geopoliticalRiskView: string;
  opportunities: string[];
  risks: string[];
  portfolioImplications: PortfolioImplications;
  classificationSummary?: ClassificationSummary;
  sourceType: MarketVisionSourceType;
  status: MarketVisionStatus;
};

export type UpsertMacroIndicatorInput = Omit<MacroIndicator, "id" | "createdAt" | "updatedAt">;

export type UpsertMarketThemeEventInput = Omit<MarketThemeEvent, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export interface MarketVisionRepository {
  listReports(limit?: number): Promise<MarketVisionReport[]>;
  getReportById(reportId: string): Promise<MarketVisionReport | null>;
  getLatestPublishedReport(): Promise<MarketVisionReport | null>;
  upsertReport(input: UpsertMarketVisionReportInput): Promise<MarketVisionReport>;
  updateReportStatus(reportId: string, status: MarketVisionStatus): Promise<void>;
  listMacroIndicators(): Promise<MacroIndicator[]>;
  upsertMacroIndicators(input: UpsertMacroIndicatorInput[]): Promise<void>;
  listThemeEvents(reportId?: string): Promise<MarketThemeEvent[]>;
  upsertThemeEvents(input: UpsertMarketThemeEventInput[]): Promise<void>;
}
