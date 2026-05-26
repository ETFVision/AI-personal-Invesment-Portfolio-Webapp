import { MarketDataProvider } from "@/application/ports/providers/MarketDataProvider";
import { MarketDataRepository } from "@/application/ports/repositories/MarketDataRepository";

export type RefreshPricesResult = {
  requestedSymbols: string[];
  fetchedCount: number;
  skippedCount: number;
  storedCount: number;
  errors: string[];
  message: string;
};

const MAX_SYMBOLS_PER_REFRESH = 75;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueSymbols(symbols: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol))
    )
  );
}

export class MarketDataService {
  constructor(
    private readonly repository: MarketDataRepository,
    private readonly provider: MarketDataProvider
  ) {}

  async refreshPortfolioPrices(input: { userId: string; portfolioId: string }): Promise<RefreshPricesResult> {
    const [holdings, watchlistAssets] = await Promise.all([
      this.repository.listPricedPortfolioHoldings(input.portfolioId),
      this.repository.listWatchlistAssets(input.userId)
    ]);
    const holdingsBySymbol = new Map(
      holdings
        .filter((holding) => holding.ticker)
        .map((holding) => [holding.ticker!.toUpperCase(), holding])
    );
    const symbols = uniqueSymbols([
      ...holdings.map((holding) => holding.ticker),
      ...watchlistAssets.map((asset) => asset.ticker ?? asset.symbol)
    ]).slice(0, MAX_SYMBOLS_PER_REFRESH);

    if (symbols.length === 0) {
      return {
        requestedSymbols: [],
        fetchedCount: 0,
        skippedCount: 0,
        storedCount: 0,
        errors: [],
        message: "No priced holdings or watchlist symbols were found."
      };
    }

    const assetIds = holdings.map((holding) => holding.assetId);
    const existingToday = await this.repository.getPricesForAssetsOnDate(assetIds, todayIsoDate(), this.provider.name);
    const symbolsToFetch = symbols.filter((symbol) => {
      const holding = holdingsBySymbol.get(symbol);
      return !holding || !existingToday.has(holding.assetId);
    });

    if (symbolsToFetch.length === 0) {
      return {
        requestedSymbols: symbols,
        fetchedCount: 0,
        skippedCount: symbols.length,
        storedCount: 0,
        errors: [],
        message: "Prices are already refreshed for today."
      };
    }

    try {
      const quotes = await this.provider.getLatestPrices(symbolsToFetch);
      const rows = quotes.flatMap((quote) => {
        const holding = holdingsBySymbol.get(quote.symbol.toUpperCase());
        if (!holding) return [];
        return [
          {
            assetId: holding.assetId,
            provider: this.provider.name,
            symbol: quote.symbol.toUpperCase(),
            priceDate: quote.asOfDate,
            closePrice: quote.price,
            currency: quote.currency ?? holding.costCurrency,
            rawPayload: quote.raw
          }
        ];
      });

      if (rows.length > 0) {
        await this.repository.upsertDailyPrices(rows);
      }

      return {
        requestedSymbols: symbols,
        fetchedCount: quotes.length,
        skippedCount: symbols.length - symbolsToFetch.length,
        storedCount: rows.length,
        errors: rows.length === quotes.length ? [] : ["Some symbols returned by the provider did not match current holdings."],
        message: rows.length > 0 ? `Stored ${rows.length} latest price${rows.length === 1 ? "" : "s"}.` : "No matching prices were stored."
      };
    } catch (error) {
      return {
        requestedSymbols: symbols,
        fetchedCount: 0,
        skippedCount: symbols.length - symbolsToFetch.length,
        storedCount: 0,
        errors: [error instanceof Error ? error.message : "Price refresh failed."],
        message: "Price refresh failed."
      };
    }
  }
}
