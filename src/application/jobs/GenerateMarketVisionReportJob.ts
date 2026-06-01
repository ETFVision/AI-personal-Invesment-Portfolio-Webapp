import type { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";

// TODO: Future Market Vision phase.
// This job is a placeholder for weekly generation via Vercel Cron or Google Cloud Scheduler.
export class GenerateMarketVisionReportJob implements BackgroundJob {
  readonly name = "generate-market-vision-report";

  async run() {
    return {
      ok: false,
      message: "Market Vision AI generation is not implemented yet.",
      metadata: { status: "placeholder" }
    };
  }
}
