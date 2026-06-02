import { AllocationService } from "@/application/services/AllocationService";
import { PerformanceService } from "@/application/services/PerformanceService";
import {
  CashBalance,
  CashPerformance,
  CashSnapshot,
  DailyPrice,
  Holding,
  HoldingMarketMetric,
  HoldingSnapshot,
  HoldingValuation,
  PerformanceMetric,
  ProductPerformance,
  PortfolioCurrentMetric,
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
  holdingMarketMetrics?: HoldingMarketMetric[];
  portfolioCurrentMetric?: PortfolioCurrentMetric | null;
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

function periodValueChange(currentValue: number, percentChange: number | null) {
  if (percentChange == null || !Number.isFinite(percentChange) || percentChange <= -1) return null;
  const baselineValue = currentValue / (1 + percentChange);
  return currentValue - baselineValue;
}

function derivedProductMetrics(valuation: HoldingValuation, metric: HoldingMarketMetric): PerformanceMetric[] {
  const build = (
    label: PerformanceMetric["label"],
    percentChange: number | null,
    baselineDate: string | null = null
  ): PerformanceMetric => ({
    label,
    percentChange,
    valueChange: periodValueChange(valuation.value, percentChange),
    baselineDate
  });

  return [
    build("Daily", metric.dailyReturn),
    build("Weekly", metric.weeklyReturn),
    build("Monthly", metric.monthlyReturn),
    build("1Y", metric.oneYearReturn),
    build("YTD", metric.ytdReturn),
    build("Since inception", metric.sinceInceptionReturn, valuation.holding.firstPurchaseDate)
  ];
}

export class AnalyticsService {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly performanceService: PerformanceService
  ) {}

  calculateDashboardAnalytics(input: DashboardAnalyticsInput) {
    const derivedPortfolioMetric = input.portfolioCurrentMetric;
    let totalCash = input.cashBalances.reduce((sum, item) => sum + Number(item.amount), 0);
    let totalHoldingsCost = input.holdings.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.averageCost ?? 0),
      0
    );
    let totalHoldingsMarketValue = input.holdingValuations.reduce((sum, item) => sum + item.value, 0);
    let totalValueEstimate = totalCash + totalHoldingsMarketValue;
    let investedAmount = totalHoldingsCost;
    let unrealizedGainLoss = totalHoldingsMarketValue - investedAmount;
    let unrealizedGainLossPercent = investedAmount === 0 ? 0 : unrealizedGainLoss / investedAmount;
    if (derivedPortfolioMetric) {
      totalCash = derivedPortfolioMetric.totalCash;
      totalHoldingsCost = derivedPortfolioMetric.investedAmount;
      totalHoldingsMarketValue = derivedPortfolioMetric.totalHoldingsMarketValue;
      totalValueEstimate = derivedPortfolioMetric.totalValueEstimate;
      investedAmount = derivedPortfolioMetric.investedAmount;
      unrealizedGainLoss = derivedPortfolioMetric.unrealizedGainLoss;
      unrealizedGainLossPercent = derivedPortfolioMetric.unrealizedGainLossPercent;
    }
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
    const holdingMetricById = new Map((input.holdingMarketMetrics ?? []).map((metric) => [metric.holdingId, metric]));

    const productPerformance: ProductPerformance[] = input.holdingValuations.map((valuation) => {
      const productTransactions = input.transactions.filter((transaction) => transactionMatchesHolding(transaction, valuation.holding));
      const realized = calculateRealizedGainLoss(productTransactions);
      const costBasis = valuation.holding.quantity * (valuation.holding.averageCost ?? 0);
      const unrealized = valuation.value - costBasis;
      const derivedMetric = holdingMetricById.get(valuation.holding.id);
      return {
        holdingId: valuation.holding.id,
        assetId: valuation.holding.assetId,
        metrics: derivedMetric
          ? derivedProductMetrics(valuation, derivedMetric)
          : this.performanceService.calculateProductPerformance({
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
