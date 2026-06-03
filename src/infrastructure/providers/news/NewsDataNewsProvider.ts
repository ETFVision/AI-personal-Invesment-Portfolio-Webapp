import type { NewsDataNewsProvider as NewsDataNewsProviderPort, NewsDataProviderArticle, NewsDataProviderRequest } from "@/application/ports/providers/NewsDataNewsProvider";
import { NewsDataNormalizationService } from "./NewsDataNormalizationService";

type NewsDataPayload = {
  status?: string;
  totalResults?: number;
  results?: unknown[];
  nextPage?: string;
};

const NEWSDATA_URL = "https://newsdata.io/api/1/latest";

class NewsDataProviderError extends Error {
  constructor(message: string, readonly status: number | null = null) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeQuery(query: string) {
  return query
    .trim()
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function buildUrl(input: { query: string; maxArticles: number }) {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) throw new Error("NEWSDATA_API_KEY is not configured.");
  const url = new URL(NEWSDATA_URL);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("q", normalizeQuery(input.query));
  url.searchParams.set("language", "en");
  url.searchParams.set("size", String(Math.max(1, Math.min(10, input.maxArticles))));
  return url;
}

async function fetchJsonWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (response.status === 429) throw new NewsDataProviderError("NewsData request failed with status 429.", 429);
      if (response.status === 402) throw new NewsDataProviderError("NewsData quota exhausted.", 402);
      if (response.status >= 500) {
        lastError = new NewsDataProviderError(`NewsData request failed with status ${response.status}.`, response.status);
        if (attempt < 2) {
          await sleep(700 * attempt);
          continue;
        }
      }
      if (!response.ok) throw new NewsDataProviderError(`NewsData request failed with status ${response.status}.`, response.status);
      const payload = await response.json() as NewsDataPayload;
      if (payload.status && payload.status !== "success") {
        throw new NewsDataProviderError(`NewsData returned status ${payload.status}.`);
      }
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("NewsData request failed.");
      if (lastError instanceof NewsDataProviderError && (lastError.status === 429 || lastError.status === 402)) throw lastError;
      if (attempt < 2) await sleep(700 * attempt);
    }
  }
  throw lastError ?? new Error("NewsData request failed.");
}

export class NewsDataNewsProvider implements NewsDataNewsProviderPort {
  readonly name = "newsdata" as const;

  constructor(private readonly normalizer = new NewsDataNormalizationService()) {}

  async fetchQueryGroup(input: NewsDataProviderRequest): Promise<NewsDataProviderArticle[]> {
    const payload = await fetchJsonWithRetry(buildUrl({ query: input.queryGroup.queryText, maxArticles: input.maxArticles }));
    const rows = Array.isArray(payload.results) ? payload.results : [];
    return rows
      .map((row) => this.normalizer.normalize(row as Record<string, unknown>, input.queryGroup))
      .filter((row): row is NewsDataProviderArticle => Boolean(row));
  }
}

export const newsDataProviderInternals = { normalizeQuery, buildUrl };
