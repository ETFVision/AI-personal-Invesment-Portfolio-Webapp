import type { AllocationItem, PortfolioDashboard } from "@/domain/portfolio/types";
import type {
  PortfolioReviewCandidate,
  PortfolioReviewFinding,
  PortfolioReviewScoreComponent,
  PortfolioReviewSection
} from "@/domain/portfolioReview/types";
import type { InstrumentRecommendation } from "@/domain/recommendations/types";
import type { Instrument } from "@/domain/universe/types";
import type { BondAnalyticsReport } from "@/application/services/bonds/BondTypes";
import type { RiskAnalyticsReport } from "@/application/services/risk/RiskAnalyticsService";
import type { NewsThemeIntelligence } from "@/domain/news/types";
import type { MarketVisionReport } from "@/domain/marketVision/types";
import type { MacroRegimeSnapshot } from "@/domain/macro/types";

export const portfolioReviewWeights = {
  allocation: 0.15,
  concentration: 0.15,
  diversification: 0.15,
  risk: 0.15,
  macroFit: 0.15,
  recommendationAlignment: 0.1,
  fixedIncome: 0.1,
  themeExposure: 0.05
} as const;

export type PortfolioReviewInputContext = {
  dashboard: PortfolioDashboard;
  riskReport: RiskAnalyticsReport;
  bondReport: BondAnalyticsReport;
  recommendations: InstrumentRecommendation[];
  instruments: Instrument[];
  marketVisionReport: MarketVisionReport | null;
  macroRegime: MacroRegimeSnapshot | null;
  themeIntelligence: NewsThemeIntelligence | null;
};

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function allocationPercent(items: AllocationItem[], labelMatch: (label: string) => boolean) {
  return items
    .filter((item) => labelMatch(item.label.toLowerCase()))
    .reduce((sum, item) => sum + item.percent, 0);
}

export function finding(severity: PortfolioReviewFinding["severity"], title: string, detail: string): PortfolioReviewFinding {
  return { severity, title, detail };
}

export function section(score: number, summary: string, findings: PortfolioReviewFinding[], metrics: Record<string, unknown>): PortfolioReviewSection {
  return {
    score: clampScore(score),
    summary,
    findings,
    metrics
  };
}

export function weightedPortfolioScore(components: PortfolioReviewScoreComponent[]) {
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight <= 0) return null;
  return clampScore(components.reduce((sum, component) => sum + component.score * component.weight, 0) / totalWeight);
}

export function recommendationCandidate(
  recommendation: InstrumentRecommendation,
  instrument: Instrument | null,
  reason: string
): PortfolioReviewCandidate | null {
  if (["Reduce", "Sell", "Insufficient Data", "Not Applicable"].includes(recommendation.recommendationLabel)) return null;
  if (!instrument?.isActive) return null;
  return {
    instrumentId: recommendation.instrumentId,
    symbol: recommendation.symbol,
    name: instrument.name,
    assetClass: instrument.assetClass,
    recommendationLabel: recommendation.recommendationLabel,
    score: recommendation.overallScore,
    reason
  };
}

export function topCandidates(input: {
  recommendations: InstrumentRecommendation[];
  instruments: Instrument[];
  assetClasses?: string[];
  sectors?: string[];
  themes?: string[];
  reason: string;
  limit?: number;
}) {
  const instrumentById = new Map(input.instruments.map((instrument) => [instrument.id, instrument]));
  return input.recommendations
    .slice()
    .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
    .map((recommendation) => {
      const instrument = instrumentById.get(recommendation.instrumentId) ?? null;
      if (input.assetClasses && !input.assetClasses.includes(instrument?.assetClass ?? "")) return null;
      if (input.sectors && !input.sectors.includes(instrument?.canonicalSector ?? instrument?.sector ?? "")) return null;
      if (input.themes && !input.themes.some((theme) => instrument?.canonicalThemes.includes(theme))) return null;
      return recommendationCandidate(recommendation, instrument, input.reason);
    })
    .filter((candidate): candidate is PortfolioReviewCandidate => Boolean(candidate))
    .slice(0, input.limit ?? 5);
}

export function latestPeriod(dashboard: PortfolioDashboard) {
  const baselineDates = dashboard.performance.map((metric) => metric.baselineDate).filter((date): date is string => Boolean(date));
  return {
    start: baselineDates.sort()[0] ?? null,
    end: dashboard.latestPriceDate ?? new Date().toISOString().slice(0, 10)
  };
}
