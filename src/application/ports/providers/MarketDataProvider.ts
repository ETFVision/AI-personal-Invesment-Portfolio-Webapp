export type MarketPriceQuote = {
  symbol: string;
  price: number;
  currency: string | null;
  asOfDate: string;
  raw: unknown;
};

export type HistoricalMarketPriceQuote = MarketPriceQuote;

export interface MarketDataProvider {
  readonly name: string;
  getLatestPrices(symbols: string[]): Promise<MarketPriceQuote[]>;
  getHistoricalPrices(
    symbol: string,
    from: string,
    to: string,
    context?: { assetClass?: string }
  ): Promise<HistoricalMarketPriceQuote[]>;
}
