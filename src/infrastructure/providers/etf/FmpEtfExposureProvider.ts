import type { EtfExposureProvider } from "@/application/ports/providers/EtfExposureProvider";
import type { EtfExposureProviderSnapshot } from "@/domain/etfLookthrough/types";
import { env } from "@/infrastructure/config/env";
import { normalizeExposureName } from "../../../domain/etfLookthrough/exposureNormalization";
import { seededEtfTopHoldings } from "./seededEtfHoldingsFallback";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function numberField(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace("%", "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function textField(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeWeight(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value > 1 ? value / 100 : value;
}

async function fetchJson(path: string, symbol: string) {
  if (!env.FMP_API_KEY) throw new Error("FMP_API_KEY is not configured.");
  const url = new URL(`${FMP_BASE_URL}/${path}`);
  url.searchParams.set("symbol", symbol.trim().toUpperCase());
  url.searchParams.set("apikey", env.FMP_API_KEY);
  const response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(12_000) });
  if (response.status === 402 || response.status === 403 || response.status === 404) return [];
  if (!response.ok) throw new Error(`FMP ETF exposure request for ${symbol} failed with status ${response.status}.`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload as Record<string, unknown>[] : [];
}

export class FmpEtfExposureProvider implements EtfExposureProvider {
  readonly name = "financial_modeling_prep";

  async getEtfExposure(symbol: string): Promise<EtfExposureProviderSnapshot> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const [sectorPayload, countryPayload, holdingsPayload] = await Promise.all([
      fetchJson("etf/sector-weightings", normalizedSymbol),
      fetchJson("etf/country-weightings", normalizedSymbol),
      fetchJson("etf/holdings", normalizedSymbol)
    ]);
    const asOfDate =
      textField(sectorPayload[0] ?? {}, ["date", "asOfDate"]) ??
      textField(countryPayload[0] ?? {}, ["date", "asOfDate"]) ??
      textField(holdingsPayload[0] ?? {}, ["date", "asOfDate"]) ??
      todayIsoDate();

    const topHoldings = holdingsPayload.flatMap((item) => {
      const holdingSymbol = textField(item, ["symbol", "holdingSymbol", "asset", "ticker"]);
      const holdingName = textField(item, ["name", "holdingName", "securityName"]);
      const holdingWeight = normalizeWeight(numberField(item, ["weightPercentage", "weight", "percentage", "assetPercentage", "value"]));
      if (!holdingSymbol || holdingWeight == null) return [];
      return [{ etfSymbol: normalizedSymbol, holdingSymbol: holdingSymbol.toUpperCase(), holdingName, holdingWeight, asOfDate, providerMetadata: item }];
    });

    return {
      symbol: normalizedSymbol,
      asOfDate,
      sectorExposures: sectorPayload.flatMap((item) => {
        const sector = normalizeExposureName("sector", textField(item, ["sector", "sectorName", "name"]));
        const exposureWeight = normalizeWeight(numberField(item, ["weightPercentage", "weight", "percentage", "assetPercentage", "value"]));
        if (!sector || exposureWeight == null) return [];
        return [{ etfSymbol: normalizedSymbol, sector, exposureWeight, asOfDate, providerMetadata: item }];
      }),
      countryExposures: countryPayload.flatMap((item) => {
        const country = normalizeExposureName("country", textField(item, ["country", "countryName", "name"]));
        const exposureWeight = normalizeWeight(numberField(item, ["weightPercentage", "weight", "percentage", "assetPercentage", "value"]));
        if (!country || exposureWeight == null) return [];
        return [{ etfSymbol: normalizedSymbol, country, exposureWeight, asOfDate, providerMetadata: item }];
      }),
      topHoldings: (topHoldings.length
        ? topHoldings
        : seededEtfTopHoldings(normalizedSymbol, asOfDate, "FMP ETF holdings endpoint returned no usable rows."))
        .sort((a, b) => b.holdingWeight - a.holdingWeight)
        .slice(0, 100)
    };
  }
}
