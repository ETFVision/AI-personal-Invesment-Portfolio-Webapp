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

export class CreditExposureService {
  calculateCreditBreakdown(holdings: BondHoldingExposure[], totalBondValue: number) {
    const byCredit = new Map<string, number>();
    for (const holding of holdings) {
      byCredit.set(holding.creditQuality, (byCredit.get(holding.creditQuality) ?? 0) + holding.value);
    }
    return allocationItems(byCredit, totalBondValue);
  }

  calculateBondTypeBreakdown(holdings: BondHoldingExposure[], totalBondValue: number) {
    const byType = new Map<string, number>();
    for (const holding of holdings) {
      byType.set(holding.bondType, (byType.get(holding.bondType) ?? 0) + holding.value);
    }
    return allocationItems(byType, totalBondValue);
  }

  calculateCreditRiskExposure(holdings: BondHoldingExposure[], totalPortfolioValue: number) {
    const value = holdings
      .filter((holding) => holding.creditQuality === "high yield" || holding.bondType === "high yield" || holding.bondType === "corporate")
      .reduce((sum, holding) => sum + holding.value, 0);
    return totalPortfolioValue === 0 ? 0 : value / totalPortfolioValue;
  }

  calculateHighYieldExposure(holdings: BondHoldingExposure[], totalPortfolioValue: number) {
    const value = holdings
      .filter((holding) => holding.creditQuality === "high yield" || holding.bondType === "high yield")
      .reduce((sum, holding) => sum + holding.value, 0);
    return totalPortfolioValue === 0 ? 0 : value / totalPortfolioValue;
  }
}
