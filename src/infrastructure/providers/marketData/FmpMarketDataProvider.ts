import { MarketDataProvider, MarketPriceQuote } from "@/application/ports/providers/MarketDataProvider";
import { env } from "@/infrastructure/config/env";

type FmpQuoteShort = {
  symbol?: string;
  price?: number;
};

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const FMP_BATCH_SIZE = 25;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export class FmpMarketDataProvider implements MarketDataProvider {
  readonly name = "financial_modeling_prep";

  async getLatestPrices(symbols: string[]): Promise<MarketPriceQuote[]> {
    if (!env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured.");
    }

    const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
    const quotes: MarketPriceQuote[] = [];

    for (let index = 0; index < uniqueSymbols.length; index += FMP_BATCH_SIZE) {
      const batch = uniqueSymbols.slice(index, index + FMP_BATCH_SIZE);
      const url = new URL(`${FMP_BASE_URL}/quote-short/${batch.join(",")}`);
      url.searchParams.set("apikey", env.FMP_API_KEY);

      const response = await fetch(url, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(10_000)
      });

      if (!response.ok) {
        throw new Error(`FMP request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as FmpQuoteShort[] | { "Error Message"?: string };
      if (!Array.isArray(payload)) {
        throw new Error(payload["Error Message"] ?? "FMP returned an unexpected response.");
      }

      for (const item of payload) {
        if (!item.symbol || typeof item.price !== "number" || !Number.isFinite(item.price)) continue;
        quotes.push({
          symbol: item.symbol.toUpperCase(),
          price: item.price,
          currency: null,
          asOfDate: todayIsoDate(),
          raw: item
        });
      }
    }

    return quotes;
  }
}
