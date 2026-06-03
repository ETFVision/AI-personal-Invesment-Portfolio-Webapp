import type { FundamentalsProvider } from "@/application/ports/providers/FundamentalsProvider";
import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import { FundamentalScoringService } from "@/application/services/fundamentals/FundamentalScoringService";
import { FundamentalTrendCalculationService } from "@/application/services/fundamentals/FundamentalTrendCalculationService";
import type { CompanyProfile, FinancialRatio, FinancialStatement } from "@/domain/fundamentals/types";

export type FundamentalsRefreshResult = {
  ok: boolean;
  status: "success" | "partial_success" | "failed";
  message: string;
  stocksRequested: number;
  profilesUpdated: number;
  statementsUpdated: number;
  ratiosUpdated: number;
  scoresUpdated: number;
  trendsUpdated: number;
  failedSymbols: string[];
};

function daysBetween(dateIso: string | null, now = new Date()) {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

function latestStatement(statements: FinancialStatement[], statementType: FinancialStatement["statementType"]) {
  return statements
    .filter((statement) => statement.statementType === statementType)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))[0] ?? null;
}

function previousStatement(statements: FinancialStatement[], statementType: FinancialStatement["statementType"], latest: FinancialStatement | null) {
  return statements
    .filter((statement) => statement.statementType === statementType && statement.reportDate !== latest?.reportDate)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))[0] ?? null;
}

