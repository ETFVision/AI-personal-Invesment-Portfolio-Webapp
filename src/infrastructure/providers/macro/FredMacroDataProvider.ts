import type { MacroDataProvider, MacroProviderFetchRequest, MacroProviderObservation } from "@/application/ports/providers/MacroDataProvider";

type FredObservation = {
  date?: string;
  value?: string;
};

const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

function parseFredValue(value: string | undefined) {
  if (!value || value === ".") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJsonWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`FRED request failed with status ${response.status}.`);
      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("FRED request failed.");
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError ?? new Error("FRED request failed.");
}

export class FredMacroDataProvider implements MacroDataProvider {
  readonly name = "fred";

  async fetchObservations(input: MacroProviderFetchRequest): Promise<MacroProviderObservation[]> {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) throw new Error("FRED_API_KEY is not configured.");
    const url = new URL(`${FRED_BASE_URL}/series/observations`);
    url.searchParams.set("series_id", input.indicatorCode);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    if (input.limit) url.searchParams.set("limit", String(input.limit));
    if (input.observationStart) url.searchParams.set("observation_start", input.observationStart);
    if (input.observationEnd) url.searchParams.set("observation_end", input.observationEnd);

    const payload = await fetchJsonWithRetry(url);
    const observations = Array.isArray(payload?.observations) ? payload.observations as FredObservation[] : [];
    return observations
      .filter((row) => typeof row.date === "string")
      .map((row) => ({
        indicatorCode: input.indicatorCode,
        observationDate: row.date as string,
        value: parseFredValue(row.value),
        providerMetadata: row as Record<string, unknown>
      }))
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  }
}

export const fredProviderInternals = { parseFredValue };
