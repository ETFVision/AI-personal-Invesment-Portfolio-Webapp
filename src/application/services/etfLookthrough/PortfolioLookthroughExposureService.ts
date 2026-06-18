import type { EtfExposureRepository } from "@/application/ports/repositories/EtfExposureRepository";
import type { SecurityIssuerLink } from "@/application/ports/repositories/EtfExposureRepository";
import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { PortfolioLookthroughExposure, PortfolioLookthroughHolding, PortfolioLookthroughReport, PortfolioLookthroughHoldingSourceEtf } from "@/domain/etfLookthrough/types";
import type { Instrument } from "@/domain/universe/types";
import { normalizeExposureName } from "../../../domain/etfLookthrough/exposureNormalization";

type ExposureAccumulator = {
  exposureWeight: number;
  directWeight: number;
  etfLookthroughWeight: number;
};

type HoldingAccumulator = {
  holdingSymbol: string;
  holdingName: string | null;
  holdingSecurityId: string | null;
  holdingIssuerId: string | null;
  holdingIssuerName: string | null;
  mappingStatus: string;
  mappingConfidenceScore: number;
  rawSymbols: string[];
  instrumentAssetClass: string | null;
  directWeight: number;
  indirectWeight: number;
  sourceEtfs: PortfolioLookthroughHoldingSourceEtf[];
  securityBreakdown: SecurityBreakdownEntry[];
};

