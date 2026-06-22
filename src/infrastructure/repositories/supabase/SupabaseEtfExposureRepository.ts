import type {
  EtfCountryExposure,
  EtfExposureRefreshLog,
  EtfSectorExposure,
  EtfThemeExposure,
  EtfTopHolding,
  PortfolioLookthroughExposure,
  PortfolioLookthroughHolding
} from "@/domain/etfLookthrough/types";
import type { EtfExposureRepository, InsertEtfExposureRefreshLogInput, SecurityIssuerLink } from "@/application/ports/repositories/EtfExposureRepository";
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
    holdingSecurityId: row.holding_security_id ?? null,
    mappingStatus: row.mapping_status ?? null,
    mappingConfidenceScore: row.mapping_confidence_score === null || row.mapping_confidence_score === undefined ? null : Number(row.mapping_confidence_score),
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
    exposureSecurityId: row.exposure_security_id ?? null,
    exposureIssuerId: row.exposure_issuer_id ?? null,
    exposureIssuerName: row.exposure_issuer_name ?? null,
    exposureWeight: Number(row.exposure_weight ?? 0),
    directWeight: Number(row.direct_weight ?? 0),
    etfLookthroughWeight: Number(row.etf_lookthrough_weight ?? 0),
    asOfDate: row.as_of_date
  };
}

function sourceEtfs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const typed = item as Record<string, unknown>;
    const symbol = typeof typed.symbol === "string" ? typed.symbol : null;
    const weight = typeof typed.weight === "number" ? typed.weight : Number(typed.weight ?? 0);
    if (!symbol || !Number.isFinite(weight)) return [];
    return [{ symbol, weight }];
  });
}

