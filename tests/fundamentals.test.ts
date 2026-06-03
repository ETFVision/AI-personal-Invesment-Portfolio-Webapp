import test from "node:test";
import assert from "node:assert/strict";
import { FundamentalScoringService } from "../src/application/services/fundamentals/FundamentalScoringService";
import { FundamentalTrendCalculationService } from "../src/application/services/fundamentals/FundamentalTrendCalculationService";
import { FundamentalsRefreshService, fundamentalsRefreshInternals } from "../src/application/services/fundamentals/FundamentalsRefreshService";
import type { FundamentalsProvider, FundamentalsProviderResult } from "../src/application/ports/providers/FundamentalsProvider";
import type { FundamentalsRepository } from "../src/application/ports/repositories/FundamentalsRepository";
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
} from "../src/domain/fundamentals/types";
import type { Instrument } from "../src/domain/universe/types";
import { fmpFundamentalsInternals } from "../src/infrastructure/providers/fundamentals/FmpFundamentalsProvider";
import { isCronSecretValid } from "../src/application/services/news/cronSecret";

function stock(symbol: string): Instrument {
  return {
    id: `inst-${symbol}`,
    symbol,
    name: `${symbol} Inc`,
    assetClass: "stock",
    instrumentType: "stock",
    sector: "Technology",
    industry: "Software",
    canonicalSector: "Technology",
    canonicalThemes: ["AI"],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "approved",
    geography: "US",
    currency: "USD",
    exchange: "NASDAQ",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: null,
    creditQuality: null,
    geoExposure: null,
    rateSensitivity: null,
    inflationSensitivity: null,
    recessionSensitivity: null,
    liquidityRole: null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "seeded",
    isActive: true
  };
}

class FakeFundamentalsRepository implements FundamentalsRepository {
  profiles: CompanyProfile[] = [];
  statements: FinancialStatement[] = [];
  ratios: FinancialRatio[] = [];
  scores: FundamentalScore[] = [];
  trends: FundamentalTrend[] = [];
  trendSummaries: FundamentalTrendSummary[] = [];
  logs: FundamentalsRefreshLog[] = [];

  constructor(private readonly instruments: Instrument[]) {}

  async listEligibleStockInstruments(limit = 20) {
    return this.instruments.filter((instrument) => instrument.assetClass === "stock").slice(0, limit);
  }

  async listSummaryRows(): Promise<FundamentalsSummaryRow[]> {
    return [];
  }

  async getDetailBySymbol(): Promise<FundamentalsDetail | null> {
    return null;
  }

  async getProfiles(instrumentIds: string[]) {
    return this.profiles.filter((profile) => instrumentIds.includes(profile.instrumentId));
  }

  async getLatestRatios(instrumentIds: string[]) {
    return this.ratios.filter((ratio) => instrumentIds.includes(ratio.instrumentId));
  }

  async getLatestScores(instrumentIds: string[]) {
    return this.scores.filter((score) => instrumentIds.includes(score.instrumentId));
  }

  async getLatestTrendSummaries(instrumentIds: string[]) {
    return this.trendSummaries.filter((summary) => instrumentIds.includes(summary.instrumentId));
  }

  async upsertCompanyProfiles(input: CompanyProfile[]) {
    this.profiles.push(...input);
  }

  async upsertFinancialStatements(input: FinancialStatement[]) {
    this.statements.push(...input);
  }

  async upsertFinancialRatios(input: FinancialRatio[]) {
    this.ratios.push(...input);
  }

  async upsertFundamentalScores(input: FundamentalScore[]) {
    this.scores.push(...input);
  }

  async upsertFundamentalTrends(input: FundamentalTrend[]) {
    this.trends.push(...input);
  }

  async upsertFundamentalTrendSummaries(input: FundamentalTrendSummary[]) {
    this.trendSummaries.push(...input);
  }

  async insertRefreshLog(input: FundamentalsRefreshLog) {
    this.logs.push(input);
  }

  async listRefreshLogs() {
    return this.logs;
  }
}

class FakeFundamentalsProvider implements FundamentalsProvider {
  readonly name = "fake";
  failed = new Set<string>();

