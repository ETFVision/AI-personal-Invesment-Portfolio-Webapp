import type { TelemetryRepository } from "@/application/ports/repositories/TelemetryRepository";
import type { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { RecommendationEvaluation } from "@/application/services/recommendations/recommendationScoring";
import type { RecommendationRun } from "@/domain/recommendations/types";
import type { MarketVisionReport } from "@/domain/marketVision/types";
import type { PortfolioReviewReport } from "@/domain/portfolioReview/types";

const DEFAULT_BENCHMARK = "SPY";

type RecommendationSnapshotInput = {
  run: RecommendationRun;
  recommendations: RecommendationEvaluation[];
  portfolioId?: string | null;
};

function componentScores(scoringBreakdown: Record<string, unknown>) {
  const components = scoringBreakdown.components;
  return Array.isArray(components) ? components : [];
}

function factorInputs(item: RecommendationEvaluation) {
  const components = componentScores(item.scoringBreakdown);
  const factors: Record<string, unknown> = {};
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const row = component as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key : typeof row.label === "string" ? row.label.toLowerCase().replaceAll(" ", "_") : null;
    if (key) factors[key] = row.score ?? null;
  }
  factors.overall_score = item.overallScore;
  factors.confidence_score = item.confidenceScore;
  factors.recommendation_label = item.recommendationLabel;
  factors.risk_level = item.riskLevel;
  return factors;
}

function marketVisionProxy(theme: string) {
  const normalized = theme.toLowerCase();
  if (normalized.includes("bond") || normalized.includes("rates") || normalized.includes("credit")) return "AGG";
  if (normalized.includes("gold") || normalized.includes("commod")) return "GLD";
  if (normalized.includes("crypto") || normalized.includes("bitcoin")) return "BTCUSD";
  if (normalized.includes("international") || normalized.includes("global")) return "VT";
  return "SPY";
}

function directionFromText(text: string): "bullish" | "neutral" | "bearish" | "mixed" {
  const normalized = text.toLowerCase();
  if (/\b(risk|pressure|weak|bear|negative|deteriorat|underperform|caution)\b/.test(normalized)) return "bearish";
  if (/\b(strong|support|bull|positive|improv|opportun|resilient)\b/.test(normalized)) return "bullish";
  if (/\b(mixed|balanced|uncertain)\b/.test(normalized)) return "mixed";
  return "neutral";
}

function sectionScore(section: unknown): number | null {
  if (!section || typeof section !== "object") return null;
  const value = (section as Record<string, unknown>).score;
  return typeof value === "number" ? value : null;
}

function sectionFindings(section: unknown) {
  if (!section || typeof section !== "object") return [];
  const findings = (section as Record<string, unknown>).findings;
  return Array.isArray(findings) ? findings : [];
}

export class TelemetrySnapshotService {
  constructor(
    private readonly telemetryRepository: TelemetryRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly portfolioRepository?: PortfolioRepository
  ) {}

  async captureRecommendationRun(input: RecommendationSnapshotInput) {
    if (input.recommendations.length === 0) return { snapshotsCreated: 0 };
    const portfolio = input.portfolioId && this.portfolioRepository ? await this.portfolioRepository.getPortfolioById(input.portfolioId) : null;
    const instrumentIds = input.recommendations.map((item) => item.instrumentId);
    const marketMetrics = await this.universeRepository.listInstrumentMarketMetrics(instrumentIds);
    const marketByInstrumentId = new Map(marketMetrics.map((item) => [item.instrumentId, item]));
    const snapshots = await this.telemetryRepository.createRecommendationSnapshots(input.recommendations.map((item) => {
      const market = marketByInstrumentId.get(item.instrumentId);
      return {
        portfolioId: input.portfolioId ?? null,
        userId: portfolio?.userId ?? null,
        instrumentId: item.instrumentId,
        symbol: item.symbol,
        recommendation: item.recommendationLabel,
        recommendationScore: item.overallScore,
        confidenceScore: item.confidenceScore,
        generatedAt: input.run.createdAt,
        runId: input.run.id,
        benchmarkSymbol: DEFAULT_BENCHMARK,
        priceAtRecommendation: market?.latestPrice ?? null,
        priceDate: market?.latestPriceDate ?? null,
        positiveDrivers: item.positiveDrivers,
        negativeDrivers: item.negativeDrivers,
        factorInputs: factorInputs(item),
        componentScores: componentScores(item.scoringBreakdown),
        guardrails: item.guardrailsApplied
      };
    }));
    return { snapshotsCreated: snapshots.length };
  }

  async captureMarketVisionReport(report: MarketVisionReport | null) {
    if (!report) return { snapshotsCreated: 0 };
    const themes = [
      { theme: "Equities", text: report.equityView },
      { theme: "Bonds", text: report.bondView },
      { theme: "Gold / Commodities", text: report.goldView },
      { theme: "Crypto", text: report.cryptoView },
      { theme: "Rates", text: report.ratesView },
      { theme: "Inflation", text: report.inflationView },
      { theme: "Growth", text: report.growthView ?? report.globalMarketSummary },
      { theme: "Currency", text: report.currencyView },
      { theme: "Geopolitical", text: report.geopoliticalRiskView }
    ].filter((item) => item.text && item.text.trim().length > 0);
    const snapshots = await this.telemetryRepository.createMarketVisionSnapshots(themes.map((item) => ({
      reportId: report.id,
      reportPeriodStart: report.reportPeriodStart,
      reportPeriodEnd: report.reportPeriodEnd,
      generatedAt: report.updatedAt ?? report.createdAt,
      theme: item.theme,
      direction: directionFromText(item.text),
      confidence: report.confidenceScore ?? 50,
      severity: 50,
      supportingSignalCount: 1,
      fredSignalCount: item.theme.match(/Rates|Inflation|Growth|Currency/) ? 1 : 0,
      newsSignalCount: 1,
      proxySymbol: marketVisionProxy(item.theme)
    })));
    return { snapshotsCreated: snapshots.length };
  }

  async capturePortfolioReview(report: PortfolioReviewReport | null) {
    if (!report) return { snapshotsCreated: 0 };
    const portfolio = this.portfolioRepository ? await this.portfolioRepository.getPortfolioById(report.portfolioId) : null;
    const snapshot = await this.telemetryRepository.createPortfolioReviewSnapshot({
      portfolioId: report.portfolioId,
      userId: portfolio?.userId ?? null,
      reviewId: report.id,
      generatedAt: report.updatedAt ?? report.createdAt,
      portfolioScore: report.overallPortfolioScore,
      diversificationScore: sectionScore(report.diversificationReview),
      concentrationScore: sectionScore(report.concentrationReview),
      riskScore: sectionScore(report.riskReview),
      fixedIncomeScore: sectionScore(report.fixedIncomeReview),
      macroFitScore: sectionScore(report.macroFitReview),
      themeExposureSummary: report.themeExposureReview.metrics ?? {},
      topRisks: [
        ...sectionFindings(report.concentrationReview),
        ...sectionFindings(report.riskReview),
        ...sectionFindings(report.themeExposureReview)
      ].slice(0, 10),
      improvementSuggestions: report.portfolioImprovementSuggestions,
      allocationSnapshot: report.allocationReview.metrics ?? {},
      lookthroughSnapshot: report.inputsSnapshot ?? {}
    });
    return { snapshotsCreated: snapshot ? 1 : 0 };
  }
}
