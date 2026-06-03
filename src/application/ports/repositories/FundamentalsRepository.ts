import type {
  CompanyProfile,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
  FundamentalTrend,
  FundamentalTrendSummary,
  FundamentalsDetail,
  FundamentalsRefreshLog,
  FundamentalsSummaryRow
} from "@/domain/fundamentals/types";
import type { Instrument } from "@/domain/universe/types";

export interface FundamentalsRepository {
  listEligibleStockInstruments(limit?: number): Promise<Instrument[]>;
  listSummaryRows(): Promise<FundamentalsSummaryRow[]>;
  getDetailBySymbol(symbol: string): Promise<FundamentalsDetail | null>;
  getProfiles(instrumentIds: string[]): Promise<CompanyProfile[]>;
  getLatestRatios(instrumentIds: string[]): Promise<FinancialRatio[]>;
  getLatestScores(instrumentIds: string[]): Promise<FundamentalScore[]>;
  getLatestTrendSummaries(instrumentIds: string[]): Promise<FundamentalTrendSummary[]>;
  upsertCompanyProfiles(input: CompanyProfile[]): Promise<void>;
  upsertFinancialStatements(input: FinancialStatement[]): Promise<void>;
  upsertFinancialRatios(input: FinancialRatio[]): Promise<void>;
  upsertFundamentalScores(input: FundamentalScore[]): Promise<void>;
  upsertFundamentalTrends(input: FundamentalTrend[]): Promise<void>;
  upsertFundamentalTrendSummaries(input: FundamentalTrendSummary[]): Promise<void>;
  insertRefreshLog(input: FundamentalsRefreshLog): Promise<void>;
  listRefreshLogs(limit?: number): Promise<FundamentalsRefreshLog[]>;
}
