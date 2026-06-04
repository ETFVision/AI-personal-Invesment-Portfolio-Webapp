import {
  BenchmarkProfile,
  BondProfile,
  CryptoProfile,
  Instrument,
  InstrumentMarketMetric,
  InstrumentPrice,
  InstrumentRiskMetric,
  MetadataRefreshLog,
  Watchlist,
  WatchlistItem
} from "@/domain/universe/types";
import {
  CanonicalTaxonomyItem,
  InstrumentTaxonomyMapping,
  ListInstrumentsFilters,
  ProviderTaxonomyMapping,
  UniverseRepository,
  UpsertInstrumentInput,
  UpsertInstrumentPriceInput,
  UpsertInstrumentRiskMetricInput,
  UpsertWatchlistInput,
  UpsertWatchlistItemInput
} from "@/application/ports/repositories/UniverseRepository";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingUniverseTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("instrument") && error.message?.toLowerCase().includes("does not exist")))
  );
}

function isMissingMetricsSupport(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42883" ||
        error.message?.toLowerCase().includes("instrument_market_metrics") ||
        error.message?.toLowerCase().includes("instrument_risk_metrics") ||
        error.message?.toLowerCase().includes("refresh_instrument_market_metrics"))
  );
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapInstrument(row: any): Instrument {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    assetClass: row.asset_class,
    instrumentType: row.instrument_type,
    sector: row.sector,
    industry: row.industry,
    canonicalSector: row.canonical_sector ?? row.sector ?? null,
    canonicalThemes: toStringArray(row.canonical_themes),
    taxonomyIsManualOverride: Boolean(row.taxonomy_is_manual_override),
    taxonomyReviewStatus: row.taxonomy_review_status ?? "mapped",
    geography: row.geography,
    currency: row.currency,
    exchange: row.exchange,
    watchlistTier: row.watchlist_tier,
    benchmarkTags: toStringArray(row.benchmark_tags),
    thematicTags: toStringArray(row.thematic_tags),
    riskCategory: row.risk_category,
    volatilityBucket: row.volatility_bucket,
    durationCategory: row.duration_category,
    treasuryClassification: row.treasury_classification,
    inflationLinked: row.inflation_linked,
    creditQuality: row.credit_quality,
    geoExposure: row.geo_exposure,
    rateSensitivity: row.rate_sensitivity,
    inflationSensitivity: row.inflation_sensitivity,
    recessionSensitivity: row.recession_sensitivity,
    liquidityRole: row.liquidity_role,
    cryptoClassification: row.crypto_classification,
    metadataLastRefreshedAt: row.metadata_last_refreshed_at,
    providerPrimary: row.provider_primary,
    providerMetadata: row.provider_metadata ?? {},
    sourceType: row.source_type,
    isActive: row.is_active
  };
}

function mapWatchlist(row: any): Watchlist {
  return {
    id: row.id,
    watchlistKey: row.watchlist_key,
    name: row.name,
    watchlistTier: row.watchlist_tier,
    description: row.description,
    isSystem: row.is_system,
    isActive: row.is_active,
    humanApprovalRequired: row.human_approval_required,
    sourceType: row.source_type
  };
}

function mapBenchmarkProfile(row: any): BenchmarkProfile {
  return {
    id: row.id,
    benchmarkKey: row.benchmark_key,
    benchmarkName: row.benchmark_name,
    benchmarkType: row.benchmark_type,
    instrumentId: row.instrument_id,
    instrumentSymbol: row.instrument_symbol ?? null,
    providerSymbol: row.provider_symbol,
    currency: row.currency,
    baseValue: Number(row.base_value),
    components: Array.isArray(row.components) ? row.components : [],
    notes: row.notes,
    isActive: row.is_active
  };
}