function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function numberFromMetadata(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeGrowth(latest: number | null | undefined, previous: number | null | undefined) {
  if (latest == null || previous == null || previous === 0) return null;
  const value = (latest - previous) / Math.abs(previous);
  return Number.isFinite(value) ? value : null;
}

function mergeRatio(current: number | null | undefined, derived: number | null) {
  return current == null ? derived : current;
}

function createEmptyDerivedRatio(input: {
  instrumentId: string;
  symbol: string;
  income: FinancialStatement | null;
  balanceSheet: FinancialStatement | null;
}): FinancialRatio {
  const reportDate = input.income?.reportDate ?? input.balanceSheet?.reportDate ?? new Date().toISOString().slice(0, 10);
  return {
    instrumentId: input.instrumentId,
    symbol: input.symbol,
    period: input.income?.period ?? input.balanceSheet?.period ?? "annual",
    fiscalYear: input.income?.fiscalYear ?? input.balanceSheet?.fiscalYear ?? Number(reportDate.slice(0, 4)),
    fiscalQuarter: input.income?.fiscalQuarter ?? input.balanceSheet?.fiscalQuarter ?? 0,
    reportDate,
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
    provider: "derived",
    providerMetadata: { source: "derived_from_financial_statements" }
  };
}

function deriveMissingRatios(input: {
  instrumentId: string;
  symbol: string;
  profile: CompanyProfile | null;
  statements: FinancialStatement[];
  ratios: FinancialRatio[];
}) {
  const income = latestStatement(input.statements, "income_statement");
  const previousIncome = previousStatement(input.statements, "income_statement", income);
  const balanceSheet = latestStatement(input.statements, "balance_sheet");
  const cashFlow = latestStatement(input.statements, "cash_flow");
  const previousCashFlow = previousStatement(input.statements, "cash_flow", cashFlow);
  const latestSharesOutstanding = income?.sharesOutstanding ?? balanceSheet?.sharesOutstanding ?? cashFlow?.sharesOutstanding ?? null;
  const providerProfilePrice = numberFromMetadata(input.profile?.providerMetadata?.price);
  const derivedMarketCap = input.profile?.marketCap ?? safeRatio(
    latestSharesOutstanding != null && providerProfilePrice != null ? latestSharesOutstanding * providerProfilePrice : null,
    1
  );

  if (!income && !balanceSheet && !cashFlow) return input.ratios;

  const sorted = [...input.ratios].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  const latestRatio = sorted[0] ?? createEmptyDerivedRatio({ instrumentId: input.instrumentId, symbol: input.symbol, income, balanceSheet });

  const derivedPe =
    safeRatio(derivedMarketCap, income?.netIncome) ??
    safeRatio(derivedMarketCap, previousIncome?.netIncome);
  const derivedPriceToSales = safeRatio(derivedMarketCap, income?.revenue);
  const derivedPriceToBook = safeRatio(derivedMarketCap, balanceSheet?.shareholdersEquity);
  const derivedGrossMargin = safeRatio(income?.grossProfit, income?.revenue);
  const derivedOperatingMargin = safeRatio(income?.operatingIncome, income?.revenue);
  const derivedNetMargin = safeRatio(income?.netIncome, income?.revenue);
  const derivedRoe = safeRatio(income?.netIncome, balanceSheet?.shareholdersEquity);
  const derivedRoa = safeRatio(income?.netIncome, balanceSheet?.totalAssets);
  const derivedDebtToEquity = safeRatio(balanceSheet?.totalDebt, balanceSheet?.shareholdersEquity);
  const derivedCurrentRatio = safeRatio(
    Number(input.profile?.providerMetadata?.currentAssets ?? balanceSheet?.providerMetadata?.totalCurrentAssets),
    Number(input.profile?.providerMetadata?.currentLiabilities ?? balanceSheet?.providerMetadata?.totalCurrentLiabilities)
  );
  const derivedFreeCashFlowYield = safeRatio(cashFlow?.freeCashFlow, derivedMarketCap);

  const enhanced: FinancialRatio = {
    ...latestRatio,
    provider: latestRatio.provider === "derived" ? "derived" : latestRatio.provider,
    providerMetadata: {
      ...latestRatio.providerMetadata,
      derivedFallbacks: {
        source: "financial_statements",
        derivedAt: new Date().toISOString(),
        marketCapInput: input.profile?.marketCap == null && derivedMarketCap != null ? "shares_outstanding_x_profile_price" : "profile_market_cap"
      }
    },
    peRatio: mergeRatio(latestRatio.peRatio, derivedPe),
    priceToSales: mergeRatio(latestRatio.priceToSales, derivedPriceToSales),
    priceToBook: mergeRatio(latestRatio.priceToBook, derivedPriceToBook),
    grossMargin: mergeRatio(latestRatio.grossMargin, derivedGrossMargin),
    operatingMargin: mergeRatio(latestRatio.operatingMargin, derivedOperatingMargin),
    netMargin: mergeRatio(latestRatio.netMargin, derivedNetMargin),
    roe: mergeRatio(latestRatio.roe, derivedRoe),
    roa: mergeRatio(latestRatio.roa, derivedRoa),
    debtToEquity: mergeRatio(latestRatio.debtToEquity, derivedDebtToEquity),
    currentRatio: mergeRatio(latestRatio.currentRatio, derivedCurrentRatio),
    freeCashFlowYield: mergeRatio(latestRatio.freeCashFlowYield, derivedFreeCashFlowYield),
    revenueGrowth: mergeRatio(latestRatio.revenueGrowth, safeGrowth(income?.revenue, previousIncome?.revenue)),
    epsGrowth: mergeRatio(latestRatio.epsGrowth, safeGrowth(income?.dilutedEps ?? income?.eps, previousIncome?.dilutedEps ?? previousIncome?.eps)),
    netIncomeGrowth: mergeRatio(latestRatio.netIncomeGrowth, safeGrowth(income?.netIncome, previousIncome?.netIncome)),
    freeCashFlowGrowth: mergeRatio(latestRatio.freeCashFlowGrowth, safeGrowth(cashFlow?.freeCashFlow, previousCashFlow?.freeCashFlow))
  };

  const rest = sorted.filter((ratio) => ratio !== latestRatio);
  return [enhanced, ...rest];
}

export class FundamentalsRefreshService {
  constructor(
    private readonly repository: FundamentalsRepository,
    private readonly provider: FundamentalsProvider,
    private readonly scoringService: FundamentalScoringService,
    private readonly trendCalculationService: FundamentalTrendCalculationService,
    private readonly config: {
      enabled: boolean;
      maxStocksPerRefresh: number;
      refreshFrequencyDays: number;
      staleAfterDays: number;
    }
  ) {}

  async refreshAll(options: { force?: boolean; symbol?: string } = {}): Promise<FundamentalsRefreshResult> {
    const startedAt = new Date().toISOString();
    if (!this.config.enabled) {
      const result = {
        ok: false,
        status: "failed" as const,
        message: "Fundamentals refresh is disabled.",
        stocksRequested: 0,
        profilesUpdated: 0,
        statementsUpdated: 0,
        ratiosUpdated: 0,
        scoresUpdated: 0,
        trendsUpdated: 0,
        failedSymbols: []
      };
      await this.repository.insertRefreshLog({
        jobName: "fundamentals-refresh",
        startedAt,
        completedAt: new Date().toISOString(),
        status: result.status,
        stocksRequested: 0,
        profilesUpdated: 0,
        statementsUpdated: 0,
        ratiosUpdated: 0,
        scoresUpdated: 0,
        failedSymbols: [],
        errorMessage: result.message,
        metadata: {}
      });
      return result;
    }

    const eligible = await this.repository.listEligibleStockInstruments(this.config.maxStocksPerRefresh * 3);
    const filtered = options.symbol
      ? eligible.filter((instrument) => instrument.symbol?.toUpperCase() === options.symbol?.toUpperCase())
      : eligible;
    const profiles = await this.repository.getProfiles(filtered.map((instrument) => instrument.id));
    const profileByInstrument = new Map(profiles.map((profile) => [profile.instrumentId, profile]));
    const due = filtered
      .filter((instrument) => {
        if (options.force) return true;
        const existing = profileByInstrument.get(instrument.id);
        return daysBetween(existing?.lastRefreshedAt ?? null) >= this.config.refreshFrequencyDays;
      })
      .slice(0, this.config.maxStocksPerRefresh);

    let profilesUpdated = 0;
    let statementsUpdated = 0;
    let ratiosUpdated = 0;
    let scoresUpdated = 0;
    let trendsUpdated = 0;
    const failedSymbols: string[] = [];

    for (const instrument of due) {
      const symbol = instrument.symbol?.toUpperCase();
      if (!symbol) continue;
      try {
        const [annualResult, quarterlyResult] = await Promise.all([
          this.provider.getFundamentals(symbol, { period: "annual", limit: 5 }),
          this.provider.getFundamentals(symbol, { period: "quarterly", limit: 9 })
        ]);
        const providerProfile = annualResult.profile ?? quarterlyResult.profile;
        const profile: CompanyProfile | null = providerProfile
          ? { ...providerProfile, instrumentId: instrument.id }
          : null;
        const annualStatements: FinancialStatement[] = annualResult.statements.map((statement) => ({
          ...statement,
          instrumentId: instrument.id
        }));
        const quarterlyStatements: FinancialStatement[] = quarterlyResult.statements.map((statement) => ({
          ...statement,
          instrumentId: instrument.id
        }));
        const annualProviderRatios: FinancialRatio[] = annualResult.ratios.map((ratio) => ({
          ...ratio,
          instrumentId: instrument.id
        }));
        const quarterlyProviderRatios: FinancialRatio[] = quarterlyResult.ratios.map((ratio) => ({
          ...ratio,
          instrumentId: instrument.id
        }));
        const annualRatios = deriveMissingRatios({
          instrumentId: instrument.id,
          symbol,
          profile,
          statements: annualStatements,
          ratios: annualProviderRatios
        });
        const quarterlyRatios = deriveMissingRatios({
          instrumentId: instrument.id,
          symbol,
          profile,
          statements: quarterlyStatements,
          ratios: quarterlyProviderRatios
        });
        const statements = [...annualStatements, ...quarterlyStatements];
        const ratios = [...annualRatios, ...quarterlyRatios];

        if (profile) {
          await this.repository.upsertCompanyProfiles([profile]);
          profilesUpdated += 1;
        }
        await this.repository.upsertFinancialStatements(statements);
        await this.repository.upsertFinancialRatios(ratios);
        statementsUpdated += statements.length;
        ratiosUpdated += ratios.length;

        const score = this.scoringService.calculateScore({
          instrumentId: instrument.id,
          symbol,
          profile,
          ratios,
          statements
        });
        await this.repository.upsertFundamentalScores([score]);
        scoresUpdated += score.overallFundamentalScore == null ? 0 : 1;
        const trendResult = this.trendCalculationService.calculate({
          instrumentId: instrument.id,
          symbol,
          ratios,
          statements,
          scores: [score]
        });
        await this.repository.upsertFundamentalTrends(trendResult.trends);
        await this.repository.upsertFundamentalTrendSummaries([trendResult.summary]);
        trendsUpdated += trendResult.trends.length;
      } catch {
        failedSymbols.push(symbol);
      }
    }

    const status = failedSymbols.length === 0 ? "success" : due.length === failedSymbols.length ? "failed" : "partial_success";
    const message =
      due.length === 0
        ? "No fundamentals refresh due."
        : `Fundamentals refreshed for ${due.length - failedSymbols.length}/${due.length} stocks.`;
    await this.repository.insertRefreshLog({
      jobName: "fundamentals-refresh",
      startedAt,
      completedAt: new Date().toISOString(),
      status,
      stocksRequested: due.length,
      profilesUpdated,
      statementsUpdated,
      ratiosUpdated,
      scoresUpdated,
      failedSymbols,
      errorMessage: failedSymbols.length > 0 ? `${failedSymbols.length} symbols failed.` : null,
      metadata: {
        force: Boolean(options.force),
        requestedSymbol: options.symbol ?? null,
        staleAfterDays: this.config.staleAfterDays,
        provider: this.provider.name,
        trendsUpdated
      }
    });

    return {
      ok: status !== "failed",
      status,
      message,
      stocksRequested: due.length,
      profilesUpdated,
      statementsUpdated,
      ratiosUpdated,
      scoresUpdated,
      trendsUpdated,
      failedSymbols
    };
  }
}

export const fundamentalsRefreshInternals = {
  daysBetween,
  deriveMissingRatios
};
