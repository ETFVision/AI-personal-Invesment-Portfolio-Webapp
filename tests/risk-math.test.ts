import test from "node:test";
import assert from "node:assert/strict";
import { CorrelationService } from "../src/application/services/risk/CorrelationService";
import { DrawdownService } from "../src/application/services/risk/DrawdownService";
import { wrapperExcludedIssuerConcentration } from "../src/application/services/risk/RiskAnalyticsDataService";
import { RiskAnalyticsService } from "../src/application/services/risk/RiskAnalyticsService";
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
import type { Holding, HoldingSnapshot, PortfolioDashboard, PortfolioSnapshot, Transaction } from "../src/domain/portfolio/types";

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

function holding(input: { id: string; ticker: string; assetType?: Holding["assetType"] }): Holding {
  return {
    id: input.id,
    portfolioId: "portfolio",
    assetId: `asset-${input.id}`,
    assetType: input.assetType ?? "etf",
    ticker: input.ticker,
    assetName: input.ticker,
    accountName: null,
    brokerName: null,
    quantity: 1,
    averageCost: 100,
    costCurrency: "USD",
    firstPurchaseDate: "2026-01-01",
    notes: null,
    sector: "Broad Market"
  };
}

function riskDashboard(values: number[]): PortfolioDashboard {
  const holdings = values.map((_, index) => holding({ id: `h${index + 1}`, ticker: `ETF${index + 1}` }));
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    portfolio: { id: "portfolio", userId: "user", name: "Risk Test", baseCurrency: "USD", isDefault: true },
    cashBalances: [],
    holdings,
    holdingValuations: holdings.map((item, index) => ({
      holding: item,
      unitPrice: values[index],
      value: values[index],
      valueCurrency: "USD",
      priceDate: "2026-06-01",
      priceProvider: "test",
      valuationSource: "market_price"
    })),
    totalCash: 0,
    totalHoldingsCost: total,
    totalHoldingsMarketValue: total,
    totalValueEstimate: total,
    investedAmount: total,
    unrealizedGainLoss: 0,
    unrealizedGainLossPercent: 0,
    realizedGainLoss: 0,
    allocationByType: [{ label: "etf", value: total, percent: 1 }],
    allocationBySector: [
      { label: "Technology", value: total * 0.2, percent: 0.2 },
      { label: "Healthcare", value: total * 0.15, percent: 0.15 },
      { label: "Financials", value: total * 0.15, percent: 0.15 },
      { label: "Industrials", value: total * 0.12, percent: 0.12 },
      { label: "Consumer", value: total * 0.11, percent: 0.11 },
      { label: "Energy", value: total * 0.1, percent: 0.1 },
      { label: "Utilities", value: total * 0.09, percent: 0.09 },
      { label: "Materials", value: total * 0.08, percent: 0.08 }
    ],
    allocationByGeography: [{ label: "US", value: total, percent: 1 }],
    currencyExposure: [{ label: "USD", currency: "USD", value: total, percent: 1 }],
    topWinners: [],
    topLosers: [],
    performance: [],
    productPerformance: [],
    cashPerformance: [],
    benchmarkComparisons: [],
    cashPercent: 0,
    investedPercent: 1,
    latestPriceDate: "2026-06-01"
  };
}

