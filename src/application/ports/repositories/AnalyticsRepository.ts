import {
  AllocationItem,
  AssetSnapshot,
  CashBalance,
  CashSnapshot,
  HoldingSnapshot,
  HoldingValuation,
  HoldingMarketMetric,
  PortfolioCurrentMetric,
  PortfolioPerformanceSummary,
  PortfolioSnapshot
} from "@/domain/portfolio/types";

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
  listHoldingSnapshots(portfolioId: string, limit?: number): Promise<HoldingSnapshot[]>;
  listCashSnapshots(portfolioId: string, limit?: number): Promise<CashSnapshot[]>;
  refreshHoldingPortfolioMetrics(portfolioId: string): Promise<void>;
  listHoldingMarketMetrics(portfolioId: string): Promise<HoldingMarketMetric[]>;
  getPortfolioCurrentMetric(portfolioId: string): Promise<PortfolioCurrentMetric | null>;
  getPortfolioPerformanceSummary(portfolioId: string): Promise<PortfolioPerformanceSummary | null>;
  upsertPortfolioPerformanceSummary(input: Omit<PortfolioPerformanceSummary, "updatedAt">): Promise<void>;
  upsertPortfolioSnapshot(input: UpsertPortfolioSnapshotInput): Promise<void>;
  upsertAssetSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    valuations: HoldingValuation[];
  }): Promise<void>;
  upsertHoldingSnapshots(input: {
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
