import test from "node:test";
import assert from "node:assert/strict";
import { FundamentalScoringService, fundamentalScoringInternals } from "../src/application/services/fundamentals/FundamentalScoringService";
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

  async listOverviewRows(): Promise<FundamentalsSummaryRow[]> {
    return [];
  }

  async listSummaryRowsForInstruments(): Promise<FundamentalsSummaryRow[]> {
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

test("FMP fundamentals provider maps Berkshire share-class symbol to provider format", () => {
  assert.equal(fmpFundamentalsInternals.normalizeFmpSymbol("BRK.B"), "BRK-B");
  assert.equal(fmpFundamentalsInternals.normalizeFmpSymbol("brk.b"), "BRK-B");
  assert.equal(fmpFundamentalsInternals.normalizeFmpSymbol("AAPL"), "AAPL");
});

test("FMP fundamentals normalization joins ROIC from key metrics", () => {
  const keyMetrics = fmpFundamentalsInternals.buildKeyMetricsLookup([{
    date: "2025-12-31",
    fiscalYear: 2025,
    period: "FY",
    returnOnInvestedCapital: 0.18
  }], "annual");
  const ratio = fmpFundamentalsInternals.normalizeRatio("AAPL", {
    date: "2025-12-31",
    calendarYear: 2025,
    period: "FY",
    returnOnEquity: 0.3,
    returnOnAssets: 0.2
  }, "fmp", "annual", keyMetrics.get("2025-12-31"));

  assert.equal(ratio.roic, 0.18);
  assert.equal(ratio.roe, 0.3);
  assert.equal(ratio.roa, 0.2);
});

test("FMP fundamentals normalization keeps ratios-supplied ROIC precedence", () => {
  const keyMetrics = fmpFundamentalsInternals.buildKeyMetricsLookup([{
    fiscalYear: 2025,
    returnOnInvestedCapital: 0.18
  }], "annual");
  const ratio = fmpFundamentalsInternals.normalizeRatio("AAPL", {
    calendarYear: 2025,
    period: "FY",
    returnOnInvestedCapital: 0.22
  }, "fmp", "annual", keyMetrics.get("2025|annual"));

  assert.equal(ratio.roic, 0.22);
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

test("fundamental scoring selects annual rows over latest quarterly rows for period-sensitive inputs", () => {
  const service = new FundamentalScoringService();
  const annualRatio: FinancialRatio = {
    instrumentId: "inst-seasonal",
    symbol: "SEAS",
    period: "annual",
    fiscalYear: 2025,
    fiscalQuarter: 0,
    reportDate: "2025-12-31",
    peRatio: 20,
    forwardPe: 18,
    priceToSales: 3,
    priceToBook: 4,
    evToEbitda: 14,
    evToSales: null,
    grossMargin: 0.45,
    operatingMargin: 0.24,
    netMargin: 0.18,
    roe: 0.18,
    roic: 0.16,
    roa: 0.10,
    debtToEquity: 0.4,
    netDebtToEbitda: 1.2,
    currentRatio: 1.6,
    quickRatio: 1.2,
    freeCashFlowYield: 0.05,
    revenueGrowth: 0.12,
    epsGrowth: 0.14,
    netIncomeGrowth: 0.13,
    freeCashFlowGrowth: 0.11,
    provider: "test",
    providerMetadata: {}
  };
  const quarterlyRatio: FinancialRatio = {
    ...annualRatio,
    period: "quarterly",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    reportDate: "2026-03-31",
    peRatio: 160,
    priceToSales: 15,
    evToEbitda: 70,
    grossMargin: 0.05,
    operatingMargin: -0.04,
    netMargin: -0.08,
    roe: -0.02,
    roic: -0.01,
    roa: -0.01,
    revenueGrowth: -0.15,
    epsGrowth: -0.2,
    netIncomeGrowth: -0.25,
    freeCashFlowGrowth: -0.3,
    freeCashFlowYield: -0.01
  };

  const score = service.calculateScore({
    instrumentId: "inst-seasonal",
    symbol: "SEAS",
    profile: null,
    ratios: [quarterlyRatio, annualRatio],
    statements: [
      trendStatement({ symbol: "SEAS", statementType: "income_statement", period: "annual", year: 2025, revenue: 1_000, operatingIncome: 240, netIncome: 180, sharesOutstanding: 100 }),
      trendStatement({ symbol: "SEAS", statementType: "cash_flow", period: "annual", year: 2025, operatingCashFlow: 260, freeCashFlow: 190 }),
      trendStatement({ symbol: "SEAS", statementType: "balance_sheet", period: "annual", year: 2025, totalAssets: 1_500, cashAndEquivalents: 150, totalDebt: 300 }),
      trendStatement({ symbol: "SEAS", statementType: "income_statement", period: "quarterly", year: 2026, quarter: 1, revenue: 200, operatingIncome: -10, netIncome: -20, sharesOutstanding: 100 }),
      trendStatement({ symbol: "SEAS", statementType: "cash_flow", period: "quarterly", year: 2026, quarter: 1, operatingCashFlow: -30, freeCashFlow: -60 }),
      trendStatement({ symbol: "SEAS", statementType: "balance_sheet", period: "quarterly", year: 2026, quarter: 1, totalAssets: 1_400, cashAndEquivalents: 50, totalDebt: 600 })
    ]
  });

  assert.equal((score.inputsSnapshot.latestRatio as FinancialRatio | null)?.period, "annual");
  assert.equal((score.inputsSnapshot.latestIncomeStatement as FinancialStatement | null)?.period, "annual");
  assert.equal((score.inputsSnapshot.latestCashFlowStatement as FinancialStatement | null)?.period, "annual");
  assert.equal((score.inputsSnapshot.latestBalanceSheet as FinancialStatement | null)?.period, "annual");
  assert.ok((score.growthScore ?? 0) > 60);
  assert.ok((score.profitabilityScore ?? 0) > 60);
  assert.ok((score.cashFlowScore ?? 0) > 60);
  assert.ok((score.valuationScore ?? 0) > 30);
});

test("fundamental scoring gives quality growth stocks a bounded valuation adjustment", () => {
  const service = new FundamentalScoringService();
  const baseRatio: FinancialRatio = {
    instrumentId: "inst-msft",
    symbol: "MSFT",
    period: "annual",
    fiscalYear: 2025,
    fiscalQuarter: 0,
    reportDate: "2025-12-31",
    peRatio: 70,
    forwardPe: 60,
    priceToSales: 18,
    priceToBook: 14,
    evToEbitda: 38,
    evToSales: 20,
    grossMargin: 0.68,
    operatingMargin: 0.42,
    netMargin: 0.32,
    roe: 0.35,
    roic: 0.3,
    roa: 0.18,
    debtToEquity: 0.4,
    netDebtToEbitda: 0.8,
    currentRatio: 1.8,
    quickRatio: 1.4,
    freeCashFlowYield: 0.015,
    revenueGrowth: 0.18,
    epsGrowth: 0.22,
    netIncomeGrowth: 0.2,
    freeCashFlowGrowth: 0.19,
    provider: "test",
    providerMetadata: {}
  };
  const score = service.calculateScore({
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
      marketCap: 3_000_000_000_000,
      beta: null,
      description: null,
      website: null,
      ceo: null,
      ipoDate: null,
      employees: null,
      lastRefreshedAt: null,
      provider: "test",
      providerMetadata: {}
    },
    ratios: [baseRatio],
    statements: []
  });

  assert.ok((score.valuationScore ?? 0) >= 28);
  assert.ok((score.inputsSnapshot.rawValuationScore as number) < score.valuationScore!);
  assert.ok((score.inputsSnapshot.valuationAdjustment as number) > 0);
});

function qualityInput(input: {
  symbol: string;
  margins: number[];
  operatingCashFlow: number;
  netIncome: number;
  roic: number;
  latestShares: number;
  previousShares: number;
}) {
  const years = [2021, 2022, 2023, 2024, 2025].slice(-input.margins.length);
  const ratios = input.margins.map((margin, index): FinancialRatio => ({
    instrumentId: `inst-${input.symbol}`,
    symbol: input.symbol,
    period: "annual",
    fiscalYear: years[index],
    fiscalQuarter: 0,
    reportDate: `${years[index]}-12-31`,
    peRatio: null,
    forwardPe: null,
    priceToSales: null,
    priceToBook: null,
    evToEbitda: null,
    evToSales: null,
    grossMargin: null,
    operatingMargin: margin,
    netMargin: margin,
    roe: null,
    roic: input.roic,
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
  }));
  const statements: FinancialStatement[] = [
    trendStatement({ symbol: input.symbol, statementType: "income_statement", period: "annual", year: 2024, revenue: 100, operatingIncome: input.margins.at(-2) ?? input.margins[0], netIncome: input.netIncome, sharesOutstanding: input.previousShares }),
    trendStatement({ symbol: input.symbol, statementType: "income_statement", period: "annual", year: 2025, revenue: 100, operatingIncome: input.margins.at(-1) ?? input.margins[0], netIncome: input.netIncome, sharesOutstanding: input.latestShares }),
    trendStatement({ symbol: input.symbol, statementType: "cash_flow", period: "annual", year: 2025, operatingCashFlow: input.operatingCashFlow }),
    trendStatement({ symbol: input.symbol, statementType: "balance_sheet", period: "annual", year: 2025, totalAssets: 1_000 })
  ];
  return { ratios, statements };
}

function qualityScoreFor(input: Parameters<typeof qualityInput>[0], options?: { isFinancial?: boolean }) {
  const data = qualityInput(input);
  const income = data.statements.find((statement) => statement.statementType === "income_statement" && statement.fiscalYear === 2025) ?? null;
  const cashFlow = data.statements.find((statement) => statement.statementType === "cash_flow") ?? null;
  const balanceSheet = data.statements.find((statement) => statement.statementType === "balance_sheet") ?? null;
  return fundamentalScoringInternals.calculateQualityScore({
    ratios: data.ratios,
    statements: data.statements,
    income,
    cashFlow,
    balanceSheet,
    isFinancial: options?.isFinancial
  });
}

function pearson(left: number[], right: number[]) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftDenominator = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightDenominator = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return numerator / (leftDenominator * rightDenominator);
}

test("fundamental quality score rewards stability and cash conversion with frozen anchors", () => {
  const strong = qualityScoreFor({
    symbol: "STABLE",
    margins: [0.30, 0.31, 0.29, 0.30, 0.30],
    operatingCashFlow: 110,
    netIncome: 100,
    roic: 0.20,
    latestShares: 98,
    previousShares: 100
  });
  const volatile = qualityScoreFor({
    symbol: "VOLATILE",
    margins: [0.05, 0.45, -0.02, 0.30, 0.10],
    operatingCashFlow: 50,
    netIncome: 100,
    roic: 0.04,
    latestShares: 112,
    previousShares: 100
  });
  const accrualWeak = qualityScoreFor({
    symbol: "ACCRUAL",
    margins: [0.30, 0.31, 0.29, 0.30, 0.30],
    operatingCashFlow: 50,
    netIncome: 100,
    roic: 0.12,
    latestShares: 100,
    previousShares: 100
  });

  assert.ok((strong.score ?? 0) > 90);
  assert.ok((volatile.score ?? 100) < 25);
  assert.ok((accrualWeak.score ?? 0) < (strong.score ?? 0));
  assert.ok((strong.signals.cashConversion.score ?? 0) > (accrualWeak.signals.cashConversion.score ?? 0));
  assert.ok((strong.signals.earningsStability.score ?? 0) > (volatile.signals.earningsStability.score ?? 0));
});

test("fundamental quality score named anchors are pinned", () => {
  const anchors = new Map([
    ["STABLE", qualityScoreFor({ symbol: "STABLE", margins: [0.30, 0.31, 0.29, 0.30, 0.30], operatingCashFlow: 110, netIncome: 100, roic: 0.20, latestShares: 98, previousShares: 100 }).score],
    ["DISCIPLINED", qualityScoreFor({ symbol: "DISCIPLINED", margins: [0.20, 0.20, 0.21, 0.20, 0.20], operatingCashFlow: 100, netIncome: 100, roic: 0.14, latestShares: 99, previousShares: 100 }).score],
    ["DILUTIVE", qualityScoreFor({ symbol: "DILUTIVE", margins: [0.25, 0.25, 0.25, 0.24, 0.25], operatingCashFlow: 90, netIncome: 100, roic: 0.12, latestShares: 110, previousShares: 100 }).score],
    ["VOLATILE", qualityScoreFor({ symbol: "VOLATILE", margins: [0.05, 0.45, -0.02, 0.30, 0.10], operatingCashFlow: 50, netIncome: 100, roic: 0.04, latestShares: 112, previousShares: 100 }).score]
  ]);

  assert.equal(Math.round(anchors.get("STABLE") ?? 0), 96);
  assert.equal(Math.round(anchors.get("DISCIPLINED") ?? 0), 82);
  assert.equal(Math.round(anchors.get("DILUTIVE") ?? 0), 63);
  assert.equal(Math.round(anchors.get("VOLATILE") ?? 0), 3);
});

test("fundamental quality score is more orthogonal than the previous overlapping formula on fixture", () => {
  const profitability = [30, 40, 50, 60, 70, 80, 90];
  const cashFlow = [28, 42, 52, 63, 72, 83, 92];
  const balanceSheet = [32, 44, 54, 61, 73, 82, 91];
  const newQuality = [
    qualityScoreFor({ symbol: "Q1", margins: [0.30, 0.31, 0.30, 0.29, 0.30], operatingCashFlow: 110, netIncome: 100, roic: 0.20, latestShares: 98, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q2", margins: [0.05, 0.45, -0.02, 0.30, 0.10], operatingCashFlow: 50, netIncome: 100, roic: 0.04, latestShares: 112, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q3", margins: [0.20, 0.20, 0.21, 0.20, 0.20], operatingCashFlow: 100, netIncome: 100, roic: 0.14, latestShares: 99, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q4", margins: [0.25, 0.10, 0.30, 0.15, 0.22], operatingCashFlow: 75, netIncome: 100, roic: 0.09, latestShares: 105, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q5", margins: [0.25, 0.25, 0.25, 0.24, 0.25], operatingCashFlow: 90, netIncome: 100, roic: 0.12, latestShares: 110, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q6", margins: [0.18, 0.22, 0.19, 0.21, 0.20], operatingCashFlow: 70, netIncome: 100, roic: 0.08, latestShares: 102, previousShares: 100 }).score ?? 0,
    qualityScoreFor({ symbol: "Q7", margins: [0.32, 0.30, 0.31, 0.29, 0.30], operatingCashFlow: 95, netIncome: 100, roic: 0.18, latestShares: 97, previousShares: 100 }).score ?? 0
  ];
  const previousQuality = profitability.map((profitabilityScore, index) =>
    (profitabilityScore + cashFlow[index] + balanceSheet[index] + profitabilityScore + cashFlow[index]) / 5
  );

  assert.ok(Math.abs(pearson(previousQuality, profitability)) > 0.98);
  assert.ok(Math.abs(pearson(previousQuality, cashFlow)) > 0.98);
  assert.ok(Math.abs(pearson(previousQuality, balanceSheet)) > 0.98);
  assert.ok(Math.abs(pearson(newQuality, profitability)) < 0.4);
  assert.ok(Math.abs(pearson(newQuality, cashFlow)) < 0.4);
  assert.ok(Math.abs(pearson(newQuality, balanceSheet)) < 0.4);
});

function companyProfile(sector: string, industry: string, symbol = "TEST"): CompanyProfile {
  return {
    instrumentId: `inst-${industry}`,
    symbol,
    companyName: "Test Company",
    sector,
    industry,
    country: "US",
    exchange: "NYSE",
    currency: "USD",
    marketCap: null,
    beta: null,
    description: null,
    website: null,
    ceo: null,
    ipoDate: null,
    employees: null,
    lastRefreshedAt: null,
    provider: "test",
    providerMetadata: {}
  };
}

test("financial sector detection matches balance-sheet financial industries only", () => {
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Banks - Diversified")), true);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Banks - Regional")), true);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Financial - Capital Markets")), true);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Insurance - Property & Casualty")), true);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Insurance - Diversified")), true);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Financial - Credit Services")), false);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "Asset Management")), false);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Technology", "Banks - Diversified")), false);
  assert.equal(fundamentalScoringInternals.isFinancialSector(null), false);
  assert.equal(fundamentalScoringInternals.isFinancialSector(companyProfile("Financial Services", "")), false);
});

