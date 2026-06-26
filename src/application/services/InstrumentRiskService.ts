import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { Instrument, InstrumentPrice, InstrumentRiskMetric } from "@/domain/universe/types";

function dailyReturns(series: InstrumentPrice[]) {
  const sorted = series
    .filter((point) => Number.isFinite(point.closePrice) && point.closePrice > 0)
    .slice()
    .sort((a, b) => a.priceDate.localeCompare(b.priceDate));
  const returns: Array<{ date: string; value: number }> = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current || previous.closePrice <= 0) continue;
    returns.push({ date: current.priceDate, value: current.closePrice / previous.closePrice - 1 });
  }
  return returns;
}

function sampleStdDev(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function annualizedVolatility(values: number[], minimumValues = 2) {
  if (values.length < minimumValues) return null;
  const stdDev = sampleStdDev(values);
  return stdDev == null ? null : stdDev * Math.sqrt(252);
}

function downsideVolatility(values: number[], minimumValues = 2) {
  const negative = values.filter((value) => value < 0);
  return annualizedVolatility(negative, minimumValues);
}

function windowValues(returns: Array<{ date: string; value: number }>, days: number) {
  return returns.slice(Math.max(0, returns.length - days)).map((item) => item.value);
}

function volatilityTrend(vol30: number | null, vol90: number | null): InstrumentRiskMetric["volatilityTrend"] {
  if (vol30 == null || vol90 == null || vol90 === 0) return "insufficient_data";
  if (vol30 > vol90 * 1.15) return "rising";
  if (vol30 < vol90 * 0.85) return "falling";
  return "stable";
}

function volatilityBucket(volatility: number | null): InstrumentRiskMetric["volatilityBucket"] {
  if (volatility == null) return "insufficient_data";
  if (volatility < 0.12) return "low";
  if (volatility < 0.25) return "medium";
  if (volatility < 0.45) return "high";
  return "very_high";
}

function drawdownBucket(maxDrawdown: number | null): InstrumentRiskMetric["drawdownBucket"] {
  if (maxDrawdown == null) return "insufficient_data";
  const drawdown = Math.abs(maxDrawdown);
  if (drawdown < 0.1) return "low";
  if (drawdown < 0.2) return "moderate";
  if (drawdown < 0.35) return "elevated";
  return "severe";
}

function riskBucket(score: number | null): InstrumentRiskMetric["riskBucket"] {
  if (score == null) return "insufficient_data";
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "very_high";
}

function drawdownMetrics(series: InstrumentPrice[]) {
  let peakPrice = -Infinity;
  let latestPeakDate: string | null = null;
  let maxDrawdown: number | null = null;
  let currentDrawdown: number | null = null;

  for (const point of series) {
    if (!Number.isFinite(point.closePrice) || point.closePrice <= 0) continue;
    if (point.closePrice >= peakPrice) {
      peakPrice = point.closePrice;
      latestPeakDate = point.priceDate;
    }
    const drawdown = peakPrice > 0 ? point.closePrice / peakPrice - 1 : null;
    if (drawdown != null && (maxDrawdown == null || drawdown < maxDrawdown)) {
      maxDrawdown = drawdown;
    }
    currentDrawdown = drawdown;
  }

  const latestDate = series.at(-1)?.priceDate ?? null;
  const drawdownDurationDays =
    currentDrawdown != null && currentDrawdown < 0 && latestPeakDate && latestDate
      ? Math.max(0, Math.round((new Date(`${latestDate}T00:00:00.000Z`).getTime() - new Date(`${latestPeakDate}T00:00:00.000Z`).getTime()) / 86_400_000))
      : 0;

  return { currentDrawdown, maxDrawdown, drawdownDurationDays };
}

function periodDrawdownMetrics(series: InstrumentPrice[], days: number, toleranceDays: number) {
  const latestDate = series.at(-1)?.priceDate ?? null;
  if (!latestDate) return { currentDrawdown: null, maxDrawdown: null };
  const latestTime = new Date(`${latestDate}T00:00:00.000Z`).getTime();
  const earliestTime = new Date(`${series[0]?.priceDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(earliestTime) || latestTime - earliestTime < (days - toleranceDays) * 86_400_000) {
    return { currentDrawdown: null, maxDrawdown: null };
  }
  const periodSeries = series.filter((point) => {
    const pointTime = new Date(`${point.priceDate}T00:00:00.000Z`).getTime();
    return Number.isFinite(pointTime) && latestTime - pointTime <= days * 86_400_000;
  });
  const drawdown = drawdownMetrics(periodSeries);
  return {
    currentDrawdown: drawdown.currentDrawdown,
    maxDrawdown: drawdown.maxDrawdown
  };
}

function periodReturnValues(returns: Array<{ date: string; value: number }>, days: number, toleranceDays: number) {
  const latestDate = returns.at(-1)?.date ?? null;
  if (!latestDate) return [];
  const latestTime = new Date(`${latestDate}T00:00:00.000Z`).getTime();
  const earliestTime = new Date(`${returns[0]?.date}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(earliestTime) || latestTime - earliestTime < (days - toleranceDays) * 86_400_000) {
    return [];
  }
  return returns.filter((item) => {
    const itemTime = new Date(`${item.date}T00:00:00.000Z`).getTime();
    return Number.isFinite(itemTime) && latestTime - itemTime <= days * 86_400_000;
  }).map((item) => item.value);
}

function worstWeeklyReturn(series: InstrumentPrice[]) {
  if (series.length < 6) return null;
  let worst: number | null = null;
  for (let index = 5; index < series.length; index += 1) {
    const previous = series[index - 5];
    const current = series[index];
    if (!previous || !current || previous.closePrice <= 0) continue;
    const value = current.closePrice / previous.closePrice - 1;
    if (worst == null || value < worst) worst = value;
  }
  return worst;
}

function confidenceScore(observationCount: number) {
  if (observationCount >= 252) return 90;
  if (observationCount >= 120) return 70;
  if (observationCount >= 60) return 55;
  if (observationCount >= 30) return 40;
  return 20;
}

function bounded(value: number) {
  return Math.max(0, Math.min(100, value));
}

function riskScore(input: {
  volatility1y: number | null;
  maxDrawdown: number | null;
  downsideVolatility: number | null;
  negativeReturnFrequency: number | null;
}) {
  if (input.volatility1y == null || input.maxDrawdown == null) return null;
  const volScore = bounded((input.volatility1y / 0.6) * 100);
  const drawdownScore = bounded((Math.abs(input.maxDrawdown) / 0.5) * 100);
  const downsideScore = input.downsideVolatility == null ? volScore : bounded((input.downsideVolatility / 0.45) * 100);
  const frequencyScore = input.negativeReturnFrequency == null ? 50 : bounded(input.negativeReturnFrequency * 100);
  return volScore * 0.35 + drawdownScore * 0.35 + downsideScore * 0.2 + frequencyScore * 0.1;
}

export class InstrumentRiskService {
  constructor(private readonly repository: UniverseRepository) {}

  async getInstrumentRiskMetric(instrument: Instrument): Promise<InstrumentRiskMetric | null> {
    const stored = await this.repository.listInstrumentRiskMetrics([instrument.id]);
    return stored.slice().sort((a, b) => (b.metricDate ?? "").localeCompare(a.metricDate ?? ""))[0] ?? null;
  }

  calculate(instrument: Instrument, prices: InstrumentPrice[]): InstrumentRiskMetric {
    const series = prices
      .filter((point) => Number.isFinite(point.closePrice) && point.closePrice > 0)
      .slice()
      .sort((a, b) => a.priceDate.localeCompare(b.priceDate));
    const returns = dailyReturns(series);
    const values = returns.map((item) => item.value);
    const vol30 = annualizedVolatility(windowValues(returns, 30), 10);
    const vol90 = annualizedVolatility(windowValues(returns, 90), 30);
    const vol1y = annualizedVolatility(windowValues(returns, 252), 60);
    const vol5y = annualizedVolatility(periodReturnValues(returns, 365 * 5, 30));
    const vol10y = annualizedVolatility(periodReturnValues(returns, 365 * 10, 30));
    const vol15y = annualizedVolatility(periodReturnValues(returns, 365 * 15, 30));
    const vol20y = annualizedVolatility(periodReturnValues(returns, 365 * 20, 120));
    const downVol = downsideVolatility(windowValues(returns, 252), 10);
    const drawdown = drawdownMetrics(series);
    const drawdown1y = periodDrawdownMetrics(series, 365, 14);
    const drawdown3y = periodDrawdownMetrics(series, 365 * 3, 30);
    const drawdown5y = periodDrawdownMetrics(series, 365 * 5, 30);
    const drawdown10y = periodDrawdownMetrics(series, 365 * 10, 30);
    const drawdown15y = periodDrawdownMetrics(series, 365 * 15, 30);
    const drawdown20y = periodDrawdownMetrics(series, 365 * 20, 120);
    const negativeFrequency = values.length === 0 ? null : values.filter((value) => value < 0).length / values.length;
    const worstDaily = values.length === 0 ? null : Math.min(...values);
    const worstWeekly = worstWeeklyReturn(series);
    const score = riskScore({
      volatility1y: vol1y,
      maxDrawdown: drawdown.maxDrawdown,
      downsideVolatility: downVol,
      negativeReturnFrequency: negativeFrequency
    });
    const confidence = confidenceScore(series.length);

    return {
      instrumentId: instrument.id,
      metricDate: series.at(-1)?.priceDate ?? new Date().toISOString().slice(0, 10),
      volatility30d: vol30,
      volatility90d: vol90,
      volatility1y: vol1y,
      volatility5y: vol5y,
      volatility10y: vol10y,
      volatility15y: vol15y,
      volatility20y: vol20y,
      volatilityTrend: volatilityTrend(vol30, vol90),
      downsideVolatility: downVol,
      currentDrawdown1y: drawdown1y.currentDrawdown,
      maxDrawdown1y: drawdown1y.maxDrawdown,
      currentDrawdown3y: drawdown3y.currentDrawdown,
      maxDrawdown3y: drawdown3y.maxDrawdown,
      currentDrawdown5y: drawdown5y.currentDrawdown,
      maxDrawdown5y: drawdown5y.maxDrawdown,
      maxDrawdown10y: drawdown10y.maxDrawdown,
      maxDrawdown15y: drawdown15y.maxDrawdown,
      maxDrawdown20y: drawdown20y.maxDrawdown,
      currentDrawdown: drawdown.currentDrawdown,
      maxDrawdown: drawdown.maxDrawdown,
      drawdownDurationDays: drawdown.drawdownDurationDays,
      drawdownBucket: drawdownBucket(drawdown.maxDrawdown),
      negativeReturnFrequency: negativeFrequency,
      worstDailyReturn: worstDaily,
      worstWeeklyReturn: worstWeekly,
      riskScore: score,
      riskBucket: riskBucket(score),
      volatilityBucket: volatilityBucket(vol1y ?? vol90 ?? vol30),
      confidenceScore: confidence,
      observationCount: series.length,
      historyStartDate: series[0]?.priceDate ?? null,
      historyEndDate: series.at(-1)?.priceDate ?? null,
      calculatedAt: new Date().toISOString()
    };
  }
}
