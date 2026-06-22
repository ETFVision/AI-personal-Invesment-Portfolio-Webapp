import { HistoricalMarketPriceQuote, MarketDataProvider, MarketPriceQuote } from "@/application/ports/providers/MarketDataProvider";
import { env } from "@/infrastructure/config/env";

type FmpQuoteShort = {
  symbol?: string;
  price?: number;
};

type FmpEodLight = {
  symbol?: string;
  date?: string;
  price?: number;
  volume?: number;
};

type FmpBulkEod = {
  symbol?: string;
  date?: string;
  adjClose?: number;
  close?: number;
  price?: number;
  volume?: number;
};

type FmpHistoricalPriceFull = {
  symbol?: string;
  historical?: Array<{
    date?: string;
    close?: number;
    adjClose?: number;
    price?: number;
    volume?: number;
  }>;
  historicalData?: Array<{
    date?: string;
    close?: number;
    adjClose?: number;
    price?: number;
    volume?: number;
  }>;
};

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const FMP_BATCH_SIZE = 25;
const FMP_MAX_ATTEMPTS = 2;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHistoricalSymbol(symbol: string, assetClass?: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized === "BRK.B") return "BRK-B";
  if (assetClass === "crypto" && !normalized.endsWith("USD")) {
    return `${normalized}USD`;
  }
  return normalized;
}

function normalizeLatestSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized === "BRK.B") return "BRK-B";
  return normalized;
}

