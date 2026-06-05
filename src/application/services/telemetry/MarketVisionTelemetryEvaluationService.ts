import type { TelemetryRepository, UpsertTelemetryMarketVisionOutcomeInput } from "@/application/ports/repositories/TelemetryRepository";
import type { MarketVisionDirection, TelemetryHorizon } from "@/domain/telemetry/types";
import { calculateSimpleReturn, maturedDate, TELEMETRY_HORIZONS } from "./telemetryMath";
import { marketVisionProxyForTheme } from "./marketVisionProxyMap";

const NEUTRAL_BAND = 0.03;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function classifyMarketVisionOutcome(direction: MarketVisionDirection, excessReturn: number | null) {
  if (excessReturn == null) return null;
  if (direction === "bullish") return excessReturn > 0;
  if (direction === "bearish") return excessReturn < 0;
  if (direction === "neutral") return Math.abs(excessReturn) <= NEUTRAL_BAND;
  return Math.abs(excessReturn) <= NEUTRAL_BAND || excessReturn > -NEUTRAL_BAND;
}

export class MarketVisionTelemetryEvaluationService {
  constructor(private readonly telemetryRepository: TelemetryRepository) {}

  async evaluate(input: { asOfDate?: string; horizons?: TelemetryHorizon[] } = {}) {
    const asOfDate = input.asOfDate ?? today();
    const horizons = input.horizons ?? TELEMETRY_HORIZONS;
    const snapshots = await this.telemetryRepository.listMarketVisionSnapshots(5000);
    const outcomes: UpsertTelemetryMarketVisionOutcomeInput[] = [];

    for (const snapshot of snapshots) {
      const startDate = snapshot.generatedAt.slice(0, 10);
      const proxyConfig = marketVisionProxyForTheme(snapshot.theme);
      const proxySymbol = snapshot.proxySymbol ?? proxyConfig.proxySymbol;
      for (const horizon of horizons) {
        const targetDate = maturedDate(startDate, horizon);
        if (targetDate > asOfDate) continue;
        const proxyStart = await this.telemetryRepository.getInstrumentPriceBySymbolOnOrAfter(proxySymbol, startDate);
        const proxyEnd = await this.telemetryRepository.getInstrumentPriceBySymbolOnOrBefore(proxySymbol, targetDate);
        const benchmarkStart = await this.telemetryRepository.getBenchmarkPriceOnOrAfter(proxyConfig.benchmarkSymbol, startDate);
        const benchmarkEnd = await this.telemetryRepository.getBenchmarkPriceOnOrBefore(proxyConfig.benchmarkSymbol, targetDate);
        const proxyReturn = proxyStart && proxyEnd ? calculateSimpleReturn(proxyStart.closePrice, proxyEnd.closePrice) : null;
        const benchmarkReturn = benchmarkStart && benchmarkEnd ? calculateSimpleReturn(benchmarkStart.closePrice, benchmarkEnd.closePrice) : null;
        const excessReturn = proxyReturn !== null && benchmarkReturn !== null ? proxyReturn - benchmarkReturn : null;
        const success = classifyMarketVisionOutcome(snapshot.direction, excessReturn);
        const outcomeStatus = proxyReturn == null ? "insufficient_data" : benchmarkReturn == null ? "benchmark_missing" : "evaluated";
        outcomes.push({
          marketVisionSnapshotId: snapshot.id,
          horizon,
          evaluationDate: asOfDate,
          proxySymbol,
          proxyReturn,
          benchmarkReturn,
          excessReturn,
          success,
          outcomeStatus
        });
      }
    }

    await this.telemetryRepository.upsertMarketVisionOutcomes(outcomes);
    return { marketVisionSnapshotsChecked: snapshots.length, marketVisionOutcomesEvaluated: outcomes.length };
  }
}
