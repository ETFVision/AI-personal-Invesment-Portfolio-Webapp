import type { CompanyProfile, FinancialRatio, FinancialStatement, FundamentalScore } from "@/domain/fundamentals/types";

export const FUNDAMENTAL_SCORE_WEIGHTS = {
  growth: 0.2,
  profitability: 0.2,
  valuation: 0.2,
  balanceSheet: 0.15,
  cashFlow: 0.15,
  quality: 0.1
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function scorePositivePercent(value: number | null, neutral = 0.05, excellent = 0.3) {
  if (value == null) return null;
  if (value <= -0.1) return 10;
  if (value <= neutral) return clamp(35 + (value + 0.1) / (neutral + 0.1) * 15);
  return clamp(50 + (value - neutral) / (excellent - neutral) * 50);
}

function scoreMargin(value: number | null, weak = 0.05, strong = 0.35) {
  if (value == null) return null;
  return clamp((value - weak) / (strong - weak) * 70 + 25);
}

function scoreReturn(value: number | null, weak = 0.03, strong = 0.25) {
  if (value == null) return null;
  return clamp((value - weak) / (strong - weak) * 75 + 20);
}

function scoreLowerBetter(value: number | null, excellent: number, poor: number) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0 && excellent >= 0) return null;
  return clamp(100 - (value - excellent) / (poor - excellent) * 80);
}

function scoreHigherBetter(value: number | null, poor: number, excellent: number) {
  if (value == null) return null;
  return clamp((value - poor) / (excellent - poor) * 80 + 10);
}

function isQualityGrowthSector(profile: CompanyProfile | null) {
  const text = `${profile?.sector ?? ""} ${profile?.industry ?? ""}`.toLowerCase();
  return [
    "technology",
    "communication",
    "semiconductor",
    "software",
    "internet",
    "healthcare",
    "biotechnology",
    "pharmaceutical"
  ].some((term) => text.includes(term));
}

function isFinancialSector(profile: CompanyProfile | null): boolean {
  const sector = (profile?.sector ?? "").toLowerCase();
  const industry = (profile?.industry ?? "").toLowerCase();
  const isFinancialSectorGate = sector.includes("financial");
  if (!isFinancialSectorGate || !industry) return false;

  return [
    "bank",
    "capital markets",
    "broker",
    "broker-dealer",
    "insurance",
    "thrifts",
    "mortgage finance"
  ].some((term) => industry.includes(term));
}

function qualityAdjustedValuationScore(input: {
  rawValuationScore: number | null;
  growthScore: number | null;
  profitabilityScore: number | null;
  cashFlowScore: number | null;
  qualityScore: number | null;
  profile: CompanyProfile | null;
}) {
  if (input.rawValuationScore == null) return null;
  const qualityComposite = average([
    input.growthScore,
    input.profitabilityScore,
    input.cashFlowScore,
    input.qualityScore
  ]);
  const isLargeCap = (input.profile?.marketCap ?? 0) >= 50_000_000_000;
  const isQualityGrowth = isLargeCap && isQualityGrowthSector(input.profile) && (qualityComposite ?? 0) >= 70;
  if (!isQualityGrowth || input.rawValuationScore >= 55) return input.rawValuationScore;

  const premiumTolerance =
    (qualityComposite ?? 0) >= 85 ? 22 :
    (qualityComposite ?? 0) >= 78 ? 17 :
    12;
  const growthBonus = (input.growthScore ?? 0) >= 70 ? 4 : 0;
  const adjusted = input.rawValuationScore + premiumTolerance + growthBonus;
  return clamp(Math.max(adjusted, 28), 0, 55);
}

function latestStatement(statements: FinancialStatement[], type: FinancialStatement["statementType"]) {
  return statements
    .filter((statement) => statement.statementType === type)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""))[0] ?? null;
}

function nonNullCount(values: Array<number | null | undefined>) {
  return values.filter((value) => typeof value === "number" && Number.isFinite(value)).length;
}

function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean == null) return null;
  const variance = average(values.map((value) => (value - mean) ** 2));
  return variance == null ? null : Math.sqrt(variance);
}