  async getFundamentals(symbol: string): Promise<FundamentalsProviderResult> {
    if (this.failed.has(symbol)) throw new Error("Provider failed");
    return {
      profile: {
        symbol,
        companyName: `${symbol} Inc`,
        sector: "Technology",
        industry: "Software",
        country: "US",
        exchange: "NASDAQ",
        currency: "USD",
        marketCap: 1000,
        beta: 1.1,
        description: null,
        website: null,
        ceo: null,
        ipoDate: null,
        employees: 1000,
        lastRefreshedAt: "2026-06-01T00:00:00Z",
        provider: "fake",
        providerMetadata: {}
      },
      statements: [{
        symbol,
        statementType: "income_statement",
        period: "annual",
        fiscalYear: 2025,
        fiscalQuarter: 0,
        reportDate: "2025-12-31",
        filingDate: "2026-02-01",
        revenue: 100,
        grossProfit: 70,
        operatingIncome: 35,
        ebitda: 40,
        netIncome: 25,
        eps: 5,
        dilutedEps: 5,
        totalAssets: null,
        totalLiabilities: null,
        shareholdersEquity: null,
        cashAndEquivalents: null,
        totalDebt: null,
        operatingCashFlow: null,
        capitalExpenditure: null,
        freeCashFlow: null,
        sharesOutstanding: 10,
        provider: "fake",
        providerMetadata: {}
      }],
      ratios: [{
        symbol,
        period: "annual",
        fiscalYear: 2025,
        fiscalQuarter: 0,
        reportDate: "2025-12-31",
        peRatio: 25,
        forwardPe: 22,
        priceToSales: 8,
        priceToBook: 6,
        evToEbitda: 20,
        evToSales: 9,
        grossMargin: 0.7,
        operatingMargin: 0.35,
        netMargin: 0.25,
        roe: 0.3,
        roic: 0.25,
        roa: 0.15,
        debtToEquity: 0.4,
        netDebtToEbitda: 0.5,
        currentRatio: 2,
        quickRatio: 1.5,
        freeCashFlowYield: 0.04,
        revenueGrowth: 0.2,
        epsGrowth: 0.25,
        netIncomeGrowth: 0.2,
        freeCashFlowGrowth: 0.2,
        provider: "fake",
        providerMetadata: {}
      }]
    };
  }
}

test("FMP fundamentals normalization preserves nulls and raw provider data", () => {
  const profile = fmpFundamentalsInternals.normalizeProfile("AAPL", {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    marketCap: "3000",
    beta: "not-a-number"
  }, "fmp");

  assert.equal(profile?.companyName, "Apple Inc.");
  assert.equal(profile?.marketCap, 3000);
  assert.equal(profile?.beta, null);
  assert.equal(profile?.providerMetadata && "symbol" in profile.providerMetadata, true);
});

test("fundamental scoring produces deterministic scores and confidence", () => {
  const service = new FundamentalScoringService();
  const score = service.calculateScore({
    instrumentId: "inst-aapl",
    symbol: "AAPL",
    profile: null,
    ratios: [{
      instrumentId: "inst-aapl",
      symbol: "AAPL",
      period: "annual",
      fiscalYear: 2025,
      fiscalQuarter: 0,
      reportDate: "2025-12-31",
      peRatio: 25,
      forwardPe: null,
      priceToSales: 8,
      priceToBook: null,
      evToEbitda: null,
      evToSales: null,
      grossMargin: 0.65,
      operatingMargin: 0.35,
      netMargin: 0.25,
      roe: 0.3,
      roic: 0.25,
      roa: 0.15,
      debtToEquity: 0.3,
      netDebtToEbitda: 0.5,
      currentRatio: 2,
      quickRatio: 1.5,
      freeCashFlowYield: 0.05,
      revenueGrowth: 0.2,
      epsGrowth: 0.2,
      netIncomeGrowth: 0.2,
      freeCashFlowGrowth: 0.2,
      provider: "test",
      providerMetadata: {}
    }],
    statements: []
  });

  assert.ok((score.overallFundamentalScore ?? 0) > 50);
  assert.ok(score.scoreConfidence > 50);
  assert.match(score.explanation, /Deterministic fundamentals score/);
});

