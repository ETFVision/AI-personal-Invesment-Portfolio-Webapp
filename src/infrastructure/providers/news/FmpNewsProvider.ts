import type { NewsProvider, NewsProviderRequest } from "@/application/ports/providers/NewsProvider";
import type { NormalizedNewsArticle } from "@/domain/news/types";
import { env } from "@/infrastructure/config/env";

type FmpNewsRow = {
  symbol?: string;
  publishedDate?: string;
  date?: string;
  title?: string;
  image?: string;
  site?: string;
  text?: string;
  url?: string;
  author?: string;
  tickers?: string[];
};

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(12_000) });
      if (response.status === 402 || response.status === 403 || response.status === 404) return [];
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`FMP news request failed with status ${response.status}.`);
        if (attempt < 2) {
          await sleep(600 * attempt);
          continue;
        }
      }
      if (!response.ok) throw new Error(`FMP news request failed with status ${response.status}.`);
      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("FMP news request failed.");
      if (attempt < 2) await sleep(600 * attempt);
    }
  }
  throw lastError ?? new Error("FMP news request failed.");
}

function normalizeRow(row: FmpNewsRow, fallbackSymbol: string | undefined, endpoint: "stock" | "general-latest"): NormalizedNewsArticle | null {
  const title = row.title?.trim();
  if (!title) return null;
  const symbol = row.symbol ?? fallbackSymbol;
  const rawSymbols = Array.from(new Set([symbol, ...(row.tickers ?? [])].filter((item): item is string => Boolean(item))));
  const url = row.url ?? null;
  return {
    sourceProvider: "financial_modeling_prep",
    sourceId: url ?? `${title}|${row.publishedDate ?? row.date ?? ""}`,
    url,
    title,
    summary: row.text?.trim() ? row.text.trim().slice(0, 600) : null,
    contentSnippet: row.text?.trim() ? row.text.trim().slice(0, 240) : null,
    publishedAt: row.publishedDate ?? row.date ?? null,
    fetchedAt: new Date().toISOString(),
    tickers: rawSymbols.map((item) => item.toUpperCase()),
    rawSymbols,
    sourceName: row.site ?? null,
    author: row.author ?? null,
    imageUrl: row.image ?? null,
    language: "en",
    country: null,
    providerMetadata: { ...row, newsEndpoint: endpoint } as Record<string, unknown>
  };
}

export class FmpNewsProvider implements NewsProvider {
  readonly name = "financial_modeling_prep";

  async fetchNews(input: NewsProviderRequest): Promise<NormalizedNewsArticle[]> {
    if (!env.FMP_API_KEY) throw new Error("FMP_API_KEY is not configured.");
    const symbols = Array.from(new Set(input.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
    const rows: NormalizedNewsArticle[] = [];

    for (const symbol of symbols) {
      if (rows.length >= input.maxArticlesTotal) break;
      const url = new URL(`${FMP_BASE_URL}/news/stock`);
      url.searchParams.set("symbols", symbol);
      url.searchParams.set("limit", String(input.maxArticlesPerInstrument));
      url.searchParams.set("apikey", env.FMP_API_KEY);
      const payload = await fetchJsonWithRetry(url);
      const items = Array.isArray(payload) ? payload : [];
      for (const item of items) {
        const normalized = normalizeRow(item as FmpNewsRow, symbol, "stock");
        if (normalized) rows.push(normalized);
        if (rows.length >= input.maxArticlesTotal) break;
      }
    }

    if (input.includeGeneralMarketNews && rows.length < input.maxArticlesTotal) {
      const url = new URL(`${FMP_BASE_URL}/news/general-latest`);
      url.searchParams.set("limit", String(Math.min(20, input.maxArticlesTotal - rows.length)));
      url.searchParams.set("apikey", env.FMP_API_KEY);
      const payload = await fetchJsonWithRetry(url);
      const items = Array.isArray(payload) ? payload : [];
      for (const item of items) {
        const normalized = normalizeRow(item as FmpNewsRow, undefined, "general-latest");
        if (normalized) rows.push(normalized);
      }
    }

    return rows.slice(0, input.maxArticlesTotal);
  }
}
