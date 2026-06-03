import type { Instrument } from "@/domain/universe/types";

export type FinancialStatementType = "income_statement" | "balance_sheet" | "cash_flow";
export type FinancialPeriod = "annual" | "quarterly";
export type FundamentalsRefreshStatus = "success" | "partial_success" | "failed";
export type FundamentalTrendDirection =
  | "accelerating"
  | "improving"
  | "rebounding"
  | "stable"
  | "decelerating"
  | "deteriorating"
  | "volatile"
  | "mixed"
  | "insufficient_data"
  | "not_applicable";
export type FundamentalTrendStrength = "weak" | "moderate" | "strong" | "insufficient_data" | "not_applicable";
export type FundamentalTrendMetricCategory = "growth" | "margin" | "profitability" | "balance_sheet" | "quality";

export type CompanyProfile = {
  id?: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  marketCap: number | null;
  beta: number | null;
  description: string | null;
  website: string | null;
  ceo: string | null;
  ipoDate: string | null;
  employees: number | null;
  lastRefreshedAt: string | null;
  provider: string;
  providerMetadata: Record<string, unknown>;
};

export type FinancialStatement = {
  id?: string;
  instrumentId: string;
  symbol: string;
  statementType: FinancialStatementType;
  period: FinancialPeriod;
  fiscalYear: number;
  fiscalQuarter: number;
  reportDate: string | null;
  filingDate: string | null;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  eps: number | null;
  dilutedEps: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  shareholdersEquity: number | null;
  cashAndEquivalents: number | null;
  totalDebt: number | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  sharesOutstanding: number | null;
  provider: string;
  providerMetadata: Record<string, unknown>;
};

export type FinancialRatio = {
  id?: string;
  instrumentId: string;
  symbol: string;
  period: FinancialPeriod;
  fiscalYear: number | null;
  fiscalQuarter: number;
  reportDate: string;
  peRatio: number | null;
  forwardPe: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  evToSales: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
  debtToEquity: number | null;
  netDebtToEbitda: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  freeCashFlowYield: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  netIncomeGrowth: number | null;
  freeCashFlowGrowth: number | null;
  provider: string;
  providerMetadata: Record<string, unknown>;
};

export type FundamentalScore = {
  id?: string;
  instrumentId: string;
  symbol: string;
  asOfDate: string;
  growthScore: number | null;
  profitabilityScore: number | null;
  valuationScore: number | null;
  balanceSheetScore: number | null;
  cashFlowScore: number | null;
  qualityScore: number | null;
  overallFundamentalScore: number | null;
  scoreConfidence: number;
  explanation: string;
  inputsSnapshot: Record<string, unknown>;
};

export type FundamentalTrend = {
  id?: string;
  instrumentId: string;
  symbol: string;
  metricName: string;
  metricCategory: FundamentalTrendMetricCategory;
  currentValue: number | null;
  previousValue: number | null;
  threePeriodAvg: number | null;
  fivePeriodAvg: number | null;
  shortTermTrendDirection: FundamentalTrendDirection;
  shortTermTrendStrength: FundamentalTrendStrength;
  shortTermTrendScore: number | null;
  shortTermConfidenceScore: number;
  longTermTrendDirection: FundamentalTrendDirection;
  longTermTrendStrength: FundamentalTrendStrength;
  longTermTrendScore: number | null;
  longTermConfidenceScore: number;
  overallTrendDirection: FundamentalTrendDirection;
  overallTrendScore: number | null;
  overallConfidenceScore: number;
  periodsAnalyzed: number;
  shortTermPeriodsAnalyzed: number;
  longTermPeriodsAnalyzed: number;
  displayPeriod: FinancialPeriod | null;
  displayWindow: "short_term" | "long_term" | null;
  asOfDate: string;
  explanation: string;
  inputsSnapshot: Record<string, unknown>;
};

export type FundamentalTrendSummary = {
  id?: string;
  instrumentId: string;
  symbol: string;
  asOfDate: string;
  overallTrendScore: number | null;
  overallConfidenceScore: number;
  overallTrendDirection: FundamentalTrendDirection;
  improvingMetricsCount: number;
  deterioratingMetricsCount: number;
  stableMetricsCount: number;
  volatileMetricsCount: number;
  insufficientDataMetricsCount: number;
  growthTrendScore: number | null;
  marginTrendScore: number | null;
  profitabilityTrendScore: number | null;
  balanceSheetTrendScore: number | null;
  qualityTrendScore: number | null;
  warnings: string[];
  explanation: string;
  inputsSnapshot: Record<string, unknown>;
};

export type FundamentalsRefreshLog = {
  id?: string;
  jobName: string;
  startedAt: string;
  completedAt: string | null;
  status: FundamentalsRefreshStatus;
  stocksRequested: number;
  profilesUpdated: number;
  statementsUpdated: number;
  ratiosUpdated: number;
  scoresUpdated: number;
  failedSymbols: string[];
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

export type FundamentalsSummaryRow = {
  instrument: Instrument;
  profile: CompanyProfile | null;
  latestRatio: FinancialRatio | null;
  latestScore: FundamentalScore | null;
  latestTrendSummary: FundamentalTrendSummary | null;
  statementCount: number;
  missingDataWarnings: string[];
};

export type FundamentalsDetail = FundamentalsSummaryRow & {
  statements: FinancialStatement[];
  ratios: FinancialRatio[];
  scores: FundamentalScore[];
  trends: FundamentalTrend[];
  trendSummary: FundamentalTrendSummary | null;
};