test("fundamentals refresh derives missing ratios from financial statements", () => {
  const ratios = fundamentalsRefreshInternals.deriveMissingRatios({
    instrumentId: "inst-msft",
    symbol: "MSFT",
    profile: {
      instrumentId: "inst-msft",
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      sector: "Technology",
      industry: "Software",
      country: "US",
      exchange: "NASDAQ",
      currency: "USD",
      marketCap: null,
      beta: null,
      description: null,
      website: null,
      ceo: null,
      ipoDate: null,
      employees: null,
      lastRefreshedAt: "2026-06-01T00:00:00Z",
      provider: "test",
      providerMetadata: { price: 30 }
    },
    statements: [
      {
        instrumentId: "inst-msft",
        symbol: "MSFT",
        statementType: "income_statement",
        period: "annual",
        fiscalYear: 2025,
        fiscalQuarter: 0,
        reportDate: "2025-12-31",
        filingDate: null,
        revenue: 300,
        grossProfit: 210,
        operatingIncome: 120,
        ebitda: null,
        netIncome: 100,
        eps: 10,
        dilutedEps: 10,
        totalAssets: null,
        totalLiabilities: null,
        shareholdersEquity: null,
        cashAndEquivalents: null,
        totalDebt: null,
        operatingCashFlow: null,
        capitalExpenditure: null,
        freeCashFlow: null,
        sharesOutstanding: 100,
        provider: "test",
        providerMetadata: {}
      },
      {
        instrumentId: "inst-msft",
        symbol: "MSFT",
        statementType: "income_statement",
        period: "annual",
        fiscalYear: 2024,
        fiscalQuarter: 0,
        reportDate: "2024-12-31",
        filingDate: null,
        revenue: 240,
        grossProfit: 160,
        operatingIncome: 90,
        ebitda: null,
        netIncome: 80,
        eps: 8,
        dilutedEps: 8,
        totalAssets: null,
        totalLiabilities: null,
        shareholdersEquity: null,
        cashAndEquivalents: null,
        totalDebt: null,
        operatingCashFlow: null,
        capitalExpenditure: null,
        freeCashFlow: null,
        sharesOutstanding: null,
        provider: "test",
        providerMetadata: {}
      },
      {
        instrumentId: "inst-msft",
        symbol: "MSFT",
        statementType: "balance_sheet",
        period: "annual",
        fiscalYear: 2025,
        fiscalQuarter: 0,
        reportDate: "2025-12-31",
        filingDate: null,
        revenue: null,
        grossProfit: null,
        operatingIncome: null,
        ebitda: null,
        netIncome: null,
        eps: null,
        dilutedEps: null,
        totalAssets: 1_000,
        totalLiabilities: 400,
        shareholdersEquity: 600,
        cashAndEquivalents: 120,
        totalDebt: 150,
        operatingCashFlow: null,
        capitalExpenditure: null,
        freeCashFlow: null,
        sharesOutstanding: null,
        provider: "test",
        providerMetadata: {}
      }
    ],
    ratios: [{
      instrumentId: "inst-msft",
      symbol: "MSFT",
      period: "annual",
      fiscalYear: 2025,
      fiscalQuarter: 0,
      reportDate: "2025-12-31",
      peRatio: null,
      forwardPe: null,
      priceToSales: null,
      priceToBook: null,
      evToEbitda: null,
      evToSales: null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      roe: null,
      roic: null,
      roa: null,
      debtToEquity: null,
      netDebtToEbitda: null,
      currentRatio: null,
      quickRatio: null,
      freeCashFlowYield: null,
      revenueGrowth: null,
      epsGrowth: null,
      netIncomeGrowth: null,
      freeCashFlowGrowth: null,
      provider: "test",
      providerMetadata: {}
    }]
  });

  assert.equal(ratios[0]?.peRatio, 30);
  assert.equal(ratios[0]?.revenueGrowth, 0.25);
  assert.equal(ratios[0]?.epsGrowth, 0.25);
  assert.equal(ratios[0]?.roe, 100 / 600);
  assert.equal(ratios[0]?.debtToEquity, 150 / 600);
});

