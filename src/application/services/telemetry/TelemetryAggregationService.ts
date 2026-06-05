import type { TelemetryRepository } from "@/application/ports/repositories/TelemetryRepository";
import type { TelemetryHorizon, TelemetryRecommendationOutcome, TelemetryRecommendationSnapshot } from "@/domain/telemetry/types";
import { confidenceBucket, factorDirection, factorValueBucket } from "./telemetryMath";

function isUsefulFactorValue(value: unknown) {
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
}

function factorKey(snapshot: TelemetryRecommendationSnapshot, key: string, value: unknown, horizon: TelemetryHorizon) {
  return `${horizon}:${key}:${factorValueBucket(value)}:${factorDirection(key)}`;
}

export class TelemetryAggregationService {
  constructor(private readonly telemetryRepository: TelemetryRepository) {}

  async refreshFactorOutcomes(horizons: TelemetryHorizon[] = ["1m", "3m", "6m", "12m"]) {
    const [snapshots, outcomes] = await Promise.all([
      this.telemetryRepository.listRecommendationSnapshots(5000),
      this.telemetryRepository.listRecommendationOutcomes()
    ]);
    const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const grouped = new Map<
      string,
      {
        factorName: string;
        factorValueBucket: string;
        factorDirection: string;
        horizon: TelemetryHorizon;
        outcomes: TelemetryRecommendationOutcome[];
      }
    >();

    for (const outcome of outcomes) {
      if (!horizons.includes(outcome.horizon) || outcome.outcomeStatus !== "evaluated") continue;
      const snapshot = snapshotsById.get(outcome.recommendationSnapshotId);
      if (!snapshot) continue;
      for (const [key, value] of Object.entries(snapshot.factorInputs ?? {})) {
        if (!isUsefulFactorValue(value)) continue;
        const groupKey = factorKey(snapshot, key, value, outcome.horizon);
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            factorName: key,
            factorValueBucket: factorValueBucket(value),
            factorDirection: factorDirection(key),
            horizon: outcome.horizon,
            outcomes: []
          });
        }
        grouped.get(groupKey)?.outcomes.push(outcome);
      }
    }

    const aggregates = Array.from(grouped.values()).map((group) => {
      const count = group.outcomes.length;
      const successful = group.outcomes.filter((outcome) => outcome.success).length;
      const averageExcessReturn = group.outcomes.reduce((sum, outcome) => sum + (outcome.excessReturn ?? 0), 0) / Math.max(count, 1);
      const averageAssetReturn = group.outcomes.reduce((sum, outcome) => sum + (outcome.assetReturn ?? 0), 0) / Math.max(count, 1);
      const successRate = count > 0 ? successful / count : null;
      return {
        factorName: group.factorName,
        factorValue: group.factorValueBucket,
        factorDirection: group.factorDirection,
        horizon: group.horizon,
        observationCount: count,
        hitRate: successRate,
        averageExcessReturn,
        averageAssetReturn,
        averageBenchmarkReturn: group.outcomes.reduce((sum, outcome) => sum + (outcome.benchmarkReturn ?? 0), 0) / Math.max(count, 1),
        confidenceBucket: confidenceBucket(count)
      };
    });

    await this.telemetryRepository.upsertFactorOutcomes(aggregates);
    return { factorOutcomesCreated: aggregates.length };
  }
}
