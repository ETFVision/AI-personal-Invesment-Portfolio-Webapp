import test from "node:test";
import assert from "node:assert/strict";
import { TelemetryAggregationService } from "../src/application/services/telemetry/TelemetryAggregationService";
import { TelemetryEvaluationService } from "../src/application/services/telemetry/TelemetryEvaluationService";
import { MarketVisionTelemetryEvaluationService } from "../src/application/services/telemetry/MarketVisionTelemetryEvaluationService";
import { PortfolioReviewTelemetryEvaluationService } from "../src/application/services/telemetry/PortfolioReviewTelemetryEvaluationService";
import { marketVisionProxyForTheme } from "../src/application/services/telemetry/marketVisionProxyMap";
import {
  calculateSimpleReturn,
  classifyRecommendationOutcome,
  confidenceBucket,
  factorValueBucket,
  isTelemetryHorizonMatured,
  maturedDate
} from "../src/application/services/telemetry/telemetryMath";
import type { TelemetryRepository } from "../src/application/ports/repositories/TelemetryRepository";
import type {
  TelemetryFactorOutcome,
  TelemetryMarketVisionSnapshot,
  TelemetryPortfolioReviewSnapshot,
  TelemetryRecommendationOutcome,
  TelemetryRecommendationSnapshot
} from "../src/domain/telemetry/types";

const snapshot: TelemetryRecommendationSnapshot = {
  id: "snapshot-1",
  portfolioId: "portfolio-1",
  userId: "user-1",
  instrumentId: "instrument-1",
  symbol: "MSFT",
  recommendation: "Buy",
  recommendationScore: 78,
  confidenceScore: 82,
  generatedAt: "2026-01-02T00:00:00.000Z",
  runId: "run-1",
  benchmarkSymbol: "SPY",
  priceAtRecommendation: 100,
  priceDate: "2026-01-02",
  positiveDrivers: ["Quality"],
  negativeDrivers: [],
  factorInputs: { fundamentals: 82, valuation: 44, recommendation_label: "Buy" },
  componentScores: [],
  guardrails: [],
  createdAt: "2026-01-02T00:00:00.000Z"
};

class FakeTelemetryRepository implements TelemetryRepository {
  outcomes: TelemetryRecommendationOutcome[] = [];
  factors: TelemetryFactorOutcome[] = [];
  marketVisionSnapshots: TelemetryMarketVisionSnapshot[] = [];
  marketVisionOutcomes: any[] = [];
  portfolioReviewSnapshots: TelemetryPortfolioReviewSnapshot[] = [];
  portfolioReviewOutcomes: any[] = [];

  async createRecommendationSnapshots() {
    return [];
  }

  async createMarketVisionSnapshots() {
    return [];
  }

  async createPortfolioReviewSnapshot() {
    return null;
  }

  async listRecommendationSnapshots() {
    return [snapshot];
  }

  async listMaturedRecommendationSnapshots() {
    return [snapshot];
  }

  async listRecommendationOutcomes() {
    return this.outcomes;
  }

  async upsertRecommendationOutcomes(input: any[]) {
    this.outcomes = input.map((item) => ({
      id: `${item.recommendationSnapshotId}-${item.horizon}`,
      recommendationSnapshotId: item.recommendationSnapshotId,
      horizon: item.horizon,
      evaluationDate: item.evaluationDate,
      startPrice: item.startPrice,
      endPrice: item.endPrice,
      assetReturn: item.assetReturn,
      benchmarkReturn: item.benchmarkReturn,
      excessReturn: item.excessReturn,
      success: item.success,
      outcomeStatus: item.outcomeStatus,
      createdAt: "2026-02-02T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z"
    }));
  }

  async upsertFactorOutcomes(input: any[]) {
    this.factors = input.map((item) => ({
      id: `${item.factorName}-${item.factorValue}-${item.horizon}`,
      factorName: item.factorName,
      factorValue: item.factorValue,
      factorDirection: item.factorDirection,
      horizon: item.horizon,
      observationCount: item.observationCount,
      averageAssetReturn: item.averageAssetReturn,
      averageBenchmarkReturn: item.averageBenchmarkReturn,
      averageExcessReturn: item.averageExcessReturn,
      hitRate: item.hitRate,
      confidenceBucket: item.confidenceBucket,
      createdAt: "2026-02-02T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z"
    }));
  }

  async listFactorOutcomes() {
    return this.factors;
  }

  async listMarketVisionSnapshots(): Promise<TelemetryMarketVisionSnapshot[]> {
    return this.marketVisionSnapshots;
  }

