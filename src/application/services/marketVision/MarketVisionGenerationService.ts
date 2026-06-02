import type { AiMarketVisionOutput, AiMarketVisionProvider } from "@/application/ports/providers/AiMarketVisionProvider";
import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";
import type { MarketVisionRepository } from "@/application/ports/repositories/MarketVisionRepository";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { PortfolioDashboard } from "@/domain/portfolio/types";
import { emptyPortfolioImplications } from "./MarketVisionService";

export const MARKET_VISION_PROMPT_VERSION = "market-vision-v1";

type OptionalPortfolioServices = {
  getPortfolioDashboard?: (portfolioId: string) => Promise<PortfolioDashboard>;
  getBondAnalytics?: (dashboard: PortfolioDashboard) => Promise<unknown>;
  getRiskAnalytics?: (portfolioId: string, dashboard: PortfolioDashboard) => Promise<unknown>;
};

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
}

function toScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function toPortfolioImplications(value: unknown) {
  const row = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    ...emptyPortfolioImplications,
    equityAllocationImplication: toString(row.equityAllocationImplication),
    bondAllocationImplication: toString(row.bondAllocationImplication),
    goldImplication: toString(row.goldImplication),
    cryptoImplication: toString(row.cryptoImplication),
    cashImplication: toString(row.cashImplication),
    riskImplication: toString(row.riskImplication),
    watchlistImplication: toString(row.watchlistImplication)
  };
}

function allText(output: AiMarketVisionOutput) {
  return [
    output.title,
    output.executiveSummary,
    output.globalMarketSummary,
    output.equityOutlook,
    output.bondOutlook,
    output.goldOutlook,
    output.cryptoOutlook,
    output.ratesOutlook,
    output.inflationOutlook,
    output.growthOutlook,
    output.employmentOutlook,
    output.currencyOutlook,
    output.geopoliticalOutlook,
    ...output.keyRisks,
    ...output.keyOpportunities,
    ...Object.values(output.portfolioImplications)
  ].join(" ").toLowerCase();
}

function assertNoRecommendations(output: AiMarketVisionOutput) {
  const text = allText(output);
  const prohibited = /\b(buy|sell|trim|add to|increase allocation|decrease allocation|overweight|underweight|rebalance into|rotate into)\b/;
  if (prohibited.test(text)) {
    throw new Error("AI Market Vision output contained recommendation language and was not saved.");
  }
}

export function validateMarketVisionGenerationOutput(input: unknown): AiMarketVisionOutput {
  const row = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const output: AiMarketVisionOutput = {
    title: toString(row.title, "Weekly Market Vision"),
    executiveSummary: toString(row.executiveSummary),
    globalMarketSummary: toString(row.globalMarketSummary),
    topEmergingThemes: toStringArray(row.topEmergingThemes),
    persistentThemes: toStringArray(row.persistentThemes),
    structuralThemes: toStringArray(row.structuralThemes),
    equityOutlook: toString(row.equityOutlook),
    bondOutlook: toString(row.bondOutlook),
    goldOutlook: toString(row.goldOutlook),
    cryptoOutlook: toString(row.cryptoOutlook),
    ratesOutlook: toString(row.ratesOutlook),
    inflationOutlook: toString(row.inflationOutlook),
    growthOutlook: toString(row.growthOutlook),
    employmentOutlook: toString(row.employmentOutlook),
    currencyOutlook: toString(row.currencyOutlook),
    geopoliticalOutlook: toString(row.geopoliticalOutlook),
    keyRisks: toStringArray(row.keyRisks),
    keyOpportunities: toStringArray(row.keyOpportunities),
    portfolioImplications: toPortfolioImplications(row.portfolioImplications),
    confidenceScore: toScore(row.confidenceScore),
    tokenUsage: {},
    costEstimate: null
  };
  assertNoRecommendations(output);
  return output;
}

function topAllocations(items: Array<{ label: string; percent: number }> = []) {
  return items.slice(0, 6).map((item) => ({ label: item.label, percent: Math.round(item.percent * 1000) / 10 }));
}

function portfolioSnapshot(dashboard: PortfolioDashboard | null) {
  if (!dashboard) return null;
  return {
    totalValue: dashboard.totalValueEstimate,
    cashPercent: Math.round(dashboard.cashPercent * 1000) / 10,
    investedPercent: Math.round(dashboard.investedPercent * 1000) / 10,
    unrealizedGainLoss: dashboard.unrealizedGainLoss,
    baseCurrency: dashboard.portfolio.baseCurrency,
    assetAllocation: topAllocations(dashboard.allocationByType),
    sectorAllocation: topAllocations(dashboard.allocationBySector),
    geographyAllocation: topAllocations(dashboard.allocationByGeography),
    currencyExposure: topAllocations(dashboard.currencyExposure),
    benchmarkComparisons: dashboard.benchmarkComparisons.slice(0, 7).map((comparison) => ({
      benchmark: comparison.benchmark.name,
      cumulativePortfolioReturn: comparison.cumulativePortfolioReturn,
      cumulativeBenchmarkReturn: comparison.cumulativeBenchmarkReturn,
      relativeOutperformance: comparison.relativeOutperformance,
      portfolioMaxDrawdown: comparison.portfolioMaxDrawdown,
      benchmarkMaxDrawdown: comparison.benchmarkMaxDrawdown
    }))
  };
}

export class MarketVisionGenerationService {
  constructor(
    private readonly marketVisionRepository: MarketVisionRepository,
    private readonly newsRepository: NewsRepository,
    private readonly macroRepository: MacroIndicatorRepository,
    private readonly aiProvider: AiMarketVisionProvider,
    private readonly portfolioServices: OptionalPortfolioServices = {},
    private readonly config = { model: "gpt-5-mini" }
  ) {}

