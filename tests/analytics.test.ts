import test from "node:test";
import assert from "node:assert/strict";
import { AllocationService } from "../src/application/services/AllocationService";
import { AnalyticsService } from "../src/application/services/AnalyticsService";
import { PerformanceService } from "../src/application/services/PerformanceService";
import { PortfolioService } from "../src/application/services/PortfolioService";
import type { CashBalance, Holding, HoldingMarketMetric, HoldingValuation, PortfolioSnapshot } from "../src/domain/portfolio/types";

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
  const daily = dashboard.performance.find((metric) => metric.label === "Daily");

  assert.equal(daily?.percentChange, 200 / 1100);
  assert.equal(oneYear?.percentChange, 200 / 1100);
  assert.equal(ytd?.percentChange, 200 / 1100);
  assert.equal(sinceInception?.percentChange, 200 / 1100);
});

test("dashboard product performance prefers derived holding market metrics", () => {
  const service = new AnalyticsService(new AllocationService(), new PerformanceService());
  const position = holding();
  const derivedMetric: HoldingMarketMetric = {
    holdingId: position.id,
    instrumentId: "instrument",
    latestPrice: 120,
    latestPriceDate: "2026-06-01",
    marketValue: 1200,
    dailyReturn: 0.01,
    weeklyReturn: 0.05,
    monthlyReturn: 0.05,
    ytdReturn: 0.05,
    oneYearReturn: 0.05,
    threeYearReturn: null,
    fiveYearReturn: null,
    sinceInceptionReturn: 0.2,
    fiftyTwoWeekLow: 90,
    fiftyTwoWeekHigh: 120,
    updatedAt: "2026-06-01T00:00:00Z"
  };

  const dashboard = service.calculateDashboardAnalytics({
    cashBalances: [],
    holdings: [position],
    holdingValuations: [{
      holding: position,
      unitPrice: 120,
      value: 1200,
      valueCurrency: "USD",
      priceDate: "2026-06-01",
      priceProvider: "derived_instrument_metrics",
      valuationSource: "market_price"
    } satisfies HoldingValuation],
    transactions: [],
    snapshots: [],
    holdingSnapshots: [],
    cashSnapshots: [],
    dailyPrices: [],
    holdingMarketMetrics: [derivedMetric]
  });

  const product = dashboard.productPerformance[0];
  assert.equal(product.metrics.find((metric) => metric.label === "Weekly")?.percentChange, 0.05);
  assert.equal(product.metrics.find((metric) => metric.label === "Monthly")?.percentChange, 0.05);
  assert.equal(product.metrics.find((metric) => metric.label === "1Y")?.percentChange, 0.05);
  assert.equal(product.metrics.find((metric) => metric.label === "YTD")?.percentChange, 0.05);
  assert.equal(product.metrics.find((metric) => metric.label === "Since inception")?.percentChange, 0.2);
});

test("dashboard product performance falls back from sparse zero baselines to inception return", () => {
  const service = new AnalyticsService(new AllocationService(), new PerformanceService());
  const position = holding();
  const derivedMetric: HoldingMarketMetric = {
    holdingId: position.id,
    instrumentId: "instrument",
    latestPrice: 102.82,
    latestPriceDate: "2026-06-01",
    marketValue: 1028.2,
    dailyReturn: -0.014,
    weeklyReturn: 0,
    monthlyReturn: 0,
    ytdReturn: 0,
    oneYearReturn: 0,
    threeYearReturn: null,
    fiveYearReturn: null,
    sinceInceptionReturn: 0.0282,
    fiftyTwoWeekLow: null,
    fiftyTwoWeekHigh: null,
    updatedAt: "2026-06-01T00:00:00Z"
  };

  const dashboard = service.calculateDashboardAnalytics({
    cashBalances: [],
    holdings: [position],
    holdingValuations: [{
      holding: position,
      unitPrice: 102.82,
      value: 1028.2,
      valueCurrency: "USD",
      priceDate: "2026-06-01",
      priceProvider: "derived_instrument_metrics",
      valuationSource: "market_price"
    } satisfies HoldingValuation],
    transactions: [],
    snapshots: [],
    holdingSnapshots: [],
    cashSnapshots: [],
    dailyPrices: [],
    holdingMarketMetrics: [derivedMetric]
  });

  const product = dashboard.productPerformance[0];
  assert.equal(product.metrics.find((metric) => metric.label === "Daily")?.percentChange, -0.014);
  assert.equal(product.metrics.find((metric) => metric.label === "Weekly")?.percentChange, 0.0282);
  assert.equal(product.metrics.find((metric) => metric.label === "Monthly")?.percentChange, 0.0282);
  assert.equal(product.metrics.find((metric) => metric.label === "1Y")?.percentChange, 0.0282);
  assert.equal(product.metrics.find((metric) => metric.label === "YTD")?.percentChange, 0.0282);
});

test("portfolio analytics snapshot refreshes holding metrics before reading dashboard", async () => {
  const calls: string[] = [];
  const position = holding();
  const repository = {
    listCashBalances: async (portfolioId: string) => {
      calls.push(`dashboard:${portfolioId}`);
      return [cashBalance()];
    },
    listHoldings: async () => [position],
    listTransactions: async () => [],
    getPortfolioById: async (portfolioId: string) => ({
      id: portfolioId,
      userId: "user",
      name: "Portfolio",
      baseCurrency: "USD",
      isDefault: true
    })
  };
  const analyticsRepository = {
    refreshHoldingPortfolioMetrics: async (portfolioId: string) => {
      calls.push(`refresh:${portfolioId}`);
    },
    listPortfolioSnapshots: async () => [],
    listCashSnapshots: async () => [],
    listHoldingMarketMetrics: async () => [{
      holdingId: position.id,
      instrumentId: "instrument",
      latestPrice: 120,
      latestPriceDate: "2026-06-26",
      marketValue: 1200,
      dailyReturn: null,
      weeklyReturn: null,
      monthlyReturn: null,
      ytdReturn: null,
      oneYearReturn: null,
      threeYearReturn: null,
      fiveYearReturn: null,
      sinceInceptionReturn: 0.2,
      fiftyTwoWeekLow: null,
      fiftyTwoWeekHigh: null,
      updatedAt: "2026-06-26T00:00:00Z"
    } satisfies HoldingMarketMetric],
    getPortfolioCurrentMetric: async () => null,
    listHoldingSnapshots: async () => [],
    upsertPortfolioSnapshot: async () => {
      calls.push("snapshot");
    },
    upsertAssetSnapshots: async () => {},
    upsertHoldingSnapshots: async () => {},
    upsertCashSnapshots: async () => {}
  };
  const service = new PortfolioService(
    repository as any,
    undefined,
    analyticsRepository as any,
    new AnalyticsService(new AllocationService(), new PerformanceService())
  );

  await service.createAnalyticsSnapshot("portfolio");

  assert.deepEqual(calls.slice(0, 2), ["refresh:portfolio", "dashboard:portfolio"]);
  assert.ok(calls.includes("snapshot"));
});