function trendRatio(input: {
  symbol?: string;
  period: "annual" | "quarterly";
  year: number;
  quarter?: number;
  revenueGrowth?: number | null;
  epsGrowth?: number | null;
  freeCashFlowGrowth?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  roe?: number | null;
  roic?: number | null;
  debtToEquity?: number | null;
}): FinancialRatio {
  return {
    instrumentId: `inst-${input.symbol ?? "AAPL"}`,
    symbol: input.symbol ?? "AAPL",
    period: input.period,
    fiscalYear: input.year,
    fiscalQuarter: input.quarter ?? 0,
    reportDate: input.period === "annual" ? `${input.year}-12-31` : `${input.year}-${String((input.quarter ?? 1) * 3).padStart(2, "0")}-30`,
    peRatio: null,
    forwardPe: null,
    priceToSales: null,
    priceToBook: null,
    evToEbitda: null,
    evToSales: null,
    grossMargin: input.grossMargin ?? null,
    operatingMargin: input.operatingMargin ?? null,
    netMargin: null,
    roe: input.roe ?? null,
    roic: input.roic ?? null,
    roa: null,
    debtToEquity: input.debtToEquity ?? null,
    netDebtToEbitda: null,
    currentRatio: null,
    quickRatio: null,
    freeCashFlowYield: null,
    revenueGrowth: input.revenueGrowth ?? null,
    epsGrowth: input.epsGrowth ?? null,
    netIncomeGrowth: null,
    freeCashFlowGrowth: input.freeCashFlowGrowth ?? null,
    provider: "test",
    providerMetadata: {}
  };
}

function trendStatement(input: {
  symbol?: string;
  statementType: "income_statement" | "balance_sheet" | "cash_flow";
  period: "annual" | "quarterly";
  year: number;
  quarter?: number;
  revenue?: number | null;
  operatingIncome?: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
  dilutedEps?: number | null;
  freeCashFlow?: number | null;
  totalAssets?: number | null;
  shareholdersEquity?: number | null;
  totalDebt?: number | null;
  cashAndEquivalents?: number | null;
  sharesOutstanding?: number | null;
  providerMetadata?: Record<string, unknown>;
}): FinancialStatement {
  return {
    instrumentId: `inst-${input.symbol ?? "AAPL"}`,
    symbol: input.symbol ?? "AAPL",
    statementType: input.statementType,
    period: input.period,
    fiscalYear: input.year,
    fiscalQuarter: input.quarter ?? 0,
    reportDate: input.period === "annual" ? `${input.year}-12-31` : `${input.year}-${String((input.quarter ?? 1) * 3).padStart(2, "0")}-30`,
    filingDate: null,
    revenue: input.revenue ?? null,
    grossProfit: null,
    operatingIncome: input.operatingIncome ?? null,
    ebitda: input.ebitda ?? null,
    netIncome: input.netIncome ?? null,
    eps: null,
    dilutedEps: input.dilutedEps ?? null,
    totalAssets: input.totalAssets ?? null,
    totalLiabilities: null,
    shareholdersEquity: input.shareholdersEquity ?? null,
    cashAndEquivalents: input.cashAndEquivalents ?? null,
    totalDebt: input.totalDebt ?? null,
    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: input.freeCashFlow ?? null,
    sharesOutstanding: input.sharesOutstanding ?? null,
    provider: "test",
    providerMetadata: input.providerMetadata ?? {}
  };
}

test("fundamental trend service detects improving and deteriorating growth trends", () => {
  const service = new FundamentalTrendCalculationService();
  const result = service.calculate({
    instrumentId: "inst-AAPL",
    symbol: "AAPL",
    statements: [],
    scores: [],
    ratios: [
      trendRatio({ period: "quarterly", year: 2025, quarter: 1, revenueGrowth: 0.02, epsGrowth: 0.3 }),
      trendRatio({ period: "quarterly", year: 2025, quarter: 2, revenueGrowth: 0.05, epsGrowth: 0.2 }),
      trendRatio({ period: "quarterly", year: 2025, quarter: 3, revenueGrowth: 0.08, epsGrowth: 0.12 }),
      trendRatio({ period: "quarterly", year: 2025, quarter: 4, revenueGrowth: 0.12, epsGrowth: 0.04 }),
      trendRatio({ period: "quarterly", year: 2026, quarter: 1, revenueGrowth: 0.16, epsGrowth: -0.02 })
    ]
  });

  const revenue = result.trends.find((trend) => trend.metricName === "revenue_growth");
  const eps = result.trends.find((trend) => trend.metricName === "eps_growth");
  assert.equal(revenue?.overallTrendDirection, "accelerating");
  assert.equal(eps?.overallTrendDirection, "deteriorating");
  assert.ok((revenue?.overallTrendScore ?? 0) > (eps?.overallTrendScore ?? 100));
});

