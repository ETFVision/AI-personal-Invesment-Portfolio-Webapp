import type { GdeltNewsProvider as GdeltNewsProviderPort, GdeltProviderArticle, GdeltProviderRequest } from "@/application/ports/providers/GdeltNewsProvider";
import { GdeltNormalizationService } from "./GdeltNormalizationService";

type GdeltDocPayload = {
  articles?: unknown[];
};

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

class GdeltProviderError extends Error {
  constructor(message: string, readonly status: number | null = null) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (response.status === 429 || response.status >= 500) {
        lastError = new GdeltProviderError(`GDELT request failed with status ${response.status}.`, response.status);
        if (attempt < 2) {
          await sleep(700 * attempt);
          continue;
        }
      }
      if (!response.ok) throw new GdeltProviderError(`GDELT request failed with status ${response.status}.`, response.status);
      return response.json() as Promise<GdeltDocPayload>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("GDELT request failed.");
      if (attempt < 2) await sleep(700 * attempt);
    }
  }
  throw lastError ?? new Error("GDELT request failed.");
}

function buildUrl(input: { query: string; maxArticles: number; recentWindowHours: number }) {
  const url = new URL(GDELT_DOC_URL);
  url.searchParams.set("query", input.query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "datedesc");
  url.searchParams.set("maxrecords", String(Math.max(1, Math.min(250, input.maxArticles))));
  url.searchParams.set("timespan", formatTimespan(input.recentWindowHours));
  return url;
}

function normalizeQuery(query: string) {
  const trimmed = query.trim();
  if (/\sOR\s/.test(trimmed) && !trimmed.startsWith("(")) return `(${trimmed})`;
  return trimmed;
}

function extractFallbackTerms(query: string) {
  return query
    .trim()
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(/\s+OR\s+/i)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function formatTimespan(hours: number) {
  const bounded = Math.max(1, hours);
  if (bounded % 24 === 0) return `${bounded / 24}d`;
  return `${bounded}h`;
}

export class GdeltNewsProvider implements GdeltNewsProviderPort {
  readonly name = "gdelt" as const;

  constructor(private readonly normalizer = new GdeltNormalizationService()) {}

  async fetchQueryGroup(input: GdeltProviderRequest): Promise<GdeltProviderArticle[]> {
    const query = normalizeQuery(input.queryGroup.queryText);
    const payload = await this.fetchWithFallback(query, input.maxArticles, input.recentWindowHours);
    const rows = Array.isArray(payload.articles) ? payload.articles : [];
    return rows
      .map((row) => this.normalizer.normalize(row as Record<string, unknown>, input.queryGroup))
      .filter((row): row is GdeltProviderArticle => Boolean(row));
  }

  private async fetchWithFallback(query: string, maxArticles: number, recentWindowHours: number): Promise<GdeltDocPayload> {
    try {
      const primary = await fetchJsonWithRetry(buildUrl({ query, maxArticles, recentWindowHours }));
      if (Array.isArray(primary.articles) && primary.articles.length > 0) return primary;
    } catch (error) {
      if (error instanceof GdeltProviderError && error.status === 429) throw error;
      const fallback = await this.fetchFallbackTerms(query, maxArticles, recentWindowHours);
      if (fallback.articles?.length) return fallback;
      throw error;
    }
    return this.fetchFallbackTerms(query, maxArticles, recentWindowHours);
  }

  private async fetchFallbackTerms(query: string, maxArticles: number, recentWindowHours: number): Promise<GdeltDocPayload> {
    const terms = extractFallbackTerms(query);
    if (terms.length <= 1) return { articles: [] };
    const articles: unknown[] = [];
    const seen = new Set<string>();
    const maxPerTerm = Math.max(1, Math.ceil(maxArticles / Math.min(terms.length, 4)));
    let lastError: Error | null = null;
    for (const term of terms) {
      if (articles.length >= maxArticles) break;
      try {
        const payload = await fetchJsonWithRetry(buildUrl({ query: term, maxArticles: maxPerTerm, recentWindowHours }));
        for (const row of Array.isArray(payload.articles) ? payload.articles : []) {
          const key = typeof row === "object" && row !== null && "url" in row ? String((row as { url?: unknown }).url ?? "") : JSON.stringify(row);
          if (seen.has(key)) continue;
          seen.add(key);
          articles.push(row);
          if (articles.length >= maxArticles) break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("GDELT fallback query failed.");
      }
    }
    if (articles.length === 0 && lastError) throw lastError;
    return { articles };
  }
}

export const gdeltProviderInternals = { normalizeQuery, extractFallbackTerms, formatTimespan };
