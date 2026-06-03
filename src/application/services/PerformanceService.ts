import {
  CashSnapshot,
  DailyPrice,
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

function isoDateDaysAgoFrom(baseDateIso: string, days: number) {
  const date = new Date(`${baseDateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function startOfYearIsoDate() {
  return `${new Date().getUTCFullYear()}-01-01`;
}

function startOfYearFromIsoDate(baseDateIso: string) {
  return `${baseDateIso.slice(0, 4)}-01-01`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function findBaselineSnapshot<T extends { snapshotDate: string }>(snapshots: T[], targetDate: string) {
  const sorted = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const onOrBefore = sorted.filter((snapshot) => snapshot.snapshotDate <= targetDate).at(-1);
  return onOrBefore ?? sorted.find((snapshot) => snapshot.snapshotDate >= targetDate);
}

function maxIsoDate(left: string, right: string | null) {
  if (!right) return left;
  return left > right ? left : right;
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

function externalPortfolioFlow(transactions: Transaction[], startExclusive: string, endInclusive: string) {
  return transactions
    .filter((transaction) => transaction.transactionDate > startExclusive && transaction.transactionDate <= endInclusive)
    .reduce((sum, transaction) => {
      if (transaction.transactionType === "deposit_cash") return sum + cashFlowAmount(transaction);
      if (transaction.transactionType === "withdraw_cash") return sum - cashFlowAmount(transaction);
      return sum;
    }, 0);
}

function chainReturn(subperiodReturns: number[]) {
  return subperiodReturns.reduce((product, value) => product * (1 + value), 1) - 1;
}

function isImplausibleProductPeriodReturn(percentChange: number, denominator: number, currentValue: number, buys: number, sells: number) {
  const noOffsettingTrades = buys === 0 && sells === 0;
  const denominatorIsTiny = denominator > 0 && currentValue > 0 && denominator < currentValue * 0.1;
  return noOffsettingTrades && denominatorIsTiny && Math.abs(percentChange) > 10;
}

function findBaselinePrice(prices: DailyPrice[], targetDate: string, minimumDate: string | null) {
  const sorted = [...prices]
    .filter((price) => !minimumDate || price.priceDate >= minimumDate)
    .sort((a, b) => a.priceDate.localeCompare(b.priceDate));
  const onOrBefore = sorted.filter((price) => price.priceDate <= targetDate).at(-1);
  return onOrBefore ?? sorted.find((price) => price.priceDate >= targetDate);
}

function holdingInceptionDate(valuation: HoldingValuation, transactions: Transaction[]) {
  const dates = [
    valuation.holding.firstPurchaseDate,
    ...transactions
      .filter((transaction) => transaction.transactionType === "buy")
      .map((transaction) => transaction.transactionDate)
  ].filter((date): date is string => Boolean(date));
  return dates.length === 0 ? null : dates.sort()[0];
}

function buildHoldingPriceMetric(
  label: PerformanceMetric["label"],
  valuation: HoldingValuation,
  priceHistory: DailyPrice[],
  targetDate: string,
  minimumDate: string | null,
  baselineDate: string | null
): PerformanceMetric {
  const currentPrice = valuation.unitPrice;
  const effectiveTargetDate = maxIsoDate(targetDate, minimumDate);
  const baseline = findBaselinePrice(priceHistory, effectiveTargetDate, minimumDate);
  if (!baseline || currentPrice == null || baseline.closePrice === 0) {
    return { label, valueChange: null, percentChange: null, baselineDate };
  }

  const baselineValue = baseline.closePrice * valuation.holding.quantity;
  const valueChange = valuation.value - baselineValue;
  return {
    label,
    valueChange,
    percentChange: currentPrice / baseline.closePrice - 1,
    baselineDate: baseline.priceDate
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
      this.buildPortfolioTwrMetric("Daily", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(1), input.investedAmount + input.cashAmount),
      this.buildPortfolioTwrMetric("Weekly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(7), input.investedAmount + input.cashAmount),
      this.buildPortfolioTwrMetric("Monthly", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(30), input.investedAmount + input.cashAmount),
      this.buildPortfolioTwrMetric("1Y", input.currentValue, input.snapshots, input.transactions, isoDateDaysAgo(365), input.investedAmount + input.cashAmount),
      this.buildPortfolioTwrMetric("YTD", input.currentValue, input.snapshots, input.transactions, startOfYearIsoDate(), input.investedAmount + input.cashAmount),
      this.buildPortfolioSinceInceptionMetric(input.currentValue, input.investedAmount, input.cashAmount, input.snapshots, input.transactions)
    ];
  }

  calculateProductPerformance(input: {
    valuation: HoldingValuation;
    snapshots: HoldingSnapshot[];
    transactions: Transaction[];
    priceHistory?: DailyPrice[];
  }): PerformanceMetric[] {
    const inceptionDate = holdingInceptionDate(input.valuation, input.transactions);
    const holdingSnapshots = input.snapshots.filter((snapshot) => {
      return snapshot.holdingId === input.valuation.holding.id && (!inceptionDate || snapshot.snapshotDate >= inceptionDate);
    });
    const priceHistory = input.priceHistory ?? [];
    const currentDate = input.valuation.priceDate ?? todayIsoDate();
    return [
      this.buildHoldingFlowAdjustedMetric("Daily", input.valuation, holdingSnapshots, input.transactions, priceHistory, isoDateDaysAgoFrom(currentDate, 1), inceptionDate),
      this.buildHoldingFlowAdjustedMetric("Weekly", input.valuation, holdingSnapshots, input.transactions, priceHistory, isoDateDaysAgoFrom(currentDate, 7), inceptionDate),
      this.buildHoldingFlowAdjustedMetric("Monthly", input.valuation, holdingSnapshots, input.transactions, priceHistory, isoDateDaysAgoFrom(currentDate, 30), inceptionDate),
      this.buildHoldingFlowAdjustedMetric("1Y", input.valuation, holdingSnapshots, input.transactions, priceHistory, isoDateDaysAgoFrom(currentDate, 365), inceptionDate),
      this.buildHoldingFlowAdjustedMetric("YTD", input.valuation, holdingSnapshots, input.transactions, priceHistory, startOfYearFromIsoDate(currentDate), inceptionDate),
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

  private buildPortfolioTwrMetric(
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
    const valueChange = currentValue - baseline.totalValue - deposits + withdrawals;
    if (useManualCapitalBase) {
      const manualValueChange = currentValue + withdrawals - manualCapitalBase;
      return {
        label,
        valueChange: manualValueChange,
        percentChange: manualCapitalBase === 0 ? null : manualValueChange / manualCapitalBase,
        baselineDate: baseline.snapshotDate
      };
    }

    const orderedSnapshots = [...snapshots]
      .filter((snapshot) => snapshot.snapshotDate >= baseline.snapshotDate && snapshot.snapshotDate <= currentDate)
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const lastSnapshot = orderedSnapshots.at(-1);
    const endpoint: PortfolioSnapshot = {
      id: "current",
      portfolioId: baseline.portfolioId,
      snapshotDate: currentDate,
      totalValue: currentValue,
      cashValue: 0,
      investedValue: currentValue,
      currency: baseline.currency
    };
    const series = lastSnapshot && lastSnapshot.snapshotDate === currentDate
      ? orderedSnapshots
      : [...orderedSnapshots, endpoint];
    const returns: number[] = [];
    for (let index = 1; index < series.length; index += 1) {
      const previous = series[index - 1];
      const current = series[index];
      if (previous.totalValue === 0) continue;
      const netFlow = externalPortfolioFlow(transactions, previous.snapshotDate, current.snapshotDate);
      returns.push((current.totalValue - netFlow) / previous.totalValue - 1);
    }

    return {
      label,
      valueChange,
      percentChange: returns.length === 0 ? null : chainReturn(returns),
      baselineDate: baseline.snapshotDate
    };
  }

  private buildPortfolioSinceInceptionMetric(
    currentValue: number,
    investedAmount: number,
    cashAmount: number,
    snapshots: PortfolioSnapshot[],
    transactions: Transaction[]
  ): PerformanceMetric {
    if (snapshots.length > 0) {
      const firstSnapshot = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[0];
      return this.buildPortfolioTwrMetric(
        "Since inception",
        currentValue,
        snapshots,
        transactions,
        firstSnapshot.snapshotDate,
        investedAmount + cashAmount
      );
    }

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
    valuation: HoldingValuation,
    snapshots: HoldingSnapshot[],
    transactions: Transaction[],
    priceHistory: DailyPrice[],
    targetDate: string,
    inceptionDate: string | null
  ): PerformanceMetric {
    const effectiveTargetDate = maxIsoDate(targetDate, inceptionDate);
    const baseline = findBaselineSnapshot(snapshots, effectiveTargetDate);
    if (!baseline) return buildHoldingPriceMetric(label, valuation, priceHistory, targetDate, inceptionDate, null);

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
    const valueChange = valuation.value - baseline.marketValue - buys + sells + income - fees;
    const denominator = baseline.marketValue + buys;
    const percentChange = denominator === 0 ? null : valueChange / denominator;
    if (
      percentChange != null &&
      isImplausibleProductPeriodReturn(percentChange, denominator, valuation.value, buys, sells)
    ) {
      return buildHoldingPriceMetric(label, valuation, priceHistory, targetDate, inceptionDate, baseline.snapshotDate);
    }
    return {
      label,
      valueChange,
      percentChange,
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
