import { RefreshPortfolioPricesJob } from "@/application/jobs/RefreshPortfolioPricesJob";
import { RefreshBenchmarkDataJob } from "@/application/jobs/RefreshBenchmarkDataJob";
import { BenchmarkComparisonService } from "@/application/services/BenchmarkComparisonService";
import { BenchmarkService } from "@/application/services/BenchmarkService";
import { AllocationService } from "@/application/services/AllocationService";
import { AssetMetadataService } from "@/application/services/AssetMetadataService";
import { AnalyticsService } from "@/application/services/AnalyticsService";
import { InstrumentMarketService } from "@/application/services/InstrumentMarketService";
import { InstrumentService } from "@/application/services/InstrumentService";
import { PortfolioService } from "@/application/services/PortfolioService";
import { MarketDataService } from "@/application/services/MarketDataService";
import { MarketVisionService } from "@/application/services/marketVision/MarketVisionService";
import { MacroIndicatorService } from "@/application/services/marketVision/MacroIndicatorService";
import { MarketThemeService } from "@/application/services/marketVision/MarketThemeService";
import { PerformanceService } from "@/application/services/PerformanceService";
import { BondService } from "@/application/services/bonds/BondService";
import { RiskAnalyticsService } from "@/application/services/risk/RiskAnalyticsService";
import { RiskAnalyticsDataService } from "@/application/services/risk/RiskAnalyticsDataService";
import { MetadataRefreshService } from "@/application/services/MetadataRefreshService";
import { UniverseManagementService } from "@/application/services/UniverseManagementService";
import { WatchlistService } from "@/application/services/WatchlistService";
import { SupabaseAuthProvider } from "@/infrastructure/providers/auth/SupabaseAuthProvider";
import { FmpAssetMetadataProvider } from "@/infrastructure/providers/metadata/FmpAssetMetadataProvider";
import { FmpMarketDataProvider } from "@/infrastructure/providers/marketData/FmpMarketDataProvider";
import { SupabaseAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseAnalyticsRepository";
import { SupabaseBenchmarkRepository } from "@/infrastructure/repositories/supabase/SupabaseBenchmarkRepository";
import { SupabaseMarketDataRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketDataRepository";
import { SupabaseMarketVisionRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketVisionRepository";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";
import { SupabaseRiskAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseRiskAnalyticsRepository";
import { SupabaseUniverseRepository } from "@/infrastructure/repositories/supabase/SupabaseUniverseRepository";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  const marketDataRepository = new SupabaseMarketDataRepository();
  const analyticsRepository = new SupabaseAnalyticsRepository();
  const benchmarkRepository = new SupabaseBenchmarkRepository();
  const riskAnalyticsRepository = new SupabaseRiskAnalyticsRepository();
  const universeRepository = new SupabaseUniverseRepository();
  const marketVisionRepository = new SupabaseMarketVisionRepository();
  const marketDataProvider = new FmpMarketDataProvider();
  const assetMetadataProvider = new FmpAssetMetadataProvider();
  const marketDataService = new MarketDataService(marketDataRepository, marketDataProvider);
  const benchmarkService = new BenchmarkService(benchmarkRepository, marketDataProvider);
  const benchmarkComparisonService = new BenchmarkComparisonService();
  const assetMetadataService = new AssetMetadataService(marketDataRepository, assetMetadataProvider);
  const instrumentMarketService = new InstrumentMarketService(universeRepository, marketDataProvider);
  const instrumentService = new InstrumentService(universeRepository);
  const bondService = new BondService(universeRepository);
  const watchlistService = new WatchlistService(universeRepository);
  const universeManagementService = new UniverseManagementService(universeRepository);
  const metadataRefreshService = new MetadataRefreshService(universeRepository, assetMetadataProvider);
  const marketThemeService = new MarketThemeService();
  const macroIndicatorService = new MacroIndicatorService();
  const marketVisionService = new MarketVisionService(marketVisionRepository, marketThemeService);
  const allocationService = new AllocationService();
  const performanceService = new PerformanceService();
  const analyticsService = new AnalyticsService(allocationService, performanceService);
  const riskAnalyticsService = new RiskAnalyticsService();
  const riskAnalyticsDataService = new RiskAnalyticsDataService(
    analyticsRepository,
    marketDataRepository,
    universeRepository,
    benchmarkRepository,
    riskAnalyticsService
  );
  return {
    authProvider: new SupabaseAuthProvider(),
    portfolioRepository,
    marketDataRepository,
    analyticsRepository,
    benchmarkRepository,
    riskAnalyticsRepository,
    universeRepository,
    marketDataProvider,
    assetMetadataProvider,
    instrumentService,
    bondService,
    instrumentMarketService,
    watchlistService,
    universeManagementService,
    metadataRefreshService,
    marketVisionService,
    macroIndicatorService,
    marketThemeService,
    allocationService,
    performanceService,
    analyticsService,
    riskAnalyticsService,
    riskAnalyticsDataService,
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
