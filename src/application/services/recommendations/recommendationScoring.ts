import type { FundamentalsSummaryRow } from "@/domain/fundamentals/types";
import type { MacroRegimeSnapshot } from "@/domain/macro/types";
import type { MarketVisionReport } from "@/domain/marketVision/types";
import type { RecommendationLabel, RecommendationTimeHorizon } from "@/domain/recommendations/types";
import type { BondProfile, Instrument, InstrumentMarketMetric, InstrumentRiskMetric } from "@/domain/universe/types";
import { instrumentTypeLabel, resolveInstrumentType } from "../instruments/InstrumentTypeResolver";
import type { PortfolioFitResult } from "./portfolioFitService";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";
import { assessmentLabel } from "./recommendationPresentation";

export type RecommendationInput = {
  instrument: Instrument;
  marketMetric: InstrumentMarketMetric | null;
  riskMetric: InstrumentRiskMetric | null;
  fundamentals: FundamentalsSummaryRow | null;
  bondProfile: BondProfile | null;
  macroRegime: MacroRegimeSnapshot | null;
  marketVisionReport: MarketVisionReport | null;
  portfolioFit: PortfolioFitResult;
};

export type RecommendationEvaluation = {
  instrumentId: string;
  symbol: string;
  instrumentType: string;
  recommendationLabel: RecommendationLabel;
  overallScore: number | null;
  confidenceScore: number;
  riskLevel: string;
  timeHorizon: RecommendationTimeHorizon;
  recommendationReasoningSummary: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  guardrailsApplied: string[];
  dataLimitations: string[];
  recommendationChangeTriggers: {
    upgrade: string[];
    downgrade: string[];
  };
  inputsSnapshot: Record<string, unknown>;
  scoringBreakdown: Record<string, unknown>;
};

export function scoreMomentum(marketMetric: InstrumentMarketMetric | null) {
  if (!marketMetric) return null;
  const oneYear = marketMetric.oneYearReturn;
  const ytd = marketMetric.ytdReturn;
  const daily = marketMetric.dailyReturn;
  let score = 50;
  if (oneYear != null) score += Math.max(-25, Math.min(25, oneYear * 60));
  if (ytd != null) score += Math.max(-15, Math.min(15, ytd * 40));
  if (daily != null) score += Math.max(-5, Math.min(5, daily * 80));
  if (oneYear == null && ytd == null && daily == null) return null;
  return Math.max(0, Math.min(100, score));
}

export function scoreRisk(riskMetric: InstrumentRiskMetric | null) {
  if (!riskMetric || riskMetric.riskScore == null) return null;
  return Math.max(0, Math.min(100, 100 - riskMetric.riskScore));
}

