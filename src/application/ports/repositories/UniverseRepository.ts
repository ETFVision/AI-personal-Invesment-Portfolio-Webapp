import {
  BenchmarkProfile,
  BondProfile,
  CryptoProfile,
  InstrumentMarketMetric,
  InstrumentPrice,
  InstrumentRiskMetric,
  Instrument,
  MetadataRefreshLog,
  Watchlist,
  WatchlistItem
} from "@/domain/universe/types";

export type CanonicalTaxonomyItem = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type ProviderTaxonomyMapping = {
  id: string;
  sourceProvider: string;
  mappingType: string;
  rawValue: string;
  canonicalValue: string;
  confidence: number;
  isManualOverride: boolean;
};

export type InstrumentTaxonomyMapping = {
  instrumentId: string;
  symbol: string | null;
  name: string;
  rawSector: string | null;
  rawIndustry: string | null;
  canonicalSector: string | null;
  canonicalThemes: string[];
  taxonomyIsManualOverride: boolean;
  taxonomyReviewStatus: string;
};

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
export type UpsertInstrumentRiskMetricInput = Omit<InstrumentRiskMetric, "calculatedAt"> & { calculatedAt?: string | null };

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
    canonicalSector?: string | null;
    canonicalThemes?: string[];
    unmappedRawValues?: string[];
  }>): Promise<void>;
  listCanonicalSectors(): Promise<CanonicalTaxonomyItem[]>;
  listCanonicalThemes(): Promise<CanonicalTaxonomyItem[]>;
  listProviderTaxonomyMappings(): Promise<ProviderTaxonomyMapping[]>;
  listInstrumentTaxonomyMappings(): Promise<InstrumentTaxonomyMapping[]>;
  upsertInstrumentTaxonomy(input: Array<{
    instrumentId: string;
    rawSector: string | null;
    rawIndustry: string | null;
    canonicalSector: string;
    canonicalThemes: string[];
    sourceProvider: string;
    confidence?: number;
    isManualOverride?: boolean;
    reviewStatus?: string;
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
  refreshInstrumentDailyReturns(instrumentIds?: string[]): Promise<void>;
  refreshInstrumentReturnAnchors(instrumentIds?: string[]): Promise<void>;
  listInstrumentMarketMetrics(instrumentIds?: string[]): Promise<InstrumentMarketMetric[]>;
  refreshInstrumentMarketMetrics(instrumentIds?: string[]): Promise<void>;
  refreshInstrumentMarketMetricsOnly(instrumentIds?: string[]): Promise<void>;
  listInstrumentRiskMetrics(instrumentIds?: string[]): Promise<InstrumentRiskMetric[]>;
  refreshInstrumentRiskMetrics(instrumentIds?: string[]): Promise<void>;
  upsertInstrumentRiskMetrics(input: UpsertInstrumentRiskMetricInput[]): Promise<void>;
  upsertInstrumentPrices(input: UpsertInstrumentPriceInput[]): Promise<void>;
}
