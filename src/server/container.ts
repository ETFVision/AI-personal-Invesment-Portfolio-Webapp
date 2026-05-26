import { RefreshPortfolioPricesJob } from "@/application/jobs/RefreshPortfolioPricesJob";
import { PortfolioService } from "@/application/services/PortfolioService";
import { MarketDataService } from "@/application/services/MarketDataService";
import { SupabaseAuthProvider } from "@/infrastructure/providers/auth/SupabaseAuthProvider";
import { FmpMarketDataProvider } from "@/infrastructure/providers/marketData/FmpMarketDataProvider";
import { SupabaseMarketDataRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketDataRepository";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  const marketDataRepository = new SupabaseMarketDataRepository();
  const marketDataProvider = new FmpMarketDataProvider();
  const marketDataService = new MarketDataService(marketDataRepository, marketDataProvider);
  return {
    authProvider: new SupabaseAuthProvider(),
    portfolioRepository,
    marketDataRepository,
    marketDataProvider,
    portfolioService: new PortfolioService(portfolioRepository, marketDataRepository),
    marketDataService,
    jobs: {
      refreshPortfolioPrices: new RefreshPortfolioPricesJob(marketDataService)
    }
  };
}
