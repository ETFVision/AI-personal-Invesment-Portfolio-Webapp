export type AssetType = "stock" | "etf" | "bond_etf" | "gold_etf" | "crypto" | "cash" | "other";

export type TransactionType =
  | "buy"
  | "sell"
  | "deposit_cash"
  | "withdraw_cash"
  | "interest_cash"
  | "dividend"
  | "fee"
  | "manual_adjustment";

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  baseCurrency: string;
  timezone: string;
  riskProfile: string | null;
};

export type Portfolio = {
  id: string;
  userId: string;
  name: string;
  baseCurrency: string;
  isDefault: boolean;
};

export type Asset = {
  id: string;
  assetType: AssetType;
  ticker: string | null;
  symbol: string | null;
  name: string;
  currency: string | null;
  sector?: string | null;
  country?: string | null;
  region?: string | null;
};

export type CashBalance = {
  id: string;
  portfolioId: string;
  accountName: string | null;
  brokerName: string | null;
  currency: string;
  amount: number;
  asOfDate: string;
  notes: string | null;
};

export type Holding = {
  id: string;
  portfolioId: string;
  assetId: string;
  assetType: AssetType;
  ticker: string | null;
  assetName: string;
  accountName: string | null;
  brokerName: string | null;
  quantity: number;
  averageCost: number | null;
  costCurrency: string;
  firstPurchaseDate: string | null;
  notes: string | null;
  sector?: string | null;
  country?: string | null;
  region?: string | null;
};

export type DailyPrice = {
  id: string;
  assetId: string;
  provider: string;
  symbol: string;
  priceDate: string;
  closePrice: number;
  currency: string | null;
};

export type HoldingValuation = {
  holding: Holding;
  unitPrice: number | null;
  value: number;
  valueCurrency: string;
  priceDate: string | null;
  priceProvider: string | null;
  valuationSource: "market_price" | "cost_basis";
};

export type AllocationItem = {
  label: string;
  value: number;
  percent: number;
};

export type PerformanceMetric = {
  label: "Daily" | "Weekly" | "Monthly" | "1Y" | "YTD" | "Since inception";
  valueChange: number | null;
  percentChange: number | null;
  baselineDate: string | null;
};

export type PortfolioSnapshot = {
  id: string;
  portfolioId: string;
  snapshotDate: string;
  totalValue: number;
  cashValue: number;
  investedValue: number;
  currency: string;
};

export type AssetSnapshot = {
  id: string;
  portfolioId: string;
  assetId: string;
  snapshotDate: string;
  marketValue: number;
  costBasis: number | null;
  currency: string;
};

export type HoldingSnapshot = {
  id: string;
  portfolioId: string;
  holdingId: string;
  assetId: string;
  snapshotDate: string;
  quantity: number;
  marketPrice: number | null;
  marketValue: number;
  costBasis: number | null;
  unrealizedGainLoss: number | null;
  currency: string;
};

export type CashSnapshot = {
  id: string;
  portfolioId: string;
  cashBalanceId: string;
  snapshotDate: string;
  amount: number;
  currency: string;
};

export type ProductPerformance = {
  holdingId: string;
  assetId: string;
  metrics: PerformanceMetric[];
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  totalGainLoss: number;
};

export type CashPerformance = {
  cashBalanceId: string;
  metrics: PerformanceMetric[];
  netDeposits: number;
  netWithdrawals: number;
};

export type Transaction = {
  id: string;
  portfolioId: string;
  assetId: string | null;
  transactionType: TransactionType;
  assetType: AssetType | null;
  ticker: string | null;
  assetName: string | null;
  accountName: string | null;
  brokerName: string | null;
  quantity: number | null;
  price: number | null;
  fees: number;
  grossAmount: number | null;
  netAmount: number | null;
  currency: string;
  transactionDate: string;
  notes: string | null;
};

export type PortfolioDashboard = {
  portfolio: Portfolio;
  cashBalances: CashBalance[];
  holdings: Holding[];
  holdingValuations: HoldingValuation[];
  totalCash: number;
  totalHoldingsCost: number;
  totalHoldingsMarketValue: number;
  totalValueEstimate: number;
  investedAmount: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  realizedGainLoss: number;
  allocationByType: AllocationItem[];
  allocationBySector: AllocationItem[];
  allocationByGeography: AllocationItem[];
  currencyExposure: Array<AllocationItem & { currency: string }>;
  topWinners: Array<{ valuation: HoldingValuation; gainLoss: number; gainLossPercent: number }>;
  topLosers: Array<{ valuation: HoldingValuation; gainLoss: number; gainLossPercent: number }>;
  performance: PerformanceMetric[];
  productPerformance: ProductPerformance[];
  cashPerformance: CashPerformance[];
  cashPercent: number;
  investedPercent: number;
  latestPriceDate: string | null;
};
