import { RefreshPortfolioPricesJob } from "@/application/jobs/RefreshPortfolioPricesJob";
import { RefreshBenchmarkDataJob } from "@/application/jobs/RefreshBenchmarkDataJob";
import { BenchmarkComparisonService } from "@/application/services/BenchmarkComparisonService";
import { BenchmarkService } from "@/application/services/BenchmarkService";
import { AllocationService } from "@/application/services/AllocationService";
import { AssetMetadataService } from "@/application/services/AssetMetadataService";
import { AnalyticsService } from "@/application/services/AnalyticsService";
import { PortfolioService } from "@/application/services/PortfolioService";
import { MarketDataService } from "@/application/services/MarketDataService";
import { PerformanceService } from "@/application/services/PerformanceService";
import { SupabaseAuthProvider } from "@/infrastructure/providers/auth/SupabaseAuthProvider";
import { FmpAssetMetadataProvider } from "@/infrastructure/providers/metadata/FmpAssetMetadataProvider";
import { FmpMarketDataProvider } from "@/infrastructure/providers/marketData/FmpMarketDataProvider";
import { SupabaseAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseAnalyticsRepository";
import { SupabaseBenchmarkRepository } from "@/infrastructure/repositories/supabase/SupabaseBenchmarkRepository";
import { SupabaseMarketDataRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketDataRepository";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  const marketDataRepository = new SupabaseMarketDataRepository();
  const analyticsRepository = new SupabaseAnalyticsRepository();
  const benchmarkRepository = new SupabaseBenchmarkRepository();
  const marketDataProvider = new FmpMarketDataProvider();
  const assetMetadataProvider = new FmpAssetMetadataProvider();
  const marketDataService = new MarketDataService(marketDataRepository, marketDataProvider);
  const benchmarkService = new BenchmarkService(benchmarkRepository, marketDataProvider);
  const benchmarkComparisonService = new BenchmarkComparisonService();
  const assetMetadataService = new AssetMetadataService(marketDataRepository, assetMetadataProvider);
  const allocationService = new AllocationService();
  const performanceService = new PerformanceService();
  const analyticsService = new AnalyticsService(allocationService, performanceService);
  return {
    authProvider: new SupabaseAuthProvider(),
    portfolioRepository,
    marketDataRepository,
    analyticsRepository,
    benchmarkRepository,
    marketDataProvider,
    assetMetadataProvider,
    allocationService,
    performanceService,
    analyticsService,
    benchmarkComparisonService,
    benchmarkService,
    portfolioService: new PortfolioService(
      portfolioRepository,
      marketDataRepository,
      analyticsRepository,
      analyticsService,
      benchmarkRepository,
      benchmarkComparisonService
    ),
    marketDataService,
    assetMetadataService,
    jobs: {
      refreshPortfolioPrices: new RefreshPortfolioPricesJob(marketDataService),
      refreshBenchmarkData: new RefreshBenchmarkDataJob(benchmarkService)
    }
  };
}