function coefficientOfVariation(values: number[]) {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean == null || Math.abs(mean) < 0.01) return null;
  const deviation = standardDeviation(values);
  return deviation == null ? null : deviation / Math.abs(mean);
}

function latestStatementsByPeriod(statements: FinancialStatement[], type: FinancialStatement["statementType"]) {
  return statements
    .filter((statement) => statement.statementType === type && statement.period === "annual")
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""));
}

function marginSeries(ratios: FinancialRatio[], statements: FinancialStatement[]) {
  const valuesByDate = new Map<string, number[]>();
  for (const ratio of ratios.filter((item) => item.period === "annual")) {
    const values = [ratio.operatingMargin, ratio.netMargin].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (values.length > 0) valuesByDate.set(ratio.reportDate, values);
  }
  for (const statement of latestStatementsByPeriod(statements, "income_statement")) {
    const date = statement.reportDate ?? `${statement.fiscalYear}-12-31`;
    const values = [
      safeRatio(statement.operatingIncome, statement.revenue),
      safeRatio(statement.netIncome, statement.revenue)
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (values.length > 0 && !valuesByDate.has(date)) valuesByDate.set(date, values);
  }
  return Array.from(valuesByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, values]) => average(values))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .slice(-5);
}

function latestAnnualRatioAverage(ratios: FinancialRatio[], selector: (ratio: FinancialRatio) => number | null) {
  const values = ratios
    .filter((ratio) => ratio.period === "annual")
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .slice(0, 5)
    .map(selector)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return average(values);
}

function latestShareCount(statements: FinancialStatement[]) {
  return statements
    .filter((statement) => statement.period === "annual" && statement.sharesOutstanding != null && statement.sharesOutstanding > 0)
    .sort((a, b) => (b.reportDate ?? "").localeCompare(a.reportDate ?? ""));
}

function cashConversionRatio(income: FinancialStatement | null, cashFlow: FinancialStatement | null, balanceSheet: FinancialStatement | null) {
  const operatingCashFlow = cashFlow?.operatingCashFlow ?? null;
  const netIncome = income?.netIncome ?? null;
  const direct = netIncome != null && netIncome > 0 ? safeRatio(operatingCashFlow, netIncome) : null;
  if (direct != null) return direct;
  if (operatingCashFlow == null || netIncome == null || balanceSheet?.totalAssets == null || balanceSheet.totalAssets <= 0) return null;
  const accrualAdjusted = 1 - (netIncome - operatingCashFlow) / balanceSheet.totalAssets;
  return Number.isFinite(accrualAdjusted) ? accrualAdjusted : null;
}

function shareCountGrowth(statements: FinancialStatement[]) {
  const series = latestShareCount(statements);
  const latest = series[0]?.sharesOutstanding ?? null;
  const previous = series[1]?.sharesOutstanding ?? null;
  return safeRatio(latest != null && previous != null ? latest - previous : null, previous);
}

function weightedAvailableAverage(items: Array<{ score: number | null; weight: number }>) {
  const available = items.filter((item): item is { score: number; weight: number } => item.score != null);
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;
  return available.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
}

function calculateQualityScore(input: {
  ratios: FinancialRatio[];
  statements: FinancialStatement[];
  income: FinancialStatement | null;
  cashFlow: FinancialStatement | null;
  balanceSheet: FinancialStatement | null;
  isFinancial?: boolean;
}) {
  const margins = marginSeries(input.ratios, input.statements);
  const earningsStabilityCov = coefficientOfVariation(margins);
  const cashConversion = input.isFinancial ? null : cashConversionRatio(input.income, input.cashFlow, input.balanceSheet);
  const averageRoic = input.isFinancial ? null : latestAnnualRatioAverage(input.ratios, (ratio) => ratio.roic);
  const shareGrowth = shareCountGrowth(input.statements);
  const signals = {
    earningsStability: {
      value: earningsStabilityCov,
      score: scoreLowerBetter(earningsStabilityCov, 0.10, 0.50),
      weight: 0.3
    },
    cashConversion: {
      value: cashConversion,
      score: input.isFinancial ? null : scoreHigherBetter(cashConversion, 0.6, 1.1),
      weight: 0.3
    },
    roicDurability: {
      value: averageRoic,
      score: input.isFinancial ? null : scoreReturn(averageRoic, 0.06, 0.20),
      weight: 0.25
    },
    capitalDiscipline: {
      value: shareGrowth,
      score: scoreLowerBetter(shareGrowth, -0.02, 0.10),
      weight: 0.15
    }
  };
  return {
    score: weightedAvailableAverage(Object.values(signals)),
    signals,
    marginObservations: margins
  };
}

