import type { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import type { TelemetryEvaluationService } from "@/application/services/telemetry/TelemetryEvaluationService";

export class TelemetryEvaluationJob implements BackgroundJob {
  readonly name = "telemetry-evaluation";

  constructor(private readonly service: TelemetryEvaluationService) {}

  async run() {
    const result = await this.service.evaluateMaturedRecommendations();
    return {
      ok: true,
      message: `Evaluated ${result.outcomesEvaluated} recommendation outcomes.`,
      metadata: result
    };
  }
}
