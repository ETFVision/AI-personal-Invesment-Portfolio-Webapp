import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import type {
  CompanyProfile,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
  FundamentalTrend,
  FundamentalTrendSummary,
  FundamentalsDetail,
  FundamentalsRefreshLog,
  FundamentalsSummaryRow
} from "@/domain/fundamentals/types";
import type { Instrument } from "@/domain/universe/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function numberOrNull(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isMissingFundamentalsOverview(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42P01" || message.includes("fundamentals_overview_metrics");
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
    canonicalThemes: asArray(row.canonical_themes ?? row.thematic_tags),
    taxonomyIsManualOverride: Boolean(row.taxonomy_is_manual_override ?? false),
    taxonomyReviewStatus: row.taxonomy_review_status ?? "approved",
    geography: row.geography,
    currency: row.currency,
    exchange: row.exchange,
    watchlistTier: row.watchlist_tier,
    benchmarkTags: asArray(row.benchmark_tags),
    thematicTags: asArray(row.thematic_tags),
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

function mapOverviewInstrument(row: any): Instrument {
  return mapInstrument({
    id: row.instrument_id,
    symbol: row.symbol,
    name: row.name,
    asset_class: row.asset_class,
    asset_category: row.asset_category,
    etf_category: row.etf_category,
    instrument_type: row.instrument_type,
    sector: row.instrument_sector,
    industry: row.instrument_industry,
    canonical_sector: row.canonical_sector,
    canonical_themes: row.canonical_themes,
    taxonomy_is_manual_override: row.taxonomy_is_manual_override,
    taxonomy_review_status: row.taxonomy_review_status,
    geography: row.geography,
    currency: row.instrument_currency,
    exchange: row.instrument_exchange,
    watchlist_tier: row.watchlist_tier,
    benchmark_tags: row.benchmark_tags,
    thematic_tags: row.thematic_tags,
    risk_category: row.risk_category,
    volatility_bucket: row.volatility_bucket,
    duration_category: row.duration_category,
    treasury_classification: row.treasury_classification,
    inflation_linked: row.inflation_linked,
    credit_quality: row.credit_quality,
    geo_exposure: row.geo_exposure,
    rate_sensitivity: row.rate_sensitivity,
    inflation_sensitivity: row.inflation_sensitivity,
    recession_sensitivity: row.recession_sensitivity,
    liquidity_role: row.liquidity_role,
    crypto_classification: row.crypto_classification,
    metadata_last_refreshed_at: row.metadata_last_refreshed_at,
    provider_primary: row.provider_primary,
    provider_metadata: {},
    source_type: row.source_type,
    is_active: row.is_active
  });
}

function mapCompanyProfile(row: any): CompanyProfile {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    companyName: row.company_name,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    exchange: row.exchange,
    currency: row.currency,
    marketCap: numberOrNull(row.market_cap),
    beta: numberOrNull(row.beta),
    description: row.description,
    website: row.website,
    ceo: row.ceo,
    ipoDate: row.ipo_date,
    employees: row.employees == null ? null : Number(row.employees),
    lastRefreshedAt: row.last_refreshed_at,
    provider: row.provider,
    providerMetadata: row.provider_metadata ?? {}
  };
}

function mapOverviewProfile(row: any): CompanyProfile | null {
  if (!row.company_name && !row.profile_provider && !row.last_refreshed_at) return null;
  return mapCompanyProfile({
    id: undefined,
    instrument_id: row.instrument_id,
    symbol: row.symbol,
    company_name: row.company_name,
    sector: row.profile_sector,
    industry: row.profile_industry,
    country: row.profile_country,
    exchange: row.profile_exchange,
    currency: row.profile_currency,
    market_cap: row.market_cap,
    beta: row.beta,
    description: null,
    website: null,
    ceo: null,
    ipo_date: row.ipo_date,
    employees: row.employees,
    last_refreshed_at: row.last_refreshed_at,
    provider: row.profile_provider ?? "unknown",
    provider_metadata: {}
  });
}

function mapFinancialStatement(row: any): FinancialStatement {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    statementType: row.statement_type,
    period: row.period,
    fiscalYear: Number(row.fiscal_year),
    fiscalQuarter: Number(row.fiscal_quarter),
    reportDate: row.report_date,
    filingDate: row.filing_date,
    revenue: numberOrNull(row.revenue),
    grossProfit: numberOrNull(row.gross_profit),
    operatingIncome: numberOrNull(row.operating_income),
    ebitda: numberOrNull(row.ebitda),
    netIncome: numberOrNull(row.net_income),
    eps: numberOrNull(row.eps),
    dilutedEps: numberOrNull(row.diluted_eps),
    totalAssets: numberOrNull(row.total_assets),
    totalLiabilities: numberOrNull(row.total_liabilities),
    shareholdersEquity: numberOrNull(row.shareholders_equity),
    cashAndEquivalents: numberOrNull(row.cash_and_equivalents),
    totalDebt: numberOrNull(row.total_debt),
    operatingCashFlow: numberOrNull(row.operating_cash_flow),
    capitalExpenditure: numberOrNull(row.capital_expenditure),
    freeCashFlow: numberOrNull(row.free_cash_flow),
    sharesOutstanding: numberOrNull(row.shares_outstanding),
    provider: row.provider,
    providerMetadata: row.provider_metadata ?? {}
  };
}

