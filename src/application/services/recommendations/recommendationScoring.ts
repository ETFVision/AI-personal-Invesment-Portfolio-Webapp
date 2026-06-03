import type { FundamentalsSummaryRow } from "@/domain/fundamentals/types";
import type { MacroRegimeSnapshot } from "@/domain/macro/types";
import type { RecommendationLabel, RecommendationTimeHorizon } from "@/domain/recommendations/types";
import type { BondProfile, Instrument, InstrumentMarketMetric, InstrumentRiskMetric } from "@/domain/universe/types";
import { instrumentTypeLabel, resolveInstrumentType } from "../instruments/InstrumentTypeResolver";
import type { PortfolioFitResult } from "./portfolioFitService";
import type { RecommendationRulesService, ScoreComponent } from "./RecommendationRulesService";

export type RecommendationInput = {
  instrument: Instrument;
  marketMetric: InstrumentMarketMetric | null;
  riskMetric: InstrumentRiskMetric | null;
  fundamentals: FundamentalsSummaryRow | null;
  bondProfile: BondProfile | null;
  macroRegime: MacroRegimeSnapshot | null;
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

export function durationMismatch(profile: BondProfile | null, regime: MacroRegimeSnapshot | null) {
  if (!profile || !regime) return false;
  const ratesRestrictive = ["restrictive", "rising", "high"].some((term) => regime.ratesRegime.toLowerCase().includes(term));
  return profile.durationCategory === "long" && ratesRestrictive;
}

export function riskLevel(riskMetric: InstrumentRiskMetric | null, instrument: Instrument) {
  if (riskMetric?.riskBucket && riskMetric.riskBucket !== "insufficient_data") return riskMetric.riskBucket;
  return instrument.riskCategory ?? instrument.volatilityBucket ?? "unknown";
}

export function buildEvaluation(input: RecommendationInput, rules: RecommendationRulesService, components: ScoreComponent[], extras: {
  baseConfidence?: number;
  timeHorizon?: RecommendationTimeHorizon;
  positiveDrivers?: string[];
  negativeDrivers?: string[];
  dataLimitations?: string[];
  fundamentalScore?: number | null;
  valuationScore?: number | null;
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
    ...components.filter((component) => component.score != null && (component.score ?? 0) < 45).map((component) => component.reason),
    ...input.portfolioFit.negativeDrivers,
    ...(extras.negativeDrivers ?? [])
  ].filter(Boolean);
  const summary = `${input.instrument.symbol ?? input.instrument.name} is rated ${guardrail.label} with a deterministic score of ${score == null ? "insufficient data" : Math.round(score)}. The rating reflects ${components.filter((component) => component.score != null).map((component) => component.label.toLowerCase()).join(", ") || "limited available"} inputs${guardrail.guardrails.length ? `, with guardrails applied for ${guardrail.guardrails.join(", ").toLowerCase()}` : ""}.`;

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
    inputsSnapshot: {
      symbol: input.instrument.symbol,
      assetClass: input.instrument.assetClass,
      sector: input.instrument.canonicalSector ?? input.instrument.sector,
      themes: input.instrument.canonicalThemes,
      macroRegime: input.macroRegime,
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
        reason: component.reason
      })),
      baseLabel,
      finalLabel: guardrail.label
    }
  } satisfies RecommendationEvaluation;
}
