import type { RecommendationLabel } from "@/domain/recommendations/types";
import type { TelemetryEvidenceBucket, TelemetryHorizon, TelemetryOutcomeStatus } from "@/domain/telemetry/types";

export const TELEMETRY_HORIZONS: TelemetryHorizon[] = ["1m", "3m", "6m", "12m"];

export function horizonMonths(horizon: TelemetryHorizon) {
  if (horizon === "1m") return 1;
  if (horizon === "3m") return 3;
  if (horizon === "6m") return 6;
  return 12;
}

export function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + months);
  return parsed.toISOString().slice(0, 10);
}

export function maturedDate(startDate: string, horizon: TelemetryHorizon) {
  return addMonths(startDate, horizonMonths(horizon));
}

export function isTelemetryHorizonMatured(startDate: string, asOfDate: string, horizon: TelemetryHorizon) {
  return maturedDate(startDate, horizon) <= asOfDate;
}

export function calculateSimpleReturn(startPrice: number | null | undefined, endPrice: number | null | undefined) {
  if (startPrice == null || endPrice == null || startPrice <= 0 || endPrice <= 0) return null;
  return endPrice / startPrice - 1;
}

export function classifyRecommendationOutcome(
  recommendation: RecommendationLabel | string,
  assetReturn: number | null,
  benchmarkReturn: number | null
): { success: boolean | null; status: TelemetryOutcomeStatus; excessReturn: number | null } {
  if (assetReturn == null) return { success: null, status: "insufficient_data", excessReturn: null };
  if (benchmarkReturn == null) return { success: null, status: "benchmark_missing", excessReturn: null };
  const excessReturn = assetReturn - benchmarkReturn;
  if (recommendation === "Strong Buy" || recommendation === "Buy") {
    return { success: excessReturn > 0, status: "evaluated", excessReturn };
  }
  if (recommendation === "Reduce" || recommendation === "Sell") {
    return { success: excessReturn < 0, status: "evaluated", excessReturn };
  }
  if (recommendation === "Hold") {
    return { success: Math.abs(excessReturn) <= 0.03 || assetReturn > -0.05, status: "evaluated", excessReturn };
  }
  if (recommendation === "Watch") {
    return { success: excessReturn <= 0 || assetReturn < -0.03, status: "evaluated", excessReturn };
  }
  return { success: null, status: "insufficient_data", excessReturn };
}

export function confidenceBucket(observationCount: number): TelemetryEvidenceBucket {
  if (observationCount < 10) return "insufficient_evidence";
  if (observationCount < 30) return "early_signal";
  if (observationCount < 100) return "moderate_evidence";
  return "stronger_evidence";
}

export function factorDirection(value: unknown) {
  if (typeof value === "number") {
    if (value >= 70) return "high";
    if (value <= 40) return "low";
    return "medium";
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value.toLowerCase().replaceAll(" ", "_");
  return "unknown";
}

export function factorValueBucket(value: unknown) {
  if (typeof value === "number") {
    if (value >= 70) return "strong";
    if (value >= 50) return "mixed";
    return "weak";
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  return "unknown";
}
