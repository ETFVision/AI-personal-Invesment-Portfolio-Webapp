import { AssetMetadata, AssetMetadataProvider } from "@/application/ports/providers/AssetMetadataProvider";
import { env } from "@/infrastructure/config/env";

type FmpProfile = {
  symbol?: string;
  companyName?: string;
  companyNameSearch?: string;
  exchangeShortName?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
};

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const FMP_MAX_ATTEMPTS = 2;
const FMP_METADATA_CONCURRENCY = 8;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function regionFromCountry(country: string | null) {
  if (!country) return null;
  const upper = country.toUpperCase();
  if (upper === "US" || upper === "USA" || upper === "CA" || upper === "CAN") return "North America";
  if (["GB", "UK", "DE", "FR", "NL", "CH", "SE", "NO", "DK", "IT", "ES", "IE"].includes(upper)) return "Europe";
  if (["JP", "CN", "HK", "SG", "IN", "KR", "TW", "AU"].includes(upper)) return "Asia Pacific";
  return country;
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
        lastError = new Error(`FMP metadata request failed with status ${response.status}.`);
        if (attempt < FMP_MAX_ATTEMPTS) {
          await sleep(500 * attempt);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("FMP metadata request failed.");
      if (attempt < FMP_MAX_ATTEMPTS) {
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("FMP metadata request failed.");
}

export class FmpAssetMetadataProvider implements AssetMetadataProvider {
  readonly name = "financial_modeling_prep";

  async getAssetMetadata(symbols: string[]): Promise<AssetMetadata[]> {
    if (!env.FMP_API_KEY) throw new Error("FMP_API_KEY is not configured.");

    const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
    const metadata: AssetMetadata[] = [];

    const apiKey = env.FMP_API_KEY;
    for (let index = 0; index < uniqueSymbols.length; index += FMP_METADATA_CONCURRENCY) {
      const batch = uniqueSymbols.slice(index, index + FMP_METADATA_CONCURRENCY);
      const results = await Promise.all(batch.map((symbol) => this.getSingleAssetMetadata(symbol, apiKey)));
      metadata.push(...results.filter((item): item is AssetMetadata => Boolean(item)));
    }

    return metadata;
  }

  private async getSingleAssetMetadata(symbol: string, apiKey: string): Promise<AssetMetadata | null> {
    const url = new URL(`${FMP_BASE_URL}/profile`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);

    const response = await fetchWithRetry(url);
    if (response.status === 402 || response.status === 403 || response.status === 404) return null;
    if (!response.ok) throw new Error(`FMP metadata request for ${symbol} failed with status ${response.status}.`);

    const payload = (await response.json()) as FmpProfile[] | { "Error Message"?: string };
    if (!Array.isArray(payload)) throw new Error(payload["Error Message"] ?? `FMP returned unexpected metadata for ${symbol}.`);

    const profile = payload[0];
    if (!profile?.symbol) return null;

    return {
      symbol: profile.symbol.toUpperCase(),
      name: profile.companyName ?? profile.companyNameSearch ?? null,
      exchange: profile.exchangeShortName ?? null,
      currency: profile.currency ?? null,
      country: profile.country ?? null,
      region: regionFromCountry(profile.country ?? null),
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
      raw: profile
    };
  }
}
