import {
  MarketDataRepository,
  SyncPortfolioDailyPricesResult,
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

function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")));
}

function uniqueSymbols(symbols: Array<string | null | undefined>) {
  return Array.from(new Set(symbols.map((symbol) => symbol?.trim().toUpperCase()).filter((symbol): symbol is string => Boolean(symbol))));
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
    const { data: watchlists, error: watchlistError } = await this.db
      .from("watchlists")
      .select("id")
      .eq("is_active", true);
    if (isMissingTable(watchlistError)) return [];
    if (watchlistError) throw new Error(watchlistError.message);

    const watchlistIds = (watchlists ?? []).map((row) => row.id);
    if (watchlistIds.length === 0) return [];

    const { data: items, error: itemsError } = await this.db
      .from("watchlist_items")
      .select("instrument_id")
      .in("watchlist_id", watchlistIds)
      .eq("is_active", true);
    if (itemsError) throw new Error(itemsError.message);

    const instrumentIds = Array.from(new Set((items ?? []).map((row) => row.instrument_id).filter(Boolean)));
    if (instrumentIds.length === 0) return [];

    const { data: instruments, error: instrumentError } = await this.db
      .from("instruments")
      .select("*")
      .in("id", instrumentIds)
      .eq("is_active", true);
    if (instrumentError) throw new Error(instrumentError.message);

    return (instruments ?? []).map((instrument) => ({
      id: instrument.id,
      assetType: instrument.asset_class,
      ticker: instrument.symbol,
      symbol: instrument.symbol,
      name: instrument.name,
      currency: instrument.currency,
      sector: instrument.canonical_sector ?? instrument.sector,
      country: instrument.geography,
      region: instrument.geography
    }));
  }

  async listAssetMetadataStatus(symbols: string[], provider: string) {
    const normalizedSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
    if (normalizedSymbols.length === 0) return new Map<string, boolean>();

    const { data, error } = await this.db
      .from("assets")
      .select("ticker, symbol, metadata")
      .in("ticker", normalizedSymbols);
    if (error) throw new Error(error.message);

    const status = new Map(normalizedSymbols.map((symbol) => [symbol, false]));
    for (const row of data ?? []) {
      const rowSymbols = [row.ticker, row.symbol]
        .map((symbol) => (typeof symbol === "string" ? symbol.trim().toUpperCase() : ""))
        .filter(Boolean);
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      const hasProviderMetadata = Object.prototype.hasOwnProperty.call(metadata, provider);
      for (const symbol of rowSymbols) {
        if (status.has(symbol)) status.set(symbol, hasProviderMetadata);
      }
    }
    return status;
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

  async listDailyPricesForAssets(assetIds: string[], sinceDate?: string) {
    if (assetIds.length === 0) return [];

    let query = this.db
      .from("daily_prices")
      .select("*")
      .in("asset_id", assetIds)
      .order("price_date", { ascending: true });
    if (sinceDate) query = query.gte("price_date", sinceDate);

    const { data, error } = await query;
    if (isMissingDailyPricesTable(error)) return [];
    if (error) throw new Error(error.message);

    return (data ?? []).map(mapDailyPrice);
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

  async syncPortfolioDailyPricesFromInstrumentPrices(portfolioId: string, _provider?: string): Promise<SyncPortfolioDailyPricesResult> {
    const holdings = await this.listPricedPortfolioHoldings(portfolioId);
    const requestedSymbols = uniqueSymbols(holdings.map((holding) => holding.ticker));
    if (holdings.length === 0 || requestedSymbols.length === 0) {
      return { requestedSymbols: [], syncedCount: 0, missingSymbols: [] };
    }

    const { data: instruments, error: instrumentError } = await this.db
      .from("instruments")
      .select("id,symbol,currency")
      .in("symbol", requestedSymbols);
    if (isMissingTable(instrumentError)) return { requestedSymbols, syncedCount: 0, missingSymbols: requestedSymbols };
    if (instrumentError) throw new Error(instrumentError.message);

    const instrumentBySymbol = new Map(
      (instruments ?? []).map((instrument) => [String(instrument.symbol ?? "").trim().toUpperCase(), instrument])
    );
    const instrumentIds = Array.from(new Set((instruments ?? []).map((instrument) => instrument.id).filter(Boolean)));
    if (instrumentIds.length === 0) {
      return { requestedSymbols, syncedCount: 0, missingSymbols: requestedSymbols };
    }

    const { data: metrics, error: metricsError } = await this.db
      .from("instrument_market_metrics")
      .select("instrument_id,latest_price,latest_price_date")
      .in("instrument_id", instrumentIds)
      .not("latest_price", "is", null)
      .not("latest_price_date", "is", null);
    if (isMissingTable(metricsError)) return { requestedSymbols, syncedCount: 0, missingSymbols: requestedSymbols };
    if (metricsError) throw new Error(metricsError.message);

    const latestMetricByInstrumentId = new Map((metrics ?? []).map((row) => [String(row.instrument_id), row]));

    const rows = holdings.flatMap((holding) => {
      const symbol = holding.ticker?.trim().toUpperCase();
      if (!symbol) return [];
      const instrument = instrumentBySymbol.get(symbol);
      if (!instrument?.id) return [];
      const latestMetric = latestMetricByInstrumentId.get(String(instrument.id));
      if (!latestMetric?.latest_price || !latestMetric.latest_price_date) return [];
      return [
        {
          assetId: holding.assetId,
          provider: "instrument_market_metrics",
          symbol,
          priceDate: latestMetric.latest_price_date,
          closePrice: Number(latestMetric.latest_price),
          currency: instrument.currency ?? holding.costCurrency,
          rawPayload: {
            source: "instrument_market_metrics",
            instrumentId: instrument.id
          }
        }
      ];
    });

    if (rows.length > 0) {
      await this.upsertDailyPrices(rows);
    }

    const syncedSymbols = new Set(rows.map((row) => row.symbol));
    return {
      requestedSymbols,
      syncedCount: rows.length,
      missingSymbols: requestedSymbols.filter((symbol) => !syncedSymbols.has(symbol))
    };
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
          canonical_sector: item.canonicalSector ?? undefined,
          canonical_themes: item.canonicalThemes ?? undefined,
          provider_primary: item.provider,
          provider_ids: providerIds,
          metadata
        })
        .eq("ticker", item.symbol);
      if (error) throw new Error(error.message);
    }
  }
}
