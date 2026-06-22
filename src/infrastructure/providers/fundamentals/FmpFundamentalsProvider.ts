import type {
  FundamentalsProvider,
  ProviderCompanyProfile,
  ProviderFinancialRatio,
  ProviderFinancialStatement
} from "@/application/ports/providers/FundamentalsProvider";
import type { FinancialPeriod, FinancialStatementType } from "@/domain/fundamentals/types";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const FMP_MAX_ATTEMPTS = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numberOrNull(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOrNull(value: unknown) {
  const raw = stringOrNull(value);
  return raw ? raw.slice(0, 10) : null;
}

function fiscalYearFromDate(date: string | null) {
  return date ? Number(date.slice(0, 4)) : new Date().getUTCFullYear();
}

function fiscalQuarterFromPeriod(period: FinancialPeriod, item: Record<string, unknown>) {
  if (period === "annual") return 0;
  const raw = stringOrNull(item.period) ?? stringOrNull(item.fiscalQuarter);
  const match = raw?.match(/Q([1-4])/i);
  return match ? Number(match[1]) : 0;
}

function normalizeFmpSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized === "BRK.B") return "BRK-B";
  return normalized;
}

async function fetchWithRetry(url: URL) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= FMP_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000)
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`FMP fundamentals request failed with status ${response.status}.`);
        if (attempt < FMP_MAX_ATTEMPTS) {
          await sleep(600 * attempt);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("FMP fundamentals request failed.");
      if (attempt < FMP_MAX_ATTEMPTS) {
        await sleep(600 * attempt);
        continue;
      }
    }
  }
  throw lastError ?? new Error("FMP fundamentals request failed.");
}