function mapFinancialRatio(row: any): FinancialRatio {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    period: row.period,
    fiscalYear: row.fiscal_year == null ? null : Number(row.fiscal_year),
    fiscalQuarter: Number(row.fiscal_quarter),
    reportDate: row.report_date,
    peRatio: numberOrNull(row.pe_ratio),
    forwardPe: numberOrNull(row.forward_pe),
    priceToSales: numberOrNull(row.price_to_sales),
    priceToBook: numberOrNull(row.price_to_book),
    evToEbitda: numberOrNull(row.ev_to_ebitda),
    evToSales: numberOrNull(row.ev_to_sales),
    grossMargin: numberOrNull(row.gross_margin),
    operatingMargin: numberOrNull(row.operating_margin),
    netMargin: numberOrNull(row.net_margin),
    roe: numberOrNull(row.roe),
    roic: numberOrNull(row.roic),
    roa: numberOrNull(row.roa),
    debtToEquity: numberOrNull(row.debt_to_equity),
    netDebtToEbitda: numberOrNull(row.net_debt_to_ebitda),
    currentRatio: numberOrNull(row.current_ratio),
    quickRatio: numberOrNull(row.quick_ratio),
    freeCashFlowYield: numberOrNull(row.free_cash_flow_yield),
    revenueGrowth: numberOrNull(row.revenue_growth),
    epsGrowth: numberOrNull(row.eps_growth),
    netIncomeGrowth: numberOrNull(row.net_income_growth),
    freeCashFlowGrowth: numberOrNull(row.free_cash_flow_growth),
    provider: row.provider,
    providerMetadata: row.provider_metadata ?? {}
  };
}

function mapFundamentalScore(row: any): FundamentalScore {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    asOfDate: row.as_of_date,
    growthScore: numberOrNull(row.growth_score),
    profitabilityScore: numberOrNull(row.profitability_score),
    valuationScore: numberOrNull(row.valuation_score),
    balanceSheetScore: numberOrNull(row.balance_sheet_score),
    cashFlowScore: numberOrNull(row.cash_flow_score),
    qualityScore: numberOrNull(row.quality_score),
    overallFundamentalScore: numberOrNull(row.overall_fundamental_score),
    scoreConfidence: Number(row.score_confidence),
    explanation: row.explanation ?? "",
    inputsSnapshot: row.inputs_snapshot ?? {}
  };
}

function mapOverviewScore(row: any): FundamentalScore | null {
  if (row.overall_fundamental_score == null && row.score_as_of_date == null) return null;
  return mapFundamentalScore({
    id: undefined,
    instrument_id: row.instrument_id,
    symbol: row.symbol,
    as_of_date: row.score_as_of_date,
    growth_score: row.growth_score,
    profitability_score: row.profitability_score,
    valuation_score: row.valuation_score,
    balance_sheet_score: row.balance_sheet_score,
    cash_flow_score: row.cash_flow_score,
    quality_score: row.quality_score,
    overall_fundamental_score: row.overall_fundamental_score,
    score_confidence: row.score_confidence ?? 0,
    explanation: "",
    inputs_snapshot: {}
  });
}

function mapFundamentalTrend(row: any): FundamentalTrend {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    metricName: row.metric_name,
    metricCategory: row.metric_category,
    currentValue: numberOrNull(row.current_value),
    previousValue: numberOrNull(row.previous_value),
    threePeriodAvg: numberOrNull(row.three_period_avg),
    fivePeriodAvg: numberOrNull(row.five_period_avg),
    shortTermTrendDirection: row.short_term_trend_direction,
    shortTermTrendStrength: row.short_term_trend_strength,
    shortTermTrendScore: numberOrNull(row.short_term_trend_score),
    shortTermConfidenceScore: Number(row.short_term_confidence_score ?? 0),
    longTermTrendDirection: row.long_term_trend_direction,
    longTermTrendStrength: row.long_term_trend_strength,
    longTermTrendScore: numberOrNull(row.long_term_trend_score),
    longTermConfidenceScore: Number(row.long_term_confidence_score ?? 0),
    overallTrendDirection: row.overall_trend_direction,
    overallTrendScore: numberOrNull(row.overall_trend_score),
    overallConfidenceScore: Number(row.overall_confidence_score ?? 0),
    periodsAnalyzed: Number(row.periods_analyzed ?? 0),
    shortTermPeriodsAnalyzed: Number(row.short_term_periods_analyzed ?? 0),
    longTermPeriodsAnalyzed: Number(row.long_term_periods_analyzed ?? 0),
    displayPeriod: row.display_period ?? null,
    displayWindow: row.display_window ?? null,
    asOfDate: row.as_of_date,
    explanation: row.explanation ?? "",
    inputsSnapshot: row.inputs_snapshot ?? {}
  };
}

