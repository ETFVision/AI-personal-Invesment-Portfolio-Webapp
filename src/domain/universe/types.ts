export type InstrumentAssetClass =
  | "etf"
  | "stock"
  | "crypto"
  | "benchmark"
  | "bond_etf"
  | "gold_etf"
  | "cash_proxy"
  | "other";

export type WatchlistTier = "core_quality" | "tactical_thematic" | "opportunistic";

export type Instrument = {
  id: string;
  symbol: string | null;
  name: string;
  assetClass: InstrumentAssetClass;
  instrumentType: string;
  sector: string | null;
  industry: string | null;
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
  providerPrimary: string | null;
  providerMetadata: Record<string, unknown>;
  sourceType: string;
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
