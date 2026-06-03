import type { PortfolioReviewRunService } from "@/application/services/portfolioReview/PortfolioReviewRunService";

export class PortfolioReviewRunJob {
  constructor(private readonly service: PortfolioReviewRunService) {}

  run(options: { portfolioId: string; runType?: "manual" | "scheduled" }) {
    return this.service.run({
      portfolioId: options.portfolioId,
      runType: options.runType ?? "scheduled"
    });
  }
}
