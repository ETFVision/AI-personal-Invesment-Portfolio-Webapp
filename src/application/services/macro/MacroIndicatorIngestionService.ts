import type { MacroDataProvider } from "@/application/ports/providers/MacroDataProvider";
import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";
import { MacroTrendService } from "./MacroTrendService";

function yearsAgo(years: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export class MacroIndicatorIngestionService {
  constructor(
    private readonly repository: MacroIndicatorRepository,
    private readonly provider: MacroDataProvider,
    private readonly trendService = new MacroTrendService(),
    private readonly config = { backfillYears: 5 }
  ) {}

  async ingest(input: { backfill?: boolean } = {}) {
    const startedAt = new Date().toISOString();
    let indicatorsRequested = 0;
    let indicatorsSuccessful = 0;
    let indicatorsFailed = 0;
    let observationsInserted = 0;
    let observationsUpdated = 0;

    try {
      const indicators = await this.repository.listIndicators({ isActive: true, sourceProvider: this.provider.name });
      indicatorsRequested = indicators.length;
      const computedTrends = [];

      for (const indicator of indicators) {
        try {
          const existing = await this.repository.listObservations(indicator.id, 2);
          const shouldBackfill = input.backfill || existing.length === 0;
          const observations = await this.provider.fetchObservations({
            indicatorCode: indicator.indicatorCode,
            observationStart: shouldBackfill ? yearsAgo(this.config.backfillYears) : undefined,
            limit: shouldBackfill ? 5000 : 5
          });
          const result = await this.repository.upsertObservations(observations.map((observation) => ({
            indicatorId: indicator.id,
            observationDate: observation.observationDate,
            value: observation.value,
            sourceProvider: this.provider.name,
            providerMetadata: observation.providerMetadata
          })));
          observationsInserted += result.inserted;
          observationsUpdated += result.updated;
          const stored = await this.repository.listObservations(indicator.id, 5000);
          const trendInput = this.trendService.calculateTrend(indicator, stored);
          if (trendInput) computedTrends.push(await this.repository.upsertTrend(trendInput));
          indicatorsSuccessful += 1;
        } catch {
          indicatorsFailed += 1;
        }
      }

      if (computedTrends.length > 0) {
        await this.repository.upsertRegimeSnapshot(this.trendService.classifyRegime(indicators, computedTrends));
      }

      const status = indicatorsFailed > 0 ? "partial_success" as const : "success" as const;
      await this.repository.insertIngestionLog({
        jobName: input.backfill ? "fred-macro-backfill" : "fred-macro-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status,
        indicatorsRequested,
        indicatorsSuccessful,
        indicatorsFailed,
        observationsInserted,
        observationsUpdated,
        errorMessage: null,
        metadata: { backfill: Boolean(input.backfill), backfillYears: this.config.backfillYears }
      });
      return { status, indicatorsRequested, indicatorsSuccessful, indicatorsFailed, observationsInserted, observationsUpdated };
    } catch (error) {
      await this.repository.insertIngestionLog({
        jobName: input.backfill ? "fred-macro-backfill" : "fred-macro-ingestion",
        sourceProvider: this.provider.name,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "failed",
        indicatorsRequested,
        indicatorsSuccessful,
        indicatorsFailed,
        observationsInserted,
        observationsUpdated,
        errorMessage: error instanceof Error ? error.message : "Unknown macro ingestion error.",
        metadata: { backfill: Boolean(input.backfill), backfillYears: this.config.backfillYears }
      });
      throw error;
    }
  }
}
