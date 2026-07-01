import type { InstrumentRiskMetric, PriceSeriesPoint } from "../../domain/universe/types";
import { scoreRisk } from "../../application/services/recommendations/recommendationScoring";

export type RiskDisplayTone = "positive" | "info" | "warning" | "danger" | "neutral";

export type RiskObservation = {
  key: string;
  title: string;
  description: string;
  tone: RiskDisplayTone;
  icon: "activity" | "alert" | "drawdown" | "downside";
};

const EMPTY_VALUE = "-";

export const RISK_BUCKET_DISPLAY: Record<InstrumentRiskMetric["volatilityBucket"], { label: string; tone: RiskDisplayTone; level: number }> = {
  low: { label: "Lower", tone: "positive", level: 0 },
  medium: { label: "Moderate", tone: "info", level: 1 },
  high: { label: "Elevated", tone: "warning", level: 2 },
  very_high: { label: "Very elevated", tone: "danger", level: 3 },
  insufficient_data: { label: EMPTY_VALUE, tone: "neutral", level: 0 }
};

export const DRAWDOWN_BUCKET_DISPLAY: Record<InstrumentRiskMetric["drawdownBucket"], { label: string; tone: RiskDisplayTone }> = {
  low: { label: "Low drawdown", tone: "positive" },
  moderate: { label: "Moderate drawdown", tone: "info" },
  elevated: { label: "Elevated drawdown", tone: "warning" },
  severe: { label: "Severe drawdown", tone: "danger" },
  insufficient_data: { label: EMPTY_VALUE, tone: "neutral" }
};

export function riskVerdictFromVolatilityBucket(bucket: InstrumentRiskMetric["volatilityBucket"] | null | undefined) {
  return RISK_BUCKET_DISPLAY[bucket ?? "insufficient_data"];
}

export function unifiedRiskScore(riskMetric: InstrumentRiskMetric | null | undefined) {
  return scoreRisk(riskMetric ?? null);
}

export function unifiedRiskBand(score: number | null | undefined): { label: string; tone: RiskDisplayTone } {
  if (score == null || !Number.isFinite(score)) return { label: EMPTY_VALUE, tone: "neutral" };
  if (score < 45) return { label: "Elevated", tone: "danger" };
  if (score < 70) return { label: "Moderate", tone: "warning" };
  return { label: "Lower", tone: "positive" };
}

export function riskUniverseVolatilityLabel(
  currentVolatility: number | null | undefined,
  rows: Array<{ instrumentId: string; volatility1y: number | null }>,
  instrumentId: string
) {
  if (currentVolatility == null || !Number.isFinite(currentVolatility)) return EMPTY_VALUE;
  const scoredRows = rows.filter((row) => row.volatility1y != null && Number.isFinite(row.volatility1y));
  const activeVolatility = scoredRows.find((row) => row.instrumentId === instrumentId)?.volatility1y ?? currentVolatility;
  const values = scoredRows.some((row) => row.instrumentId === instrumentId)
    ? scoredRows
    : [...scoredRows, { instrumentId, volatility1y: activeVolatility }];
  if (values.length === 0 || activeVolatility == null) return EMPTY_VALUE;
  const moreVolatile = values.filter((row) => (row.volatility1y ?? -Infinity) > activeVolatility).length;
  const topPercent = Math.max(1, Math.min(100, Math.ceil(((moreVolatile + 1) / values.length) * 100)));
  return `Top ${topPercent}% most volatile`;
}

export function worstPeriodReturnFromSeries(series: PriceSeriesPoint[], days: number) {
  const sorted = series
    .filter((point) => point.date && Number.isFinite(point.close) && point.close > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const returns: number[] = [];
  let baselineIndex = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const point = sorted[index];
    if (!point) continue;
    const pointDate = new Date(`${point.date}T00:00:00Z`);
    if (Number.isNaN(pointDate.getTime())) continue;
    pointDate.setUTCDate(pointDate.getUTCDate() - days);
    const targetDate = pointDate.toISOString().slice(0, 10);
    while (baselineIndex + 1 < index && sorted[baselineIndex + 1]?.date <= targetDate) {
      baselineIndex += 1;
    }
    const baseline = sorted[baselineIndex];
    if (!baseline || baseline.date > targetDate || baseline.close <= 0) continue;
    returns.push(point.close / baseline.close - 1);
  }
  return returns.length === 0 ? null : Math.min(...returns);
}

export function generateRiskObservations(input: {
  riskMetric: InstrumentRiskMetric | null;
  universeVolatilityLabel: string;
  currentDrawdownFromHigh?: number | null;
}) {
  const { riskMetric } = input;
  if (!riskMetric) return [];

  const observations: RiskObservation[] = [];
  const verdict = riskVerdictFromVolatilityBucket(riskMetric.volatilityBucket);
  if (riskMetric.volatility1y != null) {
    observations.push({
      key: "volatility",
      title: `1Y volatility ${formatPercentForObservation(riskMetric.volatility1y)}`,
      description: `${verdict.label} volatility band${input.universeVolatilityLabel !== EMPTY_VALUE ? `; ${input.universeVolatilityLabel.toLowerCase()} in the active universe` : ""}.`,
      tone: verdict.tone,
      icon: "activity"
    });
  }

  const drawdown = riskMetric.maxDrawdown ?? riskMetric.maxDrawdown1y ?? null;
  if (drawdown != null || riskMetric.currentDrawdown != null || input.currentDrawdownFromHigh != null) {
    observations.push({
      key: "drawdown",
      title: `Max drawdown ${formatPercentForObservation(drawdown)}`,
      description: `Currently ${formatPercentForObservation(riskMetric.currentDrawdown ?? input.currentDrawdownFromHigh ?? null)} from peak.`,
      tone: DRAWDOWN_BUCKET_DISPLAY[riskMetric.drawdownBucket].tone,
      icon: "drawdown"
    });
  }

  if (riskMetric.downsideVolatility != null) {
    const exceedsTotal = riskMetric.volatility1y != null && riskMetric.downsideVolatility > riskMetric.volatility1y;
    observations.push({
      key: "downside",
      title: `Downside volatility ${formatPercentForObservation(riskMetric.downsideVolatility)}`,
      description: exceedsTotal
        ? "Losing-day volatility is above the trailing 1Y volatility measure."
        : "Losing-day volatility is below the trailing 1Y volatility measure.",
      tone: exceedsTotal ? "warning" : "neutral",
      icon: "downside"
    });
  }

  if (observations.length < 2 && riskMetric.volatilityTrend !== "insufficient_data") {
    observations.push({
      key: "trend",
      title: `Volatility trend ${riskMetric.volatilityTrend.replaceAll("_", " ")}`,
      description: "Compares 30D and 90D annualised volatility direction.",
      tone: riskMetric.volatilityTrend === "rising" ? "danger" : riskMetric.volatilityTrend === "falling" ? "positive" : "neutral",
      icon: "alert"
    });
  }

  return observations.slice(0, 3);
}

function formatPercentForObservation(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
  return `${(value * 100).toFixed(Math.abs(value) < 0.1 ? 1 : 0)}%`;
}