  async generateWeeklyReport(input: { portfolioId?: string | null; force?: boolean; status?: "draft" | "published" } = {}) {
    const startedAt = new Date();
    const weekly = await this.newsRepository.getLatestWeeklyReconciliation();
    if (!weekly) throw new Error("No weekly news reconciliation is available. Run Weekly reconcile first.");
    const periodStart = weekly.periodStart;
    const periodEnd = weekly.periodEnd;
    if (!input.force) {
      const existing = await this.marketVisionRepository.findGeneratedReportForPeriod(periodStart, periodEnd);
      if (existing) {
        await this.marketVisionRepository.insertGenerationLog({
          reportId: existing.id,
          periodStart,
          periodEnd,
          startedAt: startedAt.toISOString(),
          completedAt: new Date().toISOString(),
          status: "skipped",
          modelUsed: existing.modelUsed,
          promptVersion: existing.promptVersion,
          metadata: { reason: "generated_report_already_exists" }
        });
        return existing;
      }
    }

    let dashboard: PortfolioDashboard | null = null;
    let bondAnalytics: unknown = null;
    let riskAnalytics: unknown = null;
    if (input.portfolioId && this.portfolioServices.getPortfolioDashboard) {
      dashboard = await this.portfolioServices.getPortfolioDashboard(input.portfolioId);
      bondAnalytics = this.portfolioServices.getBondAnalytics ? await this.portfolioServices.getBondAnalytics(dashboard) : null;
      riskAnalytics = this.portfolioServices.getRiskAnalytics ? await this.portfolioServices.getRiskAnalytics(input.portfolioId, dashboard) : null;
    }

    const [macroDashboard, macroSignals] = await Promise.all([
      this.macroRepository.getDashboard(),
      this.macroRepository.listLatestMacroThemeSignals(periodEnd)
    ]);

    const sourceSnapshot = {
      promptVersion: MARKET_VISION_PROMPT_VERSION,
      weeklyReconciliation: {
        id: weekly.id,
        periodStart,
        periodEnd,
        assetViews: {
          equities: weekly.equitiesSummary,
          bonds: weekly.bondsSummary,
          gold: weekly.goldSummary,
          crypto: weekly.cryptoSummary,
          macro: weekly.macroSummary,
          rates: weekly.ratesSummary,
          inflation: weekly.inflationSummary,
          currency: weekly.currencySummary,
          geopolitical: weekly.geopoliticalSummary
        },
        themeSummaries: weekly.coverageMetadata.themeSummaries ?? [],
        keyRisks: weekly.keyRisks,
        keyOpportunities: weekly.keyOpportunities
      },
      macro: {
        latestRegime: macroDashboard.latestRegime,
        themeSignals: macroSignals.map((signal) => ({
          theme: signal.theme,
          direction: signal.direction,
          regimeLabel: signal.regimeLabel,
          severityScore: signal.severityScore,
          persistenceScore: signal.persistenceScore,
          confidenceScore: signal.confidenceScore,
          explanation: signal.explanation
        }))
      },
      portfolio: portfolioSnapshot(dashboard),
      bondAnalytics,
      riskAnalytics
    };

    try {
      const aiOutput = await this.aiProvider.generateWeeklyBriefing({
        periodStart,
        periodEnd,
        context: sourceSnapshot
      });
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();
      const report = await this.marketVisionRepository.upsertReport({
        reportDate: periodEnd,
        reportPeriodStart: periodStart,
        reportPeriodEnd: periodEnd,
        title: aiOutput.title,
        executiveSummary: aiOutput.executiveSummary,
        globalMarketSummary: aiOutput.globalMarketSummary,
        equityView: aiOutput.equityOutlook,
        bondView: aiOutput.bondOutlook,
        goldView: aiOutput.goldOutlook,
        cryptoView: aiOutput.cryptoOutlook,
        ratesView: aiOutput.ratesOutlook,
        inflationView: aiOutput.inflationOutlook,
        growthView: aiOutput.growthOutlook,
        employmentView: aiOutput.employmentOutlook,
        currencyView: aiOutput.currencyOutlook,
        geopoliticalRiskView: aiOutput.geopoliticalOutlook,
        opportunities: aiOutput.keyOpportunities,
        risks: aiOutput.keyRisks,
        portfolioImplications: aiOutput.portfolioImplications,
        classificationSummary: undefined,
        sourceType: "generated",
        status: input.status ?? "draft",
        confidenceScore: aiOutput.confidenceScore,
        modelUsed: this.config.model,
        promptVersion: MARKET_VISION_PROMPT_VERSION,
        tokenUsage: aiOutput.tokenUsage ?? {},
        costEstimate: aiOutput.costEstimate ?? null,
        sourceSnapshot,
        generationDurationMs: duration
      });
      await this.marketVisionRepository.insertGenerationLog({
        reportId: report.id,
        periodStart,
        periodEnd,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        status: "success",
        modelUsed: this.config.model,
        promptVersion: MARKET_VISION_PROMPT_VERSION,
        tokenUsage: aiOutput.tokenUsage ?? {},
        costEstimate: aiOutput.costEstimate ?? null,
        metadata: { durationMs: duration, portfolioContextIncluded: Boolean(dashboard) }
      });
      return report;
    } catch (error) {
      await this.marketVisionRepository.insertGenerationLog({
        periodStart,
        periodEnd,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        status: "failed",
        modelUsed: this.config.model,
        promptVersion: MARKET_VISION_PROMPT_VERSION,
        errorMessage: error instanceof Error ? error.message : "Unknown Market Vision generation error."
      });
      throw error;
    }
  }
}