function parseHistoricalQuotes(
  payload: unknown,
  symbol: string
): HistoricalMarketPriceQuote[] {
  const normalizeQuote = (item: { date?: string; close?: number; adjClose?: number; price?: number }) => ({
    symbol,
    price:
      typeof item.adjClose === "number"
        ? item.adjClose
        : typeof item.close === "number"
          ? item.close
          : Number(item.price ?? NaN),
    currency: null,
    asOfDate: item.date ?? "",
    raw: item
  });

  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeQuote(item as { date?: string; close?: number; price?: number }))
      .filter((item) => item.asOfDate && Number.isFinite(item.price))
      .sort((a, b) => a.asOfDate.localeCompare(b.asOfDate));
  }

  if (!payload || typeof payload !== "object") return [];

  const typed = payload as FmpHistoricalPriceFull & { "Error Message"?: string };
  if ("Error Message" in typed && typed["Error Message"]) {
    throw new Error(typed["Error Message"]);
  }

  const prices = typed.historical ?? typed.historicalData ?? [];
  return prices
    .map((item) => normalizeQuote(item))
    .filter((item) => item.asOfDate && Number.isFinite(item.price))
    .sort((a, b) => a.asOfDate.localeCompare(b.asOfDate));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: URL) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= FMP_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(10_000)
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`FMP request failed with status ${response.status}.`);
        if (attempt < FMP_MAX_ATTEMPTS) {
          await sleep(500 * attempt);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("FMP request failed.");
      if (attempt < FMP_MAX_ATTEMPTS) {
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("FMP request failed.");
}

export class FmpMarketDataProvider implements MarketDataProvider {
  readonly name = "financial_modeling_prep";

  async getLatestPrices(symbols: string[]): Promise<MarketPriceQuote[]> {
    if (!env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured.");
    }

    const apiKey = env.FMP_API_KEY;
    const uniqueSymbols = Array.from(new Set(symbols.map(normalizeLatestSymbol).filter(Boolean)));
    const realtimeQuotes = await this.tryGetRealtimeQuotes(uniqueSymbols, apiKey);
    const realtimeSymbols = new Set(realtimeQuotes.map((quote) => quote.symbol.toUpperCase()));
    const missingSymbols = uniqueSymbols.filter((symbol) => !realtimeSymbols.has(symbol));

    if (missingSymbols.length === 0) return realtimeQuotes;

    const eodQuotes = await this.getLatestEndOfDayPrices(missingSymbols, apiKey);
    return [...realtimeQuotes, ...eodQuotes];
  }

  async getHistoricalPrices(
    symbol: string,
    from: string,
    to: string,
    context?: { assetClass?: string }
  ): Promise<HistoricalMarketPriceQuote[]> {
    if (!env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured.");
    }

    const apiKey = env.FMP_API_KEY;
    const normalizedSymbol = normalizeHistoricalSymbol(symbol, context?.assetClass);
    const candidates = [new URL(`${FMP_BASE_URL}/historical-price-eod/full`)];

    for (const url of candidates) {
      url.searchParams.set("symbol", normalizedSymbol);
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);

      const response = await fetchWithRetry(url);

      if (response.status === 402 || response.status === 403) {
        return [];
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        throw new Error(`FMP historical request for ${normalizedSymbol} failed with status ${response.status}.`);
      }

      const payload = await response.json();
      const normalizedPrices = parseHistoricalQuotes(payload, normalizedSymbol).filter((quote) => quote.asOfDate >= from && quote.asOfDate <= to);

      if (normalizedPrices.length > 0) return normalizedPrices;
    }

    return [];
  }

  async getBulkEodPrices(date: string): Promise<MarketPriceQuote[]> {
    if (!env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY is not configured.");
    }

    const url = new URL(`${FMP_BASE_URL}/eod-bulk`);
    url.searchParams.set("date", date);
    url.searchParams.set("apikey", env.FMP_API_KEY);

    const response = await fetchWithRetry(url);

    if (response.status === 402 || response.status === 403 || response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`FMP bulk EOD request for ${date} failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as FmpBulkEod[] | { "Error Message"?: string };
    if (!Array.isArray(payload)) {
      throw new Error(payload["Error Message"] ?? `FMP returned an unexpected bulk EOD response for ${date}.`);
    }

    return payload
      .map((item) => {
        const price =
          typeof item.adjClose === "number"
            ? item.adjClose
            : typeof item.close === "number"
              ? item.close
              : Number(item.price ?? NaN);
        return {
          symbol: item.symbol?.trim().toUpperCase() ?? "",
          price,
          currency: null,
          asOfDate: date,
          raw: item
        };
      })
      .filter((quote) => quote.symbol && Number.isFinite(quote.price));
  }

  private async tryGetRealtimeQuotes(uniqueSymbols: string[], apiKey: string) {
    const quotes: MarketPriceQuote[] = [];

    for (let index = 0; index < uniqueSymbols.length; index += FMP_BATCH_SIZE) {
      const batch = uniqueSymbols.slice(index, index + FMP_BATCH_SIZE);
      const url = new URL(`${FMP_BASE_URL}/batch-quote-short`);
      url.searchParams.set("symbols", batch.join(","));
      url.searchParams.set("apikey", apiKey);

      const response = await fetchWithRetry(url);

      if (response.status === 402 || response.status === 403) {
        return [];
      }

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

  private async getLatestEndOfDayPrices(uniqueSymbols: string[], apiKey: string) {
    const quotes: MarketPriceQuote[] = [];

    for (const symbol of uniqueSymbols) {
      const url = new URL(`${FMP_BASE_URL}/historical-price-eod/light`);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", apiKey);

      const response = await fetchWithRetry(url);

      if (response.status === 402 || response.status === 403 || response.status === 404) {
        continue;
      }

      if (!response.ok) {
        throw new Error(`FMP EOD request for ${symbol} failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as FmpEodLight[] | { "Error Message"?: string };
      if (!Array.isArray(payload)) {
        throw new Error(payload["Error Message"] ?? `FMP returned an unexpected EOD response for ${symbol}.`);
      }

      const latest = payload.find((item) => typeof item.price === "number" && Number.isFinite(item.price));
      if (!latest?.date || typeof latest.price !== "number") continue;

      quotes.push({
        symbol,
        price: latest.price,
        currency: null,
        asOfDate: latest.date,
        raw: latest
      });
    }

    return quotes;
  }
}