function mapBondProfile(row: any): BondProfile {
  return {
    instrumentId: row.instrument_id,
    symbol: row.instrument_symbol ?? null,
    durationCategory: row.duration_category,
    treasuryClassification: row.treasury_classification,
    inflationLinked: row.inflation_linked,
    creditQuality: row.credit_quality,
    geoExposure: row.geo_exposure,
    rateSensitivity: row.rate_sensitivity,
    inflationSensitivity: row.inflation_sensitivity,
    recessionSensitivity: row.recession_sensitivity,
    liquidityRole: row.liquidity_role,
    currency: row.currency,
    secYield: row.sec_yield == null ? null : Number(row.sec_yield),
    distributionYield: row.distribution_yield == null ? null : Number(row.distribution_yield),
    yieldToMaturity: row.yield_to_maturity == null ? null : Number(row.yield_to_maturity),
    yieldAsOfDate: row.yield_as_of_date,
    effectiveDuration: row.effective_duration == null ? null : Number(row.effective_duration),
    averageMaturity: row.average_maturity == null ? null : Number(row.average_maturity),
    spreadDuration: row.spread_duration == null ? null : Number(row.spread_duration),
    optionAdjustedSpread: row.option_adjusted_spread == null ? null : Number(row.option_adjusted_spread),
    expenseRatio: row.expense_ratio == null ? null : Number(row.expense_ratio),
    isManualOverride: Boolean(row.is_manual_override),
    updatedAt: row.updated_at ?? null,
    providerMetadata: row.provider_metadata ?? {}
  };
}

function mapCryptoProfile(row: any): CryptoProfile {
  return {
    instrumentId: row.instrument_id,
    symbol: row.instrument_symbol ?? null,
    chain: row.chain,
    marketCapBucket: row.market_cap_bucket,
    custodyRisk: row.custody_risk,
    volatilityBucket: row.volatility_bucket,
    providerMetadata: row.provider_metadata ?? {}
  };
}

function mapInstrumentPrice(row: any): InstrumentPrice {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    provider: row.provider,
    symbol: row.symbol,
    priceDate: row.price_date,
    closePrice: Number(row.close_price),
    currency: row.currency,
    rawPayload: row.raw_payload ?? {}
  };
}

function mapInstrumentMarketMetric(row: any): InstrumentMarketMetric {
  return {
    instrumentId: row.instrument_id,
    latestPrice: row.latest_price == null ? null : Number(row.latest_price),
    latestPriceDate: row.latest_price_date,
    previousClosePrice: row.previous_close_price == null ? null : Number(row.previous_close_price),
    previousPriceDate: row.previous_price_date,
    dailyReturn: row.daily_return == null ? null : Number(row.daily_return),
    ytdReturn: row.ytd_return == null ? null : Number(row.ytd_return),
    oneYearReturn: row.one_year_return == null ? null : Number(row.one_year_return),
    threeYearReturn: row.three_year_return == null ? null : Number(row.three_year_return),
    fiveYearReturn: row.five_year_return == null ? null : Number(row.five_year_return),
    fiftyTwoWeekLow: row.fifty_two_week_low == null ? null : Number(row.fifty_two_week_low),
    fiftyTwoWeekHigh: row.fifty_two_week_high == null ? null : Number(row.fifty_two_week_high),
    observationCount: Number(row.observation_count ?? 0),
    historyStartDate: row.history_start_date,
    historyEndDate: row.history_end_date,
    updatedAt: row.updated_at
  };
}

function mapInstrumentRiskMetric(row: any): InstrumentRiskMetric {
  return {
    instrumentId: row.instrument_id,
    metricDate: row.metric_date,
    volatility30d: row.volatility_30d == null ? null : Number(row.volatility_30d),
    volatility90d: row.volatility_90d == null ? null : Number(row.volatility_90d),
    volatility1y: row.volatility_1y == null ? null : Number(row.volatility_1y),
    volatilityTrend: row.volatility_trend ?? "insufficient_data",
    downsideVolatility: row.downside_volatility == null ? null : Number(row.downside_volatility),
    currentDrawdown1y: row.current_drawdown_1y == null ? null : Number(row.current_drawdown_1y),
    maxDrawdown1y: row.max_drawdown_1y == null ? null : Number(row.max_drawdown_1y),
    currentDrawdown3y: row.current_drawdown_3y == null ? null : Number(row.current_drawdown_3y),
    maxDrawdown3y: row.max_drawdown_3y == null ? null : Number(row.max_drawdown_3y),
    currentDrawdown5y: row.current_drawdown_5y == null ? null : Number(row.current_drawdown_5y),
    maxDrawdown5y: row.max_drawdown_5y == null ? null : Number(row.max_drawdown_5y),
    currentDrawdown: row.current_drawdown == null ? null : Number(row.current_drawdown),
    maxDrawdown: row.max_drawdown == null ? null : Number(row.max_drawdown),
    drawdownDurationDays: row.drawdown_duration_days == null ? null : Number(row.drawdown_duration_days),
    drawdownBucket: row.drawdown_bucket ?? "insufficient_data",
    negativeReturnFrequency: row.negative_return_frequency == null ? null : Number(row.negative_return_frequency),
    worstDailyReturn: row.worst_daily_return == null ? null : Number(row.worst_daily_return),
    worstWeeklyReturn: row.worst_weekly_return == null ? null : Number(row.worst_weekly_return),
    riskScore: row.risk_score == null ? null : Number(row.risk_score),
    riskBucket: row.risk_bucket ?? "insufficient_data",
    volatilityBucket: row.volatility_bucket ?? "insufficient_data",
    confidenceScore: Number(row.confidence_score ?? 0),
    observationCount: Number(row.observation_count ?? 0),
    historyStartDate: row.history_start_date,
    historyEndDate: row.history_end_date,
    calculatedAt: row.calculated_at
  };
}

