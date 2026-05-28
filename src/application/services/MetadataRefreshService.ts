import { AssetMetadataProvider } from "@/application/ports/providers/AssetMetadataProvider";
import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";

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
  const broadMarketEtfs = new Set(["VOO", "SPY", "IVV", "VTI", "VT", "VEA", "VWO", "VXUS", "ACWI", "URTH"]);
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
  constructor(
    private readonly repository: UniverseRepository,
    private readonly provider: AssetMetadataProvider
  ) {}

  async refreshUniverseMetadata(input: { requestedByUserId?: string | null; limit?: number } = {}): Promise<RefreshUniverseMetadataResult> {
    try {
      const instruments = await this.repository.listInstruments({ isActive: true });
      const symbols = uniqueSymbols(
        instruments
          .filter((instrument) => instrument.symbol)
          .map((instrument) => instrument.symbol)
      ).slice(0, input.limit ?? MAX_SYMBOLS_PER_REFRESH);

      if (symbols.length === 0) {
        return {
          requestedSymbols: [],
          updatedCount: 0,
          missingSymbols: [],
          errors: [],
          message: "No active instrument symbols were found for metadata refresh."
        };
      }

      const metadata = await this.provider.getAssetMetadata(symbols);
      const instrumentBySymbol = new Map(instruments.map((instrument) => [instrument.symbol?.toUpperCase() ?? "", instrument]));
      const returnedSymbols = new Set(metadata.map((item) => item.symbol.toUpperCase()));
      const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol));

      await this.repository.updateInstrumentMetadata(
        metadata.map((item) => {
          const instrument = instrumentBySymbol.get(item.symbol.toUpperCase());
          const classification = classifyFundMetadata(item, instrument?.assetClass ?? "stock");
          return {
            provider: this.provider.name,
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchange,
            currency: item.currency,
            country: item.country,
            region: item.region,
            sector: classification.sector,
            industry: classification.industry,
            rawPayload: item.raw
          };
        })
      );

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
}
