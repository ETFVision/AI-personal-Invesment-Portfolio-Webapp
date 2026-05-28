import { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import { BenchmarkService } from "@/application/services/BenchmarkService";

export class RefreshBenchmarkDataJob implements BackgroundJob {
  readonly name = "refresh_benchmark_data";

  constructor(private readonly benchmarkService: BenchmarkService) {}

  async run(input?: Record<string, unknown>) {
    const lookbackDays = typeof input?.lookbackDays === "number" ? input.lookbackDays : undefined;
    const result = await this.benchmarkService.refreshBenchmarkSnapshots({ lookbackDays });
    return {
      ok: result.errors.length === 0,
      message: result.message,
      metadata: result
    };
  }
}
