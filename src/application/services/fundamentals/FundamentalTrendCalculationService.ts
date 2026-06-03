import type {
  FinancialPeriod,
  FinancialRatio,
  FinancialStatement,
  FundamentalScore,
  FundamentalTrend,
  FundamentalTrendDirection,
  FundamentalTrendMetricCategory,
  FundamentalTrendStrength,
  FundamentalTrendSummary
} from "@/domain/fundamentals/types";

type TrendInput = {
  instrumentId: string;
  symbol: string;
  ratios: FinancialRatio[];
  statements: FinancialStatement[];
  scores: FundamentalScore[];
};

type MetricDefinition = {
  name: string;
  category: FundamentalTrendMetricCategory;
  shortTerm?: (period: PeriodBundle) => number | null;
  longTerm?: (period: PeriodBundle) => number | null;
  statementGrowth?: (period: PeriodBundle) => number | null;
  lowerIsBetter?: boolean;
  formatter: "percent" | "ratio";
};

type PeriodBundle = {
  period: FinancialPeriod;
  fiscalYear: number | null;
  fiscalQuarter: number;
  reportDate: string;
  ratio: FinancialRatio | null;
  income: FinancialStatement | null;
  balance: FinancialStatement | null;
  cashFlow: FinancialStatement | null;
};

type SeriesPoint = {
  date: string;
  value: number;
};

type WindowAnalysis = {
  direction: FundamentalTrendDirection;
  strength: FundamentalTrendStrength;
  score: number | null;
  confidence: number;
  currentValue: number | null;
  previousValue: number | null;
  threePeriodAvg: number | null;
  fivePeriodAvg: number | null;
  periodsAnalyzed: number;
};

function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function numberFromUnknown(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function metadataNumber(source: Record<string, unknown> | undefined, keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = numberFromUnknown(source[key]);
    if (value != null) return value;
  }
  return null;
}

function currentAssets(period: PeriodBundle) {
  return metadataNumber(period.balance?.providerMetadata, ["totalCurrentAssets", "currentAssets"]);
}

function currentLiabilities(period: PeriodBundle) {
  return metadataNumber(period.balance?.providerMetadata, ["totalCurrentLiabilities", "currentLiabilities"]);
}

function interestExpense(period: PeriodBundle) {
  return metadataNumber(period.income?.providerMetadata, ["interestExpense", "interest_expense"]);
}

function investedCapital(period: PeriodBundle) {
  const equity = period.balance?.shareholdersEquity;
  const debt = period.balance?.totalDebt;
  const cash = period.balance?.cashAndEquivalents ?? 0;
  if (equity == null || debt == null) return null;
  return equity + debt - cash;
}

function growth(latest: number | null | undefined, previous: number | null | undefined) {
  if (latest == null || previous == null || previous === 0) return null;
  const value = (latest - previous) / Math.abs(previous);
  return Number.isFinite(value) ? value : null;
}

function avg(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = avg(values) ?? 0;
  const variance = avg(values.map((value) => (value - mean) ** 2)) ?? 0;
  return Math.sqrt(variance);
}

function keyFor(period: FinancialPeriod, fiscalYear: number | null, fiscalQuarter: number, reportDate: string | null) {
  return `${period}:${fiscalYear ?? reportDate?.slice(0, 4) ?? "unknown"}:${period === "quarterly" ? fiscalQuarter : 0}:${reportDate ?? ""}`;
}

function periodDate(item: { reportDate?: string | null; fiscalYear?: number | null; fiscalQuarter?: number | null }) {
  if (item.reportDate) return item.reportDate;
  const year = item.fiscalYear ?? new Date().getUTCFullYear();
  const quarter = item.fiscalQuarter ?? 0;
  if (quarter > 0) return `${year}-${String(quarter * 3).padStart(2, "0")}-01`;
  return `${year}-12-31`;
}

