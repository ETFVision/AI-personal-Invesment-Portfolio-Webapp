import type { AllocationItem } from "@/domain/portfolio/types";
import type { BondHoldingExposure } from "./BondTypes";

function allocationItems(entries: Map<string, number>, denominator: number): AllocationItem[] {
  return Array.from(entries.entries())
    .map(([label, value]) => ({
      label,
      value,
      percent: denominator === 0 ? 0 : value / denominator
    }))
    .sort((a, b) => b.value - a.value);
}

export class DurationAnalysisService {
  calculateDurationBreakdown(holdings: BondHoldingExposure[], totalBondValue: number) {
    const byDuration = new Map<string, number>();
    for (const holding of holdings) {
      byDuration.set(holding.durationCategory, (byDuration.get(holding.durationCategory) ?? 0) + holding.value);
    }
    return allocationItems(byDuration, totalBondValue);
  }

  calculateLongDurationExposure(holdings: BondHoldingExposure[], totalPortfolioValue: number) {
    const value = holdings
      .filter((holding) => holding.durationCategory === "long")
      .reduce((sum, holding) => sum + holding.value, 0);
    return totalPortfolioValue === 0 ? 0 : value / totalPortfolioValue;
  }

  calculateCashLikeExposure(holdings: BondHoldingExposure[], totalPortfolioValue: number) {
    const value = holdings
      .filter((holding) => holding.durationCategory === "ultra-short" || holding.bondType === "cash-like" || holding.liquidityRole.includes("cash-like"))
      .reduce((sum, holding) => sum + holding.value, 0);
    return totalPortfolioValue === 0 ? 0 : value / totalPortfolioValue;
  }
}
