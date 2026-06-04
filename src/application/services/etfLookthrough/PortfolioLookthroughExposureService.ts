import type { EtfExposureRepository } from "@/application/ports/repositories/EtfExposureRepository";
import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { PortfolioLookthroughExposure, PortfolioLookthroughReport } from "@/domain/etfLookthrough/types";
import type { Instrument } from "@/domain/universe/types";

type ExposureAccumulator = {
  exposureWeight: number;
  directWeight: number;
  etfLookthroughWeight: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeWeight(value: number) {
  return value > 1 ? value / 100 : value;
}

function add(map: Map<string, ExposureAccumulator>, name: string | null | undefined, totalWeight: number, source: "direct" | "etf") {
  if (!name || !Number.isFinite(totalWeight) || totalWeight <= 0) return;
  const key = name.trim();
  if (!key) return;
  const current = map.get(key) ?? { exposureWeight: 0, directWeight: 0, etfLookthroughWeight: 0 };
  current.exposureWeight += totalWeight;
  if (source === "direct") current.directWeight += totalWeight;
  else current.etfLookthroughWeight += totalWeight;
  map.set(key, current);
}

function rows(portfolioId: string, asOfDate: string, exposureType: PortfolioLookthroughExposure["exposureType"], map: Map<string, ExposureAccumulator>) {
  return Array.from(map.entries())
    .map(([exposureName, value]) => ({
      portfolioId,
      exposureType,
      exposureName,
      exposureWeight: value.exposureWeight,
      directWeight: value.directWeight,
      etfLookthroughWeight: value.etfLookthroughWeight,
      asOfDate
    }))
    .sort((a, b) => b.exposureWeight - a.exposureWeight);
}

function groupByInstrument<T extends { etfInstrumentId: string }>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const current = grouped.get(item.etfInstrumentId) ?? [];
    current.push(item);
    grouped.set(item.etfInstrumentId, current);
  }
  return grouped;
}

function instrumentCountry(instrument: Instrument, fallback?: string | null) {
  return instrument.geoExposure ?? instrument.geography ?? fallback ?? "Unknown";
}

function instrumentSector(instrument: Instrument, fallback?: string | null) {
  return instrument.canonicalSector ?? instrument.sector ?? fallback ?? "Unclassified";
}

function hasEquityLookthrough(instrument: Instrument) {
  return instrument.assetClass === "etf" && !["Bonds / Fixed Income", "Commodities / Gold", "Crypto", "Cash / Money Market"].includes(instrument.canonicalSector ?? "");
}

export class PortfolioLookthroughExposureService {
  constructor(private readonly repository: EtfExposureRepository) {}

