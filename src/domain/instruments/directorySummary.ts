import type { FundamentalsSummaryRow } from "@/domain/fundamentals/types";
import type { InstrumentMarketView, WatchlistTier } from "@/domain/universe/types";

export type InstrumentDirectoryWatchlistItem = {
  watchlistId: string;
  watchlistName: string | null;
  watchlistTier: WatchlistTier;
  itemRank: number | null;
  rationale: string | null;
  isActive: boolean;
};

export type InstrumentDirectorySummaryRow = {
  instrumentId: string;
  symbol: string | null;
  name: string;
  assetClass: string | null;
  assetCategory: string | null;
  instrumentType: string | null;
  stockSector: string | null;
  etfCategory: string | null;
  isActive: boolean;
  latestPriceDate: string | null;
  dailyReturn: number | null;
  marketView: InstrumentMarketView;
  fundamentalsSummary: FundamentalsSummaryRow | null;
  watchlistItems: InstrumentDirectoryWatchlistItem[];
  calculationVersion: string;
  status: "fresh" | "stale" | "pending" | "failed";
  sourceUpdatedAt: string | null;
  updatedAt: string | null;
};