function bundlesFor(input: TrendInput, period: FinancialPeriod) {
  const byKey = new Map<string, PeriodBundle>();
  const ensure = (item: { period: FinancialPeriod; fiscalYear?: number | null; fiscalQuarter?: number; reportDate?: string | null }) => {
    const reportDate = periodDate(item);
    const key = keyFor(period, item.fiscalYear ?? null, item.fiscalQuarter ?? 0, reportDate);
    const existing = byKey.get(key);
    if (existing) return existing;
    const created: PeriodBundle = {
      period,
      fiscalYear: item.fiscalYear ?? null,
      fiscalQuarter: item.fiscalQuarter ?? 0,
      reportDate,
      ratio: null,
      income: null,
      balance: null,
      cashFlow: null
    };
    byKey.set(key, created);
    return created;
  };

  for (const ratio of input.ratios.filter((item) => item.period === period)) {
    ensure(ratio).ratio = ratio;
  }
  for (const statement of input.statements.filter((item) => item.period === period)) {
    const bundle = ensure(statement);
    if (statement.statementType === "income_statement") bundle.income = statement;
    if (statement.statementType === "balance_sheet") bundle.balance = statement;
    if (statement.statementType === "cash_flow") bundle.cashFlow = statement;
  }

  return Array.from(byKey.values()).sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

function seriesFrom(bundles: PeriodBundle[], selector: (bundle: PeriodBundle) => number | null, limit: number): SeriesPoint[] {
  return bundles
    .map((bundle) => ({ date: bundle.reportDate, value: selector(bundle) }))
    .filter((point): point is SeriesPoint => point.value != null && Number.isFinite(point.value))
    .slice(-limit);
}

function growthSeriesFromStatements(bundles: PeriodBundle[], selector: (bundle: PeriodBundle) => number | null, limit: number): SeriesPoint[] {
  const levels = bundles
    .map((bundle) => ({ date: bundle.reportDate, value: selector(bundle) }))
    .filter((point): point is SeriesPoint => point.value != null && Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  const growthPoints: SeriesPoint[] = [];
  for (let index = 1; index < levels.length; index += 1) {
    const calculated = growth(levels[index].value, levels[index - 1].value);
    if (calculated != null) growthPoints.push({ date: levels[index].date, value: calculated });
  }
  return growthPoints.slice(-limit);
}

function metricSeries(bundles: PeriodBundle[], metric: MetricDefinition, selector: ((bundle: PeriodBundle) => number | null) | undefined, limit: number) {
  const providerOrRatioSeries = selector ? seriesFrom(bundles, selector, limit) : [];
  if (providerOrRatioSeries.length >= 3 || !metric.statementGrowth) return providerOrRatioSeries;
  const derivedSeries = growthSeriesFromStatements(bundles, metric.statementGrowth, limit);
  return derivedSeries.length > providerOrRatioSeries.length ? derivedSeries : providerOrRatioSeries;
}

function inferDirection(values: number[], lowerIsBetter: boolean): FundamentalTrendDirection {
  if (values.length < 3) return "insufficient_data";
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAverage = avg(firstHalf) ?? latest;
  const secondAverage = avg(secondHalf) ?? latest;
  const delta = lowerIsBetter ? firstAverage - secondAverage : secondAverage - firstAverage;
  const latestDelta = lowerIsBetter ? previous - latest : latest - previous;
  const tolerance = Math.max(0.01, Math.abs(firstAverage) * 0.05);
  let directionChanges = 0;
  for (let index = 2; index < values.length; index += 1) {
    const priorMove = values[index - 1] - values[index - 2];
    const move = values[index] - values[index - 1];
    if (priorMove !== 0 && move !== 0 && Math.sign(priorMove) !== Math.sign(move)) directionChanges += 1;
  }
  const volatility = stdev(values);
  if (directionChanges >= 2 || volatility > Math.max(0.2, Math.abs(avg(values) ?? 0) * 0.6)) return "volatile";
  if (Math.abs(delta) <= tolerance && Math.abs(latestDelta) <= tolerance) return "stable";
  if (delta > tolerance && latestDelta >= -tolerance) return "improving";
  if (delta < -tolerance || latestDelta < -tolerance) return "deteriorating";
  return "stable";
}

function strengthFrom(values: number[], direction: FundamentalTrendDirection): FundamentalTrendStrength {
  if (direction === "insufficient_data") return "insufficient_data";
  if (direction === "stable" || direction === "mixed") return "weak";
  if (direction === "volatile") return "moderate";
  const first = values[0];
  const latest = values[values.length - 1];
  const magnitude = Math.abs(latest - first);
  if (magnitude >= 0.15) return "strong";
  if (magnitude >= 0.05) return "moderate";
  return "weak";
}

function scoreFrom(direction: FundamentalTrendDirection, strength: FundamentalTrendStrength) {
  if (direction === "insufficient_data") return null;
  if (direction === "improving") return strength === "strong" ? 90 : strength === "moderate" ? 74 : 66;
  if (direction === "stable") return 56;
  if (direction === "deteriorating") return strength === "strong" ? 18 : strength === "moderate" ? 34 : 42;
  if (direction === "volatile") return strength === "strong" ? 32 : 44;
  return 50;
}

function confidenceFrom(values: number[], direction: FundamentalTrendDirection) {
  if (values.length < 3) return 20;
  let confidence = values.length >= 5 ? 82 : 62;
  if (direction === "volatile") confidence -= 18;
  if (values.some((value) => !Number.isFinite(value))) confidence -= 20;
  return clamp(confidence);
}

function analyze(points: SeriesPoint[], lowerIsBetter = false): WindowAnalysis {
  const values = points.map((point) => point.value);
  const direction = inferDirection(values, lowerIsBetter);
  const strength = strengthFrom(values, direction);
  return {
    direction,
    strength,
    score: scoreFrom(direction, strength),
    confidence: confidenceFrom(values, direction),
    currentValue: values.at(-1) ?? null,
    previousValue: values.at(-2) ?? null,
    threePeriodAvg: avg(values.slice(-3)),
    fivePeriodAvg: avg(values.slice(-5)),
    periodsAnalyzed: values.length
  };
}

function combineDirection(shortTerm: WindowAnalysis, longTerm: WindowAnalysis): FundamentalTrendDirection {
  const usable = [shortTerm, longTerm].filter((item) => item.direction !== "insufficient_data");
  if (usable.length === 0) return "insufficient_data";
  if (usable.some((item) => item.direction === "volatile")) return "volatile";
  if (usable.length === 2 && usable[0].direction !== usable[1].direction) return "mixed";
  return usable[0].direction;
}

function weightedAverage(items: Array<{ value: number | null; weight: number }>) {
  const usable = items.filter((item) => item.value != null);
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;
  return usable.reduce((sum, item) => sum + Number(item.value) * item.weight, 0) / totalWeight;
}

function humanMetric(metricName: string) {
  return metricName.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: number | null, formatter: MetricDefinition["formatter"]) {
  if (value == null) return "not available";
  if (formatter === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

function explanationFor(metric: MetricDefinition, direction: FundamentalTrendDirection, windowLabel: string, value: number | null) {
  if (direction === "insufficient_data") return `Insufficient historical data is available to determine a reliable ${humanMetric(metric.name)} trend.`;
  if (direction === "improving") return `${humanMetric(metric.name)} is improving in the ${windowLabel} window, with the latest value at ${formatValue(value, metric.formatter)}.`;
  if (direction === "deteriorating") return `${humanMetric(metric.name)} is deteriorating in the ${windowLabel} window, with the latest value at ${formatValue(value, metric.formatter)}.`;
  if (direction === "volatile") return `${humanMetric(metric.name)} is volatile across the ${windowLabel} window, so confidence is reduced.`;
  if (direction === "mixed") return `${humanMetric(metric.name)} has mixed short-term and long-term signals.`;
  return `${humanMetric(metric.name)} is stable across the ${windowLabel} window.`;
}

function latestReportDate(input: TrendInput) {
  return (
    [...input.ratios.map((item) => item.reportDate), ...input.statements.map((item) => item.reportDate ?? "")]
      .filter(Boolean)
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10)
  );
}

function categoryAverage(trends: FundamentalTrend[], category: FundamentalTrendMetricCategory) {
  return weightedAverage(trends.filter((trend) => trend.metricCategory === category).map((trend) => ({ value: trend.overallTrendScore, weight: trend.overallConfidenceScore || 1 })));
}

function countByDirection(trends: FundamentalTrend[], direction: FundamentalTrendDirection) {
  return trends.filter((trend) => trend.overallTrendDirection === direction).length;
}

function buildWarnings(trends: FundamentalTrend[]) {
  const byName = new Map(trends.map((trend) => [trend.metricName, trend]));
  const warnings: string[] = [];
  const revenue = byName.get("revenue_growth");
  const eps = byName.get("eps_growth");
  const fcf = byName.get("free_cash_flow_growth");
  const margin = byName.get("operating_margin") ?? byName.get("net_margin");
  const debt = byName.get("debt_to_equity");
  const netIncome = byName.get("net_income_growth");
  const dilution = byName.get("dilution_trend");

  if (revenue?.overallTrendDirection === "deteriorating") warnings.push("Revenue growth trend is weakening.");
  if (eps?.overallTrendDirection === "deteriorating") warnings.push("EPS growth trend is weakening.");
  if (fcf?.overallTrendDirection === "deteriorating") warnings.push("Free cash flow growth trend is weakening.");
  if (margin?.overallTrendDirection === "deteriorating") warnings.push("Margins are compressing.");
  if (debt?.overallTrendDirection === "deteriorating") warnings.push("Leverage trend is rising.");
  if (revenue?.overallTrendDirection === "improving" && fcf?.overallTrendDirection === "deteriorating") warnings.push("Revenue is improving while free cash flow is weakening.");
  if (revenue?.overallTrendDirection === "improving" && margin?.overallTrendDirection === "deteriorating") warnings.push("Revenue is improving while margins are compressing.");
  if (debt?.overallTrendDirection === "deteriorating" && netIncome?.overallTrendDirection === "deteriorating") warnings.push("Leverage is rising while profitability is weakening.");
  if (eps?.overallTrendDirection === "improving" && netIncome?.overallTrendDirection === "deteriorating") warnings.push("EPS improvement may not be supported by net income growth.");
  if (eps?.overallTrendDirection === "improving" && dilution?.overallTrendDirection === "improving") warnings.push("EPS improvement may be helped by lower share count.");
  return warnings;
}

const metricDefinitions: MetricDefinition[] = [
  {
    name: "revenue_growth",
    category: "growth",
    shortTerm: (period) => period.ratio?.revenueGrowth ?? null,
    longTerm: (period) => period.ratio?.revenueGrowth ?? null,
    statementGrowth: (period) => period.income?.revenue ?? null,
    formatter: "percent"
  },
  {
    name: "eps_growth",
    category: "growth",
    shortTerm: (period) => period.ratio?.epsGrowth ?? null,
    longTerm: (period) => period.ratio?.epsGrowth ?? null,
    statementGrowth: (period) => period.income?.dilutedEps ?? period.income?.eps ?? null,
    formatter: "percent"
  },
  {
    name: "ebitda_growth",
    category: "growth",
    statementGrowth: (period) => period.income?.ebitda ?? null,
    formatter: "percent"
  },
  {
    name: "net_income_growth",
    category: "growth",
    shortTerm: (period) => period.ratio?.netIncomeGrowth ?? null,
    longTerm: (period) => period.ratio?.netIncomeGrowth ?? null,
    statementGrowth: (period) => period.income?.netIncome ?? null,
    formatter: "percent"
  },
  {
    name: "free_cash_flow_growth",
    category: "growth",
    shortTerm: (period) => period.ratio?.freeCashFlowGrowth ?? null,
    longTerm: (period) => period.ratio?.freeCashFlowGrowth ?? null,
    statementGrowth: (period) => period.cashFlow?.freeCashFlow ?? null,
    formatter: "percent"
  },
  {
    name: "gross_margin",
    category: "margin",
    shortTerm: (period) => period.ratio?.grossMargin ?? safeRatio(period.income?.grossProfit, period.income?.revenue),
    longTerm: (period) => period.ratio?.grossMargin ?? safeRatio(period.income?.grossProfit, period.income?.revenue),
    formatter: "percent"
  },
  {
    name: "operating_margin",
    category: "margin",
    shortTerm: (period) => period.ratio?.operatingMargin ?? safeRatio(period.income?.operatingIncome, period.income?.revenue),
    longTerm: (period) => period.ratio?.operatingMargin ?? safeRatio(period.income?.operatingIncome, period.income?.revenue),
    formatter: "percent"
  },
  {
    name: "net_margin",
    category: "margin",
    shortTerm: (period) => period.ratio?.netMargin ?? safeRatio(period.income?.netIncome, period.income?.revenue),
    longTerm: (period) => period.ratio?.netMargin ?? safeRatio(period.income?.netIncome, period.income?.revenue),
    formatter: "percent"
  },
  { name: "roe", category: "profitability", longTerm: (period) => period.ratio?.roe ?? safeRatio(period.income?.netIncome, period.balance?.shareholdersEquity), formatter: "percent" },
  { name: "roic", category: "profitability", longTerm: (period) => period.ratio?.roic ?? safeRatio(period.income?.operatingIncome, investedCapital(period)), formatter: "percent" },
  { name: "roa", category: "profitability", longTerm: (period) => period.ratio?.roa ?? safeRatio(period.income?.netIncome, period.balance?.totalAssets), formatter: "percent" },
  { name: "debt_to_equity", category: "balance_sheet", longTerm: (period) => period.ratio?.debtToEquity ?? safeRatio(period.balance?.totalDebt, period.balance?.shareholdersEquity), lowerIsBetter: true, formatter: "ratio" },
  { name: "current_ratio", category: "balance_sheet", longTerm: (period) => period.ratio?.currentRatio ?? safeRatio(currentAssets(period), currentLiabilities(period)), formatter: "ratio" },
  { name: "interest_coverage", category: "balance_sheet", longTerm: (period) => safeRatio(period.income?.operatingIncome, interestExpense(period)), formatter: "ratio" },
  { name: "fcf_conversion", category: "quality", longTerm: (period) => safeRatio(period.cashFlow?.freeCashFlow, period.income?.netIncome), formatter: "ratio" },
  { name: "free_cash_flow_margin", category: "quality", shortTerm: (period) => safeRatio(period.cashFlow?.freeCashFlow, period.income?.revenue), longTerm: (period) => safeRatio(period.cashFlow?.freeCashFlow, period.income?.revenue), formatter: "percent" },
  { name: "revenue_per_share_growth", category: "quality", statementGrowth: (period) => safeRatio(period.income?.revenue, period.income?.sharesOutstanding), formatter: "percent" },
  { name: "dilution_trend", category: "quality", longTerm: (period) => period.income?.sharesOutstanding ?? period.balance?.sharesOutstanding ?? null, lowerIsBetter: true, formatter: "ratio" }
];

export class FundamentalTrendCalculationService {
  calculate(input: TrendInput): { trends: FundamentalTrend[]; summary: FundamentalTrendSummary } {
    const quarterly = bundlesFor(input, "quarterly");
    const annual = bundlesFor(input, "annual");
    const asOfDate = latestReportDate(input);
    const trends = metricDefinitions.map((metric) => this.calculateMetric(input, metric, quarterly, annual, asOfDate));
    const summary = this.calculateSummary(input, trends, asOfDate);
    return { trends, summary };
  }

  private calculateMetric(input: TrendInput, metric: MetricDefinition, quarterly: PeriodBundle[], annual: PeriodBundle[], asOfDate: string): FundamentalTrend {
    const shortPoints = metricSeries(quarterly, metric, metric.shortTerm, 5);
    const longPoints = metricSeries(annual, metric, metric.longTerm, 5);
    const shortTerm = analyze(shortPoints, metric.lowerIsBetter);
    const longTerm = analyze(longPoints, metric.lowerIsBetter);
    const overallTrendDirection = combineDirection(shortTerm, longTerm);
    const overallTrendScore = weightedAverage([
      { value: shortTerm.score, weight: shortTerm.confidence * 0.4 },
      { value: longTerm.score, weight: longTerm.confidence * 0.6 }
    ]);
    const overallConfidenceScore = weightedAverage([
      { value: shortTerm.confidence, weight: shortTerm.periodsAnalyzed > 0 ? 0.4 : 0 },
      { value: longTerm.confidence, weight: longTerm.periodsAnalyzed > 0 ? 0.6 : 0 }
    ]) ?? 20;
    const primary = longTerm.direction !== "insufficient_data" ? longTerm : shortTerm;

    return {
      instrumentId: input.instrumentId,
      symbol: input.symbol,
      metricName: metric.name,
      metricCategory: metric.category,
      currentValue: primary.currentValue,
      previousValue: primary.previousValue,
      threePeriodAvg: primary.threePeriodAvg,
      fivePeriodAvg: primary.fivePeriodAvg,
      shortTermTrendDirection: shortTerm.direction,
      shortTermTrendStrength: shortTerm.strength,
      shortTermTrendScore: shortTerm.score,
      shortTermConfidenceScore: shortTerm.confidence,
      longTermTrendDirection: longTerm.direction,
      longTermTrendStrength: longTerm.strength,
      longTermTrendScore: longTerm.score,
      longTermConfidenceScore: longTerm.confidence,
      overallTrendDirection,
      overallTrendScore,
      overallConfidenceScore,
      periodsAnalyzed: Math.max(shortTerm.periodsAnalyzed, longTerm.periodsAnalyzed),
      shortTermPeriodsAnalyzed: shortTerm.periodsAnalyzed,
      longTermPeriodsAnalyzed: longTerm.periodsAnalyzed,
      asOfDate,
      explanation: explanationFor(metric, overallTrendDirection, longTerm.direction !== "insufficient_data" ? "long-term" : "short-term", primary.currentValue),
      inputsSnapshot: {
        shortTermDates: shortPoints.map((point) => point.date),
        longTermDates: longPoints.map((point) => point.date),
        lowerIsBetter: Boolean(metric.lowerIsBetter)
      }
    };
  }

  private calculateSummary(input: TrendInput, trends: FundamentalTrend[], asOfDate: string): FundamentalTrendSummary {
    const categoryWeights: Record<FundamentalTrendMetricCategory, number> = {
      growth: 0.35,
      margin: 0.25,
      profitability: 0.2,
      balance_sheet: 0.1,
      quality: 0.1
    };
    const categoryScores = {
      growth: categoryAverage(trends, "growth"),
      margin: categoryAverage(trends, "margin"),
      profitability: categoryAverage(trends, "profitability"),
      balanceSheet: categoryAverage(trends, "balance_sheet"),
      quality: categoryAverage(trends, "quality")
    };
    const overallTrendScore = weightedAverage([
      { value: categoryScores.growth, weight: categoryWeights.growth },
      { value: categoryScores.margin, weight: categoryWeights.margin },
      { value: categoryScores.profitability, weight: categoryWeights.profitability },
      { value: categoryScores.balanceSheet, weight: categoryWeights.balance_sheet },
      { value: categoryScores.quality, weight: categoryWeights.quality }
    ]);
    const directionalTrends = trends.filter((trend) => trend.overallTrendDirection !== "insufficient_data");
    const averageConfidence = avg(directionalTrends.map((trend) => trend.overallConfidenceScore)) ?? 20;
    const improving = countByDirection(trends, "improving");
    const deteriorating = countByDirection(trends, "deteriorating");
    const volatile = countByDirection(trends, "volatile");
    const stable = countByDirection(trends, "stable");
    const insufficient = countByDirection(trends, "insufficient_data");
    const overallTrendDirection =
      directionalTrends.length === 0
        ? "insufficient_data"
        : volatile > 0
          ? "volatile"
          : improving > deteriorating && improving >= stable
            ? "improving"
            : deteriorating > improving && deteriorating >= stable
              ? "deteriorating"
              : improving > 0 && deteriorating > 0
                ? "mixed"
                : "stable";
    const warnings = buildWarnings(trends);

    return {
      instrumentId: input.instrumentId,
      symbol: input.symbol,
      asOfDate,
      overallTrendScore,
      overallConfidenceScore: averageConfidence,
      overallTrendDirection,
      improvingMetricsCount: improving,
      deterioratingMetricsCount: deteriorating,
      stableMetricsCount: stable,
      volatileMetricsCount: volatile,
      insufficientDataMetricsCount: insufficient,
      growthTrendScore: categoryScores.growth,
      marginTrendScore: categoryScores.margin,
      profitabilityTrendScore: categoryScores.profitability,
      balanceSheetTrendScore: categoryScores.balanceSheet,
      qualityTrendScore: categoryScores.quality,
      warnings,
      explanation:
        overallTrendDirection === "insufficient_data"
          ? "Insufficient stored fundamentals history is available to calculate a reliable trend summary."
          : `${input.symbol} has an overall ${overallTrendDirection.replace("_", " ")} fundamental trend across ${directionalTrends.length} analyzed metrics.`,
      inputsSnapshot: {
        metricsAnalyzed: trends.length,
        categoryScores
      }
    };
  }
}

export const fundamentalTrendInternals = {
  analyze,
  bundlesFor,
  metricDefinitions,
  safeRatio,
  growth
};