function holdingExposure(row: any): PortfolioLookthroughHolding {
  return {
    portfolioId: row.portfolio_id,
    asOfDate: row.as_of_date,
    holdingSymbol: row.holding_symbol,
    holdingName: row.holding_name,
    holdingSecurityId: row.holding_security_id ?? null,
    holdingIssuerId: row.holding_issuer_id ?? null,
    holdingIssuerName: row.holding_issuer_name ?? null,
    mappingStatus: row.mapping_status ?? null,
    mappingConfidenceScore: row.mapping_confidence_score === null || row.mapping_confidence_score === undefined ? null : Number(row.mapping_confidence_score),
    directWeight: Number(row.direct_weight ?? 0),
    indirectWeight: Number(row.indirect_weight ?? 0),
    totalWeight: Number(row.total_weight ?? 0),
    sourceEtfs: sourceEtfs(row.source_etfs),
    inputsSnapshot: json(row.inputs_snapshot)
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

  private async fetchAllExposureRows(table: string, instrumentIds?: string[]): Promise<Record<string, unknown>[]> {
    const PAGE = 1000;
    const all: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = this.db.from(table).select("*").order("as_of_date", { ascending: false }).range(from, from + PAGE - 1);
      if (instrumentIds?.length) query = query.in("etf_instrument_id", instrumentIds);
      const { data, error } = await query;
      if (error?.code === "42P01") return [];
      if (error) throw new Error(error.message);
      all.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < PAGE) break;
    }
    return all;
  }

  async listLatestSectorExposures(instrumentIds?: string[]) {
    const rows = await this.fetchAllExposureRows("etf_sector_exposures", instrumentIds);
    return latestByInstrument(rows.map(sector));
  }

  async listLatestCountryExposures(instrumentIds?: string[]) {
    const rows = await this.fetchAllExposureRows("etf_country_exposures", instrumentIds);
    return latestByInstrument(rows.map(country));
  }

  async listLatestTopHoldings(instrumentIds?: string[]) {
    const rows = await this.fetchAllExposureRows("etf_top_holdings", instrumentIds);
    return latestByInstrument(rows.map(holding));
  }

  async listLatestThemeExposures(instrumentIds?: string[]) {
    const rows = await this.fetchAllExposureRows("etf_theme_exposures", instrumentIds);
    return latestByInstrument(rows.map(theme));
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
      holding_security_id: item.holdingSecurityId ?? null,
      mapping_status: item.mappingStatus ?? (item.holdingSecurityId ? "mapped" : "unmapped"),
      mapping_confidence_score: item.mappingConfidenceScore ?? (item.holdingSecurityId ? 90 : 0),
      mapping_source: item.holdingSecurityId ? "etf_top_holding_security_id" : null,
      mapping_updated_at: new Date().toISOString(),
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
      exposure_security_id: item.exposureSecurityId ?? null,
      exposure_issuer_id: item.exposureIssuerId ?? null,
      exposure_issuer_name: item.exposureIssuerName ?? null,
      exposure_weight: item.exposureWeight,
      direct_weight: item.directWeight,
      etf_lookthrough_weight: item.etfLookthroughWeight,
      as_of_date: item.asOfDate
    })), { onConflict: "portfolio_id,exposure_type,exposure_name,as_of_date" });
    if (error) throw new Error(error.message);
  }

  async upsertPortfolioLookthroughHoldings(input: PortfolioLookthroughHolding[]) {
    if (!input.length) return;
    const { error } = await this.db.from("portfolio_lookthrough_holdings").upsert(input.map((item) => ({
      portfolio_id: item.portfolioId,
      as_of_date: item.asOfDate,
      holding_symbol: item.holdingSymbol,
      holding_name: item.holdingName,
      holding_security_id: item.holdingSecurityId ?? null,
      holding_issuer_id: item.holdingIssuerId ?? null,
      holding_issuer_name: item.holdingIssuerName ?? null,
      mapping_status: item.mappingStatus ?? (item.holdingSecurityId ? "mapped" : "unmapped"),
      mapping_confidence_score: item.mappingConfidenceScore ?? (item.holdingSecurityId ? 90 : 0),
      mapping_source: item.holdingSecurityId ? "portfolio_lookthrough_security_id" : null,
      mapping_updated_at: new Date().toISOString(),
      direct_weight: item.directWeight,
      indirect_weight: item.indirectWeight,
      total_weight: item.totalWeight,
      source_etfs: item.sourceEtfs,
      inputs_snapshot: item.inputsSnapshot
    })), { onConflict: "portfolio_id,holding_symbol,as_of_date" });
    if (error?.code === "42P01") return;
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

  async listPortfolioLookthroughHoldings(portfolioId: string, asOfDate?: string) {
    let query = this.db.from("portfolio_lookthrough_holdings").select("*").eq("portfolio_id", portfolioId).order("as_of_date", { ascending: false }).limit(1000);
    if (asOfDate) query = query.eq("as_of_date", asOfDate);
    const { data, error } = await query;
    if (error?.code === "42P01") return [];
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map(holdingExposure);
    if (asOfDate || rows.length === 0) return rows;
    const latestDate = rows[0]?.asOfDate;
    return rows.filter((row) => row.asOfDate === latestDate);
  }

  async listIssuerLinksForSecurityIds(securityIds: string[]): Promise<SecurityIssuerLink[]> {
    const ids = Array.from(new Set(securityIds.filter(Boolean)));
    if (!ids.length) return [];

    const CHUNK = 150;
    const chunks = <T>(arr: T[]) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, (i + 1) * CHUNK));

    const linkResults = await Promise.all(
      chunks(ids).map(async (chunk) => {
        const { data, error } = await this.db
          .from("security_issuer_links")
          .select("security_id, issuer_id, normalized_issuer_name, share_class, link_source, confidence_score")
          .in("security_id", chunk)
          .is("valid_to", null);
        if (error?.code === "42P01") return [];
        if (error) throw new Error(error.message);
        return data ?? [];
      })
    );
    const allLinks = linkResults.flat();

    const issuerIds = Array.from(new Set(allLinks.map((row: any) => row.issuer_id).filter(Boolean)));
    if (!issuerIds.length) return [];

    const issuerResults = await Promise.all(
      chunks(issuerIds).map(async (chunk) => {
        const { data, error } = await this.db
          .from("issuers")
          .select("id, issuer_name")
          .in("id", chunk);
        if (error?.code === "42P01") return [];
        if (error) throw new Error(error.message);
        return data ?? [];
      })
    );
    const allIssuers = issuerResults.flat();

    const issuerNameById = new Map(allIssuers.map((row: any) => [row.id, row.issuer_name]));
    return allLinks.flatMap((row: any) => {
      const issuerName = issuerNameById.get(row.issuer_id);
      if (!issuerName) return [];
      return [{
        securityId: row.security_id,
        issuerId: row.issuer_id,
        issuerName,
        normalizedIssuerName: row.normalized_issuer_name ?? null,
        shareClass: row.share_class ?? null,
        linkSource: row.link_source ?? null,
        confidenceScore: row.confidence_score === null || row.confidence_score === undefined ? null : Number(row.confidence_score)
      }];
    });
  }

  async clearAllExposures() {
    const tables = ["etf_sector_exposures", "etf_country_exposures", "etf_top_holdings", "etf_theme_exposures"] as const;
    for (const table of tables) {
      const { error } = await this.db.from(table).delete().gte("as_of_date", "2000-01-01");
      if (error?.code === "42P01") continue;
      if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
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

  async getLatestHoldingsDateForEtf(instrumentId: string) {
    const { data, error } = await this.db
      .from("etf_top_holdings")
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
