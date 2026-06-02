import type {
  CompanyProfile,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
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
  upsertCompanyProfiles(input: CompanyProfile[]): Promise<void>;
  upsertFinancialStatements(input: FinancialStatement[]): Promise<void>;
  upsertFinancialRatios(input: FinancialRatio[]): Promise<void>;
  upsertFundamentalScores(input: FundamentalScore[]): Promise<void>;
  insertRefreshLog(input: FundamentalsRefreshLog): Promise<void>;
  listRefreshLogs(limit?: number): Promise<FundamentalsRefreshLog[]>;
}
