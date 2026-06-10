import test from "node:test";
import assert from "node:assert/strict";
import { CorrelationService } from "../src/application/services/risk/CorrelationService";
import { DrawdownService } from "../src/application/services/risk/DrawdownService";
import { VolatilityService } from "../src/application/services/risk/VolatilityService";
import {
  annualizedVolatility,
  buildFlowAdjustedPortfolioLevelSeries,
  calculateDrawdown,
  calculateFlowAdjustedPortfolioReturns,
  calculateReturns,
  concentrationRatio,
  correlation,
  covarianceRiskContributions,
  diversificationScore,
  syntheticPortfolioDrawdown
} from "../src/application/services/risk/riskMath";
import type { HoldingSnapshot, PortfolioSnapshot, Transaction } from "../src/domain/portfolio/types";

function holdingSnapshot(input: Partial<HoldingSnapshot>): HoldingSnapshot {
  return {
    id: input.id ?? `${input.holdingId}-${input.snapshotDate}`,
    portfolioId: input.portfolioId ?? "portfolio",
    holdingId: input.holdingId ?? "holding",
    assetId: input.assetId ?? input.holdingId ?? "asset",
    snapshotDate: input.snapshotDate ?? "2026-01-01",
    quantity: input.quantity ?? 1,
    marketPrice: input.marketPrice ?? input.marketValue ?? 100,
    marketValue: input.marketValue ?? 100,
    costBasis: input.costBasis ?? null,
    unrealizedGainLoss: input.unrealizedGainLoss ?? null,
    currency: input.currency ?? "USD"
  };
}

function portfolioSnapshot(date: string, totalValue: number): PortfolioSnapshot {
  return {
    id: `portfolio-${date}`,
    portfolioId: "portfolio",
    snapshotDate: date,
    totalValue,
    cashValue: 0,
    investedValue: totalValue,
    currency: "USD"
  };
}

function cashTransaction(date: string, amount: number, type: "deposit_cash" | "withdraw_cash" = "deposit_cash"): Transaction {
  return {
    id: `cash-${date}-${type}`,
    portfolioId: "portfolio",
    assetId: null,
    transactionType: type,
    assetType: "cash",
    ticker: null,
    assetName: "Cash",
    accountName: null,
    brokerName: null,
    quantity: null,
    price: null,
    fees: 0,
    grossAmount: Math.abs(amount),
    netAmount: type === "deposit_cash" ? Math.abs(amount) : -Math.abs(amount),
    currency: "USD",
    transactionDate: date,
    notes: null
  };
}

test("calculates portfolio returns from ordered positive values", () => {
  const returns = calculateReturns([
    { date: "2026-01-03", value: 110 },
    { date: "2026-01-01", value: 100 },
    { date: "2026-01-02", value: 105 },
    { date: "2026-01-04", value: 0 }
  ]);

  assert.equal(returns.length, 2);
  assert.equal(returns[0]?.date, "2026-01-02");
  assert.ok(Math.abs((returns[0]?.value ?? 0) - 0.05) < 0.000001);
});

test("annualized volatility uses the requested window and sqrt 252 scaling", () => {
  const returns = [
    { date: "2026-01-02", value: 0.01 },
    { date: "2026-01-03", value: -0.01 },
    { date: "2026-01-04", value: 0.02 },
    { date: "2026-01-05", value: -0.02 }
  ];

  const value = annualizedVolatility(returns, 4);
  assert.ok(value != null && value > 0.25);
});

test("flow-adjusted portfolio returns remove deposits from snapshot changes", () => {
  const snapshots = [
    portfolioSnapshot("2026-01-01", 100),
    portfolioSnapshot("2026-01-02", 1_100),
    portfolioSnapshot("2026-01-03", 1_111)
  ];
  const transactions = [cashTransaction("2026-01-02", 1_000)];

  const returns = calculateFlowAdjustedPortfolioReturns(snapshots, transactions);
  const levels = buildFlowAdjustedPortfolioLevelSeries(snapshots, transactions);

  assert.equal(returns.length, 2);
  assert.ok(Math.abs(returns[0].value) < 0.000001);
  assert.ok(Math.abs(returns[1].value - 0.01) < 0.000001);
  assert.ok(Math.abs(levels.at(-1)!.value - 101) < 0.000001);
});

test("portfolio volatility and drawdown use flow-adjusted snapshots", () => {
  const snapshots = [
    portfolioSnapshot("2026-01-01", 100),
    portfolioSnapshot("2026-01-02", 1_100),
    portfolioSnapshot("2026-01-03", 1_111)
  ];
  const transactions = [cashTransaction("2026-01-02", 1_000)];

  const volatility = new VolatilityService().calculatePortfolioVolatility(snapshots, transactions);
  const drawdown = new DrawdownService().calculatePortfolioDrawdown(snapshots, transactions);

  assert.equal(volatility.excludedJumpCount, 0);
  assert.ok((volatility.metrics.find((metric) => metric.label === "30D")?.value ?? 1) < 0.12);
  assert.equal(drawdown.maxDrawdown, 0);
  assert.ok(Math.abs(drawdown.points.at(-1)!.value - 101) < 0.000001);
});

