type SeedSector = { sector: string; weight: number };

// Pure-play sector ETFs where FMP's sector-weightings endpoint returns no data.
// Each maps to a single canonical sector at full weight.
const seededSectors: Record<string, SeedSector[]> = {
  IYW: [{ sector: "Technology", weight: 1.0 }],
  VCR: [{ sector: "Consumer Discretionary", weight: 1.0 }],
  JXI: [{ sector: "Utilities", weight: 1.0 }],
  VOX: [{ sector: "Communication Services", weight: 1.0 }],
  PXE: [{ sector: "Energy", weight: 1.0 }]
};

export function seededEtfSectorExposures(symbol: string, asOfDate: string, reason: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return (seededSectors[normalizedSymbol] ?? []).map((s) => ({
    etfSymbol: normalizedSymbol,
    sector: s.sector,
    exposureWeight: s.weight,
    asOfDate,
    providerMetadata: {
      source: "seeded_etf_sector_fallback",
      reason,
      isLiveProviderData: false,
      note: "Curated single-sector fallback used only when the live ETF sector-weightings endpoint returns no usable rows."
    }
  }));
}
