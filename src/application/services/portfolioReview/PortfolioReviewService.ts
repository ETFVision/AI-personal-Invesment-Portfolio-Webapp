import type { PortfolioReviewRepository } from "@/application/ports/repositories/PortfolioReviewRepository";
import type { MarketVisionRepository } from "@/application/ports/repositories/MarketVisionRepository";
import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";
import type { RecommendationRepository } from "@/application/ports/repositories/RecommendationRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { EtfExposureRepository } from "@/application/ports/repositories/EtfExposureRepository";
import type { PortfolioService } from "@/application/services/PortfolioService";
import type { BondService } from "@/application/services/bonds/BondService";
import type { RiskAnalyticsDataService } from "@/application/services/risk/RiskAnalyticsDataService";
import type { ThemeIntelligenceService } from "@/application/services/news/ThemeIntelligenceService";
import type { PortfolioLookthroughExposureService } from "@/application/services/etfLookthrough/PortfolioLookthroughExposureService";
import type { PortfolioReviewDashboard, PortfolioReviewReport, PortfolioReviewScoreComponent } from "@/domain/portfolioReview/types";
import { AllocationReviewService } from "./AllocationReviewService";
import { ConcentrationReviewService } from "./ConcentrationReviewService";
import { DiversificationReviewService } from "./DiversificationReviewService";
import { FixedIncomeReviewService } from "./FixedIncomeReviewService";
import { GeographyReviewService } from "./GeographyReviewService";
import { MacroFitReviewService } from "./MacroFitReviewService";
import { PortfolioActionSuggestionService } from "./PortfolioActionSuggestionService";
import { PortfolioImprovementSuggestionService } from "./PortfolioImprovementSuggestionService";
import { PortfolioRiskReviewService } from "./PortfolioRiskReviewService";
import { RecommendationAlignmentReviewService } from "./RecommendationAlignmentReviewService";
import { ThemeExposureReviewService } from "./ThemeExposureReviewService";
import {
  latestPeriod,
  portfolioReviewWeights,
  weightedPortfolioScore,
  type PortfolioReviewInputContext
} from "./portfolioReviewScoring";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function scoreComponent(key: PortfolioReviewScoreComponent["key"], label: string, score: number, reason: string): PortfolioReviewScoreComponent {
  return {
    key,
    label,
    score,
    weight: portfolioReviewWeights[key],
    reason
  };
}

