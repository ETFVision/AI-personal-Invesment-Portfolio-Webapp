import type { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import { MarketVisionGenerationService } from "@/application/services/marketVision/MarketVisionGenerationService";
import type { TelemetrySnapshotService } from "@/application/services/telemetry/TelemetrySnapshotService";

export class GenerateMarketVisionReportJob implements BackgroundJob {
  readonly name = "generate-market-vision-report";

  constructor(
    private readonly service: MarketVisionGenerationService,
    private readonly telemetrySnapshotService?: TelemetrySnapshotService
  ) {}

  async run() {
    const report = await this.service.generateWeeklyReport({ status: "draft" });
    try {
      await this.telemetrySnapshotService?.captureMarketVisionReport(report);
    } catch {
      // Telemetry capture is observational and should not fail Market Vision generation.
    }
    return {
      ok: true,
      message: "Market Vision report generated.",
      metadata: { reportId: report.id, periodStart: report.reportPeriodStart, periodEnd: report.reportPeriodEnd }
    };
  }
}
