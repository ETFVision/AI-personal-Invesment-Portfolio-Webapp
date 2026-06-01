import { RefreshPortfolioPricesJob } from "@/application/jobs/RefreshPortfolioPricesJob";
import { RefreshBenchmarkDataJob } from "@/application/jobs/RefreshBenchmarkDataJob";
import { DailyNewsIngestionJob } from "@/application/jobs/DailyNewsIngestionJob";
import { WeeklyNewsReconciliationJob } from "@/application/jobs/WeeklyNewsReconciliationJob";
import { BenchmarkComparisonService } from "@/application/services/BenchmarkComparisonService";
import { BenchmarkService } from "@/application/services/BenchmarkService";
import { AllocationService } from "@/application/services/AllocationService";
import { AssetMetadataService } from "@/application/services/AssetMetadataService";
import { AnalyticsService } from "@/application/services/AnalyticsService";
import { InstrumentMarketService } from "@/application/services/InstrumentMarketService";
import { InstrumentService } from "@/application/services/InstrumentService";
import { PortfolioService } from "@/application/services/PortfolioService";
import { MarketDataService } from "@/application/services/MarketDataService";
import { NewsClassificationService } from "@/application/services/news/NewsClassificationService";
import { NewsDashboardService } from "@/application/services/news/NewsDashboardService";
import { NewsDeduplicationService } from "@/application/services/news/NewsDeduplicationService";
import { NewsIngestionService } from "@/application/services/news/NewsIngestionService";
import { NewsInstrumentLinkingService } from "@/application/services/news/NewsInstrumentLinkingService";
import { NewsProviderService } from "@/application/services/news/NewsProviderService";
import { ThemeIntelligenceService } from "@/application/services/news/ThemeIntelligenceService";
import { WeeklyNewsReconciliationService } from "@/application/services/news/WeeklyNewsReconciliationService";
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
import { OpenAiNewsProvider } from "@/infrastructure/providers/ai/OpenAiNewsProvider";
import { FmpNewsProvider } from "@/infrastructure/providers/news/FmpNewsProvider";
import { SupabaseAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseAnalyticsRepository";
import { SupabaseBenchmarkRepository } from "@/infrastructure/repositories/supabase/SupabaseBenchmarkRepository";
import { SupabaseMarketDataRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketDataRepository";
import { SupabaseMarketVisionRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketVisionRepository";
import { SupabaseNewsRepository } from "@/infrastructure/repositories/supabase/SupabaseNewsRepository";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";
import { SupabaseRiskAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseRiskAnalyticsRepository";
import { SupabaseUniverseRepository } from "@/infrastructure/repositories/supabase/SupabaseUniverseRepository";
import { env } from "@/infrastructure/config/env";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  const marketDataRepository = new SupabaseMarketDataRepository();
  const analyticsRepository = new SupabaseAnalyticsRepository();
  const benchmarkRepository = new SupabaseBenchmarkRepository();
  const riskAnalyticsRepository = new SupabaseRiskAnalyticsRepository();
  const universeRepository = new SupabaseUniverseRepository();
  const marketVisionRepository = new SupabaseMarketVisionRepository();
  const newsRepository = new SupabaseNewsRepository();
  const marketDataProvider = new FmpMarketDataProvider();
  const assetMetadataProvider = new FmpAssetMetadataProvider();
  const newsProvider = new FmpNewsProvider();
  const newsAiProvider = new OpenAiNewsProvider();
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
  const newsDeduplicationService = new NewsDeduplicationService();
  const newsInstrumentLinkingService = new NewsInstrumentLinkingService();
  const newsProviderService = new NewsProviderService(newsProvider);
  const newsIngestionService = new NewsIngestionService(
    newsRepository,
    universeRepository,
    newsProvider,
    newsDeduplicationService,
    newsInstrumentLinkingService,
    {
      maxArticlesPerDay: env.MAX_NEWS_ARTICLES_PER_DAY,
      maxArticlesPerInstrument: env.MAX_NEWS_ARTICLES_PER_INSTRUMENT
    }
  );
  const newsClassificationService = new NewsClassificationService(newsRepository, newsAiProvider, {
    classificationModel: env.NEWS_CLASSIFICATION_MODEL,
    maxArticlesPerDay: env.MAX_NEWS_ARTICLES_PER_DAY,
    enableAiClassification: env.ENABLE_AI_NEWS_CLASSIFICATION
  });
  const weeklyNewsReconciliationService = new WeeklyNewsReconciliationService(newsRepository, newsAiProvider, {
    maxArticlesPerWeek: env.MAX_NEWS_ARTICLES_PER_WEEK,
    enableWeeklyReconciliation: env.ENABLE_WEEKLY_NEWS_RECONCILIATION,
    reconciliationModel: env.NEWS_RECONCILIATION_MODEL
  });
  const themeIntelligenceService = new ThemeIntelligenceService(newsRepository);
  const newsDashboardService = new NewsDashboardService(newsRepository, themeIntelligenceService);
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
    newsRepository,
    newsProvider,
    newsProviderService,
    newsIngestionService,
    newsDeduplicationService,
    newsInstrumentLinkingService,
    newsClassificationService,
    weeklyNewsReconciliationService,
    themeIntelligenceService,
    newsDashboardService,
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
      refreshBenchmarkData: new RefreshBenchmarkDataJob(benchmarkService),
      dailyNewsIngestion: new DailyNewsIngestionJob(newsIngestionService, newsClassificationService),
      weeklyNewsReconciliation: new WeeklyNewsReconciliationJob(weeklyNewsReconciliationService)
    }
  };
}
