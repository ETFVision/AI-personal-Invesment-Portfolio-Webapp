import {
  AssetSnapshot,
  CashSnapshot,
  HoldingValuation,
  PerformanceMetric,
  PortfolioSnapshot,
  Transaction
} from "@/domain/portfolio/types";

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function startOfYearIsoDate() {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function transactionAmount(transaction: Transaction) {
  const gross = transaction.quantity && transaction.price ? transaction.quantity * transaction.price : 0;
  if (gross !== 0) return gross;
  return Math.abs(transaction.netAmount ?? transaction.grossAmount ?? 0);
}

function buildSnapshotMetric(
  label: PerformanceMetric["label"],
  currentValue: number,
  snapshots: PortfolioSnapshot[],
  targetDate: string
): PerformanceMetric {
  const baseline = snapshots
    .filter((snapshot) => snapshot.snapshotDate <= targetDate)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];

  if (!baseline || baseline.totalValue === 0) {
    return {
      label,
      valueChange: null,
      percentChange: null,
      baselineDate: null
    };
  }

  const valueChange = currentValue - baseline.totalValue;
  return {
    label,
    valueChange,
    percentChange: valueChange / baseline.totalValue,
    baselineDate: baseline.snapshotDate
  };
}

export class PerformanceService {
  calculatePortfolioPerformance(input: {
    currentValue: number;
    investedAmount: number;
    snapshots: PortfolioSnapshot[];
    transactions: Transaction[];
  }): PerformanceMetric[] {
    return [
      this.buildPortfolioFlowAdjustedMetric("Daily", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(1)),
      this.buildPortfolioFlowAdjustedMetric("Weekly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(7)),
      this.buildPortfolioFlowAdjustedMetric("Monthly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(30)),
      this.buildPortfolioFlowAdjustedMetric("YTD", input.currentValue, input.snapshots, input.transactions, startOfYearIsoDate()),
      this.buildPortfolioSinceInceptionMetric(input.currentValue, input.investedAmount, input.transactions)
    ];
  }

  calculateProductPerformance(input: {
    valuation: HoldingValuation;
    snapshots: AssetSnapshot[];
    transactions: Transaction[];
  }): PerformanceMetric[] {
    const assetSnapshots = input.snapshots.filter((snapshot) => snapshot.assetId === input.valuation.holding.assetId);
    const assetTransactions = input.transactions.filter((transaction) => transaction.assetId === input.valuation.holding.assetId);
    return [
      this.buildAssetFlowAdjustedMetric("Daily", input.valuation.value, assetSnapshots, assetTransactions, isoDateDaysAgo(1)),
      this.buildAssetFlowAdjustedMetric("Weekly", input.valuation.value, assetSnapshots, assetTransactions, isoDateDaysAgo(7)),
      this.buildAssetFlowAdjustedMetric("Monthly", input.valuation.value, assetSnapshots, assetTransactions, isoDateDaysAgo(30)),
      this.buildAssetFlowAdjustedMetric("YTD", input.valuation.value, assetSnapshots, assetTransactions, startOfYearIsoDate()),
      this.buildAssetSinceInceptionMetric(input.valuation, assetTransactions)
    ];
  }

  calculateCashPerformance(input: {
    cashBalanceId: string;
    currentAmount: number;
    snapshots: CashSnapshot[];
    transactions: Transaction[];
  }): PerformanceMetric[] {
    const cashSnapshots = input.snapshots.filter((snapshot) => snapshot.cashBalanceId === input.cashBalanceId);
    return [
      this.buildCashFlowAdjustedMetric("Daily", input.currentAmount, cashSnapshots, input.transactions, isoDateDaysAgo(1)),
      this.buildCashFlowAdjustedMetric("Weekly", input.currentAmount, cashSnapshots, input.transactions, isoDateDaysAgo(7)),
      this.buildCashFlowAdjustedMetric("Monthly", input.currentAmount, cashSnapshots, input.transactions, isoDateDaysAgo(30)),
      this.buildCashFlowAdjustedMetric("YTD", input.currentAmount, cashSnapshots, input.transactions, startOfYearIsoDate()),
      this.buildCashSinceInceptionMetric(input.currentAmount, input.transactions)
    ];
  }

  private buildPortfolioFlowAdjustedMetric(
    label: PerformanceMetric["label"],
    currentValue: number,
    snapshots: PortfolioSnapshot[],
    transactions: Transaction[],
    targetDate: string
  ): PerformanceMetric {
    const baseline = snapshots
      .filter((snapshot) => snapshot.snapshotDate <= targetDate)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
    if (!baseline) return buildSnapshotMetric(label, currentValue, snapshots, targetDate);

    const periodTransactions = transactions.filter((transaction) => transaction.transactionDate > baseline.snapshotDate);
    const deposits = periodTransactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const withdrawals = periodTransactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const valueChange = currentValue - baseline.totalValue - deposits + withdrawals;
    const denominator = baseline.totalValue + deposits;
    return {
      label,
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: baseline.snapshotDate
    };
  }

  private buildPortfolioSinceInceptionMetric(currentValue: number, investedAmount: number, transactions: Transaction[]): PerformanceMetric {
    const deposits = transactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const withdrawals = transactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const denominator = deposits > 0 ? deposits : investedAmount;
    const valueChange = currentValue - deposits + withdrawals;
    return {
      label: "Since inception",
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: null
    };
  }

  private buildAssetFlowAdjustedMetric(
    label: PerformanceMetric["label"],
    currentValue: number,
    snapshots: AssetSnapshot[],
    transactions: Transaction[],
    targetDate: string
  ): PerformanceMetric {
    const baseline = snapshots
      .filter((snapshot) => snapshot.snapshotDate <= targetDate)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
    if (!baseline) return { label, valueChange: null, percentChange: null, baselineDate: null };

    const periodTransactions = transactions.filter((transaction) => transaction.transactionDate > baseline.snapshotDate);
    const buys = periodTransactions
      .filter((transaction) => transaction.transactionType === "buy")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) + transaction.fees, 0);
    const sells = periodTransactions
      .filter((transaction) => transaction.transactionType === "sell")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) - transaction.fees, 0);
    const income = periodTransactions
      .filter((transaction) => transaction.transactionType === "dividend")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const fees = periodTransactions
      .filter((transaction) => transaction.transactionType === "fee")
      .reduce((sum, transaction) => sum + transaction.fees + transactionAmount(transaction), 0);
    const valueChange = currentValue - baseline.marketValue - buys + sells + income - fees;
    const denominator = baseline.marketValue + buys;
    return {
      label,
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: baseline.snapshotDate
    };
  }

  private buildAssetSinceInceptionMetric(valuation: HoldingValuation, transactions: Transaction[]): PerformanceMetric {
    const buys = transactions
      .filter((transaction) => transaction.transactionType === "buy")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) + transaction.fees, 0);
    const sells = transactions
      .filter((transaction) => transaction.transactionType === "sell")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) - transaction.fees, 0);
    const income = transactions
      .filter((transaction) => transaction.transactionType === "dividend")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const costBasisFallback = valuation.holding.quantity * (valuation.holding.averageCost ?? 0);
    const denominator = buys > 0 ? buys : costBasisFallback;
    const valueChange = valuation.value + sells + income - denominator;
    return {
      label: "Since inception",
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: valuation.holding.firstPurchaseDate
    };
  }

  private buildCashFlowAdjustedMetric(
    label: PerformanceMetric["label"],
    currentAmount: number,
    snapshots: CashSnapshot[],
    transactions: Transaction[],
    targetDate: string
  ): PerformanceMetric {
    const baseline = snapshots
      .filter((snapshot) => snapshot.snapshotDate <= targetDate)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
    if (!baseline) return { label, valueChange: null, percentChange: null, baselineDate: null };

    const periodTransactions = transactions.filter((transaction) => transaction.transactionDate > baseline.snapshotDate);
    const deposits = periodTransactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const withdrawals = periodTransactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const valueChange = currentAmount - baseline.amount - deposits + withdrawals;
    const denominator = baseline.amount + deposits;
    return {
      label,
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: baseline.snapshotDate
    };
  }

  private buildCashSinceInceptionMetric(currentAmount: number, transactions: Transaction[]): PerformanceMetric {
    const deposits = transactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const withdrawals = transactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + Math.abs(transaction.netAmount ?? transactionAmount(transaction)), 0);
    const valueChange = currentAmount - deposits + withdrawals;
    return {
      label: "Since inception",
      valueChange,
      percentChange: deposits === 0 ? null : valueChange / deposits,
      baselineDate: null
    };
  }
}
