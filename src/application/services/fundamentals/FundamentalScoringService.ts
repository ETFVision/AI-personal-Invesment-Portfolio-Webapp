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
  if (value == null || value < 0) return null;
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

    const growthInputs = [
      latestRatio?.revenueGrowth,
      latestRatio?.epsGrowth,
      latestRatio?.netIncomeGrowth,
      latestRatio?.freeCashFlowGrowth
    ];
    const profitabilityInputs = [
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
    const balanceInputs = [
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
    const cashFlowScore = average(cashFlowInputs);
    const qualityScore = average([
      profitabilityScore,
      cashFlowScore,
      balanceSheetScore,
      scoreReturn(latestRatio?.roic ?? null),
      scoreMargin(latestRatio?.operatingMargin ?? null)
    ]);
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

    const availableInputs =
      nonNullCount(growthInputs) +
      nonNullCount([
        latestRatio?.grossMargin,
        latestRatio?.operatingMargin,
        latestRatio?.netMargin,
        latestRatio?.roe,
        latestRatio?.roic,
        latestRatio?.roa,
        latestRatio?.peRatio,
        latestRatio?.priceToSales,
        latestRatio?.debtToEquity,
        latestRatio?.currentRatio,
        cashFlow?.operatingCashFlow,
        cashFlow?.freeCashFlow
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
  qualityAdjustedValuationScore,
  FUNDAMENTAL_SCORE_WEIGHTS
};
