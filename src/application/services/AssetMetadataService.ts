import { AssetMetadataProvider } from "@/application/ports/providers/AssetMetadataProvider";
import { MarketDataRepository } from "@/application/ports/repositories/MarketDataRepository";
import { AssetType, Holding } from "@/domain/portfolio/types";

export type RefreshAssetMetadataResult = {
  requestedSymbols: string[];
  updatedCount: number;
  missingSymbols: string[];
  message: string;
  errors: string[];
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

function classifyFundMetadata(item: { symbol: string; sector: string | null; industry: string | null }, assetType: AssetType) {
  if (assetType === "bond_etf") {
    return {
      sector: "Fixed Income",
      industry: "Bond ETF"
    };
  }

  if (assetType === "gold_etf") {
    return {
      sector: "Commodities",
      industry: "Gold ETF"
    };
  }

  if (assetType !== "etf") {
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

function holdingTypeBySymbol(holdings: Holding[]) {
  return new Map(
    holdings
      .filter((holding) => holding.ticker)
      .map((holding) => [holding.ticker!.toUpperCase(), holding.assetType])
  );
}

export class AssetMetadataService {
  constructor(
    private readonly repository: MarketDataRepository,
    private readonly provider: AssetMetadataProvider
  ) {}

  async refreshPortfolioAssetMetadata(input: { userId: string; portfolioId: string }): Promise<RefreshAssetMetadataResult> {
    try {
      const [holdings, watchlistAssets] = await Promise.all([
        this.repository.listPricedPortfolioHoldings(input.portfolioId),
        this.repository.listWatchlistAssets(input.userId)
      ]);
      const symbols = uniqueSymbols([
        ...holdings.map((holding) => holding.ticker),
        ...watchlistAssets.map((asset) => asset.ticker ?? asset.symbol)
      ]).slice(0, MAX_SYMBOLS_PER_REFRESH);

      if (symbols.length === 0) {
        return {
          requestedSymbols: [],
          updatedCount: 0,
          missingSymbols: [],
          errors: [],
          message: "No ticker symbols were found for metadata refresh."
        };
      }

      const metadata = await this.provider.getAssetMetadata(symbols);
      const assetTypes = holdingTypeBySymbol(holdings);
      const returnedSymbols = new Set(metadata.map((item) => item.symbol.toUpperCase()));
      const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol));

      await this.repository.updateAssetMetadata(
        metadata.map((item) => ({
          ...classifyFundMetadata(item, assetTypes.get(item.symbol.toUpperCase()) ?? "stock"),
          provider: this.provider.name,
          symbol: item.symbol,
          name: item.name,
          exchange: item.exchange,
          currency: item.currency,
          country: item.country,
          region: item.region,
          rawPayload: item.raw
        }))
      );

      return {
        requestedSymbols: symbols,
        updatedCount: metadata.length,
        missingSymbols,
        errors: missingSymbols.map((symbol) => `No metadata returned for ${symbol}.`),
        message: `Updated metadata for ${metadata.length} asset${metadata.length === 1 ? "" : "s"}.${missingSymbols.length > 0 ? ` ${missingSymbols.length} symbol${missingSymbols.length === 1 ? "" : "s"} need review.` : ""}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Asset metadata refresh failed.";
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [message],
        message: `Asset metadata refresh failed: ${message}`
      };
    }
  }
}
