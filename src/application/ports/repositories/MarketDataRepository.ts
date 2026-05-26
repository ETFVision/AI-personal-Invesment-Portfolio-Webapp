import { Asset, DailyPrice, Holding } from "@/domain/portfolio/types";

export type UpsertDailyPriceInput = {
  assetId: string;
  provider: string;
  symbol: string;
  priceDate: string;
  closePrice: number;
  currency: string | null;
  rawPayload: unknown;
};

export interface MarketDataRepository {
  listPricedPortfolioHoldings(portfolioId: string): Promise<Holding[]>;
  listWatchlistAssets(userId: string): Promise<Asset[]>;
  getLatestPricesForAssets(assetIds: string[]): Promise<Map<string, DailyPrice>>;
  getPricesForAssetsOnDate(assetIds: string[], priceDate: string, provider: string): Promise<Map<string, DailyPrice>>;
  upsertDailyPrices(input: UpsertDailyPriceInput[]): Promise<void>;
}
