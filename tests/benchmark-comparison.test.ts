import test from "node:test";
import assert from "node:assert/strict";
import { BenchmarkComparisonService } from "../src/application/services/BenchmarkComparisonService";
import type { Benchmark, BenchmarkSnapshot, PortfolioSnapshot, Transaction } from "../src/domain/portfolio/types";

function assertClose(actual: number | null, expected: number, tolerance = 1e-10) {
  assert.ok(actual != null);
  assert.ok(Math.abs(actual - expected) < tolerance, `Expected ${actual} to be close to ${expected}`);
}

function benchmark(input: Partial<Benchmark> = {}): Benchmark {
  return {
    id: input.id ?? "benchmark",
    benchmarkKey: input.benchmarkKey ?? "sp500",
    name: input.name ?? "S&P 500",
    benchmarkType: input.benchmarkType ?? "equity",
    symbol: input.symbol ?? "SPY",
    currency: input.currency ?? "USD",
    baseValue: input.baseValue ?? 100,
    components: input.components ?? [],
    providerPrimary: input.providerPrimary ?? "fmp",
    metadata: input.metadata ?? {},
    isActive: input.isActive ?? true
  };
}

function portfolioSnapshot(input: Partial<PortfolioSnapshot>): PortfolioSnapshot {
  return {
    id: input.id ?? `portfolio-${input.snapshotDate}`,
    portfolioId: input.portfolioId ?? "portfolio",
    snapshotDate: input.snapshotDate ?? "2026-01-02",
    totalValue: input.totalValue ?? 100,
    cashValue: input.cashValue ?? 0,
    investedValue: input.investedValue ?? input.totalValue ?? 100,
    currency: input.currency ?? "USD"
  };
}

function benchmarkSnapshot(input: Partial<BenchmarkSnapshot>): BenchmarkSnapshot {
  return {
    id: input.id ?? `benchmark-${input.snapshotDate}`,
    benchmarkId: input.benchmarkId ?? "benchmark",
    benchmarkKey: input.benchmarkKey ?? "sp500",
    snapshotDate: input.snapshotDate ?? "2026-01-02",
    closePrice: input.closePrice ?? input.levelValue ?? 100,
    levelValue: input.levelValue ?? 100,
    dailyReturn: input.dailyReturn ?? null,
    drawdown: input.drawdown ?? null,
    currency: input.currency ?? "USD",
    provider: input.provider ?? "fmp"
  };
}

function transaction(input: Partial<Transaction>): Transaction {
  return {
    id: input.id ?? "tx",
    portfolioId: input.portfolioId ?? "portfolio",
    assetId: input.assetId ?? null,
    transactionType: input.transactionType ?? "deposit_cash",
    assetType: input.assetType ?? null,
    ticker: input.ticker ?? null,
    assetName: input.assetName ?? null,
    accountName: input.accountName ?? null,
    brokerName: input.brokerName ?? null,
    quantity: input.quantity ?? null,
    price: input.price ?? null,
    fees: input.fees ?? 0,
    grossAmount: input.grossAmount ?? null,
    netAmount: input.netAmount ?? null,
    currency: input.currency ?? "USD",
    transactionDate: input.transactionDate ?? "2026-01-03",
    notes: input.notes ?? null
  };
}

test("benchmark comparison uses aligned simple returns", () => {
  const service = new BenchmarkComparisonService();
  const [comparison] = service.calculateComparisons({
    benchmarks: [benchmark()],
    portfolioSnapshots: [
      portfolioSnapshot({ snapshotDate: "2026-01-02", totalValue: 100 }),
      portfolioSnapshot({ snapshotDate: "2026-01-03", totalValue: 110 })
    ],
    benchmarkSnapshots: [
      benchmarkSnapshot({ snapshotDate: "2026-01-02", levelValue: 200 }),
      benchmarkSnapshot({ snapshotDate: "2026-01-03", levelValue: 240 })
    ]
  });

  assertClose(comparison.cumulativePortfolioReturn, 0.1);
  assertClose(comparison.cumulativeBenchmarkReturn, 0.2);
  assertClose(comparison.relativeOutperformance, -0.1);
});

test("portfolio deposits are not counted as benchmark-comparison gains", () => {
  const service = new BenchmarkComparisonService();
  const [comparison] = service.calculateComparisons({
    benchmarks: [benchmark()],
    portfolioSnapshots: [
      portfolioSnapshot({ snapshotDate: "2026-01-02", totalValue: 100 }),
      portfolioSnapshot({ snapshotDate: "2026-01-03", totalValue: 150 })
    ],
    benchmarkSnapshots: [
      benchmarkSnapshot({ snapshotDate: "2026-01-02", levelValue: 100 }),
      benchmarkSnapshot({ snapshotDate: "2026-01-03", levelValue: 110 })
    ],
    transactions: [transaction({ transactionType: "deposit_cash", transactionDate: "2026-01-03", netAmount: 40 })]
  });

  assertClose(comparison.cumulativePortfolioReturn, 10 / 140);
});

test("portfolio withdrawals are not counted as benchmark-comparison losses", () => {
  const service = new BenchmarkComparisonService();
  const [comparison] = service.calculateComparisons({
    benchmarks: [benchmark()],
    portfolioSnapshots: [
      portfolioSnapshot({ snapshotDate: "2026-01-02", totalValue: 100 }),
      portfolioSnapshot({ snapshotDate: "2026-01-03", totalValue: 80 })
    ],
    benchmarkSnapshots: [
      benchmarkSnapshot({ snapshotDate: "2026-01-02", levelValue: 100 }),
      benchmarkSnapshot({ snapshotDate: "2026-01-03", levelValue: 90 })
    ],
    transactions: [transaction({ transactionType: "withdraw_cash", transactionDate: "2026-01-03", netAmount: -30 })]
  });

  assertClose(comparison.cumulativePortfolioReturn, 0.1);
});

test("rolling benchmark returns require a recent baseline", () => {
  const service = new BenchmarkComparisonService();
  const [comparison] = service.calculateComparisons({
    benchmarks: [benchmark()],
    portfolioSnapshots: [
      portfolioSnapshot({ snapshotDate: "2026-01-02", totalValue: 100 }),
      portfolioSnapshot({ snapshotDate: "2026-06-01", totalValue: 120 })
    ],
    benchmarkSnapshots: [
      benchmarkSnapshot({ snapshotDate: "2026-01-02", levelValue: 100 }),
      benchmarkSnapshot({ snapshotDate: "2026-06-01", levelValue: 120 })
    ]
  });

  assert.equal(comparison.rolling1DayPortfolioReturn, null);
  assert.equal(comparison.rolling7DayPortfolioReturn, null);
  assert.equal(comparison.rolling30DayPortfolioReturn, null);
});
