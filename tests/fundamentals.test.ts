import test from "node:test";
import assert from "node:assert/strict";
import { FundamentalScoringService } from "../src/application/services/fundamentals/FundamentalScoringService";
import { FundamentalsRefreshService, fundamentalsRefreshInternals } from "../src/application/services/fundamentals/FundamentalsRefreshService";
import type { FundamentalsProvider, FundamentalsProviderResult } from "../src/application/ports/providers/FundamentalsProvider";
import type { FundamentalsRepository } from "../src/application/ports/repositories/FundamentalsRepository";
import type {
  CompanyProfile,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
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

test("fundamentals refresh excludes non-stocks and logs partial success", async () => {
  const repository = new FakeFundamentalsRepository([
    stock("AAPL"),
    { ...stock("VOO"), assetClass: "etf" },
    stock("MSFT")
  ]);
  const provider = new FakeFundamentalsProvider();
  provider.failed.add("MSFT");
  const service = new FundamentalsRefreshService(repository, provider, new FundamentalScoringService(), {
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
  assert.equal(repository.logs[0]?.status, "partial_success");
});

test("fundamentals cron protection uses shared CRON_SECRET validation", () => {
  assert.equal(isCronSecretValid("expected", "expected"), true);
  assert.equal(isCronSecretValid("expected", "bad"), false);
  assert.equal(isCronSecretValid("expected", null), false);
});
