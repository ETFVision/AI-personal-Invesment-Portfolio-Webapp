import type {
  EtfCountryExposure,
  EtfExposureRefreshLog,
  EtfSectorExposure,
  EtfThemeExposure,
  EtfTopHolding,
  PortfolioLookthroughExposure
} from "@/domain/etfLookthrough/types";
import type { EtfExposureRepository, InsertEtfExposureRefreshLogInput } from "@/application/ports/repositories/EtfExposureRepository";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

function json(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function latestByInstrument<T extends { etfInstrumentId: string; asOfDate: string }>(rows: T[]) {
  const latest = new Map<string, string>();
  for (const row of rows) {
    const current = latest.get(row.etfInstrumentId);
    if (!current || row.asOfDate > current) latest.set(row.etfInstrumentId, row.asOfDate);
  }
  return rows.filter((row) => latest.get(row.etfInstrumentId) === row.asOfDate);
}

function sector(row: any): EtfSectorExposure {
  return {
    etfInstrumentId: row.etf_instrument_id,
    etfSymbol: row.etf_symbol,
    sector: row.sector,
    exposureWeight: Number(row.exposure_weight ?? 0),
    asOfDate: row.as_of_date,
    sourceProvider: row.source_provider,
    providerMetadata: json(row.provider_metadata)
  };
}

function country(row: any): EtfCountryExposure {
  return {
    etfInstrumentId: row.etf_instrument_id,
    etfSymbol: row.etf_symbol,
    country: row.country,
    exposureWeight: Number(row.exposure_weight ?? 0),
    asOfDate: row.as_of_date,
    sourceProvider: row.source_provider,
    providerMetadata: json(row.provider_metadata)
  };
}

function holding(row: any): EtfTopHolding {
  return {
    etfInstrumentId: row.etf_instrument_id,
    etfSymbol: row.etf_symbol,
    holdingSymbol: row.holding_symbol,
    holdingName: row.holding_name,
    holdingWeight: Number(row.holding_weight ?? 0),
    asOfDate: row.as_of_date,
    sourceProvider: row.source_provider,
    providerMetadata: json(row.provider_metadata)
  };
}

function theme(row: any): EtfThemeExposure {
  return {
    etfInstrumentId: row.etf_instrument_id,
    etfSymbol: row.etf_symbol,
    theme: row.theme,
    exposureWeight: Number(row.exposure_weight ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    derivationMethod: row.derivation_method,
    asOfDate: row.as_of_date
  };
}

function exposure(row: any): PortfolioLookthroughExposure {
  return {
    portfolioId: row.portfolio_id,
    exposureType: row.exposure_type,
    exposureName: row.exposure_name,
    exposureWeight: Number(row.exposure_weight ?? 0),
    directWeight: Number(row.direct_weight ?? 0),
    etfLookthroughWeight: Number(row.etf_lookthrough_weight ?? 0),
    asOfDate: row.as_of_date
  };
}

function log(row: any): EtfExposureRefreshLog {
  return {
    id: row.id,
    jobName: row.job_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    etfsRequested: Number(row.etfs_requested ?? 0),
    etfsRefreshed: Number(row.etfs_refreshed ?? 0),
    sectorRows: Number(row.sector_rows ?? 0),
    countryRows: Number(row.country_rows ?? 0),
    topHoldingRows: Number(row.top_holding_rows ?? 0),
    errorMessage: row.error_message,
    metadata: json(row.metadata),
    createdAt: row.created_at
  };
}

export class SupabaseEtfExposureRepository implements EtfExposureRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listLatestSectorExposures(instrumentIds?: string[]) {
    let query = this.db.from("etf_sector_exposures").select("*").order("as_of_date", { ascending: false }).limit(5000);
    if (instrumentIds?.length) query = query.in("etf_instrument_id", instrumentIds);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    return latestByInstrument((data ?? []).map(sector));
  }

  async listLatestCountryExposures(instrumentIds?: string[]) {
    let query = this.db.from("etf_country_exposures").select("*").order("as_of_date", { ascending: false }).limit(5000);
    if (instrumentIds?.length) query = query.in("etf_instrument_id", instrumentIds);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    return latestByInstrument((data ?? []).map(country));
  }

  async listLatestTopHoldings(instrumentIds?: string[]) {
    let query = this.db.from("etf_top_holdings").select("*").order("as_of_date", { ascending: false }).limit(5000);
    if (instrumentIds?.length) query = query.in("etf_instrument_id", instrumentIds);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    return latestByInstrument((data ?? []).map(holding));
  }

  async listLatestThemeExposures(instrumentIds?: string[]) {
    let query = this.db.from("etf_theme_exposures").select("*").order("as_of_date", { ascending: false }).limit(5000);
    if (instrumentIds?.length) query = query.in("etf_instrument_id", instrumentIds);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    return latestByInstrument((data ?? []).map(theme));
  }

  async upsertSectorExposures(input: EtfSectorExposure[]) {
    if (!input.length) return;
    const { error } = await this.db.from("etf_sector_exposures").upsert(input.map((item) => ({
      etf_instrument_id: item.etfInstrumentId,
      etf_symbol: item.etfSymbol,
      sector: item.sector,
      exposure_weight: item.exposureWeight,
      as_of_date: item.asOfDate,
      source_provider: item.sourceProvider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "etf_instrument_id,sector,as_of_date,source_provider" });
    if (error) throw new Error(error.message);
  }

  async upsertCountryExposures(input: EtfCountryExposure[]) {
    if (!input.length) return;
    const { error } = await this.db.from("etf_country_exposures").upsert(input.map((item) => ({
      etf_instrument_id: item.etfInstrumentId,
      etf_symbol: item.etfSymbol,
      country: item.country,
      exposure_weight: item.exposureWeight,
      as_of_date: item.asOfDate,
      source_provider: item.sourceProvider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "etf_instrument_id,country,as_of_date,source_provider" });
    if (error) throw new Error(error.message);
  }

  async upsertTopHoldings(input: EtfTopHolding[]) {
    if (!input.length) return;
    const { error } = await this.db.from("etf_top_holdings").upsert(input.map((item) => ({
      etf_instrument_id: item.etfInstrumentId,
      etf_symbol: item.etfSymbol,
      holding_symbol: item.holdingSymbol,
      holding_name: item.holdingName,
      holding_weight: item.holdingWeight,
      as_of_date: item.asOfDate,
      source_provider: item.sourceProvider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "etf_instrument_id,holding_symbol,as_of_date,source_provider" });
    if (error) throw new Error(error.message);
  }

  async upsertThemeExposures(input: EtfThemeExposure[]) {
    if (!input.length) return;
    const { error } = await this.db.from("etf_theme_exposures").upsert(input.map((item) => ({
      etf_instrument_id: item.etfInstrumentId,
      etf_symbol: item.etfSymbol,
      theme: item.theme,
      exposure_weight: item.exposureWeight,
      confidence_score: item.confidenceScore,
      derivation_method: item.derivationMethod,
      as_of_date: item.asOfDate
    })), { onConflict: "etf_instrument_id,theme,as_of_date,derivation_method" });
    if (error) throw new Error(error.message);
  }

  async upsertPortfolioLookthroughExposures(input: PortfolioLookthroughExposure[]) {
    if (!input.length) return;
    const { error } = await this.db.from("portfolio_lookthrough_exposures").upsert(input.map((item) => ({
      portfolio_id: item.portfolioId,
      exposure_type: item.exposureType,
      exposure_name: item.exposureName,
      exposure_weight: item.exposureWeight,
      direct_weight: item.directWeight,
      etf_lookthrough_weight: item.etfLookthroughWeight,
      as_of_date: item.asOfDate
    })), { onConflict: "portfolio_id,exposure_type,exposure_name,as_of_date" });
    if (error) throw new Error(error.message);
  }

  async listPortfolioLookthroughExposures(portfolioId: string, asOfDate?: string) {
    let query = this.db.from("portfolio_lookthrough_exposures").select("*").eq("portfolio_id", portfolioId).order("as_of_date", { ascending: false }).limit(1000);
    if (asOfDate) query = query.eq("as_of_date", asOfDate);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map(exposure);
    if (asOfDate || rows.length === 0) return rows;
    const latestDate = rows[0]?.asOfDate;
    return rows.filter((row) => row.asOfDate === latestDate);
  }

  async getLatestExposureDateForEtf(instrumentId: string) {
    const { data, error } = await this.db
      .from("etf_sector_exposures")
      .select("as_of_date")
      .eq("etf_instrument_id", instrumentId)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error?.code === "42P01") return null;
    if (error) throw new Error(error.message);
    return data?.as_of_date ?? null;
  }

  async insertRefreshLog(input: InsertEtfExposureRefreshLogInput) {
    const { error } = await this.db.from("etf_exposure_refresh_logs").insert({
      job_name: input.jobName,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: input.status,
      etfs_requested: input.etfsRequested,
      etfs_refreshed: input.etfsRefreshed,
      sector_rows: input.sectorRows,
      country_rows: input.countryRows,
      top_holding_rows: input.topHoldingRows,
      error_message: input.errorMessage,
      metadata: input.metadata
    });
    if (error) throw new Error(error.message);
  }

  async listRefreshLogs(limit = 20) {
    const { data, error } = await this.db.from("etf_exposure_refresh_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(log);
  }
}