function mapFundamentalTrendSummary(row: any): FundamentalTrendSummary {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    symbol: row.symbol,
    asOfDate: row.as_of_date,
    overallTrendScore: numberOrNull(row.overall_trend_score),
    overallConfidenceScore: Number(row.overall_confidence_score ?? 0),
    overallTrendDirection: row.overall_trend_direction,
    improvingMetricsCount: Number(row.improving_metrics_count ?? 0),
    deterioratingMetricsCount: Number(row.deteriorating_metrics_count ?? 0),
    stableMetricsCount: Number(row.stable_metrics_count ?? 0),
    volatileMetricsCount: Number(row.volatile_metrics_count ?? 0),
    insufficientDataMetricsCount: Number(row.insufficient_data_metrics_count ?? 0),
    growthTrendScore: numberOrNull(row.growth_trend_score),
    marginTrendScore: numberOrNull(row.margin_trend_score),
    profitabilityTrendScore: numberOrNull(row.profitability_trend_score),
    balanceSheetTrendScore: numberOrNull(row.balance_sheet_trend_score),
    qualityTrendScore: numberOrNull(row.quality_trend_score),
    warnings: asArray(row.warnings),
    explanation: row.explanation ?? "",
    inputsSnapshot: row.inputs_snapshot ?? {}
  };
}

function mapOverviewTrendSummary(row: any): FundamentalTrendSummary | null {
  if (row.overall_trend_score == null && row.trend_as_of_date == null) return null;
  return mapFundamentalTrendSummary({
    id: undefined,
    instrument_id: row.instrument_id,
    symbol: row.symbol,
    as_of_date: row.trend_as_of_date,
    overall_trend_score: row.overall_trend_score,
    overall_confidence_score: row.overall_confidence_score,
    overall_trend_direction: row.overall_trend_direction,
    improving_metrics_count: row.improving_metrics_count,
    deteriorating_metrics_count: row.deteriorating_metrics_count,
    stable_metrics_count: row.stable_metrics_count,
    volatile_metrics_count: row.volatile_metrics_count,
    insufficient_data_metrics_count: row.insufficient_data_metrics_count,
    growth_trend_score: row.growth_trend_score,
    margin_trend_score: row.margin_trend_score,
    profitability_trend_score: row.profitability_trend_score,
    balance_sheet_trend_score: row.balance_sheet_trend_score,
    quality_trend_score: row.quality_trend_score,
    warnings: row.trend_warnings,
    explanation: "",
    inputs_snapshot: {}
  });
}

function mapRefreshLog(row: any): FundamentalsRefreshLog {
  return {
    id: row.id,
    jobName: row.job_name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    stocksRequested: Number(row.stocks_requested),
    profilesUpdated: Number(row.profiles_updated),
    statementsUpdated: Number(row.statements_updated),
    ratiosUpdated: Number(row.ratios_updated),
    scoresUpdated: Number(row.scores_updated),
    failedSymbols: asArray(row.failed_symbols),
    errorMessage: row.error_message,
    metadata: row.metadata ?? {}
  };
}

function warnings(profile: CompanyProfile | null, ratio: FinancialRatio | null, score: FundamentalScore | null, statementCount: number) {
  const result: string[] = [];
  if (!profile) result.push("Missing company profile");
  if (!ratio) result.push("Missing latest ratios");
  if (statementCount === 0) result.push("Missing financial statements");
  if (!score || score.overallFundamentalScore == null) result.push("Insufficient data for score");
  if (score && score.scoreConfidence < 60) result.push("Low score confidence");
  return result;
}

function overviewWarnings(profile: CompanyProfile | null, score: FundamentalScore | null) {
  const result: string[] = [];
  if (!profile) result.push("Missing company profile");
  if (!score || score.overallFundamentalScore == null) result.push("Insufficient data for score");
  if (score && score.scoreConfidence < 60) result.push("Low score confidence");
  return result;
}

export class SupabaseFundamentalsRepository implements FundamentalsRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listEligibleStockInstruments(limit = 20) {
    const byId = new Map<string, Instrument>();
    const addInstruments = (rows: any[] | null) => {
      for (const instrument of (rows ?? []).map(mapInstrument)) {
        if (byId.size >= limit) break;
        if (instrument.symbol && instrument.assetClass === "stock") byId.set(instrument.id, instrument);
      }
    };