type SecurityBreakdownEntry = {
  symbol: string;
  name: string | null;
  securityId: string | null;
  issuerId: string | null;
  issuerName: string | null;
  shareClass: string | null;
  linkSource: string | null;
  directWeight: number;
  indirectWeight: number;
  sourceEtfs: PortfolioLookthroughHoldingSourceEtf[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeWeight(value: number) {
  return value > 1 ? value / 100 : value;
}

function normalizedDistribution<T>(items: T[], weightOf: (item: T) => number) {
  const weighted = items
    .map((item) => ({ item, weight: normalizeWeight(weightOf(item)) }))
    .filter(({ weight }) => Number.isFinite(weight) && weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return [];
  return weighted.map(({ item, weight }) => ({ item, weight: weight / total }));
}

function add(
  map: Map<string, ExposureAccumulator>,
  name: string | null | undefined,
  totalWeight: number,
  source: "direct" | "etf",
  exposureType: PortfolioLookthroughExposure["exposureType"]
) {
  if (!name || !Number.isFinite(totalWeight) || totalWeight <= 0) return;
  const key = normalizeExposureName(exposureType, name);
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

function addHolding(
  map: Map<string, HoldingAccumulator>,
  symbol: string | null | undefined,
  name: string | null | undefined,
  weight: number,
  source: "direct" | "indirect",
  sourceEtf?: string | null,
  securityId?: string | null,
  issuerLink?: SecurityIssuerLink | null,
  mappingStatus?: string | null,
  mappingConfidenceScore?: number | null,
  instrumentAssetClass?: string | null
) {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  const normalizedSecurityId = securityId?.trim() || null;
  const isDirectFundWrapper = source === "direct" && ["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"].includes(instrumentAssetClass ?? "");
  const issuerId = !isDirectFundWrapper ? issuerLink?.issuerId ?? null : null;
  const issuerName = !isDirectFundWrapper ? issuerLink?.issuerName ?? null : null;
  const key = issuerId ? `issuer:${issuerId}` : normalizedSecurityId ? `security:${normalizedSecurityId}` : normalizedSymbol ? `symbol:${normalizedSymbol}` : null;
  if (!key || !normalizedSymbol || !Number.isFinite(weight) || weight <= 0) return;
  const current = map.get(key) ?? {
    holdingSymbol: normalizedSymbol,
    holdingName: issuerName ?? name?.trim() ?? null,
    holdingSecurityId: issuerId ? null : normalizedSecurityId,
    holdingIssuerId: issuerId,
    holdingIssuerName: issuerName,
    mappingStatus: normalizedSecurityId ? (mappingStatus ?? "mapped") : "unmapped",
    mappingConfidenceScore: normalizedSecurityId ? (mappingConfidenceScore ?? 90) : 0,
    rawSymbols: [],
    instrumentAssetClass: instrumentAssetClass ?? null,
    directWeight: 0,
    indirectWeight: 0,
    sourceEtfs: [],
    securityBreakdown: []
  };
  if (!current.holdingName && (issuerName || name?.trim())) current.holdingName = issuerName ?? name?.trim() ?? null;
  if (!current.holdingSecurityId && normalizedSecurityId && !issuerId) current.holdingSecurityId = normalizedSecurityId;
  if (!current.holdingIssuerId && issuerId) current.holdingIssuerId = issuerId;
  if (!current.holdingIssuerName && issuerName) current.holdingIssuerName = issuerName;
  if (normalizedSecurityId) {
    current.mappingStatus = mappingStatus ?? "mapped";
    current.mappingConfidenceScore = Math.max(current.mappingConfidenceScore, mappingConfidenceScore ?? 90);
  }
  if (source === "direct" && instrumentAssetClass) {
    current.instrumentAssetClass = instrumentAssetClass;
  } else if (!current.instrumentAssetClass && instrumentAssetClass) {
    current.instrumentAssetClass = instrumentAssetClass;
  }
  if (!current.rawSymbols.includes(normalizedSymbol)) current.rawSymbols.push(normalizedSymbol);
  if (source === "direct") {
    current.directWeight += weight;
  } else {
    current.indirectWeight += weight;
    if (sourceEtf) {
      const existing = current.sourceEtfs.find((item) => item.symbol === sourceEtf);
      if (existing) existing.weight += weight;
      else current.sourceEtfs.push({ symbol: sourceEtf, weight });
    }
  }

  const breakdownKey = normalizedSecurityId ? `security:${normalizedSecurityId}` : `symbol:${normalizedSymbol}`;
  let breakdown = current.securityBreakdown.find((item) => item.securityId ? `security:${item.securityId}` === breakdownKey : `symbol:${item.symbol}` === breakdownKey);
  if (!breakdown) {
    breakdown = {
      symbol: normalizedSymbol,
      name: name?.trim() || null,
      securityId: normalizedSecurityId,
      issuerId,
      issuerName,
      shareClass: issuerLink?.shareClass ?? null,
      linkSource: issuerLink?.linkSource ?? null,
      directWeight: 0,
      indirectWeight: 0,
      sourceEtfs: []
    };
    current.securityBreakdown.push(breakdown);
  } else if (source === "direct") {
    breakdown.symbol = normalizedSymbol;
    breakdown.name = name?.trim() || breakdown.name;
  }
  if (source === "direct") breakdown.directWeight += weight;
  else {
    breakdown.indirectWeight += weight;
    if (sourceEtf) {
      const existing = breakdown.sourceEtfs.find((item) => item.symbol === sourceEtf);
      if (existing) existing.weight += weight;
      else breakdown.sourceEtfs.push({ symbol: sourceEtf, weight });
    }
  }
  map.set(key, current);
}

function holdingRows(portfolioId: string, asOfDate: string, map: Map<string, HoldingAccumulator>): PortfolioLookthroughHolding[] {
  return Array.from(map.values())
    .map((value) => ({
      portfolioId,
      asOfDate,
      holdingSymbol: value.holdingSymbol,
      holdingName: value.holdingName,
      holdingSecurityId: value.holdingSecurityId,
      holdingIssuerId: value.holdingIssuerId,
      holdingIssuerName: value.holdingIssuerName,
      mappingStatus: value.mappingStatus,
      mappingConfidenceScore: value.mappingConfidenceScore,
      directWeight: value.directWeight,
      indirectWeight: value.indirectWeight,
      totalWeight: value.directWeight + value.indirectWeight,
      sourceEtfs: value.sourceEtfs.sort((a, b) => b.weight - a.weight),
      inputsSnapshot: {
        source: "portfolio_lookthrough_exposure_service",
        aggregation: value.holdingIssuerId ? "issuer_id" : value.holdingSecurityId ? "security_id" : "raw_symbol",
        issuerId: value.holdingIssuerId,
        issuerName: value.holdingIssuerName,
        instrumentAssetClass: value.instrumentAssetClass,
        exposureRole: value.indirectWeight > 0 ? "underlying_security" : "direct_position",
        rawSymbols: value.rawSymbols.sort(),
        securityBreakdown: value.securityBreakdown
          .map((item) => ({
            ...item,
            sourceEtfs: item.sourceEtfs.sort((a, b) => b.weight - a.weight)
          }))
          .sort((a, b) => (b.directWeight + b.indirectWeight) - (a.directWeight + a.indirectWeight))
      }
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

function topHoldingExposureRows(portfolioId: string, asOfDate: string, holdings: PortfolioLookthroughHolding[]): PortfolioLookthroughExposure[] {
  return holdings.map((holding) => ({
    portfolioId,
    exposureType: "top_holding",
    exposureName: holding.holdingIssuerName ?? holding.holdingName ?? holding.holdingSymbol,
    exposureSecurityId: holding.holdingSecurityId ?? null,
    exposureIssuerId: holding.holdingIssuerId ?? null,
    exposureIssuerName: holding.holdingIssuerName ?? null,
    exposureWeight: holding.totalWeight,
    directWeight: holding.directWeight,
    etfLookthroughWeight: holding.indirectWeight,
    asOfDate
  }));
}

function mergeSourceEtfs(a: PortfolioLookthroughHoldingSourceEtf[], b: PortfolioLookthroughHoldingSourceEtf[]): PortfolioLookthroughHoldingSourceEtf[] {
  const merged = new Map<string, number>();
  for (const etf of [...a, ...b]) merged.set(etf.symbol, (merged.get(etf.symbol) ?? 0) + etf.weight);
  return Array.from(merged.entries())
    .map(([symbol, weight]) => ({ symbol, weight }))
    .sort((a, b) => b.weight - a.weight);
}

function deduplicateHoldingsBySymbol(holdings: PortfolioLookthroughHolding[]): PortfolioLookthroughHolding[] {
  const seen = new Map<string, PortfolioLookthroughHolding>();
  for (const holding of holdings) {
    const key = holding.holdingSymbol.toUpperCase();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, holding);
    } else {
      const merged: PortfolioLookthroughHolding = {
        ...existing,
        holdingIssuerId: existing.holdingIssuerId ?? holding.holdingIssuerId,
        holdingIssuerName: existing.holdingIssuerName ?? holding.holdingIssuerName,
        holdingSecurityId: existing.holdingSecurityId ?? holding.holdingSecurityId,
        holdingName: existing.holdingName ?? holding.holdingName,
        mappingStatus: existing.holdingSecurityId ? existing.mappingStatus : holding.mappingStatus,
        mappingConfidenceScore: Math.max(existing.mappingConfidenceScore ?? 0, holding.mappingConfidenceScore ?? 0),
        directWeight: existing.directWeight + holding.directWeight,
        indirectWeight: existing.indirectWeight + holding.indirectWeight,
        totalWeight: existing.totalWeight + holding.totalWeight,
        sourceEtfs: mergeSourceEtfs(existing.sourceEtfs, holding.sourceEtfs)
      };
      seen.set(key, merged);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.totalWeight - a.totalWeight);
}

function deduplicateExposuresByName(exposures: PortfolioLookthroughExposure[]): PortfolioLookthroughExposure[] {
  const seen = new Map<string, PortfolioLookthroughExposure>();
  for (const exposure of exposures) {
    const key = exposure.exposureName.toUpperCase();
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, exposure);
    } else {
      seen.set(key, {
        ...existing,
        exposureIssuerId: existing.exposureIssuerId ?? exposure.exposureIssuerId,
        exposureIssuerName: existing.exposureIssuerName ?? exposure.exposureIssuerName,
        exposureSecurityId: existing.exposureSecurityId ?? exposure.exposureSecurityId,
        exposureWeight: existing.exposureWeight + exposure.exposureWeight,
        directWeight: existing.directWeight + exposure.directWeight,
        etfLookthroughWeight: existing.etfLookthroughWeight + exposure.etfLookthroughWeight
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.exposureWeight - a.exposureWeight);
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

function instrumentLookupPriority(instrument: Instrument) {
  if (instrument.isInternalOnly) return 0;
  if (instrument.isUserSelectable === false) return 1;
  if (instrument.instrumentType === "underlying_security") return 1;
  if (instrument.assetClass === "stock") return 4;
  if (["etf", "bond_etf", "gold_etf", "crypto_etf", "cash_proxy"].includes(instrument.assetClass)) return 3;
  return 2;
}

function buildInstrumentBySymbol(instruments: Instrument[]) {
  const map = new Map<string, Instrument>();
  for (const instrument of instruments) {
    const symbol = instrument.symbol?.trim().toUpperCase();
    if (!symbol) continue;
    const current = map.get(symbol);
    if (!current || instrumentLookupPriority(instrument) > instrumentLookupPriority(current)) {
      map.set(symbol, instrument);
    }
  }
  return map;
}

function directPositionAssetClass(
  instrument: Instrument,
  holdingAssetType: PortfolioDashboard["holdingValuations"][number]["holding"]["assetType"]
) {
  const holdingClass = holdingAssetType === "cash" ? "cash_proxy" : holdingAssetType;
  const isInternalUnderlying =
    instrument.isInternalOnly ||
    instrument.isUserSelectable === false ||
    instrument.instrumentType === "underlying_security" ||
    instrument.assetClass === "other";
  return isInternalUnderlying ? holdingClass : instrument.assetClass;
}

export class PortfolioLookthroughExposureService {
  constructor(private readonly repository: EtfExposureRepository) {}

  async calculateAndStore(portfolioId: string, dashboard: PortfolioDashboard, instruments: Instrument[]): Promise<PortfolioLookthroughReport> {
    const asOfDate = dashboard.latestPriceDate ?? today();
    const instrumentBySymbol = buildInstrumentBySymbol(instruments);
    const etfIds = instruments.filter(hasEquityLookthrough).map((instrument) => instrument.id);
    const [sectorRows, countryRows, topHoldingRows, themeRows] = await Promise.all([
      this.repository.listLatestSectorExposures(etfIds),
      this.repository.listLatestCountryExposures(etfIds),
      this.repository.listLatestTopHoldings(etfIds),
      this.repository.listLatestThemeExposures(etfIds)
    ]);
    const issuerLinks = await this.repository.listIssuerLinksForSecurityIds(
      Array.from(new Set([
        ...instruments.flatMap((instrument) => instrument.securityId ? [instrument.securityId] : []),
        ...topHoldingRows.flatMap((holding) => holding.holdingSecurityId ? [holding.holdingSecurityId] : [])
      ]))
    );
    const issuerLinkBySecurityId = new Map(issuerLinks.map((link) => [link.securityId, link]));
    const sectorsByEtf = groupByInstrument(sectorRows);
    const countriesByEtf = groupByInstrument(countryRows);
    const holdingsByEtf = groupByInstrument(topHoldingRows);
    const themesByEtf = groupByInstrument(themeRows);
    const sectors = new Map<string, ExposureAccumulator>();
    const countries = new Map<string, ExposureAccumulator>();
    const currencies = new Map<string, ExposureAccumulator>();
    const themes = new Map<string, ExposureAccumulator>();
    const holdings = new Map<string, HoldingAccumulator>();
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
        add(sectors, valuation.holding.sector ?? valuation.holding.assetType, portfolioWeight, "direct", "sector");
        add(countries, valuation.holding.country ?? valuation.holding.region, portfolioWeight, "direct", "country");
        add(currencies, valuation.valueCurrency, portfolioWeight, "direct", "currency");
        addHolding(holdings, symbol ?? valuation.holding.assetName, valuation.holding.assetName, portfolioWeight, "direct");
        fallbackWeight += portfolioWeight;
        continue;
      }

      add(currencies, instrument.currency ?? valuation.valueCurrency, portfolioWeight, "direct", "currency");
      addHolding(
        holdings,
        instrument.symbol ?? symbol ?? valuation.holding.assetName,
        valuation.holding.assetName ?? instrument.name,
        portfolioWeight,
        "direct",
        null,
        instrument.securityId ?? null,
        instrument.securityId ? issuerLinkBySecurityId.get(instrument.securityId) ?? null : null,
        instrument.securityId ? "mapped" : "unmapped",
        instrument.securityId ? 95 : 0,
        directPositionAssetClass(instrument, valuation.holding.assetType)
      );
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
          for (const exposure of normalizedDistribution(etfSectors, (item) => item.exposureWeight)) add(sectors, exposure.item.sector, portfolioWeight * exposure.weight, "etf", "sector");
        } else {
          add(sectors, instrumentSector(instrument, valuation.holding.sector), portfolioWeight, "direct", "sector");
          fallbackWeight += portfolioWeight;
          diagnostics.push(`${instrument.symbol ?? instrument.name} has no cached sector look-through exposure.`);
        }

        if (etfCountries.length) {
          etfsWithCountryExposure += 1;
          for (const exposure of normalizedDistribution(etfCountries, (item) => item.exposureWeight)) add(countries, exposure.item.country, portfolioWeight * exposure.weight, "etf", "country");
        } else {
          add(countries, instrumentCountry(instrument, valuation.holding.country), portfolioWeight, "direct", "country");
        }

        if (etfThemes.length) {
          for (const exposure of etfThemes) add(themes, exposure.theme, portfolioWeight * normalizeWeight(exposure.exposureWeight), "etf", "theme");
        } else {
          for (const theme of instrument.canonicalThemes) add(themes, theme, portfolioWeight, "direct", "theme");
        }

        if (etfHoldings.length) {
          etfsWithTopHoldings += 1;
          for (const holding of etfHoldings) {
            addHolding(
              holdings,
              holding.holdingSymbol,
              holding.holdingName,
              portfolioWeight * normalizeWeight(holding.holdingWeight),
              "indirect",
              instrument.symbol,
              holding.holdingSecurityId ?? null,
              holding.holdingSecurityId ? issuerLinkBySecurityId.get(holding.holdingSecurityId) ?? null : null,
              holding.mappingStatus ?? null,
              holding.mappingConfidenceScore ?? null,
              "underlying_security"
            );
          }
        } else {
          diagnostics.push(`${instrument.symbol ?? instrument.name} has no cached top-holding look-through exposure.`);
        }
        continue;
      }

      add(sectors, instrumentSector(instrument, valuation.holding.sector), portfolioWeight, "direct", "sector");
      add(countries, instrumentCountry(instrument, valuation.holding.country), portfolioWeight, "direct", "country");
      for (const theme of instrument.canonicalThemes) add(themes, theme, portfolioWeight, "direct", "theme");
    }

    const holdingExposures = holdingRows(portfolioId, asOfDate, holdings);
    const deduplicatedHoldingExposures = deduplicateHoldingsBySymbol(holdingExposures);
    const report: PortfolioLookthroughReport = {
      asOfDate,
      sectorExposures: rows(portfolioId, asOfDate, "sector", sectors),
      countryExposures: rows(portfolioId, asOfDate, "country", countries),
      currencyExposures: rows(portfolioId, asOfDate, "currency", currencies),
      themeExposures: rows(portfolioId, asOfDate, "theme", themes),
      topHoldingExposures: topHoldingExposureRows(portfolioId, asOfDate, deduplicatedHoldingExposures),
      holdingExposures: deduplicatedHoldingExposures,
      coverage: { etfCount, etfsWithSectorExposure, etfsWithCountryExposure, etfsWithTopHoldings, lookthroughWeight, fallbackWeight },
      diagnostics
    };

    const deduplicatedTopHoldingExposures = deduplicateExposuresByName(report.topHoldingExposures);
    await this.repository.upsertPortfolioLookthroughExposures([
      ...report.sectorExposures,
      ...report.countryExposures,
      ...report.currencyExposures,
      ...report.themeExposures,
      ...deduplicatedTopHoldingExposures
    ]);
    await this.repository.upsertPortfolioLookthroughHoldings(deduplicatedHoldingExposures);
    return report;
  }
}
