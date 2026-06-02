import type { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import { MarketVisionGenerationService } from "@/application/services/marketVision/MarketVisionGenerationService";

export class GenerateMarketVisionReportJob implements BackgroundJob {
  readonly name = "generate-market-vision-report";

  constructor(private readonly service: MarketVisionGenerationService) {}

  async run() {
    const report = await this.service.generateWeeklyReport({ status: "draft" });
    return {
      ok: true,
      message: "Market Vision report generated.",
      metadata: { reportId: report.id, periodStart: report.reportPeriodStart, periodEnd: report.reportPeriodEnd }
    };
  }
}