test("financial sector scoring excludes industrial financial metrics for banks and insurers only", () => {
  const service = new FundamentalScoringService();
  const ratio = (symbol: string): FinancialRatio => ({
      instrumentId: `inst-${symbol}`,
      symbol,
      period: "annual",
      fiscalYear: 2025,
      fiscalQuarter: 0,
      reportDate: "2025-12-31",
      peRatio: 12,
      forwardPe: 11,
      priceToSales: 3,
      priceToBook: 1.3,
      evToEbitda: null,
      evToSales: null,
      grossMargin: null,
      operatingMargin: 0.28,
      netMargin: 0.24,
      roe: 0.14,
      roic: 0.12,
      roa: 0.013,
      debtToEquity: 10,
      netDebtToEbitda: null,
      currentRatio: null,
      quickRatio: null,
      freeCashFlowYield: null,
      revenueGrowth: 0.08,
      epsGrowth: 0.1,
      netIncomeGrowth: 0.09,
      freeCashFlowGrowth: null,
      provider: "test",
      providerMetadata: {}
  });
  const statements = (symbol: string): FinancialStatement[] => [
    trendStatement({ symbol, statementType: "income_statement", period: "annual", year: 2024, revenue: 100, operatingIncome: 22, netIncome: 20, sharesOutstanding: 100 }),
    trendStatement({ symbol, statementType: "income_statement", period: "annual", year: 2025, revenue: 100, operatingIncome: 24, netIncome: 21, sharesOutstanding: 99 }),
    trendStatement({ symbol, statementType: "cash_flow", period: "annual", year: 2025, operatingCashFlow: 28, freeCashFlow: 24 }),
    trendStatement({ symbol, statementType: "balance_sheet", period: "annual", year: 2025, totalAssets: 1_000, cashAndEquivalents: 50, totalDebt: 500 })
  ];

  const bankScore = service.calculateScore({
    instrumentId: "inst-jpm",
    symbol: "JPM",
    profile: companyProfile("Financial Services", "Banks - Diversified", "JPM"),
    ratios: [ratio("JPM")],
    statements: statements("JPM")
  });
  const insurerScore = service.calculateScore({
    instrumentId: "inst-cb",
    symbol: "CB",
    profile: companyProfile("Financial Services", "Insurance - Property & Casualty", "CB"),
    ratios: [ratio("CB")],
    statements: statements("CB")
  });
  const feeBasedScore = service.calculateScore({
    instrumentId: "inst-v",
    symbol: "V",
    profile: companyProfile("Financial Services", "Financial - Credit Services", "V"),
    ratios: [ratio("V")],
    statements: statements("V")
  });

  for (const score of [bankScore, insurerScore]) {
    const qualitySignals = score.inputsSnapshot.qualitySignals as {
      cashConversion: { score: number | null };
      roicDurability: { score: number | null };
    };
    assert.equal(score.cashFlowScore, null);
    assert.equal(qualitySignals.cashConversion.score, null);
    assert.equal(qualitySignals.roicDurability.score, null);
    assert.ok((score.balanceSheetScore ?? 0) > 60);
    assert.ok((score.profitabilityScore ?? 0) > 60);
    assert.ok((score.qualityScore ?? 0) > 0);
  }

  const feeBasedQualitySignals = feeBasedScore.inputsSnapshot.qualitySignals as {
    cashConversion: { score: number | null };
    roicDurability: { score: number | null };
  };
  assert.notEqual(feeBasedScore.cashFlowScore, null);
  assert.notEqual(feeBasedQualitySignals.cashConversion.score, null);
  assert.notEqual(feeBasedQualitySignals.roicDurability.score, null);
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
  operatingCashFlow?: number | null;
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
    operatingCashFlow: input.operatingCashFlow ?? null,
    capitalExpenditure: null,
    freeCashFlow: input.freeCashFlow ?? null,
    sharesOutstanding: input.sharesOutstanding ?? null,
    provider: "test",
    providerMetadata: input.providerMetadata ?? {}
  };
}

