import { AllocationItem, AssetSnapshot, CashBalance, CashSnapshot, HoldingValuation, PortfolioSnapshot } from "@/domain/portfolio/types";

export type UpsertPortfolioSnapshotInput = {
  portfolioId: string;
  snapshotDate: string;
  totalValue: number;
  cashValue: number;
  investedValue: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  currency: string;
  assetClassAllocations: AllocationItem[];
  sectorAllocations: AllocationItem[];
  geographyAllocations: AllocationItem[];
  currencyAllocations: AllocationItem[];
};

export interface AnalyticsRepository {
  listPortfolioSnapshots(portfolioId: string, limit?: number): Promise<PortfolioSnapshot[]>;
  listAssetSnapshots(portfolioId: string, limit?: number): Promise<AssetSnapshot[]>;
  listCashSnapshots(portfolioId: string, limit?: number): Promise<CashSnapshot[]>;
  upsertPortfolioSnapshot(input: UpsertPortfolioSnapshotInput): Promise<void>;
  upsertAssetSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    valuations: HoldingValuation[];
  }): Promise<void>;
  upsertCashSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    cashBalances: CashBalance[];
  }): Promise<void>;
}