export class FundamentalScoringService {
  calculateScore(input: {
    instrumentId: string;
    symbol: string;
    profile: CompanyProfile | null;
    ratios: FinancialRatio[];
    statements: FinancialStatement[];
    asOfDate?: string;
  }): FundamentalScore {
    const latestRatio = [...input.ratios].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0] ?? null;
    const income = latestStatement(input.statements, "income_statement");
    const cashFlow = latestStatement(input.statements, "cash_flow");
    const balanceSheet = latestStatement(input.statements, "balance_sheet");
    const isFinancial = isFinancialSector(input.profile);

    const growthInputs = [
      latestRatio?.revenueGrowth,
      latestRatio?.epsGrowth,
      latestRatio?.netIncomeGrowth,
      latestRatio?.freeCashFlowGrowth
    ];
    const profitabilityInputs = isFinancial
      ? [
          scoreMargin(latestRatio?.operatingMargin ?? null, 0.05, 0.35),
          scoreMargin(latestRatio?.netMargin ?? null, 0.03, 0.25),
          scoreReturn(latestRatio?.roe ?? null),
          scoreReturn(latestRatio?.roic ?? null),
          scoreReturn(latestRatio?.roa ?? null, 0.005, 0.02)
        ]
      : [
          scoreMargin(latestRatio?.grossMargin ?? null, 0.15, 0.65),
          scoreMargin(latestRatio?.operatingMargin ?? null, 0.05, 0.35),
          scoreMargin(latestRatio?.netMargin ?? null, 0.03, 0.25),
          scoreReturn(latestRatio?.roe ?? null),
          scoreReturn(latestRatio?.roic ?? null),
          scoreReturn(latestRatio?.roa ?? null, 0.02, 0.15)
        ];
    const valuationInputs = [
      scoreLowerBetter(latestRatio?.peRatio ?? null, 12, 60),
      scoreLowerBetter(latestRatio?.forwardPe ?? null, 12, 55),
      scoreLowerBetter(latestRatio?.priceToSales ?? null, 2, 20),
      scoreLowerBetter(latestRatio?.priceToBook ?? null, 1.5, 15),
      scoreLowerBetter(latestRatio?.evToEbitda ?? null, 8, 35),
      scoreHigherBetter(latestRatio?.freeCashFlowYield ?? null, 0, 0.08)
    ];
    const balanceInputs = isFinancial
      ? [
          scoreReturn(latestRatio?.roe ?? null, 0.06, 0.18),
          scoreReturn(latestRatio?.roa ?? null, 0.004, 0.015),
          scoreLowerBetter(latestRatio?.priceToBook ?? null, 1.0, 3.5)
        ]
      : [
          scoreLowerBetter(latestRatio?.debtToEquity ?? null, 0.2, 3),
          scoreLowerBetter(latestRatio?.netDebtToEbitda ?? null, 0.5, 5),
          scoreHigherBetter(latestRatio?.currentRatio ?? null, 0.7, 2.5),
          scoreHigherBetter(latestRatio?.quickRatio ?? null, 0.5, 2),
          scoreHigherBetter(balanceSheet?.cashAndEquivalents && balanceSheet?.totalDebt ? balanceSheet.cashAndEquivalents / Math.max(balanceSheet.totalDebt, 1) : null, 0.05, 1)
        ];
    const freeCashFlowMargin =
      cashFlow?.freeCashFlow != null && income?.revenue ? cashFlow.freeCashFlow / income.revenue : null;
    const cashFlowInputs = [
      scoreHigherBetter(cashFlow?.operatingCashFlow ?? null, 0, Math.max(income?.revenue ?? 1, 1) * 0.25),
      scoreHigherBetter(cashFlow?.freeCashFlow ?? null, 0, Math.max(income?.revenue ?? 1, 1) * 0.2),
      scoreMargin(freeCashFlowMargin, 0, 0.25),
      scorePositivePercent(latestRatio?.freeCashFlowGrowth ?? null, 0.03, 0.25)
    ];

