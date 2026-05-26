export type MarketPriceQuote = {
  symbol: string;
  price: number;
  currency: string | null;
  asOfDate: string;
  raw: unknown;
};

export interface MarketDataProvider {
  readonly name: string;
  getLatestPrices(symbols: string[]): Promise<MarketPriceQuote[]>;
}
