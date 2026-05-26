import { AllocationItem, CashBalance, HoldingValuation } from "@/domain/portfolio/types";

function toAllocationItems(entries: Map<string, number>, denominator: number): AllocationItem[] {
  return Array.from(entries.entries())
    .map(([label, value]) => ({
      label,
      value,
      percent: denominator === 0 ? 0 : value / denominator
    }))
    .sort((a, b) => b.value - a.value);
}

export class AllocationService {
  byAssetClass(input: { valuations: HoldingValuation[]; cashValue: number; totalValue: number }) {
    const byType = new Map<string, number>();

    for (const valuation of input.valuations) {
      byType.set(valuation.holding.assetType, (byType.get(valuation.holding.assetType) ?? 0) + valuation.value);
    }

    if (input.cashValue !== 0) byType.set("cash", (byType.get("cash") ?? 0) + input.cashValue);
    return toAllocationItems(byType, input.totalValue);
  }

  byCurrency(input: { valuations: HoldingValuation[]; cashBalances: CashBalance[]; totalValue: number }) {
    const byCurrency = new Map<string, number>();

    for (const valuation of input.valuations) {
      byCurrency.set(valuation.valueCurrency, (byCurrency.get(valuation.valueCurrency) ?? 0) + valuation.value);
    }

    for (const cash of input.cashBalances) {
      byCurrency.set(cash.currency, (byCurrency.get(cash.currency) ?? 0) + Number(cash.amount));
    }

    return toAllocationItems(byCurrency, input.totalValue).map((item) => ({
      ...item,
      currency: item.label
    }));
  }

  bySector(input: { valuations: HoldingValuation[]; totalValue: number }) {
    const bySector = new Map<string, number>();

    for (const valuation of input.valuations) {
      const label = valuation.holding.sector || "Unknown";
      bySector.set(label, (bySector.get(label) ?? 0) + valuation.value);
    }

    return toAllocationItems(bySector, input.totalValue);
  }

  byGeography(input: { valuations: HoldingValuation[]; totalValue: number }) {
    const byGeography = new Map<string, number>();

    for (const valuation of input.valuations) {
      const label = valuation.holding.region || valuation.holding.country || "Unknown";
      byGeography.set(label, (byGeography.get(label) ?? 0) + valuation.value);
    }

    return toAllocationItems(byGeography, input.totalValue);
  }
}
