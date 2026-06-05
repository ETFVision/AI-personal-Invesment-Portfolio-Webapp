import type { AssistantRepository } from "@/application/ports/repositories/AssistantRepository";
import type { MarketVisionRepository } from "@/application/ports/repositories/MarketVisionRepository";
import type { PortfolioReviewRepository } from "@/application/ports/repositories/PortfolioReviewRepository";
import type { RecommendationRepository } from "@/application/ports/repositories/RecommendationRepository";
import type { TelemetryDashboardService } from "@/application/services/telemetry/TelemetryDashboardService";
import type { PortfolioService } from "@/application/services/PortfolioService";
import type { AssistantContextPackage, AssistantMessage, AssistantQuestionCategory } from "@/domain/assistant/types";
import type { PortfolioDashboard } from "@/domain/portfolio/types";
import type { PortfolioReviewReport } from "@/domain/portfolioReview/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";

function rounded(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : Number(value.toFixed(4));
}

function textList(values: Array<{ title?: string; detail?: string }>, limit = 5) {
  return values.slice(0, limit).map((item) => [item.title, item.detail].filter(Boolean).join(": "));
}

function allocationItems(items: Array<{ label: string; percent: number }>, limit = 8) {
  return items.slice(0, limit).map((item) => ({ label: item.label, percent: rounded(item.percent) ?? 0 }));
}

function lookthroughExposure(report: PortfolioReviewReport | null) {
  const snapshot = unknownRecord(report?.inputsSnapshot);
  return unknownRecord(snapshot.lookthroughExposure);
}

