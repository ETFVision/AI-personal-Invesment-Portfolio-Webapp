import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";
import type { MarketVisionRepository } from "@/application/ports/repositories/MarketVisionRepository";
import type { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
import type { PortfolioReviewRepository } from "@/application/ports/repositories/PortfolioReviewRepository";
import type { RecommendationRepository, UpsertInstrumentRecommendationInput } from "@/application/ports/repositories/RecommendationRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { RecommendationDashboard, RecommendationRunType } from "@/domain/recommendations/types";
import type { Instrument } from "@/domain/universe/types";
import { PortfolioService } from "@/application/services/PortfolioService";
import { resolveInstrumentType } from "@/application/services/instruments/InstrumentTypeResolver";
import { RecommendationRulesService } from "./RecommendationRulesService";
import { PortfolioFitService } from "./portfolioFitService";
import { StockRecommendationService } from "./StockRecommendationService";
import { EtfRecommendationService } from "./EtfRecommendationService";
import { BondEtfRecommendationService } from "./BondEtfRecommendationService";
import { GoldRecommendationService } from "./GoldRecommendationService";
import { CryptoRecommendationService } from "./CryptoRecommendationService";
import type { RecommendationEvaluation } from "./recommendationScoring";
import type { TelemetrySnapshotService } from "@/application/services/telemetry/TelemetrySnapshotService";
import { buildPortfolioExposureContext } from "../portfolio/PortfolioExposureContextService";

type RecommendationServiceOptions = {
  maxInstrumentsPerRun?: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mapToInput(item: RecommendationEvaluation, runId: string | null): UpsertInstrumentRecommendationInput {
  return {
    recommendationRunId: runId,
    instrumentId: item.instrumentId,
    symbol: item.symbol,
    instrumentType: item.instrumentType,
    recommendationLabel: item.recommendationLabel,
    overallScore: item.overallScore,
    confidenceScore: item.confidenceScore,
    riskLevel: item.riskLevel,
    timeHorizon: item.timeHorizon,
    recommendationReasoningSummary: item.recommendationReasoningSummary,
    positiveDrivers: item.positiveDrivers,
    negativeDrivers: item.negativeDrivers,
    guardrailsApplied: item.guardrailsApplied,
    dataLimitations: item.dataLimitations,
    recommendationChangeTriggers: item.recommendationChangeTriggers,
    inputsSnapshot: item.inputsSnapshot,
    scoringBreakdown: item.scoringBreakdown
  };
}

export class RecommendationService {
  private readonly rules = new RecommendationRulesService();
  private readonly portfolioFitService = new PortfolioFitService();
  private readonly stockService = new StockRecommendationService(this.rules);
  private readonly etfService = new EtfRecommendationService(this.rules);
  private readonly bondEtfService = new BondEtfRecommendationService(this.rules);
  private readonly goldService = new GoldRecommendationService(this.rules);
  private readonly cryptoService = new CryptoRecommendationService(this.rules);

  constructor(
    private readonly recommendationRepository: RecommendationRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly fundamentalsRepository: FundamentalsRepository,
    private readonly macroIndicatorRepository: MacroIndicatorRepository,
    private readonly marketVisionRepository?: MarketVisionRepository,
    private readonly portfolioRepository?: PortfolioRepository,
    private readonly portfolioService?: PortfolioService,
    private readonly telemetrySnapshotService?: TelemetrySnapshotService,
    private readonly portfolioReviewRepository?: PortfolioReviewRepository,
    private readonly options: RecommendationServiceOptions = {}
  ) {}

  async getDashboard(portfolioId?: string | null): Promise<RecommendationDashboard> {
    const [runs, recommendations, watchlistItems, holdings] = await Promise.all([
      this.recommendationRepository.listRuns(1),
      this.recommendationRepository.listLatestRecommendations(500),
      this.universeRepository.listWatchlistItems(),
      portfolioId && this.portfolioRepository ? this.portfolioRepository.listHoldings(portfolioId) : Promise.resolve([])
    ]);
    const watchlistInstrumentIds = new Set(watchlistItems.filter((item) => item.isActive).map((item) => item.instrumentId));
    const holdingSymbols = new Set(holdings.map((holding) => (holding.ticker ?? "").toUpperCase()).filter(Boolean));
    return {
      latestRun: runs[0] ?? null,
      recommendations,
      portfolioRecommendations: recommendations.filter((item) => holdingSymbols.has(item.symbol.toUpperCase())),
      watchlistRecommendations: recommendations.filter((item) => watchlistInstrumentIds.has(item.instrumentId)),
      universeOpportunities: recommendations
        .filter((item) => ["Strong Buy", "Buy"].includes(item.recommendationLabel))
        .slice()
        .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
        .slice(0, 25)
    };
  }

  async getDashboardOverview() {
    const [runs, recommendations] = await Promise.all([
      this.recommendationRepository.listRuns(1),
      this.recommendationRepository.listLatestRecommendations(500)
    ]);
    const labelCounts = recommendations.reduce<Record<string, number>>((counts, item) => {
      counts[item.recommendationLabel] = (counts[item.recommendationLabel] ?? 0) + 1;
      return counts;
    }, {});
    return {
      latestRun: runs[0] ?? null,
      recommendationsCount: recommendations.length,
      labelCounts
    };
  }

  getLatestForInstrument(instrumentId: string) {
    return this.recommendationRepository.getLatestRecommendationForInstrument(instrumentId);
  }

  getHistoryForInstrument(instrumentId: string, limit = 8) {
    return this.recommendationRepository.listHistoryForInstrument(instrumentId, limit);
  }

  async runRecommendations(input: {
    runType?: RecommendationRunType | string;
    symbol?: string;
    portfolioId?: string | null;
  } = {}) {
    const runDate = today();
    try {
      const instruments = await this.selectInstruments(input.symbol);
      const evaluations = await this.evaluateInstruments(instruments, input.portfolioId ?? null);
      const run = await this.recommendationRepository.createRun({
        runDate,
        runType: input.symbol ? "single_instrument" : input.runType ?? "manual",
        status: "success",
        instrumentsEvaluated: instruments.length,
        recommendationsCreated: evaluations.length,
        errorMessage: null
      });
      const rows = evaluations.map((evaluation) => mapToInput(evaluation, run.id));
      await this.recommendationRepository.upsertRecommendations(rows);
      await this.recommendationRepository.insertHistory(rows, runDate);
      try {
        await this.telemetrySnapshotService?.captureRecommendationRun({
          run,
          recommendations: evaluations,
          portfolioId: input.portfolioId ?? null
        });
      } catch {
        // Telemetry is observational and should never block recommendation generation.
      }
      return { run, recommendations: evaluations };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown recommendation error";
      const run = await this.recommendationRepository.createRun({
        runDate,
        runType: input.symbol ? "single_instrument" : input.runType ?? "manual",
        status: "failed",
        instrumentsEvaluated: 0,
        recommendationsCreated: 0,
        errorMessage: message
      });
      return { run, recommendations: [] };
    }
  }

  private async selectInstruments(symbol?: string) {
    const instruments = await this.universeRepository.listInstruments({ isActive: true, limit: this.options.maxInstrumentsPerRun ?? 500 });
    const supported = instruments.filter((instrument) => this.isSupported(instrument));
    if (!symbol) return supported;
    return supported.filter((instrument) => instrument.symbol?.toUpperCase() === symbol.toUpperCase());
  }

  private isSupported(instrument: Instrument) {
    const type = resolveInstrumentType(instrument);
    return ["stock", "etf", "bond_etf", "gold_etf", "crypto"].includes(type);
  }

  private async evaluateInstruments(instruments: Instrument[], portfolioId: string | null) {
    const ids = instruments.map((instrument) => instrument.id);
    const [marketMetrics, riskMetrics, fundamentalRows, bondProfiles, macroRegime, marketVisionReport, dashboard, latestPortfolioReview] = await Promise.all([
      this.universeRepository.listInstrumentMarketMetrics(ids),
      this.universeRepository.listInstrumentRiskMetrics(ids),
      this.fundamentalsRepository.listSummaryRows(),
      this.universeRepository.listBondProfiles(),
      this.macroIndicatorRepository.getLatestRegimeSnapshot(),
      this.marketVisionRepository ? this.marketVisionRepository.getLatestPublishedReport() : Promise.resolve(null),
      this.getPortfolioDashboard(portfolioId),
      portfolioId && this.portfolioReviewRepository ? this.portfolioReviewRepository.getLatestReportSummary(portfolioId) : Promise.resolve(null)
    ]);
    const marketById = new Map(marketMetrics.map((item) => [item.instrumentId, item]));
    const riskById = new Map(riskMetrics.map((item) => [item.instrumentId, item]));
    const fundamentalsById = new Map(fundamentalRows.map((item) => [item.instrument.id, item]));
    const bondById = new Map(bondProfiles.map((item) => [item.instrumentId, item]));
    const exposureContext = dashboard ? buildPortfolioExposureContext(dashboard, latestPortfolioReview) : null;

    return instruments.map((instrument) => {
      const recommendationInput = {
        instrument,
        marketMetric: marketById.get(instrument.id) ?? null,
        riskMetric: riskById.get(instrument.id) ?? null,
        fundamentals: fundamentalsById.get(instrument.id) ?? null,
        bondProfile: bondById.get(instrument.id) ?? null,
        macroRegime,
        marketVisionReport,
        portfolioFit: this.portfolioFitService.assess(instrument, dashboard, exposureContext)
      };
      const type = resolveInstrumentType(instrument);
      if (type === "stock") return this.stockService.evaluate(recommendationInput);
      if (type === "bond_etf") return this.bondEtfService.evaluate(recommendationInput);
      if (type === "gold_etf") return this.goldService.evaluate(recommendationInput);
      if (type === "crypto") return this.cryptoService.evaluate(recommendationInput);
      return this.etfService.evaluate(recommendationInput);
    });
  }

  private async getPortfolioDashboard(portfolioId: string | null) {
    if (!portfolioId || !this.portfolioService) return null;
    return this.portfolioService.getDashboard(portfolioId);
  }
}