test("portfolio volatility excludes implausible account setup jumps", () => {
  const service = new VolatilityService();
  const result = service.calculatePortfolioVolatility([
    portfolioSnapshot("2026-05-27", 16_900.1),
    portfolioSnapshot("2026-05-28", 16_899.6),
    portfolioSnapshot("2026-05-29", 2_279_833.5),
    portfolioSnapshot("2026-06-01", 2_287_160.45),
    portfolioSnapshot("2026-06-02", 2_289_598),
    portfolioSnapshot("2026-06-03", 2_289_598),
    portfolioSnapshot("2026-06-04", 2_257_426.35)
  ]);

  const vol30 = result.metrics.find((metric) => metric.label === "30D")?.value;

  assert.equal(result.excludedJumpCount, 1);
  assert.ok(result.largestExcludedJump != null && result.largestExcludedJump > 100);
  assert.ok(vol30 != null && vol30 < 0.2);
});

test("drawdown captures current drawdown, max drawdown, and duration", () => {
  const drawdown = calculateDrawdown([
    { date: "2026-01-01", value: 100 },
    { date: "2026-01-02", value: 120 },
    { date: "2026-01-03", value: 90 },
    { date: "2026-01-04", value: 96 }
  ]);

  assert.ok(Math.abs((drawdown.maxDrawdown ?? 0) - -0.25) < 0.000001);
  assert.ok(Math.abs((drawdown.currentDrawdown ?? 0) - -0.2) < 0.000001);
  assert.equal(drawdown.drawdownDurationDays, 1);
});

test("concentration ratio handles top holding and top five concentration", () => {
  assert.equal(concentrationRatio([50, 25, 15, 10], 1), 0.5);
  assert.equal(concentrationRatio([50, 25, 15, 10], 5), 1);
  assert.equal(concentrationRatio([], 1), 0);
});

test("correlation returns null for insufficient or flat data", () => {
  assert.equal(correlation([1, 2], [1, 2]), null);
  assert.equal(correlation([1, 1, 1], [2, 3, 4]), null);
});

test("holding correlations align returns by date for uneven histories", () => {
  const service = new CorrelationService();
  const result = service.calculateHoldingCorrelations({
    labelsByHoldingId: new Map([
      ["left", "LEFT"],
      ["right", "RIGHT"]
    ]),
    holdingSnapshots: [
      holdingSnapshot({ holdingId: "left", snapshotDate: "2026-01-01", marketValue: 100 }),
      holdingSnapshot({ holdingId: "left", snapshotDate: "2026-01-02", marketValue: 110 }),
      holdingSnapshot({ holdingId: "left", snapshotDate: "2026-01-03", marketValue: 121 }),
      holdingSnapshot({ holdingId: "left", snapshotDate: "2026-01-04", marketValue: 108.9 }),
      holdingSnapshot({ holdingId: "right", snapshotDate: "2026-01-01", marketValue: 200 }),
      holdingSnapshot({ holdingId: "right", snapshotDate: "2026-01-02", marketValue: 180 }),
      holdingSnapshot({ holdingId: "right", snapshotDate: "2026-01-04", marketValue: 198 }),
      holdingSnapshot({ holdingId: "right", snapshotDate: "2026-01-05", marketValue: 217.8 })
    ]
  });

  const cell = result.matrix.find((item) => item.left === "LEFT" && item.right === "RIGHT");
  assert.equal(cell?.value, null);
});

test("diversification score rewards spread and penalizes concentration", () => {
  const diversified = diversificationScore({
    meaningfulHoldings: 14,
    assetClassCount: 5,
    sectorCount: 8,
    currencyCount: 3,
    averageCorrelation: 0.25,
    topHoldingConcentration: 0.08,
    topFiveConcentration: 0.32
  });
  const concentrated = diversificationScore({
    meaningfulHoldings: 2,
    assetClassCount: 1,
    sectorCount: 1,
    currencyCount: 1,
    averageCorrelation: 0.9,
    topHoldingConcentration: 0.65,
    topFiveConcentration: 1
  });

  assert.ok(diversified > concentrated);
  assert.ok(diversified <= 100);
  assert.ok(concentrated >= 0);
});

test("covariance risk contribution calculates institutional volatility contribution", () => {
  const dates = ["2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];
  const leftReturns = [0.01, -0.005, 0.012, -0.004];
  const rightReturns = [0.002, 0.001, -0.001, 0.003];
  const result = covarianceRiskContributions({
    minimumObservations: 3,
    assets: [
      {
        id: "stock",
        label: "STOCK",
        assetClass: "stock",
        weight: 0.6,
        returnsByDate: new Map(dates.map((date, index) => [date, leftReturns[index]]))
      },
      {
        id: "bond",
        label: "BOND",
        assetClass: "bond_etf",
        weight: 0.4,
        returnsByDate: new Map(dates.map((date, index) => [date, rightReturns[index]]))
      }
    ]
  });

  assert.ok(result);
  assert.equal(result.observationCount, 4);
  assert.ok(result.portfolioVolatility > 0);
  const contributionTotal = result.contributions.reduce((sum, contribution) => sum + contribution.riskContribution, 0);
  assert.ok(Math.abs(contributionTotal - 1) < 0.000001);
});

test("synthetic portfolio drawdown estimates max drawdown from current weights", () => {
  const dates = ["2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];
  const result = syntheticPortfolioDrawdown({
    minimumObservations: 3,
    assets: [
      {
        id: "equity",
        weight: 0.7,
        returnsByDate: new Map(dates.map((date, index) => [date, [0.04, -0.12, 0.02, 0.01][index]]))
      },
      {
        id: "bond",
        weight: 0.3,
        returnsByDate: new Map(dates.map((date, index) => [date, [0.01, 0.01, 0.005, 0.005][index]]))
      }
    ]
  });

  assert.ok(result);
  assert.equal(result.observationCount, 4);
  assert.ok((result.maxDrawdown ?? 0) < -0.07);
  assert.ok(result.coverage === 1);
});
