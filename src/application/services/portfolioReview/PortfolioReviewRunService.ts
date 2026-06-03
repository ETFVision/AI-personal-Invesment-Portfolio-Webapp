import type { PortfolioReviewRepository } from "@/application/ports/repositories/PortfolioReviewRepository";
import type { PortfolioReviewRunType } from "@/domain/portfolioReview/types";
import { PortfolioReviewService } from "./PortfolioReviewService";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export class PortfolioReviewRunService {
  constructor(
    private readonly repository: PortfolioReviewRepository,
    private readonly reviewService: PortfolioReviewService
  ) {}

  async run(input: { portfolioId: string; runType?: PortfolioReviewRunType } = { portfolioId: "" }) {
    const run = await this.repository.createRun({
      portfolioId: input.portfolioId,
      runDate: today(),
      runType: input.runType ?? "manual",
      status: "success",
      errorMessage: null
    });

    try {
      const report = await this.reviewService.generateReview({
        portfolioId: input.portfolioId,
        runId: run.id,
        status: "draft"
      });
      return { run, report };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown portfolio review error";
      await this.repository.updateRunStatus(run.id, "failed", message);
      return {
        run: {
          ...run,
          status: "failed" as const,
          errorMessage: message
        },
        report: null
      };
    }
  }
}
