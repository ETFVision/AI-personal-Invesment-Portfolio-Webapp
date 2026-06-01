import test from "node:test";
import assert from "node:assert/strict";
import { PerformanceService } from "../src/application/services/PerformanceService";
import type { PortfolioSnapshot, Transaction } from "../src/domain/portfolio/types";

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
    transactionDate: input.transactionDate ?? "2026-01-01",
    notes: input.notes ?? null
  };
}

function snapshot(input: Partial<PortfolioSnapshot>): PortfolioSnapshot {
  return {
    id: input.id ?? "snapshot",
    portfolioId: input.portfolioId ?? "portfolio",
    snapshotDate: input.snapshotDate ?? "2026-01-01",
    totalValue: input.totalValue ?? 0,
    cashValue: input.cashValue ?? 0,
    investedValue: input.investedValue ?? 0,
    currency: input.currency ?? "USD"
  };
}

test("portfolio since inception uses manual capital base when deposits are incomplete", () => {
  const service = new PerformanceService();
  const metrics = service.calculatePortfolioPerformance({
    currentValue: 13_600,
    investedAmount: 13_000,
    cashAmount: 500,
    snapshots: [],
    transactions: [transaction({ netAmount: 100 })]
  });

  const sinceInception = metrics.find((metric) => metric.label === "Since inception");
  assert.equal(sinceInception?.valueChange, 100);
  assert.equal(sinceInception?.percentChange, 100 / 13_500);
});

test("portfolio 1Y and YTD fall back to manual capital base when snapshots predate manual capital", () => {
  const service = new PerformanceService();
  const metrics = service.calculatePortfolioPerformance({
    currentValue: 13_600,
    investedAmount: 13_000,
    cashAmount: 500,
    snapshots: [
      snapshot({ snapshotDate: "2025-01-01", totalValue: 100 }),
      snapshot({ snapshotDate: "2026-01-01", totalValue: 100 })
    ],
    transactions: []
  });

  const oneYear = metrics.find((metric) => metric.label === "1Y");
  const ytd = metrics.find((metric) => metric.label === "YTD");
  assert.equal(oneYear?.valueChange, 100);
  assert.equal(oneYear?.percentChange, 100 / 13_500);
  assert.equal(ytd?.valueChange, 100);
  assert.equal(ytd?.percentChange, 100 / 13_500);
});

test("portfolio YTD uses first available snapshot when portfolio starts after year start", () => {
  const service = new PerformanceService();
  const metrics = service.calculatePortfolioPerformance({
    currentValue: 12_000,
    investedAmount: 10_000,
    cashAmount: 0,
    snapshots: [snapshot({ snapshotDate: "2026-02-01", totalValue: 10_000 })],
    transactions: []
  });

  const ytd = metrics.find((metric) => metric.label === "YTD");
  assert.equal(ytd?.baselineDate, "2026-02-01");
  assert.equal(ytd?.valueChange, 2_000);
  assert.equal(ytd?.percentChange, 0.2);
});

test("portfolio period returns ignore future-dated cash flows", () => {
  const service = new PerformanceService();
  const metrics = service.calculatePortfolioPerformance({
    currentValue: 12_000,
    investedAmount: 10_000,
    cashAmount: 0,
    snapshots: [snapshot({ snapshotDate: "2026-01-01", totalValue: 10_000 })],
    transactions: [
      transaction({ transactionType: "deposit_cash", transactionDate: "2099-01-01", netAmount: 50_000 })
    ]
  });

  const sinceYearStart = metrics.find((metric) => metric.label === "YTD");
  assert.equal(sinceYearStart?.valueChange, 2_000);
  assert.equal(sinceYearStart?.percentChange, 0.2);
});
