import type { GdeltNewsProvider as GdeltNewsProviderPort, GdeltProviderArticle, GdeltProviderRequest } from "@/application/ports/providers/GdeltNewsProvider";
import { GdeltNormalizationService } from "./GdeltNormalizationService";

type GdeltDocPayload = {
  articles?: unknown[];
};

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(15_000) });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`GDELT request failed with status ${response.status}.`);
        if (attempt < 2) {
          await sleep(700 * attempt);
          continue;
        }
      }
      if (!response.ok) throw new Error(`GDELT request failed with status ${response.status}.`);
      return response.json() as Promise<GdeltDocPayload>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("GDELT request failed.");
      if (attempt < 2) await sleep(700 * attempt);
    }
  }
  throw lastError ?? new Error("GDELT request failed.");
}

export class GdeltNewsProvider implements GdeltNewsProviderPort {
  readonly name = "gdelt" as const;

  constructor(private readonly normalizer = new GdeltNormalizationService()) {}

  async fetchQueryGroup(input: GdeltProviderRequest): Promise<GdeltProviderArticle[]> {
    const url = new URL(GDELT_DOC_URL);
    url.searchParams.set("query", input.queryGroup.queryText);
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("sort", "HybridRel");
    url.searchParams.set("maxrecords", String(Math.max(1, Math.min(250, input.maxArticles))));
    url.searchParams.set("timespan", `${Math.max(1, input.recentWindowHours)}h`);
    const payload = await fetchJsonWithRetry(url);
    const rows = Array.isArray(payload.articles) ? payload.articles : [];
    return rows
      .map((row) => this.normalizer.normalize(row as Record<string, unknown>, input.queryGroup))
      .filter((row): row is GdeltProviderArticle => Boolean(row));
  }
}