export function scoreThemeFit(instrument: Instrument) {
  const themes = new Set([...(instrument.canonicalThemes ?? []), ...(instrument.thematicTags ?? [])].filter(Boolean));
  if (themes.size === 0) return null;
  let score = 55 + Math.min(20, themes.size * 5);
  if (themes.has("AI / Automation") || themes.has("Quality") || themes.has("Global Diversification")) score += 5;
  if (themes.has("High Beta")) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export function scoreMacroFit(instrument: Instrument, regime: MacroRegimeSnapshot | null, bondProfile?: BondProfile | null) {
  if (!regime) return null;
  const sector = instrument.canonicalSector ?? instrument.sector ?? "";
  let score = 55;
  const ratesRestrictive = ["restrictive", "rising", "high"].some((term) => regime.ratesRegime.toLowerCase().includes(term));
  const inflationElevated = ["elevated", "rising", "sticky"].some((term) => regime.inflationRegime.toLowerCase().includes(term));
  const growthWeak = ["weak", "slowing", "recession"].some((term) => regime.growthRegime.toLowerCase().includes(term));
  const riskOff = ["tight", "stress"].some((term) => regime.liquidityRegime.toLowerCase().includes(term));

  if (sector === "Commodities / Gold" && (inflationElevated || riskOff)) score += 20;
  if (sector === "Crypto" && riskOff) score -= 25;
  if (sector === "Bonds / Fixed Income" && bondProfile?.durationCategory === "long" && ratesRestrictive) score -= 20;
  if (sector === "Bonds / Fixed Income" && bondProfile?.treasuryClassification === "treasury" && growthWeak) score += 15;
  if (sector === "Technology" && ratesRestrictive) score -= 8;
  if (sector === "Consumer Staples" && growthWeak) score += 8;
  return Math.max(0, Math.min(100, score));
}

function textIncludesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function marketVisionText(report: MarketVisionReport | null) {
  if (!report) return "";
  return [
    report.executiveSummary,
    report.globalMarketSummary,
    report.equityView,
    report.bondView,
    report.goldView,
    report.cryptoView,
    report.ratesView,
    report.inflationView,
    report.growthView,
    report.currencyView,
    report.geopoliticalRiskView,
    ...report.opportunities,
    ...report.risks,
    report.portfolioImplications.equityAllocationImplication,
    report.portfolioImplications.bondAllocationImplication,
    report.portfolioImplications.goldImplication,
    report.portfolioImplications.cryptoImplication,
    report.portfolioImplications.riskImplication
  ].filter(Boolean).join(" ");
}

export function scoreMarketVisionAlignment(input: RecommendationInput) {
  const report = input.marketVisionReport;
  if (!report) return null;
  const text = marketVisionText(report);
  if (!text.trim()) return null;

  const sector = input.instrument.canonicalSector ?? input.instrument.sector ?? "";
  const themes = [...(input.instrument.canonicalThemes ?? []), ...(input.instrument.thematicTags ?? [])];
  let score = 55;
  if (sector && textIncludesAny(text, [sector])) score += 8;
  if (themes.some((theme) => textIncludesAny(text, [theme]))) score += 8;
  if (textIncludesAny(text, ["opportunity", "supportive", "tailwind", "resilient", "constructive"])) score += 5;
  if (textIncludesAny(text, ["risk", "pressure", "headwind", "stress", "deteriorat", "caution"])) score -= 5;

  const assetClass = input.instrument.assetClass ?? "";
  if (assetClass.includes("bond") && textIncludesAny(text, ["duration", "yield curve", "rates"])) score += 3;
  if (assetClass.includes("gold") && textIncludesAny(text, ["gold", "inflation", "geopolitical"])) score += 5;
  if (assetClass.includes("crypto") && textIncludesAny(text, ["liquidity", "risk appetite", "crypto"])) score += 3;
  return Math.max(0, Math.min(100, score));
}

export function durationMismatch(profile: BondProfile | null, regime: MacroRegimeSnapshot | null) {
  if (!profile || !regime) return false;
  const ratesRestrictive = ["restrictive", "rising", "high"].some((term) => regime.ratesRegime.toLowerCase().includes(term));
  return profile.durationCategory === "long" && ratesRestrictive;
}

export function riskLevel(riskMetric: InstrumentRiskMetric | null, instrument: Instrument) {
  if (riskMetric?.riskBucket && riskMetric.riskBucket !== "insufficient_data") return riskMetric.riskBucket;
  return instrument.riskCategory ?? instrument.volatilityBucket ?? "unknown";
}

function componentReasonForScore(component: ScoreComponent) {
  if (component.score == null || !Number.isFinite(component.score)) return component.reason;
  if (component.key === "risk_analytics") {
    if (component.score < 45) return "Instrument risk is elevated";
    if (component.score < 70) return "Instrument risk is moderate";
    return component.reason;
  }
  if (component.score < 45) return `${component.label} score is weak`;
  if (component.score < 70) return `${component.label} score is mixed`;
  return component.reason;
}

export function buildEvaluation(input: RecommendationInput, rules: RecommendationRulesService, components: ScoreComponent[], extras: {
  baseConfidence?: number;
  timeHorizon?: RecommendationTimeHorizon;
  positiveDrivers?: string[];
  negativeDrivers?: string[];
  dataLimitations?: string[];
  fundamentalScore?: number | null;
  valuationScore?: number | null;
  changeTriggers?: {
    upgrade?: string[];
    downgrade?: string[];
  };
} = {}) {
  const score = rules.weightedScore(components);
  const confidence = rules.confidenceScore(components, extras.baseConfidence ?? 72);
  const baseLabel = rules.labelFromScore(score);
  const guardrail = rules.applyGuardrails({
    label: baseLabel,
    confidenceScore: confidence,
    fundamentalScore: extras.fundamentalScore,
    valuationScore: extras.valuationScore,
    riskScore: input.riskMetric?.riskScore,
    concentrationPercent: input.portfolioFit.concentrationPercent,
    duplicateExposure: input.portfolioFit.duplicateExposure,
    isCrypto: input.instrument.assetClass === "crypto",
    durationMismatch: durationMismatch(input.bondProfile, input.macroRegime),
    instrumentType: input.instrument.instrumentType
  });
  const instrumentType = instrumentTypeLabel(resolveInstrumentType(input.instrument));
  const dataLimitations = [
    ...components.filter((component) => component.score == null).map((component) => `${component.label} unavailable`),
    ...input.portfolioFit.dataLimitations,
    ...(extras.dataLimitations ?? [])
  ];
  const positiveDrivers = [
    ...components.filter((component) => (component.score ?? 0) >= 70).map((component) => component.reason),
    ...input.portfolioFit.positiveDrivers,
    ...(extras.positiveDrivers ?? [])
  ].filter(Boolean);
  const negativeDrivers = [
    ...components.filter((component) => component.score != null && (component.score ?? 0) < 45).map(componentReasonForScore),
    ...input.portfolioFit.negativeDrivers,
    ...(extras.negativeDrivers ?? [])
  ].filter(Boolean);
  const assessment = assessmentLabel(guardrail.label);
  const scoreText = score == null ? "insufficient data" : `${Math.round(score)}/100`;
  const summary = `${input.instrument.symbol ?? input.instrument.name} has a ${assessment} characteristics assessment with a deterministic score of ${scoreText}. The assessment reflects ${components.filter((component) => component.score != null).map((component) => component.label.toLowerCase()).join(", ") || "limited available"} inputs${guardrail.guardrails.length ? `, with guardrails applied for ${guardrail.guardrails.join(", ").toLowerCase()}` : ""}.`;
  const weakComponents = components.filter((component) => component.score != null && (component.score ?? 0) < 50);
  const strongComponents = components.filter((component) => component.score != null && (component.score ?? 0) >= 70);
  const recommendationChangeTriggers = {
    upgrade: Array.from(new Set([
      ...weakComponents.slice(0, 4).map((component) => `${component.label} improves`),
      ...(input.portfolioFit.concentrationPercent != null && input.portfolioFit.concentrationPercent > 0.15 ? ["Portfolio concentration falls"] : []),
      ...(guardrail.guardrails.some((item) => item.toLowerCase().includes("valuation")) ? ["Valuation improves"] : []),
      ...(extras.changeTriggers?.upgrade ?? [])
    ])).slice(0, 8),
    downgrade: Array.from(new Set([
      ...strongComponents.slice(0, 4).map((component) => `${component.label} deteriorates`),
      "Risk score rises materially",
      ...(input.instrument.assetClass === "crypto" ? ["Liquidity regime tightens further"] : []),
      ...(extras.changeTriggers?.downgrade ?? [])
    ])).slice(0, 8)
  };

  return {
    instrumentId: input.instrument.id,
    symbol: input.instrument.symbol ?? input.instrument.name,
    instrumentType,
    recommendationLabel: guardrail.label,
    overallScore: score,
    confidenceScore: confidence,
    riskLevel: riskLevel(input.riskMetric, input.instrument),
    timeHorizon: extras.timeHorizon ?? "medium_term",
    recommendationReasoningSummary: summary,
    positiveDrivers: Array.from(new Set(positiveDrivers)).slice(0, 8),
    negativeDrivers: Array.from(new Set(negativeDrivers)).slice(0, 8),
    guardrailsApplied: guardrail.guardrails,
    dataLimitations: Array.from(new Set(dataLimitations)).slice(0, 10),
    recommendationChangeTriggers,
    inputsSnapshot: {
      symbol: input.instrument.symbol,
      assetClass: input.instrument.assetClass,
      sector: input.instrument.canonicalSector ?? input.instrument.sector,
      themes: input.instrument.canonicalThemes,
      macroRegime: input.macroRegime,
      marketVisionReport: input.marketVisionReport ? {
        id: input.marketVisionReport.id,
        reportDate: input.marketVisionReport.reportDate,
        title: input.marketVisionReport.title,
        status: input.marketVisionReport.status,
        confidenceScore: input.marketVisionReport.confidenceScore
      } : null,
      marketMetric: input.marketMetric,
      riskMetric: input.riskMetric,
      portfolioFit: input.portfolioFit,
      fundamentalScore: input.fundamentals?.latestScore ?? null,
      trendSummary: input.fundamentals?.latestTrendSummary ?? null,
      bondProfile: input.bondProfile
    },
    scoringBreakdown: {
      components: components.map((component) => ({
        key: component.key,
        label: component.label,
        score: component.score,
        weight: component.weight,
        reason: componentReasonForScore(component)
      })),
      baseLabel,
      finalLabel: guardrail.label
    }
  } satisfies RecommendationEvaluation;
}
