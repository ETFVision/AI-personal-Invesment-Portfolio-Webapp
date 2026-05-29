import { PortfolioSnapshot } from "@/domain/portfolio/types";
import { annualizedVolatility, calculateReturns } from "@/application/services/risk/riskMath";

export type VolatilityMetric = {
  label: "30D" | "90D" | "1Y";
  value: number | null;
  observations: number;
};

export class VolatilityService {
  calculatePortfolioVolatility(snapshots: PortfolioSnapshot[]): {
    metrics: VolatilityMetric[];
    trend: Array<{ date: string; volatility: number | null }>;
  } {
    const returns = calculateReturns(
      snapshots.map((snapshot) => ({
        date: snapshot.snapshotDate,
        value: snapshot.totalValue
      }))
    );

    return {
      metrics: [
        { label: "30D", value: annualizedVolatility(returns, 30), observations: Math.min(returns.length, 30) },
        { label: "90D", value: annualizedVolatility(returns, 90), observations: Math.min(returns.length, 90) },
        { label: "1Y", value: annualizedVolatility(returns, 252), observations: Math.min(returns.length, 252) }
      ],
      trend: returns.map((point, index) => ({
        date: point.date,
        volatility: annualizedVolatility(returns.slice(0, index + 1), 30)
      }))
    };
  }
}
