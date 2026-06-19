import { AssetMetadataProvider } from "@/application/ports/providers/AssetMetadataProvider";
import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { TaxonomyService } from "@/application/services/taxonomy/TaxonomyService";

export type RefreshUniverseMetadataResult = {
  requestedSymbols: string[];
  updatedCount: number;
  missingSymbols: string[];
  errors: string[];
  message: string;
};

const MAX_SYMBOLS_PER_REFRESH = 75;

function uniqueSymbols(symbols: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol))
    )
  );
}

function providerSymbolForMetadata(symbol: string | null | undefined) {
  const normalized = symbol?.trim().toUpperCase() ?? "";
  if (normalized === "BRK.B") return "BRK-B";
  return normalized;
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function needsMetadataRefresh(metadataLastRefreshedAt: string | null, cutoffIso: string) {
  return !metadataLastRefreshedAt || metadataLastRefreshedAt < cutoffIso;
}

function needsIdentifierRefresh(
  instrument: { instrumentType: string; isin?: string | null; cusip?: string | null; identifierLastRefreshedAt?: string | null },
  cutoffIso: string,
  forceIdentifierRefresh = false
) {
  if (instrument.instrumentType === "crypto_etf") return false;
  const missingCoreIdentifier = !instrument.isin || !instrument.cusip;
  if (forceIdentifierRefresh) return missingCoreIdentifier;
  return missingCoreIdentifier && needsMetadataRefresh(instrument.identifierLastRefreshedAt ?? null, cutoffIso);
}

function sameStringArray(left: string[] | null | undefined, right: string[] | null | undefined) {
  const leftValues = left ?? [];
  const rightValues = right ?? [];
  return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
}

function classifyFundMetadata(item: { symbol: string; sector: string | null; industry: string | null }, assetClass: string) {
  if (assetClass === "bond_etf") {
    return {
      sector: "Fixed Income",
      industry: "Bond ETF"
    };
  }

  if (assetClass === "gold_etf") {
    return {
      sector: "Commodities",
      industry: "Gold ETF"
    };
  }

  if (assetClass !== "etf") {
    return {
      sector: item.sector,
      industry: item.industry
    };
  }

  const symbol = item.symbol.toUpperCase();
  const broadMarketEtfs = new Set(["VOO", "SPY", "IVV", "VTI", "VT", "VEA", "VWO", "VXUS", "ACWI"]);
  const sectorEtfs = new Set(["XLK", "XLF", "XLV", "XLY", "XLP", "XLE", "XLI", "XLB", "XLU", "XLRE", "XLC"]);

  if (sectorEtfs.has(symbol)) {
    return {
      sector: item.sector ?? "Sector ETF",
      industry: "Sector ETF"
    };
  }

  return {
    sector: broadMarketEtfs.has(symbol) ? "Broad Market" : "Multi-sector ETF",
    industry: "ETF"
  };
}

export class MetadataRefreshService {
  private readonly taxonomyService = new TaxonomyService();

  constructor(
    private readonly repository: UniverseRepository,
    private readonly provider: AssetMetadataProvider
  ) {}

  async refreshUniverseMetadata(input: { requestedByUserId?: string | null; limit?: number; forceIdentifierRefresh?: boolean } = {}): Promise<RefreshUniverseMetadataResult> {
    try {
      const instruments = await this.repository.listInstruments({ isActive: true });
      const metadataCutoff = daysAgoIso(30);
      const symbols = uniqueSymbols(
        instruments
          .filter((instrument) => needsMetadataRefresh(instrument.metadataLastRefreshedAt, metadataCutoff) || needsIdentifierRefresh(instrument, metadataCutoff, input.forceIdentifierRefresh))
          .sort((a, b) => {
            const aDate = a.metadataLastRefreshedAt ?? a.identifierLastRefreshedAt ?? "";
            const bDate = b.metadataLastRefreshedAt ?? b.identifierLastRefreshedAt ?? "";
            if (aDate !== bDate) return aDate.localeCompare(bDate);
            return (a.symbol ?? "").localeCompare(b.symbol ?? "");
          })
          .filter((instrument) => instrument.symbol)
          .map((instrument) => providerSymbolForMetadata(instrument.symbol))
      ).slice(0, input.limit ?? MAX_SYMBOLS_PER_REFRESH);

      if (symbols.length === 0) {
        return {
          requestedSymbols: [],
          updatedCount: 0,
          missingSymbols: [],
          errors: [],
            message: "Instrument metadata is already fresh."
        };
      }

      const metadata = await this.provider.getAssetMetadata(symbols);
      const instrumentByProviderSymbol = new Map(instruments.map((instrument) => [providerSymbolForMetadata(instrument.symbol), instrument]));
      const localSymbolByProviderSymbol = new Map(instruments.map((instrument) => [providerSymbolForMetadata(instrument.symbol), instrument.symbol?.toUpperCase() ?? ""]));
      const returnedSymbols = new Set(metadata.map((item) => item.symbol.toUpperCase()));
      const missingSymbols = symbols
        .filter((symbol) => !returnedSymbols.has(symbol))
        .map((symbol) => localSymbolByProviderSymbol.get(symbol) ?? symbol);

      await this.repository.updateInstrumentMetadata(
        metadata.map((item) => {
          const providerSymbol = item.symbol.toUpperCase();
          const instrument = instrumentByProviderSymbol.get(providerSymbol);
          const classification = classifyFundMetadata(item, instrument?.assetClass ?? "stock");
          const normalized = this.taxonomyService.normalize({
            symbol: item.symbol,
            name: item.name,
            assetClass: instrument?.assetClass ?? "stock",
            instrumentType: instrument?.instrumentType,
            rawSector: classification.sector,
            rawIndustry: classification.industry,
            seededThemes: instrument?.thematicTags,
            bondProfile: instrument
          });
          const canonicalSector = instrument?.taxonomyIsManualOverride ? instrument.canonicalSector : normalized.canonicalSector;
          const canonicalThemes = instrument?.taxonomyIsManualOverride ? instrument.canonicalThemes : normalized.canonicalThemes;
          return {
            provider: this.provider.name,
            symbol: instrument?.symbol ?? item.symbol,
            name: item.name,
            exchange: item.exchange,
            currency: item.currency,
            country: item.country,
            region: item.region,
            sector: classification.sector,
            industry: classification.industry,
            isin: item.isin,
            cusip: item.cusip,
            figi: item.figi,
            providerSymbol: providerSymbol || instrument?.providerSymbol,
            rawPayload: item.raw,
            canonicalSector,
            canonicalThemes,
            unmappedRawValues: instrument?.taxonomyIsManualOverride ? [] : normalized.unmappedRawValues
          };
        })
      );
      await this.repository.syncSecurityMasterIdentifiersFromInstruments();

      await this.repository.insertMetadataRefreshLog({
        refreshScope: "instrument_universe",
        provider: this.provider.name,
        requestedCount: symbols.length,
        updatedCount: metadata.length,
        missingCount: missingSymbols.length,
        status: missingSymbols.length > 0 ? "partial" : "completed",
        message: `Updated metadata for ${metadata.length} instrument${metadata.length === 1 ? "" : "s"}.${missingSymbols.length > 0 ? ` ${missingSymbols.length} symbol${missingSymbols.length === 1 ? "" : "s"} need review.` : ""}`,
        requestedSymbols: symbols,
        missingSymbols,
        requestedByUserId: input.requestedByUserId ?? null,
        completedAt: new Date().toISOString(),
        details: { provider: this.provider.name }
      });

      return {
        requestedSymbols: symbols,
        updatedCount: metadata.length,
        missingSymbols,
        errors: missingSymbols.map((symbol) => `No metadata returned for ${symbol}.`),
        message: `Updated metadata for ${metadata.length} instrument${metadata.length === 1 ? "" : "s"}.${missingSymbols.length > 0 ? ` ${missingSymbols.length} symbol${missingSymbols.length === 1 ? "" : "s"} need review.` : ""}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instrument metadata refresh failed.";
      await this.repository.insertMetadataRefreshLog({
        refreshScope: "instrument_universe",
        provider: this.provider.name,
        requestedCount: 0,
        updatedCount: 0,
        missingCount: 0,
        status: "failed",
        message,
        requestedSymbols: [],
        missingSymbols: [],
        requestedByUserId: input.requestedByUserId ?? null,
        completedAt: new Date().toISOString(),
        details: { provider: this.provider.name }
      });
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [message],
        message: `Instrument metadata refresh failed: ${message}`
      };
    }
  }

  async backfillCanonicalTaxonomy(input: { requestedByUserId?: string | null } = {}): Promise<RefreshUniverseMetadataResult> {
    try {
      const instruments = await this.repository.listInstruments({ isActive: true });
      const updates = instruments
        .filter((instrument) => !instrument.taxonomyIsManualOverride)
        .map((instrument) => {
          const normalized = this.taxonomyService.normalizeInstrument(instrument);
          return { instrument, normalized };
        })
        .filter(({ instrument, normalized }) =>
          instrument.canonicalSector !== normalized.canonicalSector || !sameStringArray(instrument.canonicalThemes, normalized.canonicalThemes)
        );

      if (updates.length > 0) {
        await this.repository.upsertInstrumentTaxonomy(
          updates.map(({ instrument, normalized }) => ({
            instrumentId: instrument.id,
            rawSector: instrument.sector,
            rawIndustry: instrument.industry,
            canonicalSector: normalized.canonicalSector,
            canonicalThemes: normalized.canonicalThemes,
            sourceProvider: "etfvision_curated_taxonomy",
            confidence: 1,
            isManualOverride: false,
            reviewStatus: normalized.unmappedRawValues.length > 0 ? "needs_review" : "mapped"
          }))
        );
      }

      await this.repository.insertMetadataRefreshLog({
        refreshScope: "instrument_taxonomy_backfill",
        provider: "etfvision_curated_taxonomy",
        requestedCount: instruments.length,
        updatedCount: updates.length,
        missingCount: 0,
        status: "completed",
        message: `Backfilled canonical taxonomy for ${updates.length} active instrument${updates.length === 1 ? "" : "s"}.`,
        requestedSymbols: instruments.map((instrument) => instrument.symbol ?? "").filter(Boolean),
        missingSymbols: [],
        requestedByUserId: input.requestedByUserId ?? null,
        completedAt: new Date().toISOString(),
        details: { source: "alpha_universe_curated_taxonomy" }
      });

      return {
        requestedSymbols: instruments.map((instrument) => instrument.symbol ?? "").filter(Boolean),
        updatedCount: updates.length,
        missingSymbols: [],
        errors: [],
        message: `Backfilled canonical taxonomy for ${updates.length} active instrument${updates.length === 1 ? "" : "s"}.`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instrument taxonomy backfill failed.";
      await this.repository.insertMetadataRefreshLog({
        refreshScope: "instrument_taxonomy_backfill",
        provider: "etfvision_curated_taxonomy",
        requestedCount: 0,
        updatedCount: 0,
        missingCount: 0,
        status: "failed",
        message,
        requestedSymbols: [],
        missingSymbols: [],
        requestedByUserId: input.requestedByUserId ?? null,
        completedAt: new Date().toISOString(),
        details: { source: "alpha_universe_curated_taxonomy" }
      });
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [message],
        message: `Instrument taxonomy backfill failed: ${message}`
      };
    }
  }

  async refreshUniverseMetadataInBatches(input: {
    requestedByUserId?: string | null;
    batchSize?: number;
    maxBatches?: number;
    forceIdentifierRefresh?: boolean;
  } = {}): Promise<RefreshUniverseMetadataResult> {
    const batchSize = Math.max(1, input.batchSize ?? 24);
    const maxBatches = Math.max(1, input.maxBatches ?? 4);
    const requestedSymbols = new Set<string>();
    const missingSymbols = new Set<string>();
    const errors: string[] = [];
    let updatedCount = 0;

    for (let index = 0; index < maxBatches; index += 1) {
      const result = await this.refreshUniverseMetadata({
        requestedByUserId: input.requestedByUserId,
        limit: batchSize,
        forceIdentifierRefresh: input.forceIdentifierRefresh
      });

      result.requestedSymbols.forEach((symbol) => requestedSymbols.add(symbol));
      result.missingSymbols.forEach((symbol) => missingSymbols.add(symbol));
      errors.push(...result.errors);
      updatedCount += result.updatedCount;

      if (result.requestedSymbols.length === 0) break;
    }

    if (updatedCount > 0) {
      await this.repository.syncSecurityMasterIdentifiersFromInstruments();
    }

    return {
      requestedSymbols: Array.from(requestedSymbols),
      updatedCount,
      missingSymbols: Array.from(missingSymbols),
      errors,
      message:
        requestedSymbols.size === 0
          ? "Instrument metadata is already fresh."
          : `Updated metadata for ${updatedCount} instrument${updatedCount === 1 ? "" : "s"} across ${requestedSymbols.size} requested symbol${requestedSymbols.size === 1 ? "" : "s"}.`
    };
  }
}