test("fundamentals refresh does not derive valuation or leverage ratios from invalid denominators", () => {
  const ratios = fundamentalsRefreshInternals.deriveMissingRatios({
    instrumentId: "inst-distress",
    symbol: "DST",
    profile: {
      instrumentId: "inst-distress",
      symbol: "DST",
      companyName: "Distress Co",
      sector: "Technology",
      industry: "Software",
      country: "US",
      exchange: "NASDAQ",
      currency: "USD",
      marketCap: 1_000,
      beta: null,
      description: null,
      website: null,
      ceo: null,
      ipoDate: null,
      employees: null,
      lastRefreshedAt: "2026-06-01T00:00:00Z",
      provider: "test",
      providerMetadata: {}
    },
    statements: [
      trendStatement({
        statementType: "income_statement",
        period: "annual",
        year: 2025,
        revenue: 400,
        operatingIncome: 80,
        netIncome: -50,
        dilutedEps: -1,
        sharesOutstanding: 100
      }),
      trendStatement({
        statementType: "balance_sheet",
        period: "annual",
        year: 2025,
        totalAssets: 600,
        shareholdersEquity: -100,
        totalDebt: 300,
        providerMetadata: { totalCurrentAssets: 100, totalCurrentLiabilities: -20 }
      }),
      trendStatement({
        statementType: "cash_flow",
        period: "annual",
        year: 2025,
        freeCashFlow: -20
      })
    ],
    ratios: []
  });

  assert.equal(ratios[0]?.peRatio, null);
  assert.equal(ratios[0]?.priceToBook, null);
  assert.equal(ratios[0]?.roe, null);
  assert.equal(ratios[0]?.debtToEquity, null);
  assert.equal(ratios[0]?.currentRatio, null);
  assert.equal(ratios[0]?.freeCashFlowYield, -0.02);
  assert.equal(ratios[0]?.priceToSales, 2.5);
});

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

