import { NextRequest } from "next/server";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const MAX_SYMBOLS = 25;

type JsonValue = Record<string, unknown> | unknown[];

type EndpointProbe = {
  ok: boolean;
  status: number;
  rows: number;
  latestDate?: string | null;
  price?: number | null;
  name?: string | null;
  message?: string;
};

type SymbolCoverage = {
  symbol: string;
  quote: EndpointProbe;
  profile: EndpointProbe;
  latestEod: EndpointProbe;
  recentHistory: EndpointProbe;
  etfSectorExposure: EndpointProbe;
  etfCountryExposure: EndpointProbe;
  etfTopHoldings: EndpointProbe;
  marketDataSupported: boolean;
  etfExposureSupported: boolean;
  notes: string[];
};

function parseSymbols(request: NextRequest) {
  return (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);
}

function buildUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${FMP_BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", env.FMP_API_KEY ?? "");
  return url;
}

async function fetchJson(path: string, params: Record<string, string>): Promise<{ status: number; data: JsonValue | null }> {
  if (!env.FMP_API_KEY) return { status: 0, data: null };
  const response = await fetch(buildUrl(path, params), { cache: "no-store" });
  if (!response.ok) return { status: response.status, data: null };
  const data = (await response.json()) as JsonValue;
  return { status: response.status, data };
}

function asArray(data: JsonValue | null): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).historical)) {
    return ((data as Record<string, unknown>).historical as unknown[]).filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null
    );
  }
  return [];
}

function numberOrNull(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function probeFromRows(status: number, rows: Record<string, unknown>[], options?: { nameKey?: string; priceKeys?: string[] }): EndpointProbe {
  const first = rows[0];
  const priceKey = options?.priceKeys?.find((key) => first?.[key] !== undefined);
  const price = priceKey ? numberOrNull(first?.[priceKey]) : null;
  return {
    ok: status >= 200 && status < 300 && rows.length > 0,
    status,
    rows: rows.length,
    latestDate: typeof first?.date === "string" ? first.date : null,
    price,
    name: options?.nameKey && typeof first?.[options.nameKey] === "string" ? String(first[options.nameKey]) : null
  };
}

function missingProbe(status: number, message?: string): EndpointProbe {
  return { ok: false, status, rows: 0, message };
}

async function probeSymbol(symbol: string, quoteProbe: EndpointProbe, fromDate: string, toDate: string): Promise<SymbolCoverage> {
  const [profile, latestEod, recentHistory, sectorExposure, countryExposure, topHoldings] = await Promise.all([
    fetchJson("profile", { symbol }),
    fetchJson("historical-price-eod/light", { symbol }),
    fetchJson("historical-price-eod/full", { symbol, from: fromDate, to: toDate }),
    fetchJson("etf/sector-weightings", { symbol }),
    fetchJson("etf/country-weightings", { symbol }),
    fetchJson("etf/holdings", { symbol })
  ]);

  const profileRows = asArray(profile.data);
  const latestRows = asArray(latestEod.data);
  const historyRows = asArray(recentHistory.data);
  const sectorRows = asArray(sectorExposure.data);
  const countryRows = asArray(countryExposure.data);
  const holdingRows = asArray(topHoldings.data);

  const result: SymbolCoverage = {
    symbol,
    quote: quoteProbe,
    profile: probeFromRows(profile.status, profileRows, { nameKey: "companyName" }),
    latestEod: probeFromRows(latestEod.status, latestRows, { priceKeys: ["price", "close", "adjClose"] }),
    recentHistory: probeFromRows(recentHistory.status, historyRows, { priceKeys: ["close", "adjClose"] }),
    etfSectorExposure: probeFromRows(sectorExposure.status, sectorRows),
    etfCountryExposure: probeFromRows(countryExposure.status, countryRows),
    etfTopHoldings: probeFromRows(topHoldings.status, holdingRows),
    marketDataSupported: false,
    etfExposureSupported: false,
    notes: []
  };

  result.marketDataSupported = result.quote.ok || result.latestEod.ok || result.recentHistory.ok;
  result.etfExposureSupported = result.etfSectorExposure.ok || result.etfCountryExposure.ok || result.etfTopHoldings.ok;

  if (!result.marketDataSupported) result.notes.push("No quote or historical price data returned.");
  if (!result.profile.ok) result.notes.push("No profile metadata returned.");
  if (!result.etfExposureSupported) result.notes.push("No ETF look-through exposure returned.");
  return result;
}

export async function POST(request: NextRequest) {
  const symbols = parseSymbols(request);
  const lookbackDays = Number(request.nextUrl.searchParams.get("lookbackDays") ?? 30);
  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return runCronJob(request, { jobName: "fmp-symbol-coverage", lockTtlSeconds: 5 * 60 }, async () => {
    if (!symbols.length) {
      return { ok: false, message: "Provide comma-separated symbols using ?symbols=QUAL,USMV,...", requested: 0 };
    }
    if (!env.FMP_API_KEY) {
      return { ok: false, message: "FMP_API_KEY is not configured.", requested: symbols.length };
    }

    const batchQuote = await fetchJson("batch-quote-short", { symbols: symbols.join(",") });
    const quoteRows = asArray(batchQuote.data);
    const quoteBySymbol = new Map(quoteRows.map((row) => [String(row.symbol ?? "").toUpperCase(), row]));

    const results: SymbolCoverage[] = [];
    for (const symbol of symbols) {
      const quoteRow = quoteBySymbol.get(symbol);
      const quote = quoteRow
        ? probeFromRows(batchQuote.status, [quoteRow], { priceKeys: ["price"] })
        : missingProbe(batchQuote.status, batchQuote.status >= 200 && batchQuote.status < 300 ? "Symbol missing from batch quote response." : "Batch quote request failed.");
      results.push(await probeSymbol(symbol, quote, fromDate, toDate));
    }

    const marketDataSupported = results.filter((result) => result.marketDataSupported).length;
    const etfExposureSupported = results.filter((result) => result.etfExposureSupported).length;
    const profileSupported = results.filter((result) => result.profile.ok).length;

    return {
      ok: true,
      message: `Checked FMP coverage for ${results.length}/${symbols.length} symbols.`,
      requested: symbols.length,
      checked: results.length,
      marketDataSupported,
      profileSupported,
      etfExposureSupported,
      lookbackDays,
      results
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
