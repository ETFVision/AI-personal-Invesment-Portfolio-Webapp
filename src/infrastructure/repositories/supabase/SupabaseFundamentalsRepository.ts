import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import type {
  CompanyProfile,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
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
    const ids = instruments.map((instrument) => instrument.id);
    const [profiles, ratios, scores, statements] = await Promise.all([
      this.getProfiles(ids),
      this.getLatestRatios(ids),
      this.getLatestScores(ids),
      this.listStatements(ids)
    ]);
    const profileById = new Map(profiles.map((item) => [item.instrumentId, item]));
    const ratioById = new Map(ratios.map((item) => [item.instrumentId, item]));
    const scoreById = new Map(scores.map((item) => [item.instrumentId, item]));
    const statementCountById = new Map<string, number>();
    for (const statement of statements) {
      statementCountById.set(statement.instrumentId, (statementCountById.get(statement.instrumentId) ?? 0) + 1);
    }
    return instruments.map((instrument): FundamentalsSummaryRow => {
      const profile = profileById.get(instrument.id) ?? null;
      const latestRatio = ratioById.get(instrument.id) ?? null;
      const latestScore = scoreById.get(instrument.id) ?? null;
      const statementCount = statementCountById.get(instrument.id) ?? 0;
      return {
        instrument,
        profile,
        latestRatio,
        latestScore,
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
    const [profiles, ratios, scores, statements] = await Promise.all([
      this.getProfiles([instrument.id]),
      this.listRatios([instrument.id]),
      this.listScores([instrument.id]),
      this.listStatements([instrument.id])
    ]);
    const profile = profiles[0] ?? null;
    const latestRatio = ratios[0] ?? null;
    const latestScore = scores[0] ?? null;
    return {
      instrument,
      profile,
      latestRatio,
      latestScore,
      statementCount: statements.length,
      missingDataWarnings: warnings(profile, latestRatio, latestScore, statements.length),
      statements,
      ratios,
      scores
    } satisfies FundamentalsDetail;
  }

  async getProfiles(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("company_profiles").select("*").in("instrument_id", instrumentIds);
    if (error) return [];
    return (data ?? []).map(mapCompanyProfile);
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

  async getLatestScores(instrumentIds: string[]) {
    const scores = await this.listScores(instrumentIds);
    const seen = new Set<string>();
    return scores.filter((score) => {
      if (seen.has(score.instrumentId)) return false;
      seen.add(score.instrumentId);
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

  private async listRatios(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("financial_ratios").select("*").in("instrument_id", instrumentIds).order("report_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFinancialRatio);
  }

  private async listScores(instrumentIds: string[]) {
    if (instrumentIds.length === 0) return [];
    const { data, error } = await this.db.from("fundamental_scores").select("*").in("instrument_id", instrumentIds).order("as_of_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapFundamentalScore);
  }
}
