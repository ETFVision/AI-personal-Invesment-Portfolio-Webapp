import { RefreshPortfolioPricesJob } from "@/application/jobs/RefreshPortfolioPricesJob";
import { RefreshBenchmarkDataJob } from "@/application/jobs/RefreshBenchmarkDataJob";
import { DailyNewsIngestionJob } from "@/application/jobs/DailyNewsIngestionJob";
import { FredMacroIngestionJob } from "@/application/jobs/FredMacroIngestionJob";
import { GdeltNewsIngestionJob } from "@/application/jobs/GdeltNewsIngestionJob";
import { NewsDataNewsIngestionJob } from "@/application/jobs/NewsDataNewsIngestionJob";
import { WeeklyNewsReconciliationJob } from "@/application/jobs/WeeklyNewsReconciliationJob";
import { GenerateMarketVisionReportJob } from "@/application/jobs/GenerateMarketVisionReportJob";
import { FundamentalsRefreshJob } from "@/application/jobs/FundamentalsRefreshJob";
import { RecommendationRunJob } from "@/application/jobs/RecommendationRunJob";
import { BenchmarkComparisonService } from "@/application/services/BenchmarkComparisonService";
import { BenchmarkService } from "@/application/services/BenchmarkService";
import { AllocationService } from "@/application/services/AllocationService";
import { AssetMetadataService } from "@/application/services/AssetMetadataService";
import { AnalyticsService } from "@/application/services/AnalyticsService";
import { InstrumentMarketService } from "@/application/services/InstrumentMarketService";
import { InstrumentRiskService } from "@/application/services/InstrumentRiskService";
import { InstrumentService } from "@/application/services/InstrumentService";
import { PortfolioService } from "@/application/services/PortfolioService";
import { MarketDataService } from "@/application/services/MarketDataService";
import { NewsClassificationService } from "@/application/services/news/NewsClassificationService";
import { NewsDashboardService } from "@/application/services/news/NewsDashboardService";
import { NewsDeduplicationService } from "@/application/services/news/NewsDeduplicationService";
import { GlobalNewsIngestionService } from "@/application/services/news/GlobalNewsIngestionService";
import { NewsDataIngestionService } from "@/application/services/news/NewsDataIngestionService";
import { NewsIngestionService } from "@/application/services/news/NewsIngestionService";
import { NewsInstrumentLinkingService } from "@/application/services/news/NewsInstrumentLinkingService";
import { NewsProviderService } from "@/application/services/news/NewsProviderService";
import { MacroDashboardService } from "@/application/services/macro/MacroDashboardService";
import { MacroContextService } from "@/application/services/macro/MacroContextService";
import { MacroIndicatorIngestionService } from "@/application/services/macro/MacroIndicatorIngestionService";
import { MacroTrendService } from "@/application/services/macro/MacroTrendService";
import { ThemeIntelligenceService } from "@/application/services/news/ThemeIntelligenceService";
import { WeeklyNewsReconciliationService } from "@/application/services/news/WeeklyNewsReconciliationService";
import { MarketVisionService } from "@/application/services/marketVision/MarketVisionService";
import { MarketVisionGenerationService } from "@/application/services/marketVision/MarketVisionGenerationService";
import { MacroIndicatorService } from "@/application/services/marketVision/MacroIndicatorService";
import { MarketThemeService } from "@/application/services/marketVision/MarketThemeService";
import { CompanyProfileService } from "@/application/services/fundamentals/CompanyProfileService";
import { FinancialRatioService } from "@/application/services/fundamentals/FinancialRatioService";
import { FinancialStatementService } from "@/application/services/fundamentals/FinancialStatementService";
import { FundamentalScoringService } from "@/application/services/fundamentals/FundamentalScoringService";
import { FundamentalTrendCalculationService } from "@/application/services/fundamentals/FundamentalTrendCalculationService";
import { FundamentalsRefreshService } from "@/application/services/fundamentals/FundamentalsRefreshService";
import { RecommendationService } from "@/application/services/recommendations/RecommendationService";
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
import { OpenAiMarketVisionProvider } from "@/infrastructure/providers/ai/OpenAiMarketVisionProvider";
import { FmpNewsProvider } from "@/infrastructure/providers/news/FmpNewsProvider";
import { FmpFundamentalsProvider } from "@/infrastructure/providers/fundamentals/FmpFundamentalsProvider";
import { GdeltNewsProvider } from "@/infrastructure/providers/news/GdeltNewsProvider";
import { NewsDataNewsProvider } from "@/infrastructure/providers/news/NewsDataNewsProvider";
import { FredMacroDataProvider } from "@/infrastructure/providers/macro/FredMacroDataProvider";
import { SupabaseAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseAnalyticsRepository";
import { SupabaseBenchmarkRepository } from "@/infrastructure/repositories/supabase/SupabaseBenchmarkRepository";
import { SupabaseMarketDataRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketDataRepository";
import { SupabaseMarketVisionRepository } from "@/infrastructure/repositories/supabase/SupabaseMarketVisionRepository";
import { SupabaseMacroIndicatorRepository } from "@/infrastructure/repositories/supabase/SupabaseMacroIndicatorRepository";
import { SupabaseGdeltRepository } from "@/infrastructure/repositories/supabase/SupabaseGdeltRepository";
import { SupabaseNewsDataRepository } from "@/infrastructure/repositories/supabase/SupabaseNewsDataRepository";
import { SupabaseNewsRepository } from "@/infrastructure/repositories/supabase/SupabaseNewsRepository";
import { SupabasePortfolioRepository } from "@/infrastructure/repositories/supabase/SupabasePortfolioRepository";
import { SupabaseRiskAnalyticsRepository } from "@/infrastructure/repositories/supabase/SupabaseRiskAnalyticsRepository";
import { SupabaseUniverseRepository } from "@/infrastructure/repositories/supabase/SupabaseUniverseRepository";
import { SupabaseFundamentalsRepository } from "@/infrastructure/repositories/supabase/SupabaseFundamentalsRepository";
import { SupabaseRecommendationRepository } from "@/infrastructure/repositories/supabase/SupabaseRecommendationRepository";
import { env } from "@/infrastructure/config/env";

export function createContainer() {
  const portfolioRepository = new SupabasePortfolioRepository();
  const marketDataRepository = new SupabaseMarketDataRepository();
  const analyticsRepository = new SupabaseAnalyticsRepository();
  const benchmarkRepository = new SupabaseBenchmarkRepository();
  const riskAnalyticsRepository = new SupabaseRiskAnalyticsRepository();
  const universeRepository = new SupabaseUniverseRepository();
  const marketVisionRepository = new SupabaseMarketVisionRepository();
  const macroIndicatorRepository = new SupabaseMacroIndicatorRepository();
  const gdeltRepository = new SupabaseGdeltRepository();
  const newsDataRepository = new SupabaseNewsDataRepository();
  const newsRepository = new SupabaseNewsRepository();
  const fundamentalsRepository = new SupabaseFundamentalsRepository();
  const recommendationRepository = new SupabaseRecommendationRepository();
  const marketDataProvider = new FmpMarketDataProvider();
  const assetMetadataProvider = new FmpAssetMetadataProvider();
  const newsProvider = new FmpNewsProvider();
  const gdeltNewsProvider = new GdeltNewsProvider();
  const newsDataNewsProvider = new NewsDataNewsProvider();
  const macroDataProvider = new FredMacroDataProvider();
  const newsAiProvider = new OpenAiNewsProvider();
  const marketVisionAiProvider = new OpenAiMarketVisionProvider();
  const fundamentalsProvider = new FmpFundamentalsProvider();
  const marketDataService = new MarketDataService(marketDataRepository, marketDataProvider);
  const benchmarkService = new BenchmarkService(benchmarkRepository, marketDataProvider);
  const benchmarkComparisonService = new BenchmarkComparisonService();
  const assetMetadataService = new AssetMetadataService(marketDataRepository, assetMetadataProvider);
  const instrumentMarketService = new InstrumentMarketService(universeRepository, marketDataProvider);
  const instrumentRiskService = new InstrumentRiskService(universeRepository);
  const instrumentService = new InstrumentService(universeRepository);
  const bondService = new BondService(universeRepository);
  const watchlistService = new WatchlistService(universeRepository);
  const universeManagementService = new UniverseManagementService(universeRepository);
  const metadataRefreshService = new MetadataRefreshService(universeRepository, assetMetadataProvider);
  const marketThemeService = new MarketThemeService();
  const macroIndicatorService = new MacroIndicatorService();
  const macroContextService = new MacroContextService();
  const macroTrendService = new MacroTrendService();
  const macroIndicatorIngestionService = new MacroIndicatorIngestionService(macroIndicatorRepository, macroDataProvider, macroTrendService, {
    backfillYears: env.FRED_BACKFILL_YEARS
  });
  const macroDashboardService = new MacroDashboardService(macroIndicatorRepository);
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
  const globalNewsIngestionService = new GlobalNewsIngestionService(
    newsRepository,
    gdeltRepository,
    gdeltNewsProvider,
    newsDeduplicationService,
    undefined,
    undefined,
    {
      enabled: env.ENABLE_GDELT_INGESTION,
      maxArticlesPerQuery: env.GDELT_MAX_ARTICLES_PER_QUERY,
      maxArticlesPerDay: env.GDELT_MAX_ARTICLES_PER_DAY,
      recentWindowHours: env.GDELT_RECENT_WINDOW_HOURS,
      queryDelayMs: env.GDELT_QUERY_DELAY_MS,
      minRefreshMinutes: 30,
      maxQueryGroupsPerRun: env.GDELT_MAX_QUERY_GROUPS_PER_RUN,
      querySuccessCooldownMinutes: env.GDELT_QUERY_SUCCESS_COOLDOWN_MINUTES,
      queryFailureBackoffMinutes: env.GDELT_QUERY_FAILURE_BACKOFF_MINUTES,
      queryRateLimitBackoffMinutes: env.GDELT_QUERY_RATE_LIMIT_BACKOFF_MINUTES
    }
  );
  const newsDataIngestionService = new NewsDataIngestionService(
    newsRepository,
    newsDataRepository,
    newsDataNewsProvider,
    newsDeduplicationService,
    undefined,
    undefined,
    {
      enabled: env.ENABLE_NEWSDATA_INGESTION,
      maxQueryGroups: env.NEWSDATA_MAX_QUERY_GROUPS,
      maxArticlesPerQuery: env.NEWSDATA_MAX_ARTICLES_PER_QUERY,
      maxArticlesPerDay: env.NEWSDATA_MAX_ARTICLES_PER_DAY,
      runFrequencyDays: env.NEWSDATA_RUN_FREQUENCY_DAYS,
      minSecondsBetweenRequests: env.NEWSDATA_MIN_SECONDS_BETWEEN_REQUESTS,
      rateLimitBackoffMinutes: 24 * 60,
      failureBackoffMinutes: 120
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
  }, undefined, undefined, macroIndicatorRepository);
  const themeIntelligenceService = new ThemeIntelligenceService(newsRepository, macroIndicatorRepository);
  const newsDashboardService = new NewsDashboardService(newsRepository, themeIntelligenceService, gdeltRepository, newsDataRepository);
  const fundamentalScoringService = new FundamentalScoringService();
  const fundamentalTrendCalculationService = new FundamentalTrendCalculationService();
  const fundamentalsRefreshService = new FundamentalsRefreshService(
    fundamentalsRepository,
    fundamentalsProvider,
    fundamentalScoringService,
    fundamentalTrendCalculationService,
    {
      enabled: env.ENABLE_FUNDAMENTALS_REFRESH,
      maxStocksPerRefresh: env.FUNDAMENTALS_MAX_STOCKS_PER_REFRESH,
      refreshFrequencyDays: env.FUNDAMENTALS_REFRESH_FREQUENCY_DAYS,
      staleAfterDays: env.FUNDAMENTALS_STALE_AFTER_DAYS
    }
  );
  const companyProfileService = new CompanyProfileService(fundamentalsRepository);
  const financialStatementService = new FinancialStatementService(fundamentalsRepository);
  const financialRatioService = new FinancialRatioService(fundamentalsRepository);
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
  const portfolioService = new PortfolioService(
    portfolioRepository,
    marketDataRepository,
    analyticsRepository,
    analyticsService,
    benchmarkRepository,
    benchmarkComparisonService
  );
  const marketVisionGenerationService = new MarketVisionGenerationService(
    marketVisionRepository,
    newsRepository,
    macroIndicatorRepository,
    marketVisionAiProvider,
    {
      getPortfolioDashboard: (portfolioId) => portfolioService.getDashboard(portfolioId),
      getBondAnalytics: (dashboard) => bondService.getPortfolioBondAnalytics(dashboard),
      getRiskAnalytics: (portfolioId, dashboard) => riskAnalyticsDataService.buildReport(portfolioId, dashboard)
    },
    { model: env.MARKET_VISION_MODEL }
  );
  const recommendationService = new RecommendationService(
    recommendationRepository,
    universeRepository,
    fundamentalsRepository,
    macroIndicatorRepository,
    marketVisionRepository,
    portfolioRepository,
    portfolioService
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
    instrumentRiskService,
    watchlistService,
    universeManagementService,
    metadataRefreshService,
    marketVisionService,
    marketVisionGenerationService,
    macroIndicatorService,
    macroContextService,
    macroIndicatorRepository,
    macroDataProvider,
    macroTrendService,
    macroIndicatorIngestionService,
    macroDashboardService,
    marketThemeService,
    newsRepository,
    gdeltRepository,
    newsDataRepository,
    newsProvider,
    gdeltNewsProvider,
    newsDataNewsProvider,
    newsProviderService,
    newsIngestionService,
    globalNewsIngestionService,
    newsDataIngestionService,
    newsDeduplicationService,
    newsInstrumentLinkingService,
    newsClassificationService,
    weeklyNewsReconciliationService,
    themeIntelligenceService,
    newsDashboardService,
    fundamentalsRepository,
    recommendationRepository,
    recommendationService,
    fundamentalsProvider,
    fundamentalScoringService,
    fundamentalTrendCalculationService,
    fundamentalsRefreshService,
    companyProfileService,
    financialStatementService,
    financialRatioService,
    allocationService,
    performanceService,
    analyticsService,
    riskAnalyticsService,
    riskAnalyticsDataService,
    benchmarkComparisonService,
    benchmarkService,
    portfolioService,
    marketDataService,
    assetMetadataService,
    jobs: {
      refreshPortfolioPrices: new RefreshPortfolioPricesJob(marketDataService),
      refreshBenchmarkData: new RefreshBenchmarkDataJob(benchmarkService),
      dailyNewsIngestion: new DailyNewsIngestionJob(newsIngestionService, newsClassificationService),
      gdeltNewsIngestion: new GdeltNewsIngestionJob(globalNewsIngestionService),
      newsDataNewsIngestion: new NewsDataNewsIngestionJob(newsDataIngestionService),
      weeklyNewsReconciliation: new WeeklyNewsReconciliationJob(weeklyNewsReconciliationService, newsClassificationService),
      fredMacroIngestion: new FredMacroIngestionJob(macroIndicatorIngestionService),
      weeklyMarketVision: new GenerateMarketVisionReportJob(marketVisionGenerationService),
      fundamentalsRefresh: new FundamentalsRefreshJob(fundamentalsRefreshService),
      recommendationRun: new RecommendationRunJob(recommendationService)
    }
  };
}
