import type { TelemetryRepository, UpsertTelemetryPortfolioReviewOutcomeInput } from "@/application/ports/repositories/TelemetryRepository";
import type { PortfolioReviewEffectiveness, TelemetryHorizon, TelemetryPortfolioReviewSnapshot } from "@/domain/telemetry/types";
import { calculateSimpleReturn, maturedDate, TELEMETRY_HORIZONS } from "./telemetryMath";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberFromRecord(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const item = record[key];
    if (typeof item === "number" && Number.isFinite(item)) return item;
  }
  return null;
}

function riskMetric(snapshot: TelemetryPortfolioReviewSnapshot, keys: string[]) {
  const reviewMetrics = snapshot.lookthroughSnapshot.reviewMetrics;
  const risk = reviewMetrics && typeof reviewMetrics === "object" && !Array.isArray(reviewMetrics)
    ? (reviewMetrics as Record<string, unknown>).risk
    : null;
  return numberFromRecord(risk, keys);
}

function classifyEffectiveness(input: {
  portfolioScoreChange: number | null;
  diversificationScoreChange: number | null;
  concentrationScoreChange: number | null;
  riskScoreChange: number | null;
}): PortfolioReviewEffectiveness | null {
  const changes = [
    input.portfolioScoreChange,
    input.diversificationScoreChange,
    input.concentrationScoreChange,
    input.riskScoreChange
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (changes.length === 0) return null;
  if (changes.some((value) => value >= 5)) return "effective";
  if (changes.some((value) => value <= -5)) return "deteriorated";
  return "neutral";
}

function latestSnapshotForPortfolio(snapshots: TelemetryPortfolioReviewSnapshot[], source: TelemetryPortfolioReviewSnapshot, targetDate: string) {
  return snapshots
    .filter((item) => item.portfolioId === source.portfolioId && item.id !== source.id)
    .filter((item) => item.generatedAt.slice(0, 10) >= source.generatedAt.slice(0, 10) && item.generatedAt.slice(0, 10) <= targetDate)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
}

export class PortfolioReviewTelemetryEvaluationService {
  constructor(private readonly telemetryRepository: TelemetryRepository) {}

  async evaluate(input: { asOfDate?: string; horizons?: TelemetryHorizon[] } = {}) {
    const asOfDate = input.asOfDate ?? today();
    const horizons = input.horizons ?? TELEMETRY_HORIZONS;
    const snapshots = await this.telemetryRepository.listPortfolioReviewSnapshots(5000);
    const outcomes: UpsertTelemetryPortfolioReviewOutcomeInput[] = [];

    for (const snapshot of snapshots) {
      const startDate = snapshot.generatedAt.slice(0, 10);
      for (const horizon of horizons) {
        const targetDate = maturedDate(startDate, horizon);
        if (targetDate > asOfDate) continue;
        const comparison = latestSnapshotForPortfolio(snapshots, snapshot, targetDate);
        const startValue = await this.telemetryRepository.getPortfolioValueOnOrAfter(snapshot.portfolioId, startDate);
        const endValue = await this.telemetryRepository.getPortfolioValueOnOrBefore(snapshot.portfolioId, targetDate);
        const benchmarkStart = await this.telemetryRepository.getBenchmarkPriceOnOrAfter("SPY", startDate);
        const benchmarkEnd = await this.telemetryRepository.getBenchmarkPriceOnOrBefore("SPY", targetDate);
        const portfolioReturn = startValue && endValue ? calculateSimpleReturn(startValue.totalValue, endValue.totalValue) : null;
        const benchmarkReturn = benchmarkStart && benchmarkEnd ? calculateSimpleReturn(benchmarkStart.closePrice, benchmarkEnd.closePrice) : null;
        const excessReturn = portfolioReturn !== null && benchmarkReturn !== null ? portfolioReturn - benchmarkReturn : null;
        const portfolioScoreChange = comparison && snapshot.portfolioScore != null && comparison.portfolioScore != null
          ? comparison.portfolioScore - snapshot.portfolioScore
          : null;
        const diversificationScoreChange = comparison && snapshot.diversificationScore != null && comparison.diversificationScore != null
          ? comparison.diversificationScore - snapshot.diversificationScore
          : null;
        const concentrationScoreChange = comparison && snapshot.concentrationScore != null && comparison.concentrationScore != null
          ? comparison.concentrationScore - snapshot.concentrationScore
          : null;
        const riskScoreChange = comparison && snapshot.riskScore != null && comparison.riskScore != null
          ? comparison.riskScore - snapshot.riskScore
          : null;
        const volatilityChange = comparison
          ? difference(riskMetric(comparison, ["annualizedVolatility", "annualisedVolatility"]), riskMetric(snapshot, ["annualizedVolatility", "annualisedVolatility"]))
          : null;
        const drawdownChange = comparison
          ? difference(riskMetric(comparison, ["maxDrawdown", "currentDrawdown"]), riskMetric(snapshot, ["maxDrawdown", "currentDrawdown"]))
          : null;
        const effectivenessClassification = classifyEffectiveness({
          portfolioScoreChange,
          diversificationScoreChange,
          concentrationScoreChange,
          riskScoreChange
        });
        const outcomeStatus = comparison ? (portfolioReturn == null ? "insufficient_data" : benchmarkReturn == null ? "benchmark_missing" : "evaluated") : "insufficient_data";
        outcomes.push({
          portfolioReviewSnapshotId: snapshot.id,
          horizon,
          evaluationDate: asOfDate,
          portfolioReturn,
          benchmarkReturn,
          excessReturn,
          volatilityChange,
          drawdownChange,
          diversificationScoreChange,
          concentrationScoreChange,
          riskScoreChange,
          portfolioScoreChange,
          effectivenessClassification,
          outcomeStatus
        });
      }
    }

    await this.telemetryRepository.upsertPortfolioReviewOutcomes(outcomes);
    return { portfolioReviewSnapshotsChecked: snapshots.length, portfolioReviewOutcomesEvaluated: outcomes.length };
  }
}

function difference(current: number | null, prior: number | null) {
  return current != null && prior != null ? current - prior : null;
}
