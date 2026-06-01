import {
  CashSnapshot,
  HoldingValuation,
  HoldingSnapshot,
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function findBaselineSnapshot<T extends { snapshotDate: string }>(snapshots: T[], targetDate: string) {
  const sorted = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const onOrBefore = sorted.filter((snapshot) => snapshot.snapshotDate <= targetDate).at(-1);
  return onOrBefore ?? sorted.find((snapshot) => snapshot.snapshotDate >= targetDate);
}

function transactionAmount(transaction: Transaction) {
  const gross = transaction.quantity && transaction.price ? transaction.quantity * transaction.price : 0;
  if (gross !== 0) return gross;
  return transaction.grossAmount ?? Math.abs(transaction.netAmount ?? 0);
}

function cashFlowAmount(transaction: Transaction) {
  return Math.abs(transaction.netAmount ?? transaction.grossAmount ?? transactionAmount(transaction));
}

function buildSnapshotMetric(
  label: PerformanceMetric["label"],
  currentValue: number,
  snapshots: PortfolioSnapshot[],
  targetDate: string
): PerformanceMetric {
  const baseline = findBaselineSnapshot(snapshots, targetDate);

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
    cashAmount: number;
    snapshots: PortfolioSnapshot[];
    transactions: Transaction[];
  }): PerformanceMetric[] {
    return [
      this.buildPortfolioFlowAdjustedMetric("Daily", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(1), input.investedAmount + input.cashAmount),
      this.buildPortfolioFlowAdjustedMetric("Weekly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(7), input.investedAmount + input.cashAmount),
      this.buildPortfolioFlowAdjustedMetric("Monthly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(30), input.investedAmount + input.cashAmount),
      this.buildPortfolioFlowAdjustedMetric("1Y", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(365), input.investedAmount + input.cashAmount),
      this.buildPortfolioFlowAdjustedMetric("YTD", input.currentValue, input.snapshots, input.transactions, startOfYearIsoDate(), input.investedAmount + input.cashAmount),
      this.buildPortfolioSinceInceptionMetric(input.currentValue, input.investedAmount, input.cashAmount, input.transactions)
    ];
  }

  calculateProductPerformance(input: {
    valuation: HoldingValuation;
    snapshots: HoldingSnapshot[];
    transactions: Transaction[];
  }): PerformanceMetric[] {
    const holdingSnapshots = input.snapshots.filter((snapshot) => snapshot.holdingId === input.valuation.holding.id);
    return [
      this.buildHoldingFlowAdjustedMetric("Daily", input.valuation.value, holdingSnapshots, input.transactions, isoDateDaysAgo(1)),
      this.buildHoldingFlowAdjustedMetric("Weekly", input.valuation.value, holdingSnapshots, input.transactions, isoDateDaysAgo(7)),
      this.buildHoldingFlowAdjustedMetric("Monthly", input.valuation.value, holdingSnapshots, input.transactions, isoDateDaysAgo(30)),
      this.buildHoldingFlowAdjustedMetric("1Y", input.valuation.value, holdingSnapshots, input.transactions, isoDateDaysAgo(365)),
      this.buildHoldingFlowAdjustedMetric("YTD", input.valuation.value, holdingSnapshots, input.transactions, startOfYearIsoDate()),
      this.buildAssetSinceInceptionMetric(input.valuation, input.transactions)
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
      this.buildCashFlowAdjustedMetric("1Y", input.currentAmount, cashSnapshots, input.transactions, isoDateDaysAgo(365)),
      this.buildCashFlowAdjustedMetric("YTD", input.currentAmount, cashSnapshots, input.transactions, startOfYearIsoDate()),
      this.buildCashSinceInceptionMetric(input.currentAmount, input.transactions)
    ];
  }

  private buildPortfolioFlowAdjustedMetric(
    label: PerformanceMetric["label"],
    currentValue: number,
    snapshots: PortfolioSnapshot[],
    transactions: Transaction[],
    targetDate: string,
    manualCapitalBase = 0
  ): PerformanceMetric {
    const baseline = findBaselineSnapshot(snapshots, targetDate);
    if (!baseline) return buildSnapshotMetric(label, currentValue, snapshots, targetDate);

    const currentDate = todayIsoDate();
    const periodTransactions = transactions.filter(
      (transaction) => transaction.transactionDate > baseline.snapshotDate && transaction.transactionDate <= currentDate
    );
    const deposits = periodTransactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const withdrawals = periodTransactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const snapshotCapitalBase = baseline.totalValue + deposits;
    const useManualCapitalBase = manualCapitalBase > 0 && snapshotCapitalBase < manualCapitalBase * 0.8;
    const denominator = useManualCapitalBase ? manualCapitalBase : snapshotCapitalBase;
    const valueChange = useManualCapitalBase
      ? currentValue + withdrawals - manualCapitalBase
      : currentValue - baseline.totalValue - deposits + withdrawals;
    return {
      label,
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: baseline.snapshotDate
    };
  }

  private buildPortfolioSinceInceptionMetric(
    currentValue: number,
    investedAmount: number,
    cashAmount: number,
    transactions: Transaction[]
  ): PerformanceMetric {
    const deposits = transactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const withdrawals = transactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const capitalFallback = investedAmount + cashAmount;
    const netRecordedCapital = Math.max(0, deposits - withdrawals);
    const denominator = Math.max(netRecordedCapital, capitalFallback);
    const valueChange = currentValue + withdrawals - denominator;
    return {
      label: "Since inception",
      valueChange,
      percentChange: denominator === 0 ? null : valueChange / denominator,
      baselineDate: null
    };
  }

  private buildHoldingFlowAdjustedMetric(
    label: PerformanceMetric["label"],
    currentValue: number,
    snapshots: HoldingSnapshot[],
    transactions: Transaction[],
    targetDate: string
  ): PerformanceMetric {
    const baseline = findBaselineSnapshot(snapshots, targetDate);
    if (!baseline) return { label, valueChange: null, percentChange: null, baselineDate: null };

    const currentDate = todayIsoDate();
    const periodTransactions = transactions.filter(
      (transaction) => transaction.transactionDate > baseline.snapshotDate && transaction.transactionDate <= currentDate
    );
    const buys = periodTransactions
      .filter((transaction) => transaction.transactionType === "buy")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) + transaction.fees, 0);
    const sells = periodTransactions
      .filter((transaction) => transaction.transactionType === "sell")
      .reduce((sum, transaction) => sum + transactionAmount(transaction) - transaction.fees, 0);
    const income = periodTransactions
      .filter((transaction) => transaction.transactionType === "dividend")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
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
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
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
    const baseline = findBaselineSnapshot(snapshots, targetDate);
    if (!baseline) return { label, valueChange: null, percentChange: null, baselineDate: null };

    const currentDate = todayIsoDate();
    const periodTransactions = transactions.filter(
      (transaction) => transaction.transactionDate > baseline.snapshotDate && transaction.transactionDate <= currentDate
    );
    const deposits = periodTransactions
      .filter((transaction) => transaction.transactionType === "deposit_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const withdrawals = periodTransactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
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
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const withdrawals = transactions
      .filter((transaction) => transaction.transactionType === "withdraw_cash")
      .reduce((sum, transaction) => sum + cashFlowAmount(transaction), 0);
    const valueChange = currentAmount - deposits + withdrawals;
    return {
      label: "Since inception",
      valueChange,
      percentChange: deposits === 0 ? null : valueChange / deposits,
      baselineDate: null
    };
  }
}
