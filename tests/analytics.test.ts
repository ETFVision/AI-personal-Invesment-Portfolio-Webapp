import test from "node:test";
import assert from "node:assert/strict";
import { AllocationService } from "../src/application/services/AllocationService";
import { AnalyticsService } from "../src/application/services/AnalyticsService";
import { PerformanceService } from "../src/application/services/PerformanceService";
import type { CashBalance, Holding, HoldingValuation, PortfolioSnapshot } from "../src/domain/portfolio/types";

function holding(): Holding {
  return {
    id: "holding",
    portfolioId: "portfolio",
    assetId: "asset",
    assetType: "etf",
    ticker: "VOO",
    assetName: "Vanguard S&P 500 ETF",
    accountName: null,
    brokerName: null,
    quantity: 10,
    averageCost: 100,
    costCurrency: "USD",
    firstPurchaseDate: "2026-05-01",
    notes: null
  };
}

function cashBalance(): CashBalance {
  return {
    id: "cash",
    portfolioId: "portfolio",
    accountName: null,
    brokerName: null,
    currency: "USD",
    amount: 100,
    asOfDate: "2026-06-01",
    notes: null
  };
}

function snapshot(date: string, value: number): PortfolioSnapshot {
  return {
    id: `snapshot-${date}`,
    portfolioId: "portfolio",
    snapshotDate: date,
    totalValue: value,
    cashValue: value,
    investedValue: 0,
    currency: "USD"
  };
}

test("dashboard long-term performance ignores tiny stale snapshots when manual capital history is incomplete", () => {
  const service = new AnalyticsService(new AllocationService(), new PerformanceService());
  const position = holding();
  const dashboard = service.calculateDashboardAnalytics({
    cashBalances: [cashBalance()],
    holdings: [position],
    holdingValuations: [{
      holding: position,
      unitPrice: 120,
      value: 1200,
      valueCurrency: "USD",
      priceDate: "2026-06-01",
      priceProvider: "test",
      valuationSource: "market_price"
    } satisfies HoldingValuation],
    transactions: [],
    snapshots: [snapshot("2025-06-01", 10), snapshot("2026-01-01", 10)],
    holdingSnapshots: [],
    cashSnapshots: []
  });

  const oneYear = dashboard.performance.find((metric) => metric.label === "1Y");
  const ytd = dashboard.performance.find((metric) => metric.label === "YTD");
  const sinceInception = dashboard.performance.find((metric) => metric.label === "Since inception");

  assert.equal(oneYear?.percentChange, 200 / 1100);
  assert.equal(ytd?.percentChange, 200 / 1100);
  assert.equal(sinceInception?.percentChange, 200 / 1100);
});