test("fundamental trend service treats falling debt-to-equity as improving", () => {
  const service = new FundamentalTrendCalculationService();
  const result = service.calculate({
    instrumentId: "inst-AAPL",
    symbol: "AAPL",
    statements: [],
    scores: [],
    ratios: [
      trendRatio({ period: "annual", year: 2021, debtToEquity: 1.2, roe: 0.2, roic: 0.15 }),
      trendRatio({ period: "annual", year: 2022, debtToEquity: 1.0, roe: 0.22, roic: 0.17 }),
      trendRatio({ period: "annual", year: 2023, debtToEquity: 0.8, roe: 0.24, roic: 0.18 }),
      trendRatio({ period: "annual", year: 2024, debtToEquity: 0.6, roe: 0.26, roic: 0.2 }),
      trendRatio({ period: "annual", year: 2025, debtToEquity: 0.4, roe: 0.28, roic: 0.22 })
    ]
  });

  const leverage = result.trends.find((trend) => trend.metricName === "debt_to_equity");
  assert.equal(leverage?.overallTrendDirection, "improving");
  assert.equal(leverage?.shortTermTrendDirection, "not_applicable");
  assert.ok((leverage?.overallTrendScore ?? 0) >= 65);
});

test("fundamental trend service derives growth trends from stored quarterly statements when FMP growth ratios are sparse", () => {
  const service = new FundamentalTrendCalculationService();
  const quarterlyRevenue = [80, 84, 88, 92, 100, 110, 124, 142, 166];
  const quarterlyEps = [0.8, 0.85, 0.9, 0.95, 1.05, 1.18, 1.38, 1.65, 2.02];
  const quarterlyEbitda = [24, 26, 28, 30, 34, 39, 47, 58, 74];
  const quarterlyFcf = [12, 13, 14, 15, 18, 22, 29, 39, 54];
  const incomeStatements = quarterlyRevenue.map((revenue, index) => {
    const year = index < 4 ? 2024 : index < 8 ? 2025 : 2026;
    const quarter = (index % 4) + 1;
    return trendStatement({
      statementType: "income_statement",
      period: "quarterly",
      year,
      quarter,
      revenue,
      netIncome: quarterlyEps[index] * 20,
      dilutedEps: quarterlyEps[index],
      ebitda: quarterlyEbitda[index]
    });
  });
  const cashFlowStatements = quarterlyFcf.map((freeCashFlow, index) => {
    const year = index < 4 ? 2024 : index < 8 ? 2025 : 2026;
    const quarter = (index % 4) + 1;
    return trendStatement({ statementType: "cash_flow", period: "quarterly", year, quarter, freeCashFlow });
  });
  const result = service.calculate({
    instrumentId: "inst-AAPL",
    symbol: "AAPL",
    scores: [],
    ratios: [],
    statements: [...incomeStatements, ...cashFlowStatements]
  });

  const revenue = result.trends.find((trend) => trend.metricName === "revenue_growth");
  const eps = result.trends.find((trend) => trend.metricName === "eps_growth");
  const fcf = result.trends.find((trend) => trend.metricName === "free_cash_flow_growth");
  const ebitda = result.trends.find((trend) => trend.metricName === "ebitda_growth");
  assert.equal(revenue?.shortTermPeriodsAnalyzed, 5);
  assert.equal(revenue?.displayPeriod, "quarterly");
  assert.equal(revenue?.displayWindow, "short_term");
  assert.notEqual(revenue?.shortTermTrendDirection, "insufficient_data");
  assert.notEqual(eps?.shortTermTrendDirection, "insufficient_data");
  assert.notEqual(fcf?.shortTermTrendDirection, "insufficient_data");
  assert.notEqual(ebitda?.shortTermTrendDirection, "insufficient_data");
});

