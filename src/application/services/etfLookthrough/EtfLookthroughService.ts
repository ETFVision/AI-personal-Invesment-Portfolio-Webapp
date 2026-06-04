import type { EtfExposureProviderSnapshot, EtfSectorExposure, EtfThemeExposure } from "@/domain/etfLookthrough/types";
import type { Instrument } from "@/domain/universe/types";

const sectorThemeMap: Record<string, string[]> = {
  technology: ["Technology", "AI"],
  "information technology": ["Technology", "AI"],
  healthcare: ["Healthcare", "Defensive"],
  "health care": ["Healthcare", "Defensive"],
  financials: ["Financials"],
  "consumer discretionary": ["Consumer", "Growth"],
  "consumer staples": ["Consumer", "Defensive"],
  industrials: ["Industrials"],
  energy: ["Energy"],
  utilities: ["Defensive"],
  materials: ["Industrials"],
  "real estate": ["Defensive"],
  communication: ["Technology", "Growth"],
  "communication services": ["Technology", "Growth"]
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export class EtfLookthroughService {
  buildThemeExposures(instrument: Instrument, sectorExposures: EtfSectorExposure[], asOfDate: string): EtfThemeExposure[] {
    const weights = new Map<string, number>();
    for (const sector of sectorExposures) {
      const themes = sectorThemeMap[sector.sector.toLowerCase()] ?? [];
      for (const theme of themes) {
        weights.set(theme, (weights.get(theme) ?? 0) + sector.exposureWeight);
      }
    }
    for (const theme of unique(instrument.canonicalThemes)) {
      weights.set(theme, Math.max(weights.get(theme) ?? 0, sectorExposures.length ? 0.05 : 1));
    }
    return Array.from(weights.entries()).map(([theme, exposureWeight]) => ({
      etfInstrumentId: instrument.id,
      etfSymbol: instrument.symbol ?? "",
      theme,
      exposureWeight: Math.min(1, exposureWeight),
      confidenceScore: sectorExposures.length ? 72 : 55,
      derivationMethod: sectorExposures.length ? "sector_mapping" : "instrument_taxonomy_fallback",
      asOfDate
    }));
  }

  fromProviderSnapshot(instrument: Instrument, snapshot: EtfExposureProviderSnapshot, sourceProvider: string) {
    const sectorExposures = snapshot.sectorExposures.map((item) => ({
      ...item,
      etfInstrumentId: instrument.id,
      sourceProvider
    }));
    const countryExposures = snapshot.countryExposures.map((item) => ({
      ...item,
      etfInstrumentId: instrument.id,
      sourceProvider
    }));
    const topHoldings = snapshot.topHoldings.map((item) => ({
      ...item,
      etfInstrumentId: instrument.id,
      sourceProvider
    }));
    return {
      sectorExposures,
      countryExposures,
      topHoldings,
      themeExposures: this.buildThemeExposures(instrument, sectorExposures, snapshot.asOfDate)
    };
  }
}