    const { data: holdingRows, error: holdingError } = await this.db
      .from("holdings")
      .select("ticker")
      .eq("is_active", true)
      .eq("asset_type", "stock")
      .not("ticker", "is", null)
      .limit(limit);
    if (!holdingError) {
      const holdingSymbols = Array.from(new Set((holdingRows ?? []).map((row: any) => String(row.ticker ?? "").trim().toUpperCase()).filter(Boolean)));
      if (holdingSymbols.length > 0) {
        const { data: holdingInstruments, error: holdingInstrumentError } = await this.db
          .from("instruments")
          .select("*")
          .eq("asset_class", "stock")
          .in("symbol", holdingSymbols);
        if (holdingInstrumentError) throw new Error(holdingInstrumentError.message);
        addInstruments(holdingInstruments);
      }
    }

    if (byId.size < limit) {
      const { data: watchlistRows, error: watchlistError } = await this.db
        .from("watchlist_items")
        .select("instrument_id")
        .eq("is_active", true)
        .limit(limit);
      if (!watchlistError) {
        const watchlistInstrumentIds = Array.from(new Set((watchlistRows ?? []).map((row: any) => String(row.instrument_id ?? "")).filter(Boolean)));
        if (watchlistInstrumentIds.length > 0) {
          const { data: watchlistInstruments, error: watchlistInstrumentError } = await this.db
            .from("instruments")
            .select("*")
            .eq("is_active", true)
            .eq("asset_class", "stock")
            .in("id", watchlistInstrumentIds);
          if (watchlistInstrumentError) throw new Error(watchlistInstrumentError.message);
          addInstruments(watchlistInstruments);
        }
      }
    }

    if (byId.size < limit) {
      const { data: stockInstruments, error: stockError } = await this.db
        .from("instruments")
        .select("*")
        .eq("is_active", true)
        .eq("asset_class", "stock")
        .order("symbol")
        .limit(limit);
      if (stockError) throw new Error(stockError.message);
      addInstruments(stockInstruments);
    }

