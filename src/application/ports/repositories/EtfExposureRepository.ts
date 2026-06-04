import type {
  EtfCountryExposure,
  EtfExposureRefreshLog,
  EtfSectorExposure,
  EtfThemeExposure,
  EtfTopHolding,
  PortfolioLookthroughExposure
} from "@/domain/etfLookthrough/types";

export type InsertEtfExposureRefreshLogInput = Omit<EtfExposureRefreshLog, "id" | "createdAt">;

export interface EtfExposureRepository {
  listLatestSectorExposures(instrumentIds?: string[]): Promise<EtfSectorExposure[]>;
  listLatestCountryExposures(instrumentIds?: string[]): Promise<EtfCountryExposure[]>;
  listLatestTopHoldings(instrumentIds?: string[]): Promise<EtfTopHolding[]>;
  listLatestThemeExposures(instrumentIds?: string[]): Promise<EtfThemeExposure[]>;
  upsertSectorExposures(input: EtfSectorExposure[]): Promise<void>;
  upsertCountryExposures(input: EtfCountryExposure[]): Promise<void>;
  upsertTopHoldings(input: EtfTopHolding[]): Promise<void>;
  upsertThemeExposures(input: EtfThemeExposure[]): Promise<void>;
  upsertPortfolioLookthroughExposures(input: PortfolioLookthroughExposure[]): Promise<void>;
  listPortfolioLookthroughExposures(portfolioId: string, asOfDate?: string): Promise<PortfolioLookthroughExposure[]>;
  getLatestExposureDateForEtf(instrumentId: string): Promise<string | null>;
  insertRefreshLog(input: InsertEtfExposureRefreshLogInput): Promise<void>;
  listRefreshLogs(limit?: number): Promise<EtfExposureRefreshLog[]>;
}
