import { HoldingSnapshot } from "@/domain/portfolio/types";
import { calculateReturns, correlation } from "@/application/services/risk/riskMath";

export type CorrelationCell = {
  left: string;
  right: string;
  value: number | null;
};

export class CorrelationService {
  calculateHoldingCorrelations(input: {
    holdingSnapshots: HoldingSnapshot[];
    labelsByHoldingId: Map<string, string>;
  }) {
    const returnsByHolding = new Map<string, number[]>();
    for (const holdingId of input.labelsByHoldingId.keys()) {
      const series = input.holdingSnapshots
        .filter((snapshot) => snapshot.holdingId === holdingId)
        .map((snapshot) => ({ date: snapshot.snapshotDate, value: snapshot.marketValue }));
      returnsByHolding.set(holdingId, calculateReturns(series).map((point) => point.value));
    }

    const holdingIds = Array.from(input.labelsByHoldingId.keys());
    const matrix: CorrelationCell[] = [];
    const highCorrelationPairs: Array<{ left: string; right: string; value: number }> = [];
    const values: number[] = [];

    for (const left of holdingIds) {
      for (const right of holdingIds) {
        const value = left === right ? 1 : correlation(returnsByHolding.get(left) ?? [], returnsByHolding.get(right) ?? []);
        const leftLabel = input.labelsByHoldingId.get(left) ?? left;
        const rightLabel = input.labelsByHoldingId.get(right) ?? right;
        matrix.push({ left: leftLabel, right: rightLabel, value });
        if (left < right && value != null) {
          values.push(value);
          if (value >= 0.85) highCorrelationPairs.push({ left: leftLabel, right: rightLabel, value });
        }
      }
    }

    const averageCorrelation = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
    return { matrix, highCorrelationPairs, averageCorrelation };
  }

  calculateGroupedCorrelations(input: {
    holdingSnapshots: HoldingSnapshot[];
    groupByHoldingId: Map<string, string>;
  }) {
    const valuesByGroupAndDate = new Map<string, Map<string, number>>();
    for (const snapshot of input.holdingSnapshots) {
      const group = input.groupByHoldingId.get(snapshot.holdingId);
      if (!group) continue;
      const valuesByDate = valuesByGroupAndDate.get(group) ?? new Map<string, number>();
      valuesByDate.set(snapshot.snapshotDate, (valuesByDate.get(snapshot.snapshotDate) ?? 0) + snapshot.marketValue);
      valuesByGroupAndDate.set(group, valuesByDate);
    }

    const returnsByGroup = new Map<string, number[]>();
    for (const [group, valuesByDate] of valuesByGroupAndDate.entries()) {
      const series = Array.from(valuesByDate.entries()).map(([date, value]) => ({ date, value }));
      returnsByGroup.set(group, calculateReturns(series).map((point) => point.value));
    }

    const groups = Array.from(valuesByGroupAndDate.keys()).sort();
    const matrix: CorrelationCell[] = [];
    const values: number[] = [];
    for (const left of groups) {
      for (const right of groups) {
        const value = left === right ? 1 : correlation(returnsByGroup.get(left) ?? [], returnsByGroup.get(right) ?? []);
        matrix.push({ left, right, value });
        if (left < right && value != null) values.push(value);
      }
    }

    const averageCorrelation = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
    return { matrix, averageCorrelation };
  }
}