async function getJsonArray(path: string, symbol: string, apiKey: string, params: Record<string, string> = {}) {
  const url = new URL(`${FMP_BASE_URL}/${path}`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetchWithRetry(url);
  if (response.status === 402 || response.status === 403 || response.status === 404) return [];
  if (!response.ok) throw new Error(`FMP fundamentals request for ${symbol} failed with status ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    const errorMessage = payload && typeof payload === "object" && "Error Message" in payload ? String(payload["Error Message"]) : null;
    if (errorMessage) throw new Error(errorMessage);
    return [];
  }
  return payload as Record<string, unknown>[];
}

function normalizeProfile(symbol: string, item: Record<string, unknown> | undefined, provider: string): ProviderCompanyProfile | null {
  if (!item) return null;
  return {
    symbol,
    companyName: stringOrNull(item.companyName) ?? stringOrNull(item.companyNameSearch) ?? stringOrNull(item.name),
    sector: stringOrNull(item.sector),
    industry: stringOrNull(item.industry),
    country: stringOrNull(item.country),
    exchange: stringOrNull(item.exchangeShortName) ?? stringOrNull(item.exchange),
    currency: stringOrNull(item.currency),
    marketCap: numberOrNull(item.marketCap),
    beta: numberOrNull(item.beta),
    description: stringOrNull(item.description),
    website: stringOrNull(item.website),
    ceo: stringOrNull(item.ceo),
    ipoDate: dateOrNull(item.ipoDate),
    employees: numberOrNull(item.fullTimeEmployees ?? item.employees),
    lastRefreshedAt: new Date().toISOString(),
    provider,
    providerMetadata: item
  };
}

function normalizeStatement(
  symbol: string,
  item: Record<string, unknown>,
  provider: string,
  statementType: FinancialStatementType,
  period: FinancialPeriod
): ProviderFinancialStatement {
  const reportDate = dateOrNull(item.date ?? item.reportDate ?? item.fillingDate);
  return {
    symbol,
    statementType,
    period,
    fiscalYear: numberOrNull(item.calendarYear ?? item.fiscalYear) ?? fiscalYearFromDate(reportDate),
    fiscalQuarter: fiscalQuarterFromPeriod(period, item),
    reportDate,
    filingDate: dateOrNull(item.fillingDate ?? item.filingDate ?? item.acceptedDate),
    revenue: numberOrNull(item.revenue),
    grossProfit: numberOrNull(item.grossProfit),
    operatingIncome: numberOrNull(item.operatingIncome),
    ebitda: numberOrNull(item.ebitda),
    netIncome: numberOrNull(item.netIncome),
    eps: numberOrNull(item.eps),
    dilutedEps: numberOrNull(item.epsdiluted ?? item.dilutedEPS ?? item.dilutedEps),
    totalAssets: numberOrNull(item.totalAssets),
    totalLiabilities: numberOrNull(item.totalLiabilities),
    shareholdersEquity: numberOrNull(item.totalStockholdersEquity ?? item.shareholdersEquity),
    cashAndEquivalents: numberOrNull(item.cashAndCashEquivalents ?? item.cashAndEquivalents),
    totalDebt: numberOrNull(item.totalDebt),
    operatingCashFlow: numberOrNull(item.operatingCashFlow ?? item.netCashProvidedByOperatingActivities),
    capitalExpenditure: numberOrNull(item.capitalExpenditure ?? item.capitalExpenditures),
    freeCashFlow: numberOrNull(item.freeCashFlow),
    sharesOutstanding: numberOrNull(item.weightedAverageShsOutDil ?? item.weightedAverageShsOut ?? item.sharesOutstanding),
    provider,
    providerMetadata: item
  };
}

function fmpMetricLookupKey(item: Record<string, unknown>, period: FinancialPeriod) {
  const date = dateOrNull(item.date ?? item.reportDate);
  if (date) return date;
  const fiscalYear = numberOrNull(item.calendarYear ?? item.fiscalYear);
  if (fiscalYear == null) return null;
  return `${fiscalYear}|${period}`;
}

function buildKeyMetricsLookup(rows: Record<string, unknown>[], period: FinancialPeriod) {
  const lookup = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = fmpMetricLookupKey(row, period);
    if (key && !lookup.has(key)) lookup.set(key, row);
  }
  return lookup;
}

function normalizeRatio(
  symbol: string,
  item: Record<string, unknown>,
  provider: string,
  period: FinancialPeriod,
  keyMetric?: Record<string, unknown>
): ProviderFinancialRatio {
  const reportDate = dateOrNull(item.date ?? item.reportDate) ?? new Date().toISOString().slice(0, 10);
  return {
    symbol,
    period,
    fiscalYear: numberOrNull(item.calendarYear ?? item.fiscalYear) ?? fiscalYearFromDate(reportDate),
    fiscalQuarter: fiscalQuarterFromPeriod(period, item),
    reportDate,
    peRatio: numberOrNull(item.priceEarningsRatio ?? item.peRatio),
    forwardPe: numberOrNull(item.forwardPE ?? item.forwardPe),
    priceToSales: numberOrNull(item.priceToSalesRatio ?? item.priceToSales),
    priceToBook: numberOrNull(item.priceToBookRatio ?? item.priceToBook),
    evToEbitda: numberOrNull(item.enterpriseValueMultiple ?? item.evToEbitda),
    evToSales: numberOrNull(item.evToSales),
    grossMargin: numberOrNull(item.grossProfitMargin ?? item.grossMargin),
    operatingMargin: numberOrNull(item.operatingProfitMargin ?? item.operatingMargin),
    netMargin: numberOrNull(item.netProfitMargin ?? item.netMargin),
    roe: numberOrNull(item.returnOnEquity ?? item.roe),
    roic: numberOrNull(item.returnOnInvestedCapital ?? item.roic ?? keyMetric?.returnOnInvestedCapital ?? keyMetric?.roic),
    roa: numberOrNull(item.returnOnAssets ?? item.roa),
    debtToEquity: numberOrNull(item.debtEquityRatio ?? item.debtToEquity),
    netDebtToEbitda: numberOrNull(item.netDebtToEBITDA ?? item.netDebtToEbitda),
    currentRatio: numberOrNull(item.currentRatio),
    quickRatio: numberOrNull(item.quickRatio),
    freeCashFlowYield: numberOrNull(item.freeCashFlowYield),
    revenueGrowth: numberOrNull(item.revenueGrowth),
    epsGrowth: numberOrNull(item.epsgrowth ?? item.epsGrowth),
    netIncomeGrowth: numberOrNull(item.netIncomeGrowth),
    freeCashFlowGrowth: numberOrNull(item.freeCashFlowGrowth),
    provider,
    providerMetadata: item
  };
}

export class FmpFundamentalsProvider implements FundamentalsProvider {
  readonly name = "financial_modeling_prep";

  async getFundamentals(symbol: string, options: { period?: FinancialPeriod; limit?: number } = {}) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) throw new Error("FMP_API_KEY is not configured.");
    const normalizedSymbol = normalizeFmpSymbol(symbol);
    const period = options.period ?? "annual";
    const limit = String(options.limit ?? 5);

    const [profileRows, incomeRows, balanceRows, cashFlowRows, ratioRows, keyMetricRows] = await Promise.all([
      getJsonArray("profile", normalizedSymbol, apiKey),
      getJsonArray("income-statement", normalizedSymbol, apiKey, { period, limit }),
      getJsonArray("balance-sheet-statement", normalizedSymbol, apiKey, { period, limit }),
      getJsonArray("cash-flow-statement", normalizedSymbol, apiKey, { period, limit }),
      getJsonArray("ratios", normalizedSymbol, apiKey, { period, limit }),
      getJsonArray("key-metrics", normalizedSymbol, apiKey, { period, limit })
    ]);
    const keyMetricsByDate = buildKeyMetricsLookup(keyMetricRows, period);

    return {
      profile: normalizeProfile(normalizedSymbol, profileRows[0], this.name),
      statements: [
        ...incomeRows.map((item) => normalizeStatement(normalizedSymbol, item, this.name, "income_statement", period)),
        ...balanceRows.map((item) => normalizeStatement(normalizedSymbol, item, this.name, "balance_sheet", period)),
        ...cashFlowRows.map((item) => normalizeStatement(normalizedSymbol, item, this.name, "cash_flow", period))
      ],
      ratios: ratioRows.map((item) => normalizeRatio(
        normalizedSymbol,
        item,
        this.name,
        period,
        keyMetricsByDate.get(fmpMetricLookupKey(item, period) ?? "")
      ))
    };
  }
}

export const fmpFundamentalsInternals = {
  normalizeFmpSymbol,
  normalizeProfile,
  normalizeStatement,
  normalizeRatio,
  buildKeyMetricsLookup,
  fmpMetricLookupKey,
  numberOrNull
};