test("fundamental trend service derives profitability and liquidity trends from stored statements when FMP ratios are missing", () => {
  const service = new FundamentalTrendCalculationService();
  const statements: FinancialStatement[] = [];
  for (let index = 0; index < 5; index += 1) {
    const year = 2021 + index;
    statements.push(
      trendStatement({
        statementType: "income_statement",
        period: "annual",
        year,
        revenue: 100 + index * 10,
        operatingIncome: 30 + index * 5,
        netIncome: 20 + index * 3,
        sharesOutstanding: 100 - index * 2,
        providerMetadata: { interestExpense: 10 - index }
      }),
      trendStatement({
        statementType: "balance_sheet",
        period: "annual",
        year,
        totalAssets: 200 + index * 20,
        shareholdersEquity: 80 + index * 8,
        totalDebt: 40 - index * 2,
        cashAndEquivalents: 10,
        providerMetadata: { totalCurrentAssets: 120 + index * 8, totalCurrentLiabilities: 80 - index * 2 }
      })
    );
  }

  const result = service.calculate({
    instrumentId: "inst-AAPL",
    symbol: "AAPL",
    scores: [],
    ratios: [],
    statements
  });

  const roic = result.trends.find((trend) => trend.metricName === "roic");
  const currentRatio = result.trends.find((trend) => trend.metricName === "current_ratio");
  const interestCoverage = result.trends.find((trend) => trend.metricName === "interest_coverage");
  const revenuePerShare = result.trends.find((trend) => trend.metricName === "revenue_per_share_growth");
  assert.equal(roic?.longTermPeriodsAnalyzed, 5);
  assert.equal(roic?.shortTermTrendDirection, "not_applicable");
  assert.notEqual(roic?.longTermTrendDirection, "insufficient_data");
  assert.notEqual(currentRatio?.longTermTrendDirection, "insufficient_data");
  assert.notEqual(interestCoverage?.longTermTrendDirection, "insufficient_data");
  assert.notEqual(revenuePerShare?.longTermTrendDirection, "insufficient_data");
});

test("fundamental trend service marks insufficient data and creates quality warnings", () => {
  const service = new FundamentalTrendCalculationService();
  const result = service.calculate({
    instrumentId: "inst-AAPL",
    symbol: "AAPL",
    statements: [],
    scores: [],
    ratios: [
      trendRatio({ period: "annual", year: 2024, revenueGrowth: 0.1, freeCashFlowGrowth: 0.05, operatingMargin: 0.3 }),
      trendRatio({ period: "annual", year: 2025, revenueGrowth: 0.2, freeCashFlowGrowth: -0.1, operatingMargin: 0.2 })
    ]
  });

  const revenue = result.trends.find((trend) => trend.metricName === "revenue_growth");
  assert.equal(revenue?.overallTrendDirection, "insufficient_data");
  assert.equal(result.summary.overallTrendDirection, "insufficient_data");
});

test("fundamentals refresh excludes non-stocks and logs partial success", async () => {
  const repository = new FakeFundamentalsRepository([
    stock("AAPL"),
    { ...stock("VOO"), assetClass: "etf" },
    stock("MSFT")
  ]);
  const provider = new FakeFundamentalsProvider();
  provider.failed.add("MSFT");
  const service = new FundamentalsRefreshService(repository, provider, new FundamentalScoringService(), new FundamentalTrendCalculationService(), {
    enabled: true,
    maxStocksPerRefresh: 10,
    refreshFrequencyDays: 1,
    staleAfterDays: 30
  });

  const result = await service.refreshAll({ force: true });

  assert.equal(result.status, "partial_success");
  assert.equal(result.stocksRequested, 2);
  assert.deepEqual(result.failedSymbols, ["MSFT"]);
  assert.equal(repository.profiles.length, 1);
  assert.equal(repository.scores.length, 1);
  assert.ok(repository.trends.length > 0);
  assert.equal(repository.trendSummaries.length, 1);
  assert.equal(repository.logs[0]?.status, "partial_success");
});

test("fundamentals cron protection uses shared CRON_SECRET validation", () => {
  assert.equal(isCronSecretValid("expected", "expected"), true);
  assert.equal(isCronSecretValid("expected", "bad"), false);
  assert.equal(isCronSecretValid("expected", null), false);
});
