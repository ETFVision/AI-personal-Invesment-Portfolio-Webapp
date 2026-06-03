import type { RecommendationService } from "@/application/services/recommendations/RecommendationService";

export class RecommendationRunJob {
  constructor(private readonly service: RecommendationService) {}

  run(options: { symbol?: string; portfolioId?: string | null; runType?: string } = {}) {
    return this.service.runRecommendations({
      symbol: options.symbol,
      portfolioId: options.portfolioId,
      runType: options.runType ?? "scheduled"
    });
  }
}
