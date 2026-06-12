export type InstrumentAssetClass =
  | "etf"
  | "stock"
  | "crypto"
  | "benchmark"
  | "bond_etf"
  | "gold_etf"
  | "cash_proxy"
  | "other";

export type InstrumentAssetCategory =
  | "EQUITY"
  | "BOND"
  | "COMMODITY"
  | "REAL_ESTATE"
  | "CASH"
  | "CRYPTO"
  | "MULTI_ASSET"
  | "UNKNOWN";

export type WatchlistTier = "core_quality" | "tactical_thematic" | "opportunistic";

export type Instrument = {
  id: string;
  securityId?: string | null;
  symbol: string | null;
  name: string;
  assetClass: InstrumentAssetClass;
  assetCategory?: InstrumentAssetCategory | null;
  etfCategory?: string | null;
  instrumentType: string;
  sector: string | null;
  industry: string | null;
  canonicalSector: string | null;
  canonicalThemes: string[];
  taxonomyIsManualOverride: boolean;
  taxonomyReviewStatus: string;
  geography: string | null;
  currency: string | null;
  exchange: string | null;
  watchlistTier: WatchlistTier | null;
  benchmarkTags: string[];
  thematicTags: string[];
  riskCategory: string | null;
  volatilityBucket: string | null;
  durationCategory: string | null;
  treasuryClassification: string | null;
  inflationLinked: boolean | null;
  creditQuality: string | null;
  geoExposure: string | null;
  rateSensitivity: string | null;
  inflationSensitivity: string | null;
  recessionSensitivity: string | null;
  liquidityRole: string | null;
  cryptoClassification: string | null;
  metadataLastRefreshedAt: string | null;
  identifierLastRefreshedAt?: string | null;
  isin?: string | null;
  cusip?: string | null;
  figi?: string | null;
  providerSymbol?: string | null;
  providerPrimary: string | null;
  providerMetadata: Record<string, unknown>;
  sourceType: string;
  isUserSelectable?: boolean;
  isInternalOnly?: boolean;
  isActive: boolean;
};

export type InstrumentPrice = {
  id: string;
  instrumentId: string;
  provider: string;
  symbol: string;
  priceDate: string;
  closePrice: number;
  currency: string | null;
  rawPayload: unknown;
};

export type InstrumentMarketMetric = {
  instrumentId: string;
  latestPrice: number | null;
  latestPriceDate: string | null;
  previousClosePrice: number | null;
  previousPriceDate: string | null;
  dailyReturn: number | null;
  ytdReturn: number | null;
  oneYearReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  observationCount: number;
  historyStartDate: string | null;
  historyEndDate: string | null;
  updatedAt: string | null;
};

export type InstrumentRiskMetric = {
  instrumentId: string;
  metricDate: string;
  volatility30d: number | null;
  volatility90d: number | null;
  volatility1y: number | null;
  volatilityTrend: "rising" | "stable" | "falling" | "insufficient_data";
  downsideVolatility: number | null;
  currentDrawdown1y: number | null;
  maxDrawdown1y: number | null;
  currentDrawdown3y: number | null;
  maxDrawdown3y: number | null;
  currentDrawdown5y: number | null;
  maxDrawdown5y: number | null;
  currentDrawdown: number | null;
  maxDrawdown: number | null;
  drawdownDurationDays: number | null;
  drawdownBucket: "low" | "moderate" | "elevated" | "severe" | "insufficient_data";
  negativeReturnFrequency: number | null;
  worstDailyReturn: number | null;
  worstWeeklyReturn: number | null;
  riskScore: number | null;
  riskBucket: "low" | "medium" | "high" | "very_high" | "insufficient_data";
  volatilityBucket: "low" | "medium" | "high" | "very_high" | "insufficient_data";
  confidenceScore: number;
  observationCount: number;
  historyStartDate: string | null;
  historyEndDate: string | null;
  calculatedAt: string | null;
};

export type InstrumentMarketDetailField = {
  label: string;
  value: string;
};

export type InstrumentMarketView = {
  instrument: Instrument;
  rank: number;
  latestPrice: number | null;
  latestPriceDate: string | null;
  dailyReturn: number | null;
  ytdReturn: number | null;
  oneYearReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  liquidity: string;
  freshnessLabel: string;
  freshnessTone: string;
  priceObservationCount: number;
  priceHistoryStart: string | null;
  priceHistoryEnd: string | null;
  detailFields: InstrumentMarketDetailField[];
};

export type Watchlist = {
  id: string;
  watchlistKey: string;
  name: string;
  watchlistTier: WatchlistTier;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  humanApprovalRequired: boolean;
  sourceType: string;
};

export type WatchlistItem = {
  id: string;
  watchlistId: string;
  instrumentId: string;
  watchlistKey: string;
  symbol: string | null;
  name: string;
  watchlistTier: WatchlistTier;
  itemRank: number | null;
  rationale: string | null;
  approvalStatus: string;
  isActive: boolean;
};

export type BondProfile = {
  instrumentId: string;
  symbol: string | null;
  durationCategory: string | null;
  treasuryClassification: string | null;
  inflationLinked: boolean | null;
  creditQuality: string | null;
  geoExposure: string | null;
  rateSensitivity: string | null;
  inflationSensitivity: string | null;
  recessionSensitivity: string | null;
  liquidityRole: string | null;
  currency: string | null;
  secYield: number | null;
  distributionYield: number | null;
  yieldToMaturity: number | null;
  yieldAsOfDate: string | null;
  effectiveDuration: number | null;
  averageMaturity: number | null;
  spreadDuration: number | null;
  optionAdjustedSpread: number | null;
  expenseRatio: number | null;
  isManualOverride: boolean;
  updatedAt: string | null;
  providerMetadata: Record<string, unknown>;
};

export type BenchmarkProfile = {
  id: string;
  benchmarkKey: string;
  benchmarkName: string;
  benchmarkType: "equity" | "bond" | "commodity" | "crypto" | "composite";
  instrumentId: string | null;
  instrumentSymbol: string | null;
  providerSymbol: string | null;
  currency: string;
  baseValue: number;
  components: Array<{ symbol: string; weight: number }>;
  notes: string | null;
  isActive: boolean;
};

export type CryptoProfile = {
  instrumentId: string;
  symbol: string | null;
  chain: string | null;
  marketCapBucket: string | null;
  custodyRisk: string | null;
  volatilityBucket: string | null;
  providerMetadata: Record<string, unknown>;
};

export type MetadataRefreshLog = {
  id: string;
  refreshScope: string;
  provider: string;
  requestedCount: number;
  updatedCount: number;
  missingCount: number;
  status: string;
  message: string | null;
  requestedSymbols: string[];
  missingSymbols: string[];
  requestedByUserId: string | null;
  createdAt: string;
  completedAt: string | null;
  details: Record<string, unknown>;
};