function calculateRisk(values: number[], issuerConcentration?: { topHolding: number; topFive: number } | null) {
  return new RiskAnalyticsService().calculateRiskAnalytics({
    dashboard: riskDashboard(values),
    portfolioSnapshots: [],
    holdingSnapshots: [],
    dailyPrices: [],
    transactions: [],
    benchmarkSnapshots: [],
    issuerConcentration
  });
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

test("diversification score rewards breadth and penalizes correlation", () => {
  const diversified = diversificationScore({
    meaningfulHoldings: 14,
    assetClassCount: 5,
    sectorCount: 8,
    currencyCount: 3,
    averageCorrelation: 0.25
  });
  const concentrated = diversificationScore({
    meaningfulHoldings: 2,
    assetClassCount: 1,
    sectorCount: 1,
    currencyCount: 1,
    averageCorrelation: 0.9
  });

  assert.ok(diversified > concentrated);
  assert.ok(diversified <= 100);
  assert.ok(concentrated >= 0);
});

test("risk analytics diversification score ignores issuer concentration inputs", () => {
  const directWrapper = calculateRisk([60, 10, 10, 10, 10]);
  const issuerLookthrough = calculateRisk([60, 10, 10, 10, 10], { topHolding: 0.08, topFive: 0.32 });

  assert.equal(issuerLookthrough.diversification.score, directWrapper.diversification.score);
  assert.equal(issuerLookthrough.concentration.topHoldingConcentration, directWrapper.concentration.topHoldingConcentration);
  assert.equal(issuerLookthrough.concentration.topFiveConcentration, directWrapper.concentration.topFiveConcentration);
  assert.ok(issuerLookthrough.warnings.includes("Top holding exceeds 25% of invested assets."));
});

test("risk analytics diversification score is unchanged across different issuer concentration levels", () => {
  const diversifiedIssuer = calculateRisk([20, 20, 20, 20, 20], { topHolding: 0.08, topFive: 0.32 });
  const concentratedIssuer = calculateRisk([20, 20, 20, 20, 20], { topHolding: 0.55, topFive: 0.8 });

  assert.equal(concentratedIssuer.diversification.score, diversifiedIssuer.diversification.score);
  assert.equal(concentratedIssuer.concentration.topHoldingConcentration, diversifiedIssuer.concentration.topHoldingConcentration);
  assert.equal(concentratedIssuer.concentration.topFiveConcentration, diversifiedIssuer.concentration.topFiveConcentration);
});

test("risk analytics issuer concentration still excludes ETF wrappers for concentration diagnostics", () => {
  const issuerConcentration = wrapperExcludedIssuerConcentration({
    inputsSnapshot: {
      lookthroughExposure: {
        holdingExposures: [
          {
            holdingSymbol: "VOO",
            holdingName: "Vanguard S&P 500 ETF",
            directWeight: 0.3,
            indirectWeight: 0,
            totalWeight: 0.3,
            inputsSnapshot: { instrumentAssetClass: "etf" }
          },
          {
            holdingSymbol: "BND",
            holdingName: "Vanguard Total Bond Market ETF",
            directWeight: 0.1,
            indirectWeight: 0,
            totalWeight: 0.1,
            inputsSnapshot: { instrumentAssetClass: "bond_etf" }
          },
          {
            holdingSymbol: "NVDA",
            holdingName: "NVIDIA",
            holdingIssuerId: "issuer-nvda",
            holdingIssuerName: "NVIDIA Corporation",
            directWeight: 0,
            indirectWeight: 0.08,
            totalWeight: 0.08,
            inputsSnapshot: { exposureRole: "underlying_security", issuerId: "issuer-nvda", issuerName: "NVIDIA Corporation" }
          },
          {
            holdingSymbol: "MSFT",
            holdingName: "Microsoft",
            holdingIssuerId: "issuer-msft",
            holdingIssuerName: "Microsoft Corporation",
            directWeight: 0,
            indirectWeight: 0.06,
            totalWeight: 0.06,
            inputsSnapshot: { exposureRole: "underlying_security", issuerId: "issuer-msft", issuerName: "Microsoft Corporation" }
          },
          {
            holdingSymbol: "AAPL",
            holdingName: "Apple",
            holdingIssuerId: "issuer-aapl",
            holdingIssuerName: "Apple Inc.",
            directWeight: 0,
            indirectWeight: 0.05,
            totalWeight: 0.05,
            inputsSnapshot: { exposureRole: "underlying_security", issuerId: "issuer-aapl", issuerName: "Apple Inc." }
          },
          {
            holdingSymbol: "LLY",
            holdingName: "Eli Lilly",
            holdingIssuerId: "issuer-lly",
            holdingIssuerName: "Eli Lilly and Company",
            directWeight: 0.04,
            indirectWeight: 0,
            totalWeight: 0.04,
            inputsSnapshot: { instrumentAssetClass: "stock", issuerId: "issuer-lly", issuerName: "Eli Lilly and Company" }
          }
        ]
      }
    }
  });
  const directWrapper = calculateRisk([60, 10, 10, 10, 10]);
  const wrapperExcludedLookthrough = calculateRisk([60, 10, 10, 10, 10], issuerConcentration);

  assert.ok(issuerConcentration);
  assert.equal(issuerConcentration.topHolding, 0.08);
  assert.ok(Math.abs(issuerConcentration.topFive - 0.23) < 0.000001);
  assert.equal(wrapperExcludedLookthrough.diversification.score, directWrapper.diversification.score);
});

test("risk analytics diversification score is unchanged when issuer concentration is absent", () => {
  const direct = calculateRisk([60, 10, 10, 10, 10]);
  const nullIssuer = calculateRisk([60, 10, 10, 10, 10], null);

  assert.equal(nullIssuer.diversification.score, direct.diversification.score);
});

test("risk analytics holding score remains based on direct holding count", () => {
  const oneWrapper = calculateRisk([100], { topHolding: 0.08, topFive: 0.32 });
  const twelveWrappers = calculateRisk(Array.from({ length: 12 }, () => 100), { topHolding: 0.08, topFive: 0.32 });

  assert.ok(twelveWrappers.diversification.score > oneWrapper.diversification.score);
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
