import test from "node:test";
import assert from "node:assert/strict";
import { PerformanceService } from "../src/application/services/PerformanceService";
import type { Transaction } from "../src/domain/portfolio/types";

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