  async calculateAndStore(portfolioId: string, dashboard: PortfolioDashboard, instruments: Instrument[]): Promise<PortfolioLookthroughReport> {
    const asOfDate = dashboard.latestPriceDate ?? today();
    const instrumentBySymbol = new Map(instruments.flatMap((instrument) => instrument.symbol ? [[instrument.symbol.toUpperCase(), instrument]] : []));
    const etfIds = instruments.filter(hasEquityLookthrough).map((instrument) => instrument.id);
    const [sectorRows, countryRows, topHoldingRows, themeRows] = await Promise.all([
      this.repository.listLatestSectorExposures(etfIds),
      this.repository.listLatestCountryExposures(etfIds),
      this.repository.listLatestTopHoldings(etfIds),
      this.repository.listLatestThemeExposures(etfIds)
    ]);
    const sectorsByEtf = groupByInstrument(sectorRows);
    const countriesByEtf = groupByInstrument(countryRows);
    const holdingsByEtf = groupByInstrument(topHoldingRows);
    const themesByEtf = groupByInstrument(themeRows);
    const sectors = new Map<string, ExposureAccumulator>();
    const countries = new Map<string, ExposureAccumulator>();
    const currencies = new Map<string, ExposureAccumulator>();
    const themes = new Map<string, ExposureAccumulator>();
    const topHoldings = new Map<string, ExposureAccumulator>();
    const diagnostics: string[] = [];
    let etfCount = 0;
    let etfsWithSectorExposure = 0;
    let etfsWithCountryExposure = 0;
    let etfsWithTopHoldings = 0;
    let lookthroughWeight = 0;
    let fallbackWeight = 0;

    for (const valuation of dashboard.holdingValuations) {
      const symbol = valuation.holding.ticker?.toUpperCase();
      const instrument = symbol ? instrumentBySymbol.get(symbol) : undefined;
      const portfolioWeight = dashboard.totalValueEstimate > 0 ? valuation.value / dashboard.totalValueEstimate : 0;
      if (!instrument || portfolioWeight <= 0) {
        add(sectors, valuation.holding.sector ?? valuation.holding.assetType, portfolioWeight, "direct");
        add(countries, valuation.holding.country ?? valuation.holding.region, portfolioWeight, "direct");
        add(currencies, valuation.valueCurrency, portfolioWeight, "direct");
        add(topHoldings, symbol ?? valuation.holding.assetName, portfolioWeight, "direct");
        fallbackWeight += portfolioWeight;
        continue;
      }

      add(currencies, instrument.currency ?? valuation.valueCurrency, portfolioWeight, "direct");
      const shouldLookthrough = hasEquityLookthrough(instrument);
      if (shouldLookthrough) {
        etfCount += 1;
        const etfSectors = sectorsByEtf.get(instrument.id) ?? [];
        const etfCountries = countriesByEtf.get(instrument.id) ?? [];
        const etfHoldings = holdingsByEtf.get(instrument.id) ?? [];
        const etfThemes = themesByEtf.get(instrument.id) ?? [];

        if (etfSectors.length) {
          etfsWithSectorExposure += 1;
          lookthroughWeight += portfolioWeight;
          for (const exposure of etfSectors) add(sectors, exposure.sector, portfolioWeight * normalizeWeight(exposure.exposureWeight), "etf");
        } else {
          add(sectors, instrumentSector(instrument, valuation.holding.sector), portfolioWeight, "direct");
          fallbackWeight += portfolioWeight;
          diagnostics.push(`${instrument.symbol ?? instrument.name} has no cached sector look-through exposure.`);
        }

        if (etfCountries.length) {
          etfsWithCountryExposure += 1;
          for (const exposure of etfCountries) add(countries, exposure.country, portfolioWeight * normalizeWeight(exposure.exposureWeight), "etf");
        } else {
          add(countries, instrumentCountry(instrument, valuation.holding.country), portfolioWeight, "direct");
        }

        if (etfThemes.length) {
          for (const exposure of etfThemes) add(themes, exposure.theme, portfolioWeight * normalizeWeight(exposure.exposureWeight), "etf");
        } else {
          for (const theme of instrument.canonicalThemes) add(themes, theme, portfolioWeight, "direct");
        }

        if (etfHoldings.length) {
          etfsWithTopHoldings += 1;
          for (const holding of etfHoldings) add(topHoldings, holding.holdingSymbol, portfolioWeight * normalizeWeight(holding.holdingWeight), "etf");
        } else {
          add(topHoldings, instrument.symbol ?? instrument.name, portfolioWeight, "direct");
        }
        continue;
      }

      add(sectors, instrumentSector(instrument, valuation.holding.sector), portfolioWeight, "direct");
      add(countries, instrumentCountry(instrument, valuation.holding.country), portfolioWeight, "direct");
      for (const theme of instrument.canonicalThemes) add(themes, theme, portfolioWeight, "direct");
      add(topHoldings, instrument.symbol ?? instrument.name, portfolioWeight, "direct");
    }

    const report: PortfolioLookthroughReport = {
      asOfDate,
      sectorExposures: rows(portfolioId, asOfDate, "sector", sectors),
      countryExposures: rows(portfolioId, asOfDate, "country", countries),
      currencyExposures: rows(portfolioId, asOfDate, "currency", currencies),
      themeExposures: rows(portfolioId, asOfDate, "theme", themes),
      topHoldingExposures: rows(portfolioId, asOfDate, "top_holding", topHoldings),
      coverage: { etfCount, etfsWithSectorExposure, etfsWithCountryExposure, etfsWithTopHoldings, lookthroughWeight, fallbackWeight },
      diagnostics
    };

    await this.repository.upsertPortfolioLookthroughExposures([
      ...report.sectorExposures,
      ...report.countryExposures,
      ...report.currencyExposures,
      ...report.themeExposures,
      ...report.topHoldingExposures
    ]);
    return report;
  }
}