test("fundamental trend service ignores invalid balance sheet denominators", () => {
  const service = new FundamentalTrendCalculationService();
  const statements: FinancialStatement[] = [];
  for (let index = 0; index < 5; index += 1) {
    const year = 2021 + index;
    statements.push(
      trendStatement({
        statementType: "income_statement",
        period: "annual",
        year,
        revenue: 100 + index * 5,
        operatingIncome: 20,
        netIncome: 10,
        providerMetadata: { interestExpense: 0 }
      }),
      trendStatement({
        statementType: "balance_sheet",
        period: "annual",
        year,
        totalAssets: 200,
        shareholdersEquity: -50,
        totalDebt: 120,
        cashAndEquivalents: 300,
        providerMetadata: { totalCurrentAssets: 100, totalCurrentLiabilities: -25 }
      })
    );
  }

  const result = service.calculate({
    instrumentId: "inst-DST",
    symbol: "DST",
    scores: [],
    ratios: [],
    statements
  });

  const roe = result.trends.find((trend) => trend.metricName === "roe");
  const roic = result.trends.find((trend) => trend.metricName === "roic");
  const debtToEquity = result.trends.find((trend) => trend.metricName === "debt_to_equity");
  const currentRatio = result.trends.find((trend) => trend.metricName === "current_ratio");
  const interestCoverage = result.trends.find((trend) => trend.metricName === "interest_coverage");
  assert.equal(roe?.longTermTrendDirection, "insufficient_data");
  assert.equal(roic?.longTermTrendDirection, "insufficient_data");
  assert.equal(debtToEquity?.longTermTrendDirection, "insufficient_data");
  assert.equal(currentRatio?.longTermTrendDirection, "insufficient_data");
  assert.equal(interestCoverage?.longTermTrendDirection, "insufficient_data");
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

test("forced fundamentals refresh rotates through oldest profile cohorts", async () => {
  const instruments = ["AAA", "BBB", "CCC", "DDD", "EEE"].map(stock);
  const repository = new FakeFundamentalsRepository(instruments);
  const profileFor = (symbol: string, lastRefreshedAt: string | null): CompanyProfile => ({
    instrumentId: `inst-${symbol}`,
    symbol,
    companyName: `${symbol} Inc`,
    sector: "Technology",
    industry: "Software",
    country: "US",
    exchange: "NASDAQ",
    currency: "USD",
    marketCap: 1000,
    beta: 1,
    description: null,
    website: null,
    ceo: null,
    ipoDate: null,
    employees: 100,
    lastRefreshedAt,
    provider: "fake",
    providerMetadata: {}
  });
  repository.profiles = [
    profileFor("AAA", null),
    profileFor("BBB", "2026-01-01T00:00:00Z"),
    profileFor("CCC", "2026-02-01T00:00:00Z"),
    profileFor("DDD", "2026-03-01T00:00:00Z"),
    profileFor("EEE", "2026-04-01T00:00:00Z")
  ];
  const service = new FundamentalsRefreshService(repository, new FakeFundamentalsProvider(), new FundamentalScoringService(), new FundamentalTrendCalculationService(), {
    enabled: true,
    maxStocksPerRefresh: 2,
    refreshFrequencyDays: 1,
    staleAfterDays: 30
  });

  const first = await service.refreshAll({ force: true });
  const firstSymbols = repository.scores.map((score) => score.symbol);
  const second = await service.refreshAll({ force: true });
  const secondSymbols = repository.scores.slice(firstSymbols.length).map((score) => score.symbol);

  assert.equal(first.stocksRequested, 2);
  assert.equal(second.stocksRequested, 2);
  assert.deepEqual(firstSymbols, ["AAA", "BBB"]);
  assert.deepEqual(secondSymbols, ["CCC", "DDD"]);
});

test("fundamentals cron protection uses shared CRON_SECRET validation", () => {
  assert.equal(isCronSecretValid("expected", "expected"), true);
  assert.equal(isCronSecretValid("expected", "bad"), false);
  assert.equal(isCronSecretValid("expected", null), false);
});