function exposureItemsFromLookthrough(
  rows: unknown[],
  fallback: Array<{ label: string; percent: number }>,
  limit = 8
) {
  const parsed = rows.map((item) => {
    const row = unknownRecord(item);
    const rawWeight = row.exposureWeight ?? row.percent ?? row.weight;
    const percent = typeof rawWeight === "number" ? rawWeight : null;
    return {
      label: String(row.exposureName ?? row.label ?? row.name ?? "Unknown"),
      percent
    };
  }).filter((item): item is { label: string; percent: number } => item.percent != null && item.percent > 0);
  const source = parsed.length > 0 ? parsed : fallback;
  return source
    .sort((a, b) => b.percent - a.percent)
    .slice(0, limit)
    .map((item) => ({ label: item.label, percent: rounded(item.percent) ?? 0 }));
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function unknownRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function scoreFromSection(section: { score?: number } | null | undefined) {
  return typeof section?.score === "number" ? section.score : null;
}

function recommendationDistribution(recommendations: InstrumentRecommendation[]) {
  return recommendations.reduce<Record<string, number>>((counts, item) => {
    counts[item.recommendationLabel] = (counts[item.recommendationLabel] ?? 0) + 1;
    return counts;
  }, {});
}

function extractSymbols(question: string) {
  return Array.from(new Set((question.match(/\b[A-Z]{2,5}\b/g) ?? []).filter((symbol) => !["ETF", "CIO", "USD"].includes(symbol)))).slice(0, 5);
}

function componentScore(recommendation: InstrumentRecommendation, key: string) {
  const components = unknownArray(recommendation.scoringBreakdown.components);
  const match = components.find((item) => {
    const row = unknownRecord(item);
    return row.key === key || row.label === key;
  });
  const score = unknownRecord(match).score;
  return typeof score === "number" ? score : null;
}

function topIndirectHoldings(report: PortfolioReviewReport | null) {
  const snapshot = unknownRecord(report?.inputsSnapshot);
  const lookthrough = lookthroughExposure(report);
  const holdingRows = unknownArray(lookthrough.holdingExposures);
  const nestedHoldings = holdingRows
    .map((item) => {
      const row = unknownRecord(item);
      return {
        symbol: String(row.holdingSymbol ?? row.symbol ?? row.ticker ?? row.label ?? "Unknown"),
        name: typeof row.holdingName === "string" ? row.holdingName : typeof row.name === "string" ? row.name : null,
        percent: typeof row.totalWeight === "number" ? rounded(row.totalWeight) : typeof row.percent === "number" ? rounded(row.percent) : null,
        value: typeof row.value === "number" ? rounded(row.value) : null
      };
    })
    .filter((item) => item.percent != null && item.percent > 0)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
  const direct = nestedHoldings.length > 0
    ? nestedHoldings
    : unknownArray(snapshot.topCombinedHoldings ?? snapshot.topIndirectHoldings ?? snapshot.topUnderlyingHoldings);
  return direct.slice(0, 10).map((item) => {
    if ("symbol" in Object(item) && "percent" in Object(item)) return item as { symbol: string; name?: string | null; percent?: number | null; value?: number | null };
    const row = unknownRecord(item);
    return {
      symbol: String(row.symbol ?? row.ticker ?? row.label ?? "Unknown"),
      name: typeof row.name === "string" ? row.name : null,
      percent: typeof row.percent === "number" ? rounded(row.percent) : typeof row.weight === "number" ? rounded(row.weight) : null,
      value: typeof row.value === "number" ? rounded(row.value) : null
    };
  });
}

export class AssistantContextBuilder {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly portfolioReviewRepository: PortfolioReviewRepository,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly marketVisionRepository: MarketVisionRepository,
    private readonly telemetryDashboardService: TelemetryDashboardService,
    private readonly assistantRepository: AssistantRepository
  ) {}

  async build(input: {
    question: string;
    category: AssistantQuestionCategory;
    userId: string;
    portfolioId: string;
    conversationId: string;
  }): Promise<AssistantContextPackage> {
    const [dashboard, latestReview, recommendations, latestMarketVision, telemetry, recentMessages] = await Promise.all([
      this.portfolioService.getDashboard(input.portfolioId),
      this.portfolioReviewRepository.getLatestReport(input.portfolioId),
      this.recommendationRepository.listLatestRecommendations(250),
      this.marketVisionRepository.getLatestPublishedReport(),
      this.telemetryDashboardService.getDashboard(),
      this.assistantRepository.listMessages(input.conversationId, 6)
    ]);
    const symbols = extractSymbols(input.question);
    const focusedRecommendations = recommendations
      .filter((item) => symbols.length === 0 || symbols.includes(item.symbol))
      .slice(0, symbols.length > 0 ? 8 : 12)
      .map((item) => ({
        symbol: item.symbol,
        label: item.recommendationLabel,
        score: item.overallScore,
        confidence: item.confidenceScore,
        positiveDrivers: item.positiveDrivers.slice(0, 4),
        negativeDrivers: item.negativeDrivers.slice(0, 4),
        guardrails: item.guardrailsApplied.slice(0, 4),
        portfolioFit: componentScore(item, "portfolio_fit"),
        marketVisionAlignment: componentScore(item, "market_vision_alignment")
      }));
    const lookthrough = lookthroughExposure(latestReview);
    const lookthroughSectorRows = unknownArray(lookthrough.sectorExposures);
    const lookthroughCountryRows = unknownArray(lookthrough.countryExposures);
    const lookthroughThemeRows = unknownArray(lookthrough.themeExposures);
    const hasLookthroughExposure = lookthroughSectorRows.length > 0 || lookthroughCountryRows.length > 0 || lookthroughThemeRows.length > 0;

    return {
      category: input.category,
      portfolio: this.portfolioSummary(dashboard, latestReview),
      holdings: dashboard.holdingValuations.slice(0, 10).map((item) => ({
        symbol: item.holding.ticker ?? item.holding.assetName,
        name: item.holding.assetName,
        value: rounded(item.value) ?? 0,
        percent: dashboard.totalValueEstimate > 0 ? rounded(item.value / dashboard.totalValueEstimate) : null
      })),
      indirectHoldings: topIndirectHoldings(latestReview),
      exposures: {
        source: hasLookthroughExposure ? "lookthrough" : "direct_fallback",
        lookthroughCoverage: unknownRecord(lookthrough.coverage),
        sectors: exposureItemsFromLookthrough(lookthroughSectorRows, allocationItems(dashboard.allocationBySector)),
        geographies: exposureItemsFromLookthrough(lookthroughCountryRows, allocationItems(dashboard.allocationByGeography)),
        themes: exposureItemsFromLookthrough(lookthroughThemeRows, allocationItems(this.themeExposureItems(latestReview)))
      },
      portfolioReview: {
        summary: latestReview?.executiveSummary ?? null,
        watchAreas: textList(latestReview?.watchAreas ?? []),
        suggestions: (latestReview?.portfolioImprovementSuggestions ?? []).slice(0, 5).map((item) => `${item.title}: ${item.rationale}`),
        riskFindings: textList(latestReview?.riskReview.findings ?? []),
        concentrationFindings: textList(latestReview?.concentrationReview.findings ?? [])
      },
      recommendations: {
        distribution: recommendationDistribution(recommendations),
        focused: focusedRecommendations
      },
      marketVision: {
        title: latestMarketVision?.title ?? null,
        executiveSummary: latestMarketVision?.executiveSummary ?? null,
        risks: latestMarketVision?.risks?.slice(0, 6) ?? [],
        opportunities: latestMarketVision?.opportunities?.slice(0, 6) ?? [],
        portfolioImplications: latestMarketVision?.portfolioImplications ?? {}
      },
      telemetry: {
        available: telemetry.overview.evaluatedOutcomes > 0 || telemetry.factorOutcomes.length > 0,
        recommendationCoverage: telemetry.overview.coverage.recommendationCoverage,
        bestFactors: telemetry.bestFactors.slice(0, 5).map((item) => `${item.factorName} ${item.factorValue}: ${rounded(item.averageExcessReturn) ?? "-"} excess`),
        worstFactors: telemetry.worstFactors.slice(0, 5).map((item) => `${item.factorName} ${item.factorValue}: ${rounded(item.averageExcessReturn) ?? "-"} excess`),
        confidenceCalibration: telemetry.confidenceCalibration.slice(0, 6).map((item) => `${item.bucket} ${item.horizon}: ${item.hitRate == null ? "insufficient" : rounded(item.hitRate)}`),
        marketVisionAccuracy: telemetry.marketVisionOutcomes.filter((item) => item.outcomeStatus === "evaluated").slice(0, 6).map((item) => `${item.proxySymbol ?? "proxy"} ${item.horizon}: ${item.success ? "successful" : "not successful"}`),
        portfolioReviewEffectiveness: telemetry.portfolioReviewOutcomes.some((item) => item.outcomeStatus === "evaluated")
          ? `${telemetry.portfolioReviewOutcomes.filter((item) => item.outcomeStatus === "evaluated").length} evaluated review outcomes`
          : null
      },
      recentMessages: recentMessages.map((message: AssistantMessage) => ({
        role: message.role,
        content: message.content.slice(0, 800),
        questionCategory: message.questionCategory
      })),
      dataLimitations: [
        latestReview ? "" : "No Portfolio Review report is available yet.",
        latestMarketVision ? "" : "No published Market Vision report is available yet.",
        telemetry.overview.evaluatedOutcomes > 0 ? "" : "Telemetry evidence may be insufficient until observations mature."
      ].filter(Boolean)
    };
  }

  private portfolioSummary(dashboard: PortfolioDashboard, latestReview: PortfolioReviewReport | null) {
    return {
      id: dashboard.portfolio.id,
      name: dashboard.portfolio.name,
      totalValue: rounded(dashboard.totalValueEstimate),
      latestPriceDate: dashboard.latestPriceDate,
      portfolioScore: latestReview?.overallPortfolioScore ?? null,
      diversificationScore: scoreFromSection(latestReview?.diversificationReview),
      concentrationScore: scoreFromSection(latestReview?.concentrationReview),
      riskScore: scoreFromSection(latestReview?.riskReview),
      fixedIncomeScore: scoreFromSection(latestReview?.fixedIncomeReview),
      macroFitScore: scoreFromSection(latestReview?.macroFitReview)
    };
  }

  private themeExposureItems(latestReview: PortfolioReviewReport | null) {
    const metrics = unknownRecord(latestReview?.themeExposureReview.metrics);
    const exposures = unknownArray(metrics.themeExposures ?? metrics.themeExposure ?? metrics.breakdown);
    return exposures.map((item) => {
      const row = unknownRecord(item);
      return {
        label: String(row.label ?? row.theme ?? row.name ?? "Unknown"),
        percent: typeof row.percent === "number" ? row.percent : typeof row.value === "number" ? row.value : 0
      };
    });
  }
}