export function portfolioReviewConfidenceScore(context: PortfolioReviewInputContext) {
  let score = 40;
  if (context.dashboard.holdings.length > 0) score += 10;
  if (context.dashboard.latestPriceDate) score += 8;
  if (context.riskReport.riskContributionObservationCount >= 30) score += 10;
  if (context.recommendations.length > 0) score += 10;
  if (context.marketVisionReport) score += 7;
  if (context.macroRegime) score += 5;
  if (context.themeIntelligence?.topThemesThisWeek.length) score += 5;
  if (!context.lookthroughReport?.coverage.etfCount || (
    context.lookthroughReport.coverage.etfsWithSectorExposure > 0 &&
    context.lookthroughReport.coverage.etfsWithCountryExposure > 0 &&
    context.lookthroughReport.coverage.etfsWithTopHoldings > 0
  )) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function portfolioReviewExecutiveSummary(score: number | null, watchAreaCount: number, suggestionCount: number, limitationCount: number) {
  const scoreText = score == null ? "insufficient data" : `${score}/100`;
  const posture =
    score == null ? "cannot yet be scored reliably" :
    score >= 75 ? "is broadly healthy" :
    score >= 60 ? "is workable but has review areas" :
    "needs attention before it can be considered well balanced";
  return `Portfolio review score is ${scoreText}. The portfolio ${posture}. ${watchAreaCount} watch areas, ${suggestionCount} balance findings and ${limitationCount} data limitations were identified. Balance findings are deterministic analytical outputs and do not constitute investment advice, trade instructions, or position sizing guidance.`;
}

function dataLimitations(context: PortfolioReviewInputContext) {
  return [
    context.dashboard.holdings.length === 0 ? "No holdings are available for portfolio review." : null,
    !context.dashboard.latestPriceDate ? "Latest portfolio price date is unavailable." : null,
    context.riskReport.riskContributionMethod !== "covariance" ? "Risk contribution may use proxy estimates where overlapping price history is insufficient." : null,
    context.recommendations.length === 0 ? "Insight alignment is limited because no latest instrument insights were found." : null,
    !context.marketVisionReport ? "Market Vision context is unavailable." : null,
    !context.macroRegime ? "FRED macro regime snapshot is unavailable." : null,
    !context.themeIntelligence?.topThemesThisWeek.length ? "Theme intelligence summary is unavailable or empty." : null,
    context.lookthroughReport && context.lookthroughReport.coverage.etfCount > 0 && context.lookthroughReport.coverage.etfsWithTopHoldings === 0
        ? "Indirect ETF holding exposure is unavailable because no ETF top-holding data is cached."
        : null,
    context.lookthroughReport && context.lookthroughReport.coverage.etfCount > 0 && context.lookthroughReport.coverage.etfsWithSectorExposure === 0
      ? "ETF sector look-through exposure is unavailable; sector review may use direct taxonomy fallback."
      : null,
    context.lookthroughReport && context.lookthroughReport.coverage.etfCount > 0 && context.lookthroughReport.coverage.etfsWithCountryExposure === 0
      ? "ETF country look-through exposure is unavailable; geography review may use direct geography fallback."
      : null
  ].filter((item): item is string => Boolean(item));
}

export class PortfolioReviewService {
  constructor(
    private readonly repository: PortfolioReviewRepository,
    private readonly portfolioService: PortfolioService,
    private readonly riskAnalyticsDataService: RiskAnalyticsDataService,
    private readonly bondService: BondService,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly marketVisionRepository: MarketVisionRepository,
    private readonly macroIndicatorRepository: MacroIndicatorRepository,
    private readonly themeIntelligenceService: ThemeIntelligenceService,
    private readonly portfolioLookthroughExposureService: PortfolioLookthroughExposureService,
    private readonly etfExposureRepository: EtfExposureRepository,
    private readonly allocationReviewService = new AllocationReviewService(),
    private readonly concentrationReviewService = new ConcentrationReviewService(),
    private readonly diversificationReviewService = new DiversificationReviewService(),
    private readonly portfolioRiskReviewService = new PortfolioRiskReviewService(),
    private readonly macroFitReviewService = new MacroFitReviewService(),
    private readonly recommendationAlignmentReviewService = new RecommendationAlignmentReviewService(),
    private readonly fixedIncomeReviewService = new FixedIncomeReviewService(),
    private readonly themeExposureReviewService = new ThemeExposureReviewService(),
    private readonly geographyReviewService = new GeographyReviewService(),
    private readonly improvementSuggestionService = new PortfolioImprovementSuggestionService(),
    private readonly actionSuggestionService = new PortfolioActionSuggestionService()
  ) {}

  async getDashboard(portfolioId: string): Promise<PortfolioReviewDashboard> {
    const [latestReport, reports, runs] = await Promise.all([
      this.repository.getLatestReport(portfolioId),
      this.repository.listReportSummaries(portfolioId, 10),
      this.repository.listRuns(portfolioId, 10)
    ]);
    return {
      latestReport,
      reports,
      runs
    };
  }

  async generateReview(input: { portfolioId: string; runId?: string | null; status?: "draft" | "final" }): Promise<PortfolioReviewReport> {
    const context = await this.buildContext(input.portfolioId);
    const allocationReview = this.allocationReviewService.review(context);
    const concentrationReview = this.concentrationReviewService.review(context);
    const diversificationReview = this.diversificationReviewService.review(context);
    const riskReview = this.portfolioRiskReviewService.review(context);
    const macroFitReview = this.macroFitReviewService.review(context);
    const recommendationAlignmentReview = this.recommendationAlignmentReviewService.review(context);
    const fixedIncomeReview = this.fixedIncomeReviewService.review(context);
    const themeExposureReview = this.themeExposureReviewService.review(context);
    const geographyReview = this.geographyReviewService.review(context);
    const components = [
      scoreComponent("allocation", "Allocation", allocationReview.score, allocationReview.summary),
      scoreComponent("concentration", "Concentration", concentrationReview.score, concentrationReview.summary),
      scoreComponent("diversification", "Diversification", diversificationReview.score, diversificationReview.summary),
      scoreComponent("risk", "Risk", riskReview.score, riskReview.summary),
      scoreComponent("macroFit", "Macro Fit", macroFitReview.score, macroFitReview.summary),
      scoreComponent("recommendationAlignment", "Recommendation Alignment", recommendationAlignmentReview.score, recommendationAlignmentReview.summary),
      scoreComponent("fixedIncome", "Fixed Income", fixedIncomeReview.score, fixedIncomeReview.summary),
      scoreComponent("themeExposure", "Theme Exposure", themeExposureReview.score, themeExposureReview.summary),
      scoreComponent("geography", "Geography", geographyReview.score, geographyReview.summary)
    ];
    const overallScore = weightedPortfolioScore(components);
    const suggestions = this.improvementSuggestionService.build(context);
    const potentialActions = this.actionSuggestionService.build(suggestions);
    const watchAreas = [
      ...allocationReview.findings,
      ...concentrationReview.findings,
      ...riskReview.findings,
      ...fixedIncomeReview.findings
    ].filter((item) => item.severity !== "info").slice(0, 10);
    const period = latestPeriod(context.dashboard);
    const limitations = dataLimitations(context);

    return this.repository.upsertReport({
      portfolioId: input.portfolioId,
      portfolioReviewRunId: input.runId ?? null,
      reviewDate: today(),
      periodStart: period.start,
      periodEnd: period.end,
      status: input.status ?? "draft",
      executiveSummary: this.executiveSummary(overallScore, watchAreas.length, suggestions.length, limitations.length),
      allocationReview,
      concentrationReview,
      diversificationReview,
      riskReview,
      macroFitReview,
      recommendationAlignmentReview,
      fixedIncomeReview,
      themeExposureReview,
      geographyReview,
      watchAreas,
      portfolioImprovementSuggestions: suggestions,
      potentialActions,
      dataLimitations: limitations,
      overallPortfolioScore: overallScore,
      confidenceScore: portfolioReviewConfidenceScore(context),
      inputsSnapshot: {
        generatedAt: new Date().toISOString(),
        scoreComponents: components,
        portfolio: {
          id: context.dashboard.portfolio.id,
          name: context.dashboard.portfolio.name,
          value: context.dashboard.totalValueEstimate,
          holdings: context.dashboard.holdings.length,
          latestPriceDate: context.dashboard.latestPriceDate
        },
        riskAsOfDate: context.riskReport.asOfDate,
        bondProfileCoverage: context.bondReport.profileCoverage,
        recommendationCount: context.recommendations.length,
        marketVisionReportId: context.marketVisionReport?.id ?? null,
        macroRegimeId: context.macroRegime?.id ?? null,
        topThemes: context.themeIntelligence?.topThemesThisWeek.slice(0, 8) ?? [],
        lookthroughExposure: context.lookthroughReport
      }
    });
  }

  private async buildContext(portfolioId: string): Promise<PortfolioReviewInputContext> {
    const dashboard = await this.portfolioService.getDashboard(portfolioId);
    const [riskReport, bondReport, recommendations, instruments, marketVisionReport, macroRegime] = await Promise.all([
      this.riskAnalyticsDataService.buildReport(portfolioId, dashboard),
      this.bondService.getPortfolioBondAnalytics(dashboard),
      this.recommendationRepository.listLatestRecommendations(500),
      this.universeRepository.listInstruments({ isActive: true }),
      this.marketVisionRepository.getLatestPublishedReport(),
      this.macroIndicatorRepository.getLatestRegimeSnapshot()
    ]);
    const periodEnd = dashboard.latestPriceDate ?? today();
    const periodStartDate = new Date(`${periodEnd}T00:00:00.000Z`);
    periodStartDate.setUTCDate(periodStartDate.getUTCDate() - 6);
    const [themeIntelligence, lookthroughReport, etfTopHoldings] = await Promise.all([
      this.themeIntelligenceService.getThemeIntelligence(periodStartDate.toISOString().slice(0, 10), periodEnd),
      this.portfolioLookthroughExposureService.calculateAndStore(portfolioId, dashboard, instruments),
      this.etfExposureRepository.listLatestTopHoldings(instruments.map((instrument) => instrument.id))
    ]);
    return {
      dashboard,
      riskReport,
      bondReport,
      recommendations,
      instruments,
      marketVisionReport,
      macroRegime,
      themeIntelligence,
      lookthroughReport,
      etfTopHoldings
    };
  }

  private executiveSummary(score: number | null, watchAreaCount: number, suggestionCount: number, limitationCount: number) {
    return portfolioReviewExecutiveSummary(score, watchAreaCount, suggestionCount, limitationCount);
  }
}
