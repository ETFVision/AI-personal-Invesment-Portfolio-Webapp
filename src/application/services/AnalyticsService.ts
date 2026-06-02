import { AllocationService } from "@/application/services/AllocationService";
import { PerformanceService } from "@/application/services/PerformanceService";
import {
  CashBalance,
  CashPerformance,
  CashSnapshot,
  DailyPrice,
  Holding,
  HoldingSnapshot,
  HoldingValuation,
  ProductPerformance,
  PortfolioSnapshot,
  Transaction
} from "@/domain/portfolio/types";

type DashboardAnalyticsInput = {
  cashBalances: CashBalance[];
  holdings: Holding[];
  holdingValuations: HoldingValuation[];
  transactions: Transaction[];
  snapshots: PortfolioSnapshot[];
  holdingSnapshots: HoldingSnapshot[];
  cashSnapshots: CashSnapshot[];
  dailyPrices?: DailyPrice[];
};

function cashFlowAmount(transaction: Transaction) {
  return Math.abs(transaction.netAmount ?? transaction.grossAmount ?? 0);
}

function transactionAmount(transaction: Transaction) {
  const gross = transaction.quantity && transaction.price ? transaction.quantity * transaction.price : 0;
  if (gross !== 0) return gross;
  return transaction.grossAmount ?? Math.abs(transaction.netAmount ?? 0);
}

function recordedCapitalCoverage(transactions: Transaction[]) {
  const deposits = transactions
    .filter((transaction) => transaction.transactionType === "deposit_cash")
    .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
  const buys = transactions
    .filter((transaction) => transaction.transactionType === "buy")
    .reduce((sum, transaction) => sum + transactionAmount(transaction) + transaction.fees, 0);
  return deposits + buys;
}

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

function transactionMatchesHolding(transaction: Transaction, holding: Holding) {
  if (transaction.assetId && transaction.assetId !== holding.assetId) return false;
  if (holding.ticker && transaction.ticker && holding.ticker !== transaction.ticker) return false;
  if (holding.accountName && transaction.accountName && holding.accountName !== transaction.accountName) return false;
  if (holding.brokerName && transaction.brokerName && holding.brokerName !== transaction.brokerName) return false;
  return true;
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
    const manualCapitalBase = investedAmount + totalCash;
    const manualPortfolioValueChange = totalValueEstimate - manualCapitalBase;
    const hasIncompleteManualCapitalHistory =
      manualCapitalBase > 0 && recordedCapitalCoverage(input.transactions) < manualCapitalBase * 0.8;
    const portfolioPerformance = this.performanceService.calculatePortfolioPerformance({
      currentValue: totalValueEstimate,
      investedAmount,
      cashAmount: totalCash,
      snapshots: input.snapshots,
      transactions: input.transactions
    }).map((metric) => {
      if (!hasIncompleteManualCapitalHistory) return metric;
      return {
        ...metric,
        valueChange: manualPortfolioValueChange,
        percentChange: manualCapitalBase === 0 ? null : manualPortfolioValueChange / manualCapitalBase,
        baselineDate: null
      };
    });
    const pricesByAssetId = new Map<string, DailyPrice[]>();
    for (const price of input.dailyPrices ?? []) {
      const current = pricesByAssetId.get(price.assetId) ?? [];
      current.push(price);
      pricesByAssetId.set(price.assetId, current);
    }

    const productPerformance: ProductPerformance[] = input.holdingValuations.map((valuation) => {
      const productTransactions = input.transactions.filter((transaction) => transactionMatchesHolding(transaction, valuation.holding));
      const realized = calculateRealizedGainLoss(productTransactions);
      const costBasis = valuation.holding.quantity * (valuation.holding.averageCost ?? 0);
      const unrealized = valuation.value - costBasis;
      return {
        holdingId: valuation.holding.id,
        assetId: valuation.holding.assetId,
        metrics: this.performanceService.calculateProductPerformance({
          valuation,
          snapshots: input.holdingSnapshots,
          transactions: productTransactions,
          priceHistory: pricesByAssetId.get(valuation.holding.assetId) ?? []
        }),
        realizedGainLoss: realized,
        unrealizedGainLoss: unrealized,
        totalGainLoss: realized + unrealized
      };
    });
    const cashPerformance: CashPerformance[] = input.cashBalances.map((cash) => {
      const accountTransactions = input.transactions.filter((transaction) => {
        return (
          (transaction.transactionType === "deposit_cash" || transaction.transactionType === "withdraw_cash") &&
          transaction.currency === cash.currency &&
          (transaction.accountName ?? "Default") === (cash.accountName ?? "Default")
        );
      });
      return {
        cashBalanceId: cash.id,
        metrics: this.performanceService.calculateCashPerformance({
          cashBalanceId: cash.id,
          currentAmount: cash.amount,
          snapshots: input.cashSnapshots,
          transactions: accountTransactions
        }),
        netDeposits: accountTransactions
          .filter((transaction) => transaction.transactionType === "deposit_cash")
          .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0),
        netWithdrawals: accountTransactions
          .filter((transaction) => transaction.transactionType === "withdraw_cash")
          .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0)
      };
    });

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
      performance: portfolioPerformance,
      productPerformance,
      cashPerformance,
      cashPercent: totalValueEstimate === 0 ? 0 : totalCash / totalValueEstimate,
      investedPercent: totalValueEstimate === 0 ? 0 : totalHoldingsMarketValue / totalValueEstimate
    };
  }
}