function mapCanonicalTaxonomyItem(row: any): CanonicalTaxonomyItem {
  return {
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active)
  };
}

function mapProviderTaxonomyMapping(row: any): ProviderTaxonomyMapping {
  return {
    id: row.id,
    sourceProvider: row.source_provider,
    mappingType: row.mapping_type,
    rawValue: row.raw_value,
    canonicalValue: row.canonical_value,
    confidence: Number(row.confidence ?? 0),
    isManualOverride: Boolean(row.is_manual_override)
  };
}

function mapInstrumentTaxonomyMapping(row: any): InstrumentTaxonomyMapping {
  return {
    instrumentId: row.id,
    symbol: row.symbol,
    name: row.name,
    rawSector: row.sector,
    rawIndustry: row.industry,
    canonicalSector: row.canonical_sector,
    canonicalThemes: toStringArray(row.canonical_themes),
    taxonomyIsManualOverride: Boolean(row.taxonomy_is_manual_override),
    taxonomyReviewStatus: row.taxonomy_review_status ?? "mapped"
  };
}

function mapMetadataRefreshLog(row: any): MetadataRefreshLog {
  return {
    id: row.id,
    refreshScope: row.refresh_scope,
    provider: row.provider,
    requestedCount: Number(row.requested_count),
    updatedCount: Number(row.updated_count),
    missingCount: Number(row.missing_count),
    status: row.status,
    message: row.message,
    requestedSymbols: toStringArray(row.requested_symbols),
    missingSymbols: toStringArray(row.missing_symbols),
    requestedByUserId: row.requested_by_user_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    details: row.details ?? {}
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function uuidOrUndefined(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uuidOrNull(value: string | null | undefined) {
  return uuidOrUndefined(value) ?? null;
}

const SUPABASE_PAGE_SIZE = 1000;

export class SupabaseUniverseRepository implements UniverseRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listInstruments(filters?: ListInstrumentsFilters) {
    let query = this.db.from("instruments").select("*").order("symbol", { ascending: true });
    if (filters?.isActive != null) query = query.eq("is_active", filters.isActive);
    if (filters?.assetClass) query = query.eq("asset_class", filters.assetClass);
    if (filters?.watchlistTier) query = query.eq("watchlist_tier", filters.watchlistTier);
    if (filters?.query) {
      const safeQuery = filters.query.trim();
      if (safeQuery) {
        query = query.or(`symbol.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`);
      }
    }
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInstrument);
  }

  async listInstrumentPrices(instrumentIds?: string[], sinceDate?: string) {
    const rows: any[] = [];

    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
      let query = this.db
        .from("instrument_prices")
        .select("*")
        .order("instrument_id", { ascending: true })
        .order("price_date", { ascending: true })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (instrumentIds && instrumentIds.length > 0) {
        query = query.in("instrument_id", instrumentIds);
      }
      if (sinceDate) {
        query = query.gte("price_date", sinceDate);
      }

      const { data, error } = await query;
      if (isMissingUniverseTable(error)) return [];
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if ((data ?? []).length < SUPABASE_PAGE_SIZE) break;
    }

    return rows.map(mapInstrumentPrice);
  }

  async listInstrumentPriceStats(instrumentIds?: string[]) {
    const stats = new Map<string, { instrumentId: string; earliestPriceDate: string | null; latestPriceDate: string | null; observationCount: number }>();

    for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
      let query = this.db
        .from("instrument_prices")
        .select("instrument_id, price_date")
        .order("instrument_id", { ascending: true })
        .order("price_date", { ascending: true })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);
      if (instrumentIds && instrumentIds.length > 0) {
        query = query.in("instrument_id", instrumentIds);
      }

      const { data, error } = await query;
      if (isMissingUniverseTable(error)) return [];
      if (error) throw new Error(error.message);

      for (const row of data ?? []) {
        const instrumentId = String(row.instrument_id);
        const priceDate = String(row.price_date);
        const current = stats.get(instrumentId) ?? {
          instrumentId,
          earliestPriceDate: null,
          latestPriceDate: null,
          observationCount: 0
        };
        current.observationCount += 1;
        if (!current.earliestPriceDate || priceDate < current.earliestPriceDate) {
          current.earliestPriceDate = priceDate;
        }
        if (!current.latestPriceDate || priceDate > current.latestPriceDate) {
          current.latestPriceDate = priceDate;
        }
        stats.set(instrumentId, current);
      }

      if ((data ?? []).length < SUPABASE_PAGE_SIZE) break;
    }

    return Array.from(stats.values());
  }

  async upsertInstruments(input: UpsertInstrumentInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("instruments").upsert(
      input.map((item) => omitUndefined({
        id: uuidOrUndefined(item.id),
        symbol: item.symbol,
        name: item.name,
        asset_class: item.assetClass,
        instrument_type: item.instrumentType,
        sector: item.sector,
        industry: item.industry,
        canonical_sector: item.canonicalSector,
        canonical_themes: item.canonicalThemes ?? [],
        taxonomy_is_manual_override: item.taxonomyIsManualOverride,
        taxonomy_review_status: item.taxonomyReviewStatus,
        geography: item.geography,
        currency: item.currency,
        exchange: item.exchange,
        watchlist_tier: item.watchlistTier,
        benchmark_tags: item.benchmarkTags,
        thematic_tags: item.thematicTags,
        risk_category: item.riskCategory,
        volatility_bucket: item.volatilityBucket,
        duration_category: item.durationCategory,
        treasury_classification: item.treasuryClassification,
        inflation_linked: item.inflationLinked,
        credit_quality: item.creditQuality,
        geo_exposure: item.geoExposure,
        rate_sensitivity: item.rateSensitivity,
        inflation_sensitivity: item.inflationSensitivity,
        recession_sensitivity: item.recessionSensitivity,
        liquidity_role: item.liquidityRole,
        crypto_classification: item.cryptoClassification,
        metadata_last_refreshed_at: item.metadataLastRefreshedAt,
        provider_primary: item.providerPrimary,
        provider_metadata: item.providerMetadata,
        source_type: item.sourceType,
        is_active: item.isActive
      })),
      { onConflict: "symbol" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertInstrumentPrices(input: UpsertInstrumentPriceInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("instrument_prices").upsert(
      input.map((item) => ({
        instrument_id: uuidOrUndefined(item.instrumentId),
        provider: item.provider,
        symbol: item.symbol,
        price_date: item.priceDate,
        close_price: item.closePrice,
        currency: item.currency,
        raw_payload: item.rawPayload
      })),
      { onConflict: "instrument_id,provider,price_date" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listInstrumentMarketMetrics(instrumentIds?: string[]) {
    let query = this.db.from("instrument_market_metrics").select("*").order("latest_price_date", { ascending: false, nullsFirst: false });
    if (instrumentIds && instrumentIds.length > 0) {
      query = query.in("instrument_id", instrumentIds);
    }

    const { data, error } = await query;
    if (isMissingMetricsSupport(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInstrumentMarketMetric);
  }

  async refreshInstrumentMarketMetrics(instrumentIds?: string[]) {
    const { error } = await this.db.rpc("refresh_instrument_market_metrics", {
      target_instrument_ids: instrumentIds && instrumentIds.length > 0 ? instrumentIds : null
    });
    if (isMissingMetricsSupport(error)) return;
    if (error) throw new Error(error.message);
  }

  async listInstrumentRiskMetrics(instrumentIds?: string[]) {
    let query = this.db.from("instrument_risk_metrics").select("*").order("metric_date", { ascending: false, nullsFirst: false });
    if (instrumentIds && instrumentIds.length > 0) {
      query = query.in("instrument_id", instrumentIds);
    }

    const { data, error } = await query;
    if (isMissingMetricsSupport(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInstrumentRiskMetric);
  }

  async refreshInstrumentRiskMetrics(instrumentIds?: string[]) {
    const { error } = await this.db.rpc("refresh_instrument_risk_metrics", {
      target_instrument_ids: instrumentIds && instrumentIds.length > 0 ? instrumentIds : null
    });
    if (isMissingMetricsSupport(error)) return;
    if (error) throw new Error(error.message);

    const { error: periodError } = await this.db.rpc("refresh_instrument_risk_period_drawdowns", {
      target_instrument_ids: instrumentIds && instrumentIds.length > 0 ? instrumentIds : null
    });
    if (isMissingMetricsSupport(periodError)) return;
    if (periodError) throw new Error(periodError.message);
  }

  async upsertInstrumentRiskMetrics(input: UpsertInstrumentRiskMetricInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("instrument_risk_metrics").upsert(
      input.map((item) => ({
        instrument_id: uuidOrUndefined(item.instrumentId),
        metric_date: item.metricDate,
        volatility_30d: item.volatility30d,
        volatility_90d: item.volatility90d,
        volatility_1y: item.volatility1y,
        volatility_trend: item.volatilityTrend,
        downside_volatility: item.downsideVolatility,
        current_drawdown_1y: item.currentDrawdown1y,
        max_drawdown_1y: item.maxDrawdown1y,
        current_drawdown_3y: item.currentDrawdown3y,
        max_drawdown_3y: item.maxDrawdown3y,
        current_drawdown_5y: item.currentDrawdown5y,
        max_drawdown_5y: item.maxDrawdown5y,
        current_drawdown: item.currentDrawdown,
        max_drawdown: item.maxDrawdown,
        drawdown_duration_days: item.drawdownDurationDays,
        drawdown_bucket: item.drawdownBucket,
        negative_return_frequency: item.negativeReturnFrequency,
        worst_daily_return: item.worstDailyReturn,
        worst_weekly_return: item.worstWeeklyReturn,
        risk_score: item.riskScore,
        risk_bucket: item.riskBucket,
        volatility_bucket: item.volatilityBucket,
        confidence_score: item.confidenceScore,
        observation_count: item.observationCount,
        history_start_date: item.historyStartDate,
        history_end_date: item.historyEndDate,
        calculated_at: item.calculatedAt ?? new Date().toISOString()
      })),
      { onConflict: "instrument_id,metric_date" }
    );
    if (isMissingMetricsSupport(error)) return;
    if (error) throw new Error(error.message);
  }

  async listCanonicalSectors() {
    const { data, error } = await this.db.from("canonical_sectors").select("*").eq("is_active", true).order("sort_order");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCanonicalTaxonomyItem);
  }

  async listCanonicalThemes() {
    const { data, error } = await this.db.from("canonical_themes").select("*").eq("is_active", true).order("sort_order");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCanonicalTaxonomyItem);
  }

  async listProviderTaxonomyMappings() {
    const { data, error } = await this.db
      .from("provider_taxonomy_mappings")
      .select("*")
      .order("source_provider")
      .order("mapping_type")
      .order("raw_value");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProviderTaxonomyMapping);
  }

  async listInstrumentTaxonomyMappings() {
    const { data, error } = await this.db
      .from("instruments")
      .select("id,symbol,name,sector,industry,canonical_sector,canonical_themes,taxonomy_is_manual_override,taxonomy_review_status")
      .order("symbol", { ascending: true });
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInstrumentTaxonomyMapping);
  }

  async upsertInstrumentTaxonomy(input: Array<{
    instrumentId: string;
    rawSector: string | null;
    rawIndustry: string | null;
    canonicalSector: string;
    canonicalThemes: string[];
    sourceProvider: string;
    confidence?: number;
    isManualOverride?: boolean;
    reviewStatus?: string;
  }>) {
    for (const item of input) {
      const { error: updateError } = await this.db
        .from("instruments")
        .update({
          canonical_sector: item.canonicalSector,
          canonical_themes: item.canonicalThemes,
          taxonomy_is_manual_override: item.isManualOverride ?? false,
          taxonomy_review_status: item.reviewStatus ?? "mapped"
        })
        .eq("id", item.instrumentId);
      if (isMissingUniverseTable(updateError)) return;
      if (updateError) throw new Error(updateError.message);

      const { error: sectorError } = await this.db.from("instrument_sector_mappings").upsert(
        {
          instrument_id: uuidOrUndefined(item.instrumentId),
          source_provider: item.sourceProvider,
          raw_value: item.rawSector,
          canonical_value: item.canonicalSector,
          confidence: item.confidence ?? 1,
          is_manual_override: item.isManualOverride ?? false
        },
        { onConflict: "instrument_id,source_provider" }
      );
      if (isMissingUniverseTable(sectorError)) return;
      if (sectorError) throw new Error(sectorError.message);

      const { error: deleteError } = await this.db
        .from("instrument_theme_mappings")
        .delete()
        .eq("instrument_id", item.instrumentId)
        .eq("source_provider", item.sourceProvider);
      if (isMissingUniverseTable(deleteError)) return;
      if (deleteError) throw new Error(deleteError.message);

      if (item.canonicalThemes.length > 0) {
        const { error: themeError } = await this.db.from("instrument_theme_mappings").insert(
          item.canonicalThemes.map((theme) => ({
            instrument_id: uuidOrUndefined(item.instrumentId),
            source_provider: item.sourceProvider,
            raw_value: item.rawIndustry ?? item.rawSector,
            canonical_value: theme,
            confidence: item.confidence ?? 1,
            is_manual_override: item.isManualOverride ?? false
          }))
        );
        if (isMissingUniverseTable(themeError)) return;
        if (themeError) throw new Error(themeError.message);
      }
    }
  }

  async setInstrumentActive(instrumentId: string, isActive: boolean) {
    const { error } = await this.db.from("instruments").update({ is_active: isActive }).eq("id", uuidOrUndefined(instrumentId));
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async updateInstrumentTags(input: Array<{ instrumentId: string; benchmarkTags: string[]; thematicTags: string[] }>) {
    for (const item of input.filter((row) => Boolean(uuidOrUndefined(row.instrumentId)))) {
      const { error } = await this.db
        .from("instruments")
        .update({ benchmark_tags: item.benchmarkTags, thematic_tags: item.thematicTags })
        .eq("id", uuidOrUndefined(item.instrumentId));
      if (isMissingUniverseTable(error)) return;
      if (error) throw new Error(error.message);

      const tagRows = [
        ...item.benchmarkTags.map((tag) => ({ instrument_id: uuidOrUndefined(item.instrumentId), tag, tag_type: "benchmark", source: "human", is_active: true })),
        ...item.thematicTags.map((tag) => ({ instrument_id: uuidOrUndefined(item.instrumentId), tag, tag_type: "thematic", source: "human", is_active: true }))
      ];

      const { error: deleteError } = await this.db.from("instrument_tags").delete().eq("instrument_id", uuidOrUndefined(item.instrumentId));
      if (isMissingUniverseTable(deleteError)) return;
      if (deleteError) throw new Error(deleteError.message);

      if (tagRows.length > 0) {
        const { error: insertError } = await this.db.from("instrument_tags").insert(tagRows);
        if (isMissingUniverseTable(insertError)) return;
        if (insertError) throw new Error(insertError.message);
      }
    }
  }

  async updateInstrumentMetadata(
    input: Array<{
      provider: string;
      symbol: string;
      name: string | null;
      exchange: string | null;
      currency: string | null;
      country: string | null;
      region: string | null;
      sector: string | null;
      industry: string | null;
      rawPayload: unknown;
      canonicalSector?: string | null;
      canonicalThemes?: string[];
      unmappedRawValues?: string[];
    }>
  ) {
    for (const item of input) {
      const { data: current, error: currentError } = await this.db
        .from("instruments")
        .select("id,provider_metadata,taxonomy_is_manual_override,canonical_sector,canonical_themes")
        .eq("symbol", item.symbol)
        .maybeSingle();
      if (isMissingUniverseTable(currentError)) return;
      if (currentError) throw new Error(currentError.message);

      const providerMetadata = {
        ...(current?.provider_metadata ?? {}),
        [item.provider]: item.rawPayload
      };
      const hasManualTaxonomy = Boolean(current?.taxonomy_is_manual_override);
      const canonicalSector = hasManualTaxonomy ? current?.canonical_sector : item.canonicalSector;
      const canonicalThemes = hasManualTaxonomy ? toStringArray(current?.canonical_themes) : item.canonicalThemes;

      const { error } = await this.db
        .from("instruments")
        .update({
          name: item.name ?? undefined,
          exchange: item.exchange ?? undefined,
          currency: item.currency ?? undefined,
          geography: item.region ?? item.country ?? undefined,
          sector: item.sector ?? undefined,
          industry: item.industry ?? undefined,
          canonical_sector: canonicalSector ?? undefined,
          canonical_themes: canonicalThemes ?? undefined,
          taxonomy_review_status: hasManualTaxonomy ? "mapped" : item.unmappedRawValues && item.unmappedRawValues.length > 0 ? "needs_review" : "mapped",
          provider_primary: item.provider,
          provider_metadata: providerMetadata,
          metadata_last_refreshed_at: new Date().toISOString()
        })
        .eq("symbol", item.symbol);
      if (isMissingUniverseTable(error)) return;
      if (error) throw new Error(error.message);

      if (current?.id && canonicalSector && canonicalThemes) {
        await this.upsertInstrumentTaxonomy([
          {
            instrumentId: current.id,
            rawSector: item.sector,
            rawIndustry: item.industry,
            canonicalSector,
            canonicalThemes,
            sourceProvider: item.provider,
            confidence: item.unmappedRawValues && item.unmappedRawValues.length > 0 ? 0.75 : 1,
            isManualOverride: hasManualTaxonomy,
            reviewStatus: hasManualTaxonomy ? "mapped" : item.unmappedRawValues && item.unmappedRawValues.length > 0 ? "needs_review" : "mapped"
          }
        ]);
      }
    }
  }

  async listWatchlists() {
    const { data, error } = await this.db.from("watchlists").select("*").order("name");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapWatchlist);
  }

  async upsertWatchlists(input: UpsertWatchlistInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("watchlists").upsert(
      input.map((item) => omitUndefined({
        id: uuidOrUndefined(item.id),
        watchlist_key: item.watchlistKey,
        name: item.name,
        watchlist_tier: item.watchlistTier,
        description: item.description,
        is_system: item.isSystem,
        is_active: item.isActive,
        human_approval_required: item.humanApprovalRequired,
        source_type: item.sourceType
      })),
      { onConflict: "watchlist_key" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listWatchlistItems(watchlistIds?: string[]) {
    let query = this.db.from("watchlist_items").select("*").order("item_rank", { ascending: true, nullsFirst: false });
    if (watchlistIds && watchlistIds.length > 0) {
      query = query.in("watchlist_id", watchlistIds);
    }

    const { data, error } = await query;
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);

    const watchlists = await this.listWatchlists();
    const instruments = await this.listInstruments({ isActive: true });
    const watchlistById = new Map(watchlists.map((watchlist) => [watchlist.id, watchlist]));
    const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));

    return (data ?? []).map((row) => {
      const watchlist = watchlistById.get(row.watchlist_id);
      const instrument = instrumentById.get(row.instrument_id);
      return {
        id: row.id,
        watchlistId: row.watchlist_id,
        instrumentId: row.instrument_id,
        watchlistKey: watchlist?.watchlistKey ?? "",
        symbol: instrument?.symbol ?? null,
        name: instrument?.name ?? "",
        watchlistTier: watchlist?.watchlistTier ?? "core_quality",
        itemRank: row.item_rank,
        rationale: row.rationale,
        approvalStatus: row.approval_status,
        isActive: row.is_active
      } satisfies WatchlistItem;
    });
  }

  async upsertWatchlistItems(input: UpsertWatchlistItemInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("watchlist_items").upsert(
      input.map((item) => omitUndefined({
        id: uuidOrUndefined(item.id),
        watchlist_id: uuidOrUndefined(item.watchlistId),
        instrument_id: uuidOrUndefined(item.instrumentId),
        item_rank: item.itemRank,
        rationale: item.rationale,
        approval_status: item.approvalStatus,
        is_active: item.isActive
      })),
      { onConflict: "watchlist_id,instrument_id" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listBondProfiles() {
    const { data, error } = await this.db
      .from("bond_profiles")
      .select("*, instruments(symbol)")
      .order("instrument_id");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...mapBondProfile(row),
      symbol: row.instruments?.symbol ?? row.symbol ?? null
    }));
  }

  async upsertBondProfiles(input: BondProfile[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("bond_profiles").upsert(
      input.map((item) => ({
        instrument_id: uuidOrUndefined(item.instrumentId),
        duration_category: item.durationCategory,
        treasury_classification: item.treasuryClassification,
        inflation_linked: item.inflationLinked,
        credit_quality: item.creditQuality,
        geo_exposure: item.geoExposure,
        rate_sensitivity: item.rateSensitivity,
        inflation_sensitivity: item.inflationSensitivity,
        recession_sensitivity: item.recessionSensitivity,
        liquidity_role: item.liquidityRole,
        currency: item.currency,
        sec_yield: item.secYield,
        distribution_yield: item.distributionYield,
        yield_to_maturity: item.yieldToMaturity,
        yield_as_of_date: item.yieldAsOfDate,
        effective_duration: item.effectiveDuration,
        average_maturity: item.averageMaturity,
        spread_duration: item.spreadDuration,
        option_adjusted_spread: item.optionAdjustedSpread,
        expense_ratio: item.expenseRatio,
        is_manual_override: item.isManualOverride,
        provider_metadata: item.providerMetadata
      })),
      { onConflict: "instrument_id" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listBenchmarkProfiles() {
    const { data, error } = await this.db
      .from("benchmark_profiles")
      .select("*, instruments(symbol)")
      .order("benchmark_key");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...mapBenchmarkProfile(row),
      instrumentSymbol: row.instruments?.symbol ?? row.instrument_symbol ?? null
    }));
  }

  async upsertBenchmarkProfiles(input: BenchmarkProfile[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("benchmark_profiles").upsert(
      input.map((item) => omitUndefined({
        id: uuidOrUndefined(item.id),
        benchmark_key: item.benchmarkKey,
        benchmark_name: item.benchmarkName,
        benchmark_type: item.benchmarkType,
        instrument_id: uuidOrNull(item.instrumentId),
        instrument_symbol: item.instrumentSymbol,
        provider_symbol: item.providerSymbol,
        currency: item.currency,
        base_value: item.baseValue,
        components: item.components,
        notes: item.notes,
        is_active: item.isActive
      })),
      { onConflict: "benchmark_key" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listCryptoProfiles() {
    const { data, error } = await this.db
      .from("crypto_profiles")
      .select("*, instruments(symbol)")
      .order("instrument_id");
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...mapCryptoProfile(row),
      symbol: row.instruments?.symbol ?? row.symbol ?? null
    }));
  }

  async upsertCryptoProfiles(input: CryptoProfile[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("crypto_profiles").upsert(
      input.map((item) => ({
        instrument_id: uuidOrUndefined(item.instrumentId),
        chain: item.chain,
        market_cap_bucket: item.marketCapBucket,
        custody_risk: item.custodyRisk,
        volatility_bucket: item.volatilityBucket,
        provider_metadata: item.providerMetadata
      })),
      { onConflict: "instrument_id" }
    );
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listMetadataRefreshLogs(limit = 25) {
    const { data, error } = await this.db
      .from("metadata_refresh_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (isMissingUniverseTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMetadataRefreshLog);
  }

  async insertMetadataRefreshLog(input: Omit<MetadataRefreshLog, "id" | "createdAt">) {
    const { error } = await this.db.from("metadata_refresh_logs").insert({
      refresh_scope: input.refreshScope,
      provider: input.provider,
      requested_count: input.requestedCount,
      updated_count: input.updatedCount,
      missing_count: input.missingCount,
      status: input.status,
      message: input.message,
      requested_symbols: input.requestedSymbols,
      missing_symbols: input.missingSymbols,
      requested_by_user_id: input.requestedByUserId,
      completed_at: input.completedAt,
      details: input.details
    });
    if (isMissingUniverseTable(error)) return;
    if (error) throw new Error(error.message);
  }
}
