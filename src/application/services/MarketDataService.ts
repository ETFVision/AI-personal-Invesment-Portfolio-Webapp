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

function latestExpectedEodDate() {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 8);
  date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
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
    const latestPrices = await this.repository.getLatestPricesForAssets(assetIds);
    const expectedPriceDate = latestExpectedEodDate();
    const symbolsToFetch = symbols.filter((symbol) => {
      const holding = holdingsBySymbol.get(symbol);
      if (!holding) return false;
      const latestPrice = latestPrices.get(holding.assetId);
      return !latestPrice || latestPrice.priceDate < expectedPriceDate;
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
      const returnedSymbols = new Set(quotes.map((quote) => quote.symbol.toUpperCase()));
      const missingSymbols = symbolsToFetch.filter((symbol) => !returnedSymbols.has(symbol));
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
      const storedSymbols = new Set(rows.map((row) => row.symbol.toUpperCase()));
      const unstoredSymbols = quotes
        .map((quote) => quote.symbol.toUpperCase())
        .filter((symbol) => holdingsBySymbol.has(symbol) && !storedSymbols.has(symbol));
      const errors = [
        ...missingSymbols.map((symbol) => `No price returned for ${symbol}.`),
        ...unstoredSymbols.map((symbol) => `Price for ${symbol} could not be stored.`)
      ];

      if (rows.length > 0) {
        await this.repository.upsertDailyPrices(rows);
      }

      return {
        requestedSymbols: symbols,
        fetchedCount: quotes.length,
        skippedCount: symbols.length - symbolsToFetch.length,
        storedCount: rows.length,
        errors,
        message:
          rows.length > 0
            ? `Stored ${rows.length} latest price${rows.length === 1 ? "" : "s"}.${errors.length > 0 ? ` ${errors.length} symbol${errors.length === 1 ? "" : "s"} need attention.` : ""}`
            : `No prices were stored.${errors.length > 0 ? ` ${errors.join(" ")}` : ""}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Price refresh failed.";
      return {
        requestedSymbols: symbols,
        fetchedCount: 0,
        skippedCount: symbols.length - symbolsToFetch.length,
        storedCount: 0,
        errors: [errorMessage],
        message: `Price refresh failed: ${errorMessage}`
      };
    }
  }

  async syncPortfolioPricesFromInstrumentPrices(input: { portfolioId: string; provider?: string }): Promise<RefreshPricesResult> {
    const result = await this.repository.syncPortfolioDailyPricesFromInstrumentPrices(input.portfolioId, input.provider);
    const errors = result.missingSymbols.map((symbol) => `No instrument price available for ${symbol}.`);
    return {
      requestedSymbols: result.requestedSymbols,
      fetchedCount: 0,
      skippedCount: Math.max(0, result.requestedSymbols.length - result.syncedCount),
      storedCount: result.syncedCount,
      errors,
      message:
        result.syncedCount > 0
          ? `Synced ${result.syncedCount} portfolio asset price${result.syncedCount === 1 ? "" : "s"} from instrument prices.${errors.length > 0 ? ` ${errors.length} symbol${errors.length === 1 ? "" : "s"} still need instrument prices.` : ""}`
          : `No portfolio asset prices were synced from instrument prices.${errors.length > 0 ? ` ${errors.join(" ")}` : ""}`
    };
  }
}
