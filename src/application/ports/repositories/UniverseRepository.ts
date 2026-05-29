import {
  BenchmarkProfile,
  BondProfile,
  CryptoProfile,
  InstrumentMarketMetric,
  InstrumentPrice,
  Instrument,
  MetadataRefreshLog,
  Watchlist,
  WatchlistItem
} from "@/domain/universe/types";

export type ListInstrumentsFilters = {
  query?: string;
  assetClass?: string;
  isActive?: boolean;
  watchlistTier?: string;
  limit?: number;
};

export type UpsertInstrumentInput = Omit<Instrument, "id"> & { id?: string };

export type UpsertWatchlistInput = Omit<Watchlist, "id"> & { id?: string };

export type UpsertWatchlistItemInput = Omit<WatchlistItem, "id" | "watchlistKey" | "symbol" | "name" | "watchlistTier"> & {
  id?: string;
};

export type UpsertInstrumentPriceInput = Omit<InstrumentPrice, "id"> & { id?: string };

export type InstrumentPriceStats = {
  instrumentId: string;
  earliestPriceDate: string | null;
  latestPriceDate: string | null;
  observationCount: number;
};

export interface UniverseRepository {
  listInstruments(filters?: ListInstrumentsFilters): Promise<Instrument[]>;
  upsertInstruments(input: UpsertInstrumentInput[]): Promise<void>;
  setInstrumentActive(instrumentId: string, isActive: boolean): Promise<void>;
  updateInstrumentTags(input: Array<{ instrumentId: string; benchmarkTags: string[]; thematicTags: string[] }>): Promise<void>;
  updateInstrumentMetadata(input: Array<{
    provider: string;
    symbol: string;
    name: string | null;
    exchange: string | null;
    currency: string | null;
    country: string | null;
    region: string | null;
    sector: string | null;
    industry: string | null;
    rawPayload: unknown;
  }>): Promise<void>;
  listWatchlists(): Promise<Watchlist[]>;
  upsertWatchlists(input: UpsertWatchlistInput[]): Promise<void>;
  listWatchlistItems(watchlistIds?: string[]): Promise<WatchlistItem[]>;
  upsertWatchlistItems(input: UpsertWatchlistItemInput[]): Promise<void>;
  listBondProfiles(): Promise<BondProfile[]>;
  upsertBondProfiles(input: BondProfile[]): Promise<void>;
  listBenchmarkProfiles(): Promise<BenchmarkProfile[]>;
  upsertBenchmarkProfiles(input: BenchmarkProfile[]): Promise<void>;
  listCryptoProfiles(): Promise<CryptoProfile[]>;
  upsertCryptoProfiles(input: CryptoProfile[]): Promise<void>;
  listMetadataRefreshLogs(limit?: number): Promise<MetadataRefreshLog[]>;
  insertMetadataRefreshLog(input: Omit<MetadataRefreshLog, "id" | "createdAt">): Promise<void>;
  listInstrumentPrices(instrumentIds?: string[], sinceDate?: string): Promise<InstrumentPrice[]>;
  listInstrumentPriceStats(instrumentIds?: string[]): Promise<InstrumentPriceStats[]>;
  listInstrumentMarketMetrics(instrumentIds?: string[]): Promise<InstrumentMarketMetric[]>;
  refreshInstrumentMarketMetrics(instrumentIds?: string[]): Promise<void>;
  upsertInstrumentPrices(input: UpsertInstrumentPriceInput[]): Promise<void>;
}
