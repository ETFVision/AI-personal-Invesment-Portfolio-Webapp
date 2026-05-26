import {
  MarketDataRepository,
  UpdateAssetMetadataInput,
  UpsertDailyPriceInput
} from "@/application/ports/repositories/MarketDataRepository";
import { Asset, DailyPrice, Holding } from "@/domain/portfolio/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function mapHolding(row: any): Holding {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    assetType: row.asset_type,
    ticker: row.ticker,
    assetName: row.asset_name,
    accountName: row.account_name,
    brokerName: row.broker_name,
    quantity: Number(row.quantity),
    averageCost: row.average_cost == null ? null : Number(row.average_cost),
    costCurrency: row.cost_currency,
    firstPurchaseDate: row.first_purchase_date,
    notes: row.notes
  };
}

function mapDailyPrice(row: any): DailyPrice {
  return {
    id: row.id,
    assetId: row.asset_id,
    provider: row.provider,
    symbol: row.symbol,
    priceDate: row.price_date,
    closePrice: Number(row.close_price),
    currency: row.currency
  };
}

function isMissingDailyPricesTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("daily_prices") && error.message?.toLowerCase().includes("does not exist")))
  );
}

export class SupabaseMarketDataRepository implements MarketDataRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listPricedPortfolioHoldings(portfolioId: string) {
    const { data, error } = await this.db
      .from("holdings")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .not("ticker", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapHolding);
  }

  async listWatchlistAssets(_userId: string): Promise<Asset[]> {
    // Watchlist tables are planned after the core MVP. The market-data service already accepts
    // this source so a later repository adapter can add it without changing the service contract.
    return [];
  }

  async getLatestPricesForAssets(assetIds: string[]) {
    if (assetIds.length === 0) return new Map<string, DailyPrice>();

    const { data, error } = await this.db
      .from("daily_prices")
      .select("*")
      .in("asset_id", assetIds)
      .order("price_date", { ascending: false });
    if (isMissingDailyPricesTable(error)) return new Map<string, DailyPrice>();
    if (error) throw new Error(error.message);

    const latest = new Map<string, DailyPrice>();
    for (const row of data ?? []) {
      if (!latest.has(row.asset_id)) latest.set(row.asset_id, mapDailyPrice(row));
    }
    return latest;
  }

  async getPricesForAssetsOnDate(assetIds: string[], priceDate: string, provider: string) {
    if (assetIds.length === 0) return new Map<string, DailyPrice>();

    const { data, error } = await this.db
      .from("daily_prices")
      .select("*")
      .in("asset_id", assetIds)
      .eq("price_date", priceDate)
      .eq("provider", provider);
    if (isMissingDailyPricesTable(error)) return new Map<string, DailyPrice>();
    if (error) throw new Error(error.message);

    return new Map((data ?? []).map((row) => [row.asset_id, mapDailyPrice(row)]));
  }

  async upsertDailyPrices(input: UpsertDailyPriceInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("daily_prices").upsert(
      input.map((item) => ({
        asset_id: item.assetId,
        provider: item.provider,
        symbol: item.symbol,
        price_date: item.priceDate,
        close_price: item.closePrice,
        currency: item.currency,
        raw_payload: item.rawPayload
      })),
      { onConflict: "asset_id,provider,price_date" }
    );
    if (error) throw new Error(error.message);
  }

  async updateAssetMetadata(input: UpdateAssetMetadataInput[]) {
    for (const item of input) {
      const { data: current, error: currentError } = await this.db
        .from("assets")
        .select("provider_ids, metadata")
        .eq("ticker", item.symbol)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);

      const providerIds = {
        ...(current?.provider_ids ?? {}),
        [item.provider]: item.symbol
      };
      const metadata = {
        ...(current?.metadata ?? {}),
        [item.provider]: item.rawPayload
      };

      const { error } = await this.db
        .from("assets")
        .update({
          name: item.name ?? undefined,
          exchange: item.exchange ?? undefined,
          currency: item.currency ?? undefined,
          country: item.country ?? undefined,
          region: item.region ?? item.country ?? undefined,
          sector: item.sector ?? undefined,
          industry: item.industry ?? undefined,
          provider_primary: item.provider,
          provider_ids: providerIds,
          metadata
        })
        .eq("ticker", item.symbol);
      if (error) throw new Error(error.message);
    }
  }
}
