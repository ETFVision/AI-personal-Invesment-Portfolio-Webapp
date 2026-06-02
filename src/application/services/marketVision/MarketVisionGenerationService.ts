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
  return typeof value === "string" ? normalizeGeneratedText(value).trim() : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
}

function toScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function roundedPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

export function normalizeGeneratedText(value: string) {
  return value
    .replace(/\u00e2\u20ac\u2122|\u00e2\u20ac\u2126|\u2018|\u2019/g, "'")
    .replace(/\u00e2\u20ac\u0153|\u00e2\u20ac\ufffd|\u00e2\u20ac\u009c|\u00e2\u20ac\u009d|\u201c|\u201d/g, "\"")
    .replace(/\u00e2\u20ac"|\u00e2\u20ac\u201d|\u00e2\u20ac\u201c|\u00e2\u20ac\u0093|\u00e2\u20ac\u0094|\u2013|\u2014/g, "-")
    .replace(/\u00e2\u20ac\u00a6|\u2026/g, "...")
    .replace(/\u00c2\u00b7|\u00b7/g, "-")
    .replace(/\u00a0/g, " ");
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

function replacePortfolioExposureClaims(text: string, exposureName: string, aliases: string[]) {
  let next = text;
  const marketContext = `${exposureName} market context`;
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const portfolioPossessive = new RegExp(`\\bthe portfolio(?:'|\\u2019|\\u00e2\\u20ac\\u2122)s\\s+${escaped}\\s+(?:exposure|holdings?|sleeve|component|allocation)\\b`, "gi");
    const portfolioContext = new RegExp(`\\bportfolio context shows\\s+(?:meaningful\\s+)?${escaped}\\s+(?:exposure|holdings?|sleeve|component|allocation)\\b`, "gi");
    const sleevePossessive = new RegExp(`\\bthe\\s+${escaped}\\s+sleeve(?:'|\\u2019|\\u00e2\\u20ac\\u2122)s\\b`, "gi");
    const currentMix = new RegExp(`\\bcurrent mix appears centered on ([^.]*?)\\b(?:meaningful\\s+)?${escaped}\\s+(?:exposure|holdings?|sleeve|component|allocation|components?)\\b`, "gi");
    const bareMeaningful = new RegExp(`\\bmeaningful\\s+${escaped}\\s+(?:exposure|holdings?|sleeve|component|allocation|components?)\\b`, "gi");
    next = next
      .replace(portfolioPossessive, marketContext)
      .replace(portfolioContext, marketContext)
      .replace(sleevePossessive, `the ${marketContext}`)
      .replace(currentMix, "current mix appears centered on $1" + marketContext)
      .replace(bareMeaningful, marketContext);
  }
  return next.replace(/\bwith\s+(?:,?\s*){0,2}components\b/gi, "with market context");
}

function replaceUnsupportedExposureLists(text: string, exposureFlags: PortfolioExposureFlags) {
  const unsupported = [
    !exposureFlags.hasBonds ? "bond" : null,
    !exposureFlags.hasCrypto ? "crypto" : null,
    !exposureFlags.hasGold ? "gold" : null,
    !exposureFlags.hasCash ? "cash" : null
  ].filter((item): item is string => Boolean(item));
  if (unsupported.length === 0) return text;
  return text.replace(/\bwith meaningful ([^.]*?) components\b/gi, (match, list: string) => {
    const normalized = String(list).toLowerCase();
    if (!unsupported.some((item) => normalized.includes(item))) return match;
    return "with relevant cross-asset market context";
  });
}

function removeInternalGuardrailLanguage(text: string) {
  return text
    .replace(/\bfor a portfolio with ([^.]*?) allowed as exposures\b/gi, "for the portfolio context provided")
    .replace(/\ballowedClaims\b/g, "portfolio context")
    .replace(/\ballowed claims?\b/gi, "portfolio context")
    .replace(/\ballowed exposures?\b/gi, "portfolio context");
}

function sanitizeYieldCurveLanguage(text: string) {
  const lower = text.toLowerCase();
  const hasShortYieldFalling = /(?:2-year|two-year|front end|front-end).{0,80}(?:fell|falling|declined|lower|easing)/i.test(text);
  const hasLongYieldRising = /(?:30-year|thirty-year|long end|long-end).{0,80}(?:rose|rising|increased|higher|firming)/i.test(text);
  if (hasShortYieldFalling && hasLongYieldRising && lower.includes("flatten")) {
    const withoutFlatteningClaim = text.replace(/\b(?:the\s+)?curve\s+(?:is\s+|was\s+|has\s+been\s+)?flatten(?:ed|ing)?(?:\s+modestly)?\b/gi, "yield-curve signals were mixed");
    return withoutFlatteningClaim.replace(/\b(?:while\s+)?(?:the\s+)?(?:2s\/10s|10y\/3m|10y\/2y|yield-curve)\s+(?:and\s+(?:the\s+)?(?:2s\/10s|10y\/3m|10y\/2y|yield-curve)\s+)?spreads?\s+(?:both\s+)?fell,\s+implying\s+flattening pressure\b/gi, "while stored spread indicators pointed to flattening pressure, creating a mixed curve signal");
  }
  return text;
}

function removeUnsupportedExposureClaims(output: AiMarketVisionOutput, exposureFlags?: PortfolioExposureFlags | null) {
  const patchMacroText = (text: string) => sanitizeYieldCurveLanguage(removeInternalGuardrailLanguage(text));
  if (!exposureFlags) {
    return {
      ...output,
      globalMarketSummary: patchMacroText(output.globalMarketSummary),
      bondOutlook: patchMacroText(output.bondOutlook),
      ratesOutlook: patchMacroText(output.ratesOutlook)
    };
  }
  const patchText = (text: string) => {
    let next = replaceUnsupportedExposureLists(patchMacroText(text), exposureFlags);
    if (!exposureFlags.hasCrypto) next = replacePortfolioExposureClaims(next, "crypto", ["crypto", "bitcoin", "digital asset"]);
    if (!exposureFlags.hasGold) next = replacePortfolioExposureClaims(next, "gold", ["gold", "commodities", "commodity"]);
    if (!exposureFlags.hasBonds) next = replacePortfolioExposureClaims(next, "bond", ["bond", "bonds", "fixed income"]);
    if (!exposureFlags.hasCash) next = replacePortfolioExposureClaims(next, "cash", ["cash", "liquidity"]);
    return next;
  };
  return {
    ...output,
    executiveSummary: patchText(output.executiveSummary),
    globalMarketSummary: patchText(output.globalMarketSummary),
    equityOutlook: patchText(output.equityOutlook),
    goldOutlook: patchText(output.goldOutlook),
    cryptoOutlook: patchText(output.cryptoOutlook),
    bondOutlook: patchText(output.bondOutlook),
    ratesOutlook: patchText(output.ratesOutlook),
    portfolioImplications: {
      ...output.portfolioImplications,
      bondAllocationImplication: patchText(output.portfolioImplications.bondAllocationImplication),
      goldImplication: patchText(output.portfolioImplications.goldImplication),
      cryptoImplication: patchText(output.portfolioImplications.cryptoImplication),
      cashImplication: patchText(output.portfolioImplications.cashImplication),
      riskImplication: patchText(output.portfolioImplications.riskImplication)
    }
  };
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
  return items.slice(0, 6).map((item) => ({ label: item.label, percent: roundedPercent(item.percent) }));
}

type PortfolioExposureFlags = {
  hasPortfolioContext: boolean;
  hasBonds: boolean;
  hasGold: boolean;
  hasCrypto: boolean;
  hasCash: boolean;
  hasEquities: boolean;
};

function labelHasAny(label: string | null | undefined, needles: string[]) {
  const normalized = (label ?? "").toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function portfolioExposureFlags(dashboard: PortfolioDashboard | null): PortfolioExposureFlags | null {
  if (!dashboard) return null;
  const holdings = dashboard.holdings;
  const allocations = dashboard.allocationByType;
  const hasType = (types: string[], labels: string[]) => holdings.some((holding) => types.includes(holding.assetType)) ||
    allocations.some((item) => item.value > 0 && labelHasAny(item.label, labels));
  return {
    hasPortfolioContext: true,
    hasBonds: hasType(["bond_etf"], ["bond", "fixed income"]),
    hasGold: hasType(["gold_etf"], ["gold", "commodit"]),
    hasCrypto: hasType(["crypto"], ["crypto", "bitcoin", "ethereum"]),
    hasCash: dashboard.totalCash > 0,
    hasEquities: hasType(["stock", "etf"], ["stock", "equity", "etf"])
  };
}

function portfolioExposureGuidance(flags: PortfolioExposureFlags | null) {
  if (!flags) {
    return {
      portfolioContextAvailable: false,
      allowedClaims: {
        equities: false,
        bonds: false,
        gold: false,
        crypto: false,
        cash: false
      },
      instruction: "No portfolio context is available. Discuss all asset classes as market context only."
    };
  }
  return {
    portfolioContextAvailable: flags.hasPortfolioContext,
    allowedClaims: {
      equities: flags.hasEquities,
      bonds: flags.hasBonds,
      gold: flags.hasGold,
      crypto: flags.hasCrypto,
      cash: flags.hasCash
    },
    instruction: "Only describe an asset class as a portfolio exposure when its allowedClaims value is true. Otherwise discuss it as market context only."
  };
}

function portfolioSnapshot(dashboard: PortfolioDashboard | null) {
  if (!dashboard) return null;
  return {
    totalValue: dashboard.totalValueEstimate,
    cashPercent: roundedPercent(dashboard.cashPercent),
    investedPercent: roundedPercent(dashboard.investedPercent),
    unrealizedGainLoss: dashboard.unrealizedGainLoss,
    baseCurrency: dashboard.portfolio.baseCurrency,
    exposureFlags: portfolioExposureFlags(dashboard),
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
    private readonly config = { model: "gpt-5.4-mini" }
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

    const exposureFlags = portfolioExposureFlags(dashboard);
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
      portfolioExposureFlags: exposureFlags,
      portfolioExposureGuidance: portfolioExposureGuidance(exposureFlags),
      bondAnalytics,
      riskAnalytics
    };

    try {
      const aiOutput = removeUnsupportedExposureClaims(await this.aiProvider.generateWeeklyBriefing({
        periodStart,
        periodEnd,
        context: sourceSnapshot
      }), exposureFlags);
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