    return Array.from(byId.values())
      .filter((instrument) => Boolean(instrument.symbol))
      .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)))
      .slice(0, limit);
  }

  async listSummaryRows() {
    const instruments = await this.listEligibleStockInstruments(500);
    return this.buildSummaryRows(instruments, { includeDiagnostics: true });
  }

  async listOverviewRows() {
    const { data, error } = await this.db
      .from("fundamentals_overview_metrics")
      .select("*")
      .order("symbol")
      .limit(500);
    if (isMissingFundamentalsOverview(error)) return this.listOverviewRowsFromSourceTables();
    if (error) throw new Error(error.message);
    return (data ?? []).map((row): FundamentalsSummaryRow => {
      const instrument = mapOverviewInstrument(row);
      const profile = mapOverviewProfile(row);
      const latestScore = mapOverviewScore(row);
      return {
        instrument,
        profile,
        latestRatio: null,
        latestScore,
        latestTrendSummary: mapOverviewTrendSummary(row),
        statementCount: 0,
        missingDataWarnings: overviewWarnings(profile, latestScore)
      };
    });
  }

  private async listOverviewRowsFromSourceTables() {
    const { data, error } = await this.db
      .from("instruments")
      .select("*")
      .eq("is_active", true)
      .eq("asset_class", "stock")
      .order("symbol")
      .limit(500);
    if (error) throw new Error(error.message);
    const instruments = (data ?? []).map(mapInstrument).filter((instrument) => Boolean(instrument.symbol));
    const ids = instruments.map((instrument) => instrument.id);
    const [profiles, scores, trends] = await Promise.all([
      this.getSummaryProfiles(ids),
      this.getLatestSummaryScores(ids),
      this.getLatestSummaryTrendSummaries(ids)
    ]);
    const profileById = new Map(profiles.map((item) => [item.instrumentId, item]));
    const scoreById = new Map(scores.map((item) => [item.instrumentId, item]));
    const trendById = new Map(trends.map((item) => [item.instrumentId, item]));
    return instruments.map((instrument): FundamentalsSummaryRow => {
      const profile = profileById.get(instrument.id) ?? null;
      const latestScore = scoreById.get(instrument.id) ?? null;
      return {
        instrument,
        profile,
        latestRatio: null,
        latestScore,
        latestTrendSummary: trendById.get(instrument.id) ?? null,
        statementCount: 0,
        missingDataWarnings: overviewWarnings(profile, latestScore)
      };
    });
  }

  async listSummaryRowsForInstruments(instruments: Instrument[]) {
    return this.buildSummaryRows(instruments.filter((instrument) => instrument.assetClass === "stock"), { includeDiagnostics: false, includeTrends: false });
  }

  private async buildSummaryRows(instruments: Instrument[], options: { includeDiagnostics: boolean; includeTrends?: boolean }) {
    const ids = instruments.map((instrument) => instrument.id);
    const [profiles, ratios, scores, trends, statements] = options.includeDiagnostics
      ? await Promise.all([
          this.getSummaryProfiles(ids),
          this.getLatestSummaryRatios(ids),
          this.getLatestSummaryScores(ids),
          this.getLatestSummaryTrendSummaries(ids),
          this.listStatementCounts(ids)
        ])
      : await Promise.all([
          this.getSummaryProfiles(ids),
          Promise.resolve([]),
          this.getLatestSummaryScores(ids),
          options.includeTrends ? this.getLatestSummaryTrendSummaries(ids) : Promise.resolve([]),
          Promise.resolve(new Map<string, number>())
        ]);
    const profileById = new Map(profiles.map((item) => [item.instrumentId, item]));
    const ratioById = new Map(ratios.map((item) => [item.instrumentId, item]));
    const scoreById = new Map(scores.map((item) => [item.instrumentId, item]));
    const trendById = new Map(trends.map((item) => [item.instrumentId, item]));
    const statementCountById = statements;
    return instruments.map((instrument): FundamentalsSummaryRow => {
      const profile = profileById.get(instrument.id) ?? null;
      const latestRatio = ratioById.get(instrument.id) ?? null;
      const latestScore = scoreById.get(instrument.id) ?? null;
      const latestTrendSummary = trendById.get(instrument.id) ?? null;
      const statementCount = statementCountById.get(instrument.id) ?? 0;
      return {
        instrument,
        profile,
        latestRatio,
        latestScore,
        latestTrendSummary,
        statementCount,
        missingDataWarnings: warnings(profile, latestRatio, latestScore, statementCount)
      };
    });
  }

  async getDetailBySymbol(symbol: string) {
    const { data, error } = await this.db
      .from("instruments")
      .select("*")
      .eq("asset_class", "stock")
      .ilike("symbol", symbol)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const instrument = mapInstrument(data);
    const [profiles, ratios, scores, statements, trends, trendSummaries] = await Promise.all([
      this.getProfiles([instrument.id]),
      this.getLatestDetailRatios(instrument.id),
      this.getLatestDetailScores(instrument.id),
      this.listLatestStatementSnapshot(instrument.id),
      this.listDetailTrends(instrument.id),
      this.getLatestDetailTrendSummaries(instrument.id)
    ]);
    const profile = profiles[0] ?? null;
    const latestRatio = ratios[0] ?? null;
    const latestScore = scores[0] ?? null;
    return {
      instrument,
      profile,
      latestRatio,
      latestScore,
      latestTrendSummary: trendSummaries[0] ?? null,
      statementCount: statements.length,
      missingDataWarnings: warnings(profile, latestRatio, latestScore, statements.length),
      statements,
      ratios,
      scores,
      trends,
      trendSummary: trendSummaries[0] ?? null
    } satisfies FundamentalsDetail;
  }

  async getProfiles(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("company_profiles").select("*").in("instrument_id", instrumentIds);
    if (error) return [];
    return (data ?? []).map(mapCompanyProfile);
  }

  private async getSummaryProfiles(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db
      .from("company_profiles")
      .select("id,instrument_id,symbol,company_name,sector,industry,country,exchange,currency,market_cap,beta,ipo_date,employees,last_refreshed_at,provider")
      .in("instrument_id", instrumentIds);
    if (error) return [];
    return (data ?? []).map((row) => mapCompanyProfile({ ...row, description: null, website: null, ceo: null, provider_metadata: {} }));
  }

  async getLatestRatios(instrumentIds: string[]) {
    const ratios = await this.listRatios(instrumentIds);
    const seen = new Set<string>();
    return ratios.filter((ratio) => {
      if (seen.has(ratio.instrumentId)) return false;
      seen.add(ratio.instrumentId);
      return true;
    });
  }

  private async getLatestSummaryRatios(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db
      .from("financial_ratios")
      .select("id,instrument_id,symbol,period,fiscal_year,fiscal_quarter,report_date,pe_ratio,forward_pe,price_to_sales,price_to_book,ev_to_ebitda,ev_to_sales,gross_margin,operating_margin,net_margin,roe,roic,roa,debt_to_equity,net_debt_to_ebitda,current_ratio,quick_ratio,free_cash_flow_yield,revenue_growth,eps_growth,net_income_growth,free_cash_flow_growth,provider")
      .in("instrument_id", instrumentIds)
      .order("report_date", { ascending: false });
    if (error) return [];
    const seen = new Set<string>();
    return (data ?? []).map((row) => mapFinancialRatio({ ...row, provider_metadata: {} })).filter((ratio) => {
      if (seen.has(ratio.instrumentId)) return false;
      seen.add(ratio.instrumentId);
      return true;
    });
  }

  async getLatestScores(instrumentIds: string[]) {
    const scores = await this.listScores(instrumentIds);
    const seen = new Set<string>();
    return scores.filter((score) => {
      if (seen.has(score.instrumentId)) return false;
      seen.add(score.instrumentId);
      return true;
    });
  }

  private async getLatestSummaryScores(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db
      .from("fundamental_scores")
      .select("id,instrument_id,symbol,as_of_date,growth_score,profitability_score,valuation_score,balance_sheet_score,cash_flow_score,quality_score,overall_fundamental_score,score_confidence")
      .in("instrument_id", instrumentIds)
      .order("as_of_date", { ascending: false })
      .limit(Math.max(500, instrumentIds.length * 5));
    if (error) return [];
    const seen = new Set<string>();
    return (data ?? []).map((row) => mapFundamentalScore({ ...row, explanation: "", inputs_snapshot: {} })).filter((score) => {
      if (seen.has(score.instrumentId)) return false;
      seen.add(score.instrumentId);
      return true;
    });
  }

  async getLatestTrendSummaries(instrumentIds: string[]) {
    const summaries = await this.listTrendSummaries(instrumentIds);
    const seen = new Set<string>();
    return summaries.filter((summary) => {
      if (seen.has(summary.instrumentId)) return false;
      seen.add(summary.instrumentId);
      return true;
    });
  }

  private async getLatestSummaryTrendSummaries(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db
      .from("fundamental_trend_summaries")
      .select("id,instrument_id,symbol,as_of_date,overall_trend_score,overall_confidence_score,overall_trend_direction,improving_metrics_count,deteriorating_metrics_count,stable_metrics_count,volatile_metrics_count,insufficient_data_metrics_count,growth_trend_score,margin_trend_score,profitability_trend_score,balance_sheet_trend_score,quality_trend_score,warnings")
      .in("instrument_id", instrumentIds)
      .order("as_of_date", { ascending: false })
      .limit(Math.max(500, instrumentIds.length * 5));
    if (error) return [];
    const seen = new Set<string>();
    return (data ?? []).map((row) => mapFundamentalTrendSummary({ ...row, explanation: "", inputs_snapshot: {} })).filter((summary) => {
      if (seen.has(summary.instrumentId)) return false;
      seen.add(summary.instrumentId);
      return true;
    });
  }

  async upsertCompanyProfiles(input: CompanyProfile[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("company_profiles").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      company_name: item.companyName,
      sector: item.sector,
      industry: item.industry,
      country: item.country,
      exchange: item.exchange,
      currency: item.currency,
      market_cap: item.marketCap,
      beta: item.beta,
      description: item.description,
      website: item.website,
      ceo: item.ceo,
      ipo_date: item.ipoDate,
      employees: item.employees,
      last_refreshed_at: item.lastRefreshedAt,
      provider: item.provider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "instrument_id" });
    if (error) throw new Error(error.message);
  }

  async upsertFinancialStatements(input: FinancialStatement[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("financial_statements").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      statement_type: item.statementType,
      period: item.period,
      fiscal_year: item.fiscalYear,
      fiscal_quarter: item.fiscalQuarter,
      report_date: item.reportDate,
      filing_date: item.filingDate,
      revenue: item.revenue,
      gross_profit: item.grossProfit,
      operating_income: item.operatingIncome,
      ebitda: item.ebitda,
      net_income: item.netIncome,
      eps: item.eps,
      diluted_eps: item.dilutedEps,
      total_assets: item.totalAssets,
      total_liabilities: item.totalLiabilities,
      shareholders_equity: item.shareholdersEquity,
      cash_and_equivalents: item.cashAndEquivalents,
      total_debt: item.totalDebt,
      operating_cash_flow: item.operatingCashFlow,
      capital_expenditure: item.capitalExpenditure,
      free_cash_flow: item.freeCashFlow,
      shares_outstanding: item.sharesOutstanding,
      provider: item.provider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "instrument_id,statement_type,period,fiscal_year,fiscal_quarter" });
    if (error) throw new Error(error.message);
  }

  async upsertFinancialRatios(input: FinancialRatio[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("financial_ratios").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      period: item.period,
      fiscal_year: item.fiscalYear,
      fiscal_quarter: item.fiscalQuarter,
      report_date: item.reportDate,
      pe_ratio: item.peRatio,
      forward_pe: item.forwardPe,
      price_to_sales: item.priceToSales,
      price_to_book: item.priceToBook,
      ev_to_ebitda: item.evToEbitda,
      ev_to_sales: item.evToSales,
      gross_margin: item.grossMargin,
      operating_margin: item.operatingMargin,
      net_margin: item.netMargin,
      roe: item.roe,
      roic: item.roic,
      roa: item.roa,
      debt_to_equity: item.debtToEquity,
      net_debt_to_ebitda: item.netDebtToEbitda,
      current_ratio: item.currentRatio,
      quick_ratio: item.quickRatio,
      free_cash_flow_yield: item.freeCashFlowYield,
      revenue_growth: item.revenueGrowth,
      eps_growth: item.epsGrowth,
      net_income_growth: item.netIncomeGrowth,
      free_cash_flow_growth: item.freeCashFlowGrowth,
      provider: item.provider,
      provider_metadata: item.providerMetadata
    })), { onConflict: "instrument_id,period,report_date" });
    if (error) throw new Error(error.message);
  }

  async upsertFundamentalScores(input: FundamentalScore[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("fundamental_scores").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      as_of_date: item.asOfDate,
      growth_score: item.growthScore,
      profitability_score: item.profitabilityScore,
      valuation_score: item.valuationScore,
      balance_sheet_score: item.balanceSheetScore,
      cash_flow_score: item.cashFlowScore,
      quality_score: item.qualityScore,
      overall_fundamental_score: item.overallFundamentalScore,
      score_confidence: item.scoreConfidence,
      explanation: item.explanation,
      inputs_snapshot: item.inputsSnapshot
    })), { onConflict: "instrument_id,as_of_date" });
    if (error) throw new Error(error.message);
  }

  async upsertFundamentalTrends(input: FundamentalTrend[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("fundamental_trends").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      metric_name: item.metricName,
      metric_category: item.metricCategory,
      current_value: item.currentValue,
      previous_value: item.previousValue,
      three_period_avg: item.threePeriodAvg,
      five_period_avg: item.fivePeriodAvg,
      short_term_trend_direction: item.shortTermTrendDirection,
      short_term_trend_strength: item.shortTermTrendStrength,
      short_term_trend_score: item.shortTermTrendScore,
      short_term_confidence_score: item.shortTermConfidenceScore,
      long_term_trend_direction: item.longTermTrendDirection,
      long_term_trend_strength: item.longTermTrendStrength,
      long_term_trend_score: item.longTermTrendScore,
      long_term_confidence_score: item.longTermConfidenceScore,
      overall_trend_direction: item.overallTrendDirection,
      overall_trend_score: item.overallTrendScore,
      overall_confidence_score: item.overallConfidenceScore,
      periods_analyzed: item.periodsAnalyzed,
      short_term_periods_analyzed: item.shortTermPeriodsAnalyzed,
      long_term_periods_analyzed: item.longTermPeriodsAnalyzed,
      display_period: item.displayPeriod,
      display_window: item.displayWindow,
      as_of_date: item.asOfDate,
      explanation: item.explanation,
      inputs_snapshot: item.inputsSnapshot
    })), { onConflict: "instrument_id,metric_name,as_of_date" });
    if (error) throw new Error(error.message);
  }

  async upsertFundamentalTrendSummaries(input: FundamentalTrendSummary[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("fundamental_trend_summaries").upsert(input.map((item) => ({
      instrument_id: item.instrumentId,
      symbol: item.symbol,
      as_of_date: item.asOfDate,
      overall_trend_score: item.overallTrendScore,
      overall_confidence_score: item.overallConfidenceScore,
      overall_trend_direction: item.overallTrendDirection,
      improving_metrics_count: item.improvingMetricsCount,
      deteriorating_metrics_count: item.deterioratingMetricsCount,
      stable_metrics_count: item.stableMetricsCount,
      volatile_metrics_count: item.volatileMetricsCount,
      insufficient_data_metrics_count: item.insufficientDataMetricsCount,
      growth_trend_score: item.growthTrendScore,
      margin_trend_score: item.marginTrendScore,
      profitability_trend_score: item.profitabilityTrendScore,
      balance_sheet_trend_score: item.balanceSheetTrendScore,
      quality_trend_score: item.qualityTrendScore,
      warnings: item.warnings,
      explanation: item.explanation,
      inputs_snapshot: item.inputsSnapshot
    })), { onConflict: "instrument_id,as_of_date" });
    if (error) throw new Error(error.message);
  }

  async insertRefreshLog(input: FundamentalsRefreshLog) {
    const { error } = await this.db.from("fundamentals_refresh_logs").insert({
      job_name: input.jobName,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: input.status,
      stocks_requested: input.stocksRequested,
      profiles_updated: input.profilesUpdated,
      statements_updated: input.statementsUpdated,
      ratios_updated: input.ratiosUpdated,
      scores_updated: input.scoresUpdated,
      failed_symbols: input.failedSymbols,
      error_message: input.errorMessage,
      metadata: input.metadata
    });
    if (error) throw new Error(error.message);
  }

  async listRefreshLogs(limit = 25) {
    const { data, error } = await this.db.from("fundamentals_refresh_logs").select("*").order("started_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRefreshLog);
  }

  private async listStatements(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("financial_statements").select("*").in("instrument_id", instrumentIds).order("report_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFinancialStatement);
  }

  private async listLatestStatementSnapshot(instrumentId: string) {
    const { data, error } = await this.db
      .from("financial_statements")
      .select(
        "id,instrument_id,symbol,statement_type,period,fiscal_year,fiscal_quarter,report_date,filing_date,revenue,gross_profit,operating_income,ebitda,net_income,eps,diluted_eps,total_assets,total_liabilities,shareholders_equity,cash_and_equivalents,total_debt,operating_cash_flow,capital_expenditure,free_cash_flow,shares_outstanding,provider"
      )
      .eq("instrument_id", instrumentId)
      .order("report_date", { ascending: false })
      .limit(24);
    if (error) return [];
    const byType = new Map<string, FinancialStatement>();
    for (const row of data ?? []) {
      const statement = mapFinancialStatement({ ...row, provider_metadata: {} });
      if (!byType.has(statement.statementType)) byType.set(statement.statementType, statement);
    }
    return Array.from(byType.values());
  }

  private async listStatementCounts(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return new Map<string, number>();
    const { data, error } = await this.db.from("financial_statements").select("instrument_id").in("instrument_id", instrumentIds);
    if (error) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const instrumentId = String(row.instrument_id ?? "");
      if (!instrumentId) continue;
      counts.set(instrumentId, (counts.get(instrumentId) ?? 0) + 1);
    }
    return counts;
  }

  private async listRatios(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("financial_ratios").select("*").in("instrument_id", instrumentIds).order("report_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFinancialRatio);
  }

  private async getLatestDetailRatios(instrumentId: string) {
    const { data, error } = await this.db
      .from("financial_ratios")
      .select(
        "id,instrument_id,symbol,period,fiscal_year,fiscal_quarter,report_date,pe_ratio,forward_pe,price_to_sales,price_to_book,ev_to_ebitda,ev_to_sales,gross_margin,operating_margin,net_margin,roe,roic,roa,debt_to_equity,net_debt_to_ebitda,current_ratio,quick_ratio,free_cash_flow_yield,revenue_growth,eps_growth,net_income_growth,free_cash_flow_growth,provider"
      )
      .eq("instrument_id", instrumentId)
      .order("report_date", { ascending: false })
      .limit(1);
    if (error) return [];
    return (data ?? []).map((row) => mapFinancialRatio({ ...row, provider_metadata: {} }));
  }

  private async listScores(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("fundamental_scores").select("*").in("instrument_id", instrumentIds).order("as_of_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFundamentalScore);
  }

  private async getLatestDetailScores(instrumentId: string) {
    const { data, error } = await this.db
      .from("fundamental_scores")
      .select("id,instrument_id,symbol,as_of_date,growth_score,profitability_score,valuation_score,balance_sheet_score,cash_flow_score,quality_score,overall_fundamental_score,score_confidence")
      .eq("instrument_id", instrumentId)
      .order("as_of_date", { ascending: false })
      .limit(1);
    if (error) return [];
    return (data ?? []).map((row) => mapFundamentalScore({ ...row, explanation: "", inputs_snapshot: {} }));
  }

  private async listTrends(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("fundamental_trends").select("*").in("instrument_id", instrumentIds).order("metric_category").order("metric_name");
    if (error) return [];
    return (data ?? []).map(mapFundamentalTrend);
  }

  private async listDetailTrends(instrumentId: string) {
    const { data, error } = await this.db
      .from("fundamental_trends")
      .select(
        "id,instrument_id,symbol,metric_name,metric_category,current_value,previous_value,three_period_avg,five_period_avg,short_term_trend_direction,short_term_trend_strength,short_term_trend_score,short_term_confidence_score,long_term_trend_direction,long_term_trend_strength,long_term_trend_score,long_term_confidence_score,overall_trend_direction,overall_trend_score,overall_confidence_score,periods_analyzed,short_term_periods_analyzed,long_term_periods_analyzed,display_period,display_window,as_of_date,explanation"
      )
      .eq("instrument_id", instrumentId)
      .order("metric_category")
      .order("metric_name");
    if (error) return [];
    return (data ?? []).map((row) => mapFundamentalTrend({ ...row, inputs_snapshot: {} }));
  }

  private async listTrendSummaries(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("fundamental_trend_summaries").select("*").in("instrument_id", instrumentIds).order("as_of_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFundamentalTrendSummary);
  }

  private async getLatestDetailTrendSummaries(instrumentId: string) {
    const { data, error } = await this.db
      .from("fundamental_trend_summaries")
      .select(
        "id,instrument_id,symbol,as_of_date,overall_trend_score,overall_confidence_score,overall_trend_direction,improving_metrics_count,deteriorating_metrics_count,stable_metrics_count,volatile_metrics_count,insufficient_data_metrics_count,growth_trend_score,margin_trend_score,profitability_trend_score,balance_sheet_trend_score,quality_trend_score,warnings,explanation"
      )
      .eq("instrument_id", instrumentId)
      .order("as_of_date", { ascending: false })
      .limit(1);
    if (error) return [];
    return (data ?? []).map((row) => mapFundamentalTrendSummary({ ...row, inputs_snapshot: {} }));
  }
}
