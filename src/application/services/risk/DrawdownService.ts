import { BenchmarkComparison, PortfolioSnapshot } from "@/domain/portfolio/types";
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

  calculateBenchmarkDrawdown(comparisons: BenchmarkComparison[]) {
    return comparisons
      .filter((comparison) => comparison.points.length > 0)
      .map((comparison) => ({
        benchmarkKey: comparison.benchmark.benchmarkKey,
        benchmarkName: comparison.benchmark.name,
        portfolioMaxDrawdown: comparison.portfolioMaxDrawdown,
        benchmarkMaxDrawdown: comparison.benchmarkMaxDrawdown
      }));
  }
}
