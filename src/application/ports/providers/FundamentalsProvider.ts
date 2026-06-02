import type { CompanyProfile, FinancialPeriod, FinancialRatio, FinancialStatement } from "@/domain/fundamentals/types";

export type ProviderCompanyProfile = Omit<CompanyProfile, "instrumentId">;
export type ProviderFinancialStatement = Omit<FinancialStatement, "instrumentId">;
export type ProviderFinancialRatio = Omit<FinancialRatio, "instrumentId">;

export type FundamentalsProviderResult = {
  profile: ProviderCompanyProfile | null;
  statements: ProviderFinancialStatement[];
  ratios: ProviderFinancialRatio[];
};

export interface FundamentalsProvider {
  readonly name: string;
  getFundamentals(symbol: string, options?: { period?: FinancialPeriod; limit?: number }): Promise<FundamentalsProviderResult>;
}