  async listMarketVisionOutcomes() {
    return this.marketVisionOutcomes;
  }

  async upsertMarketVisionOutcomes(input: any[]) {
    this.marketVisionOutcomes = input.map((item) => ({
      id: `${item.marketVisionSnapshotId}-${item.horizon}`,
      ...item,
      createdAt: "2026-02-02T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z"
    }));
  }

  async listPortfolioReviewSnapshots(): Promise<TelemetryPortfolioReviewSnapshot[]> {
    return this.portfolioReviewSnapshots;
  }

  async listPortfolioReviewOutcomes() {
    return this.portfolioReviewOutcomes;
  }

  async upsertPortfolioReviewOutcomes(input: any[]) {
    this.portfolioReviewOutcomes = input.map((item) => ({
      id: `${item.portfolioReviewSnapshotId}-${item.horizon}`,
      ...item,
      createdAt: "2026-02-02T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z"
    }));
  }

  async getInstrumentPriceOnOrAfter() {
    return { date: "2026-01-02", closePrice: 100 };
  }

  async getInstrumentPriceOnOrBefore() {
    return { date: "2026-02-02", closePrice: 112 };
  }

  async getBenchmarkPriceOnOrAfter() {
    return { date: "2026-01-02", closePrice: 100 };
  }

  async getBenchmarkPriceOnOrBefore() {
    return { date: "2026-02-02", closePrice: 104 };
  }

  async getInstrumentPriceBySymbolOnOrAfter() {
    return { date: "2026-01-02", closePrice: 100 };
  }

  async getInstrumentPriceBySymbolOnOrBefore() {
    return { date: "2026-02-02", closePrice: 112 };
  }

  async getPortfolioValueOnOrAfter() {
    return { date: "2026-01-02", totalValue: 1000 };
  }

  async getPortfolioValueOnOrBefore() {
    return { date: "2026-02-02", totalValue: 1040 };
  }

  async getDashboard() {
    return {
      overview: {
        recommendationSnapshots: 1,
        recommendationOutcomes: this.outcomes.length,
        evaluatedOutcomes: this.outcomes.filter((item) => item.outcomeStatus === "evaluated").length,
        pendingOutcomes: 0,
        marketVisionSnapshots: 0,
        portfolioReviewSnapshots: 0,
        latestEvaluationDate: this.outcomes[0]?.evaluationDate ?? null,
        coverage: {
          recommendationCoverage: null,
          marketVisionCoverage: null,
          portfolioReviewCoverage: null,
          maturedRecommendationObservations: 0,
          evaluatedRecommendationObservations: 0,
          maturedMarketVisionObservations: 0,
          evaluatedMarketVisionObservations: 0,
          maturedPortfolioReviewObservations: 0,
          evaluatedPortfolioReviewObservations: 0,
          missingDataOutcomes: 0,
          benchmarkMissingOutcomes: 0
        }
      },
      recommendationSummary: [],
      factorOutcomes: this.factors,
      bestFactors: [],
      worstFactors: [],
      confidenceCalibration: [],
      marketVisionOutcomes: [],
      portfolioReviewOutcomes: [],
      marketVisionSnapshots: [],
      portfolioReviewSnapshots: []
    };
  }
}

test("telemetry horizon math matures on expected dates", () => {
  assert.equal(maturedDate("2026-01-02", "1m"), "2026-02-02");
  assert.equal(isTelemetryHorizonMatured("2026-01-02", "2026-02-01", "1m"), false);
  assert.equal(isTelemetryHorizonMatured("2026-01-02", "2026-02-02", "1m"), true);
});

test("telemetry classifies recommendation outcomes against benchmark excess return", () => {
  assert.equal(calculateSimpleReturn(100, 112), 0.1200000000000001);
  assert.deepEqual(classifyRecommendationOutcome("Buy", 0.12, 0.04), {
    success: true,
    status: "evaluated",
    excessReturn: 0.07999999999999999
  });
  assert.equal(classifyRecommendationOutcome("Reduce", 0.12, 0.04).success, false);
  assert.equal(classifyRecommendationOutcome("Hold", -0.02, 0.01).success, true);
});

test("telemetry buckets confidence and factor values conservatively", () => {
  assert.equal(confidenceBucket(0), "insufficient_evidence");
  assert.equal(confidenceBucket(12), "early_signal");
  assert.equal(confidenceBucket(45), "moderate_evidence");
  assert.equal(confidenceBucket(120), "stronger_evidence");
  assert.equal(factorValueBucket(82), "strong");
  assert.equal(factorValueBucket(55), "mixed");
  assert.equal(factorValueBucket(35), "weak");
});

