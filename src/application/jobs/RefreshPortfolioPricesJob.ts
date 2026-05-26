import { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import { MarketDataService } from "@/application/services/MarketDataService";

export class RefreshPortfolioPricesJob implements BackgroundJob {
  readonly name = "refresh_portfolio_prices";

  constructor(private readonly marketDataService: MarketDataService) {}

  async run(input?: Record<string, unknown>) {
    const userId = typeof input?.userId === "string" ? input.userId : null;
    const portfolioId = typeof input?.portfolioId === "string" ? input.portfolioId : null;
    if (!userId || !portfolioId) {
      return {
        ok: false,
        message: "RefreshPortfolioPricesJob requires userId and portfolioId."
      };
    }

    const result = await this.marketDataService.refreshPortfolioPrices({ userId, portfolioId });
    return {
      ok: result.errors.length === 0,
      message: result.message,
      metadata: result
    };
  }
}
