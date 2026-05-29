import { BenchmarkComparison, BenchmarkSnapshot, PortfolioSnapshot } from "@/domain/portfolio/types";
import { calculateDrawdown } from "@/application/services/risk/riskMath";

export class DrawdownService {
  calculatePortfolioDrawdown(snapshots: PortfolioSnapshot[]) {
    return calculateDrawdown(
      snapshots.map((snapshot) => ({
        date: snapshot.snapshotDate,
        value: snapshot.totalValue
      }))
    );
  }

  calculateBenchmarkDrawdown(
    comparisons: BenchmarkComparison[],
    benchmarkSnapshots: BenchmarkSnapshot[] = [],
    portfolioMaxDrawdown?: number | null
  ) {
    const snapshotsByBenchmarkId = new Map<string, BenchmarkSnapshot[]>();
    for (const snapshot of benchmarkSnapshots) {
      const snapshots = snapshotsByBenchmarkId.get(snapshot.benchmarkId) ?? [];
      snapshots.push(snapshot);
      snapshotsByBenchmarkId.set(snapshot.benchmarkId, snapshots);
    }

    return comparisons
      .filter((comparison) => comparison.points.length > 0 || snapshotsByBenchmarkId.has(comparison.benchmark.id))
      .map((comparison) => {
        const benchmarkSeries = snapshotsByBenchmarkId.get(comparison.benchmark.id) ?? [];
        const fullHistoryDrawdown =
          benchmarkSeries.length > 1
            ? calculateDrawdown(benchmarkSeries.map((snapshot) => ({
                date: snapshot.snapshotDate,
                value: snapshot.levelValue
              })))
            : null;

        return {
          benchmarkKey: comparison.benchmark.benchmarkKey,
          benchmarkName: comparison.benchmark.name,
          portfolioMaxDrawdown: portfolioMaxDrawdown ?? comparison.portfolioMaxDrawdown,
          benchmarkMaxDrawdown: fullHistoryDrawdown?.maxDrawdown ?? comparison.benchmarkMaxDrawdown,
          benchmarkObservationCount: benchmarkSeries.length,
          benchmarkHistoryStart: benchmarkSeries.slice().sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[0]?.snapshotDate ?? null,
          benchmarkHistoryEnd: benchmarkSeries.slice().sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0]?.snapshotDate ?? null
        };
      });
  }
}
