import { BackgroundJob } from "@/application/ports/jobs/BackgroundJob";
import { InstrumentMarketService } from "@/application/services/InstrumentMarketService";
import { MarketDataService } from "@/application/services/MarketDataService";

export class RefreshPortfolioPricesJob implements BackgroundJob {
  readonly name = "refresh_portfolio_prices";

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly instrumentMarketService: InstrumentMarketService
  ) {}

  async run(input?: Record<string, unknown>) {
    const userId = typeof input?.userId === "string" ? input.userId : null;
    const portfolioId = typeof input?.portfolioId === "string" ? input.portfolioId : null;
    if (!userId || !portfolioId) {
      return {
        ok: false,
        message: "RefreshPortfolioPricesJob requires userId and portfolioId."
      };
    }

    const instrumentRefresh = await this.instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays: 30,
      batchSize: 50,
      maxBatches: 8,
      includeBackfill: false
    });
    const result = await this.marketDataService.syncPortfolioPricesFromInstrumentPrices({ portfolioId });
    const errors = [...instrumentRefresh.errors, ...result.errors];
    return {
      ok: errors.length === 0,
      message: `${instrumentRefresh.message} ${result.message}`,
      metadata: {
        masterInstrumentRefresh: instrumentRefresh,
        portfolioPriceSync: result,
        errors
      }
    };
  }
}
