import { AllocationService } from "@/application/services/AllocationService";
import { PerformanceService } from "@/application/services/PerformanceService";
import {
  CashBalance,
  Holding,
  HoldingValuation,
  PerformanceMetric,
  PortfolioSnapshot,
  Transaction
} from "@/domain/portfolio/types";

type DashboardAnalyticsInput = {
  cashBalances: CashBalance[];
  holdings: Holding[];
  holdingValuations: HoldingValuation[];
  transactions: Transaction[];
  snapshots: PortfolioSnapshot[];
};

function calculateRealizedGainLoss(transactions: Transaction[]) {
  const lots = new Map<string, { quantity: number; cost: number }>();
  let realizedGainLoss = 0;

  for (const transaction of [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))) {
    if (!transaction.assetId || !transaction.quantity || !transaction.price) continue;

    const current = lots.get(transaction.assetId) ?? { quantity: 0, cost: 0 };
    if (transaction.transactionType === "buy") {
      current.quantity += transaction.quantity;
      current.cost += transaction.quantity * transaction.price + transaction.fees;
      lots.set(transaction.assetId, current);
    }

    if (transaction.transactionType === "sell" && current.quantity > 0) {
      const soldQuantity = Math.min(transaction.quantity, current.quantity);
      const averageCost = current.cost / current.quantity;
      const proceeds = soldQuantity * transaction.price - transaction.fees;
      const costBasis = soldQuantity * averageCost;
      realizedGainLoss += proceeds - costBasis;
      current.quantity -= soldQuantity;
      current.cost -= costBasis;
      lots.set(transaction.assetId, current);
    }
  }

  return realizedGainLoss;
}

export class AnalyticsService {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly performanceService: PerformanceService
  ) {}

  calculateDashboardAnalytics(input: DashboardAnalyticsInput) {
    const totalCash = input.cashBalances.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalHoldingsCost = input.holdings.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.averageCost ?? 0),
      0
    );
    const totalHoldingsMarketValue = input.holdingValuations.reduce((sum, item) => sum + item.value, 0);
    const totalValueEstimate = totalCash + totalHoldingsMarketValue;
    const investedAmount = totalHoldingsCost;
    const unrealizedGainLoss = totalHoldingsMarketValue - investedAmount;
    const unrealizedGainLossPercent = investedAmount === 0 ? 0 : unrealizedGainLoss / investedAmount;
    const realizedGainLoss = calculateRealizedGainLoss(input.transactions);

    const gainLossRows = input.holdingValuations
      .map((valuation) => {
        const costBasis = Number(valuation.holding.quantity) * Number(valuation.holding.averageCost ?? 0);
        const gainLoss = valuation.value - costBasis;
        return {
          valuation,
          gainLoss,
          gainLossPercent: costBasis === 0 ? 0 : gainLoss / costBasis
        };
      })
      .filter((row) => row.valuation.valuationSource === "market_price");

    return {
      totalCash,
      totalHoldingsCost,
      totalHoldingsMarketValue,
      totalValueEstimate,
      investedAmount,
      unrealizedGainLoss,
      unrealizedGainLossPercent,
      realizedGainLoss,
      allocationByType: this.allocationService.byAssetClass({
        valuations: input.holdingValuations,
        cashValue: totalCash,
        totalValue: totalValueEstimate
      }),
      allocationBySector: this.allocationService.bySector({
        valuations: input.holdingValuations,
        totalValue: totalHoldingsMarketValue
      }),
      allocationByGeography: this.allocationService.byGeography({
        valuations: input.holdingValuations,
        totalValue: totalHoldingsMarketValue
      }),
      currencyExposure: this.allocationService.byCurrency({
        valuations: input.holdingValuations,
        cashBalances: input.cashBalances,
        totalValue: totalValueEstimate
      }),
      topWinners: [...gainLossRows]
        .filter((row) => row.gainLoss > 0)
        .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
        .slice(0, 5),
      topLosers: [...gainLossRows]
        .filter((row) => row.gainLoss < 0)
        .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
        .slice(0, 5),
      performance: this.performanceService.calculatePerformance(totalValueEstimate, input.snapshots),
      cashPercent: totalValueEstimate === 0 ? 0 : totalCash / totalValueEstimate,
      investedPercent: totalValueEstimate === 0 ? 0 : totalHoldingsMarketValue / totalValueEstimate
    };
  }
}
