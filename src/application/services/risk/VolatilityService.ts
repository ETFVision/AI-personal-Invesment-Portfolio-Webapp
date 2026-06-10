import type { PortfolioSnapshot, Transaction } from "@/domain/portfolio/types";
import { annualizedVolatility, calculateFlowAdjustedPortfolioReturns } from "./riskMath";

export type VolatilityMetric = {
  label: "30D" | "90D" | "1Y";
  value: number | null;
  observations: number;
};

export class VolatilityService {
  calculatePortfolioVolatility(snapshots: PortfolioSnapshot[], transactions: Transaction[] = []): {
    metrics: VolatilityMetric[];
    trend: Array<{ date: string; volatility: number | null }>;
    excludedJumpCount: number;
    largestExcludedJump: number | null;
  } {
    const rawReturns = calculateFlowAdjustedPortfolioReturns(snapshots, transactions);
    const excludedReturns = rawReturns.filter((point) => Math.abs(point.value) > 1);
    const returns = rawReturns.filter((point) => Math.abs(point.value) <= 1);

    return {
      metrics: [
        { label: "30D", value: annualizedVolatility(returns, 30), observations: Math.min(returns.length, 30) },
        { label: "90D", value: annualizedVolatility(returns, 90), observations: Math.min(returns.length, 90) },
        { label: "1Y", value: annualizedVolatility(returns, 252), observations: Math.min(returns.length, 252) }
      ],
      trend: returns.map((point, index) => ({
        date: point.date,
        volatility: annualizedVolatility(returns.slice(0, index + 1), 30)
      })),
      excludedJumpCount: excludedReturns.length,
      largestExcludedJump: excludedReturns.length === 0
        ? null
        : excludedReturns.reduce((largest, point) => Math.abs(point.value) > Math.abs(largest) ? point.value : largest, excludedReturns[0].value)
    };
  }
}
