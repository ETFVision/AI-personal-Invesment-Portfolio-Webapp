import type { TelemetryRepository, UpsertTelemetryRecommendationOutcomeInput } from "@/application/ports/repositories/TelemetryRepository";
import type { TelemetryHorizon, TelemetryRecommendationSnapshot } from "@/domain/telemetry/types";
import { calculateSimpleReturn, classifyRecommendationOutcome, maturedDate, TELEMETRY_HORIZONS } from "./telemetryMath";
import { TelemetryAggregationService } from "./TelemetryAggregationService";
import { MarketVisionTelemetryEvaluationService } from "./MarketVisionTelemetryEvaluationService";
import { PortfolioReviewTelemetryEvaluationService } from "./PortfolioReviewTelemetryEvaluationService";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function snapshotStartDate(snapshot: TelemetryRecommendationSnapshot) {
  return snapshot.priceDate ?? snapshot.generatedAt.slice(0, 10);
}

function isFinitePrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export class TelemetryEvaluationService {
  constructor(
    private readonly telemetryRepository: TelemetryRepository,
    private readonly aggregationService: TelemetryAggregationService,
    private readonly marketVisionEvaluationService?: MarketVisionTelemetryEvaluationService,
    private readonly portfolioReviewEvaluationService?: PortfolioReviewTelemetryEvaluationService
  ) {}

  async evaluateMaturedRecommendations(input: { asOfDate?: string; horizons?: TelemetryHorizon[] } = {}) {
    const asOfDate = input.asOfDate ?? today();
    const horizons = input.horizons ?? TELEMETRY_HORIZONS;
    const snapshots = await this.telemetryRepository.listMaturedRecommendationSnapshots(asOfDate, horizons);
    const outcomes: UpsertTelemetryRecommendationOutcomeInput[] = [];

    for (const snapshot of snapshots) {
      for (const horizon of horizons) {
        const startDate = snapshotStartDate(snapshot);
        const targetDate = maturedDate(startDate, horizon);
        if (targetDate > asOfDate) continue;
        const startPrice = isFinitePrice(snapshot.priceAtRecommendation)
          ? { closePrice: snapshot.priceAtRecommendation, date: snapshot.priceDate ?? startDate }
          : await this.telemetryRepository.getInstrumentPriceOnOrAfter(snapshot.instrumentId, startDate);
        const endPrice = await this.telemetryRepository.getInstrumentPriceOnOrBefore(snapshot.instrumentId, targetDate);

        const benchmarkSymbol = snapshot.benchmarkSymbol ?? "SPY";
        const benchmarkStart = await this.telemetryRepository.getBenchmarkPriceOnOrAfter(benchmarkSymbol, startDate);
        const benchmarkEnd = await this.telemetryRepository.getBenchmarkPriceOnOrBefore(benchmarkSymbol, targetDate);
        const assetReturn = startPrice && endPrice ? calculateSimpleReturn(startPrice.closePrice, endPrice.closePrice) : null;
        const benchmarkReturn = benchmarkStart && benchmarkEnd ? calculateSimpleReturn(benchmarkStart.closePrice, benchmarkEnd.closePrice) : null;
        const excessReturn = assetReturn !== null && benchmarkReturn !== null ? assetReturn - benchmarkReturn : null;
        const outcome = classifyRecommendationOutcome(snapshot.recommendation, assetReturn, benchmarkReturn);

        outcomes.push({
          recommendationSnapshotId: snapshot.id,
          horizon,
          evaluationDate: asOfDate,
          startPrice: startPrice?.closePrice ?? null,
          endPrice: endPrice?.closePrice ?? null,
          assetReturn,
          benchmarkReturn,
          excessReturn,
          success: outcome.success,
          outcomeStatus: outcome.status,
        });
      }
    }

    await this.telemetryRepository.upsertRecommendationOutcomes(outcomes);
    const marketVisionResult = await this.marketVisionEvaluationService?.evaluate({ asOfDate, horizons }) ?? {
      marketVisionSnapshotsChecked: 0,
      marketVisionOutcomesEvaluated: 0
    };
    const portfolioReviewResult = await this.portfolioReviewEvaluationService?.evaluate({ asOfDate, horizons }) ?? {
      portfolioReviewSnapshotsChecked: 0,
      portfolioReviewOutcomesEvaluated: 0
    };
    const aggregateResult = await this.aggregationService.refreshFactorOutcomes(horizons);
    return {
      snapshotsChecked: snapshots.length,
      outcomesEvaluated: outcomes.length,
      ...marketVisionResult,
      ...portfolioReviewResult,
      ...aggregateResult
    };
  }
}