test("telemetry evaluator records outcomes and aggregates factor evidence", async () => {
  const repository = new FakeTelemetryRepository();
  const aggregationService = new TelemetryAggregationService(repository);
  const evaluationService = new TelemetryEvaluationService(repository, aggregationService);
  const result = await evaluationService.evaluateMaturedRecommendations({ asOfDate: "2026-02-02", horizons: ["1m"] });

  assert.equal(result.outcomesEvaluated, 1);
  assert.equal(repository.outcomes[0].outcomeStatus, "evaluated");
  assert.equal(repository.outcomes[0].success, true);
  assert.equal(repository.outcomes[0].assetReturn, 0.1200000000000001);
  assert.equal(repository.outcomes[0].benchmarkReturn, 0.040000000000000036);
  assert.ok(repository.factors.some((factor) => factor.factorName === "fundamentals" && factor.factorValue === "strong"));
  assert.ok(repository.factors.every((factor) => factor.confidenceBucket === "insufficient_evidence"));
});

test("market vision proxy mapping is deterministic", () => {
  assert.equal(marketVisionProxyForTheme("Technology").proxySymbol, "XLK");
  assert.equal(marketVisionProxyForTheme("Healthcare").proxySymbol, "XLV");
  assert.equal(marketVisionProxyForTheme("Inflation").proxySymbol, "TIP");
});

test("market vision telemetry evaluates bullish proxy outperformance", async () => {
  const repository = new FakeTelemetryRepository();
  repository.marketVisionSnapshots = [{
    id: "mv-1",
    reportId: "report-1",
    reportPeriodStart: "2026-01-01",
    reportPeriodEnd: "2026-01-07",
    generatedAt: "2026-01-02T00:00:00.000Z",
    theme: "Technology",
    direction: "bullish",
    confidence: 72,
    severity: 50,
    supportingSignalCount: 3,
    fredSignalCount: 0,
    newsSignalCount: 3,
    proxySymbol: "XLK",
    createdAt: "2026-01-02T00:00:00.000Z"
  }];
  const service = new MarketVisionTelemetryEvaluationService(repository);
  const result = await service.evaluate({ asOfDate: "2026-02-02", horizons: ["1m"] });

  assert.equal(result.marketVisionOutcomesEvaluated, 1);
  assert.equal(repository.marketVisionOutcomes[0].success, true);
  assert.equal(repository.marketVisionOutcomes[0].outcomeStatus, "evaluated");
});

test("portfolio review telemetry classifies material score improvement as effective", async () => {
  const repository = new FakeTelemetryRepository();
  const base: TelemetryPortfolioReviewSnapshot = {
    id: "review-snapshot-1",
    portfolioId: "portfolio-1",
    userId: "user-1",
    reviewId: "review-1",
    generatedAt: "2026-01-02T00:00:00.000Z",
    portfolioScore: 70,
    diversificationScore: 60,
    concentrationScore: 62,
    riskScore: 65,
    fixedIncomeScore: 55,
    macroFitScore: 60,
    themeExposureSummary: {},
    topRisks: [],
    improvementSuggestions: [],
    allocationSnapshot: {},
    lookthroughSnapshot: { reviewMetrics: { risk: { annualizedVolatility: 0.12, maxDrawdown: -0.08 } } },
    createdAt: "2026-01-02T00:00:00.000Z"
  };
  repository.portfolioReviewSnapshots = [
    base,
    {
      ...base,
      id: "review-snapshot-2",
      reviewId: "review-2",
      generatedAt: "2026-02-02T00:00:00.000Z",
      portfolioScore: 77,
      diversificationScore: 66,
      concentrationScore: 65,
      riskScore: 66,
      lookthroughSnapshot: { reviewMetrics: { risk: { annualizedVolatility: 0.1, maxDrawdown: -0.05 } } }
    }
  ];
  const service = new PortfolioReviewTelemetryEvaluationService(repository);
  const result = await service.evaluate({ asOfDate: "2026-02-02", horizons: ["1m"] });

  assert.equal(result.portfolioReviewOutcomesEvaluated, 1);
  assert.equal(repository.portfolioReviewOutcomes[0].effectivenessClassification, "effective");
  assert.equal(repository.portfolioReviewOutcomes[0].portfolioScoreChange, 7);
  assert.equal(repository.portfolioReviewOutcomes[0].diversificationScoreChange, 6);
});