    const growthScore = average(growthInputs.map((value) => scorePositivePercent(value ?? null)));
    const profitabilityScore = average(profitabilityInputs);
    const rawValuationScore = average(valuationInputs);
    const balanceSheetScore = average(balanceInputs);
    const cashFlowScore = isFinancial ? null : average(cashFlowInputs);
    const quality = calculateQualityScore({
      ratios: input.ratios,
      statements: input.statements,
      income,
      cashFlow,
      balanceSheet,
      isFinancial
    });
    const qualityScore = quality.score;
    const valuationScore = qualityAdjustedValuationScore({
      rawValuationScore,
      growthScore,
      profitabilityScore,
      cashFlowScore,
      qualityScore,
      profile: input.profile
    });

    const weightedCandidates: Array<{ score: number | null; weight: number }> = [
      { score: growthScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.growth },
      { score: profitabilityScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.profitability },
      { score: valuationScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.valuation },
      { score: balanceSheetScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.balanceSheet },
      { score: cashFlowScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.cashFlow },
      { score: qualityScore, weight: FUNDAMENTAL_SCORE_WEIGHTS.quality }
    ];
    const weightedInputs = weightedCandidates.filter((item): item is { score: number; weight: number } => item.score != null);
    const totalWeight = weightedInputs.reduce((sum, item) => sum + item.weight, 0);
    const overallFundamentalScore =
      totalWeight === 0 ? null : weightedInputs.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;

    const availableInputs = nonNullCount([
      ...growthInputs,
      latestRatio?.grossMargin,
      latestRatio?.operatingMargin,
      latestRatio?.netMargin,
      latestRatio?.roe,
      latestRatio?.peRatio,
      latestRatio?.priceToSales,
      latestRatio?.debtToEquity,
      latestRatio?.currentRatio,
      cashFlow?.operatingCashFlow,
      cashFlow?.freeCashFlow,
      quality.signals.earningsStability.score,
      quality.signals.roicDurability.score
    ]);
    const scoreConfidence = clamp((availableInputs / 16) * 100);
    const explanation =
      overallFundamentalScore == null
        ? "Insufficient normalized fundamentals to calculate a reliable score."
        : `Deterministic fundamentals score from growth, profitability, quality-adjusted valuation, balance sheet, cash flow, and quality inputs.`;

    return {
      instrumentId: input.instrumentId,
      symbol: input.symbol,
      asOfDate: input.asOfDate ?? new Date().toISOString().slice(0, 10),
      growthScore,
      profitabilityScore,
      valuationScore,
      balanceSheetScore,
      cashFlowScore,
      qualityScore,
      overallFundamentalScore,
      scoreConfidence,
      explanation,
      inputsSnapshot: {
        profile: input.profile,
        latestRatio,
        latestIncomeStatement: income,
        latestCashFlowStatement: cashFlow,
        latestBalanceSheet: balanceSheet,
        rawValuationScore,
        valuationAdjustment: rawValuationScore == null || valuationScore == null ? null : valuationScore - rawValuationScore,
        qualitySignals: quality.signals,
        qualityMarginObservations: quality.marginObservations,
        weights: FUNDAMENTAL_SCORE_WEIGHTS
      }
    };
  }
}

export const fundamentalScoringInternals = {
  scorePositivePercent,
  scoreLowerBetter,
  scoreHigherBetter,
  scoreMargin,
  scoreReturn,
  calculateQualityScore,
  isFinancialSector,
  qualityAdjustedValuationScore,
  FUNDAMENTAL_SCORE_WEIGHTS
};
