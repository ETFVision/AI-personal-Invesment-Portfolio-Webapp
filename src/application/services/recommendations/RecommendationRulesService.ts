import type { RecommendationLabel } from "@/domain/recommendations/types";

const LABEL_ORDER: RecommendationLabel[] = ["Sell", "Reduce", "Watch", "Hold", "Buy", "Strong Buy"];

export type ScoreComponent = {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  reason: string;
};

export type GuardrailResult = {
  label: RecommendationLabel;
  guardrails: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function capLabel(label: RecommendationLabel, cap: RecommendationLabel) {
  const labelIndex = LABEL_ORDER.indexOf(label);
  const capIndex = LABEL_ORDER.indexOf(cap);
  if (labelIndex === -1 || capIndex === -1) return label;
  return labelIndex > capIndex ? cap : label;
}

export class RecommendationRulesService {
  weightedScore(components: ScoreComponent[]) {
    const available = components.filter((component) => component.score != null && Number.isFinite(component.score));
    const totalWeight = available.reduce((sum, component) => sum + component.weight, 0);
    if (available.length === 0 || totalWeight <= 0) return null;
    return clamp(available.reduce((sum, component) => sum + clamp(component.score ?? 0) * component.weight, 0) / totalWeight);
  }

  confidenceScore(components: ScoreComponent[], baseConfidence = 70) {
    const availableWeight = components
      .filter((component) => component.score != null && Number.isFinite(component.score))
      .reduce((sum, component) => sum + component.weight, 0);
    const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
    if (totalWeight <= 0) return 0;
    const available = components.filter((component) => component.score != null && Number.isFinite(component.score));
    const availableRatio = availableWeight / totalWeight;
    const scores = available.map((component) => component.score ?? 0);
    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const variance = scores.length ? scores.reduce((sum, score) => sum + (score - averageScore) ** 2, 0) / scores.length : 0;
    const dispersion = Math.sqrt(variance);
    const hasStrongAndWeakSignals = scores.some((score) => score >= 70) && scores.some((score) => score < 45);
    const completenessBonus = availableRatio >= 0.95 ? 8 : availableRatio >= 0.8 ? 4 : 0;
    const agreementBonus = dispersion > 0 && dispersion < 12 ? 5 : 0;
    const strategicAgreementBonus =
      (available.find((component) => component.key === "fundamentals" || component.key === "business_quality")?.score ?? 0) >= 70 &&
      (available.find((component) => component.key === "market_vision_alignment")?.score ?? 0) >= 70 &&
      (available.find((component) => component.key === "theme_alignment")?.score ?? 0) >= 70
        ? 5
        : 0;
    const conflictPenalty = hasStrongAndWeakSignals ? 8 : 0;
    const dispersionPenalty = Math.min(12, dispersion * 0.25);
    return clamp(baseConfidence * availableRatio + completenessBonus + agreementBonus + strategicAgreementBonus - conflictPenalty - dispersionPenalty);
  }

  labelFromScore(score: number | null): RecommendationLabel {
    if (score == null) return "Insufficient Data";
    if (score >= 85) return "Strong Buy";
    if (score >= 70) return "Buy";
    if (score >= 50) return "Hold";
    if (score >= 35) return "Watch";
    if (score >= 20) return "Reduce";
    return "Sell";
  }

  applyGuardrails(input: {
    label: RecommendationLabel;
    confidenceScore: number;
    fundamentalScore?: number | null;
    valuationScore?: number | null;
    businessQualityScore?: number | null;
    riskScore?: number | null;
    concentrationPercent?: number | null;
    duplicateExposure?: boolean;
    isCrypto?: boolean;
    durationMismatch?: boolean;
    instrumentType?: string;
  }): GuardrailResult {
    const guardrails: string[] = [];
    let label = input.label;
    const phase2Enabled = process.env.ENABLE_STOCK_PHASE2_SCORES === "true" && !input.isCrypto;
    const applyCap = (cap: RecommendationLabel, reason: string) => {
      const capped = capLabel(label, cap);
      if (capped !== label) {
        label = capped;
        guardrails.push(reason);
      }
    };

    if (input.confidenceScore < 50) {
      return { label: "Insufficient Data", guardrails: ["Data confidence below 50"] };
    }
    if (phase2Enabled) {
      const qualityScore = input.businessQualityScore ?? input.fundamentalScore;
      if (qualityScore != null && qualityScore < 35) {
        applyCap("Watch", input.businessQualityScore != null ? "Weak business quality cap" : "Weak fundamentals cap");
      }
      if (input.valuationScore != null && input.valuationScore < 15) {
        applyCap("Hold", "Severely stretched valuation characteristics cap");
      }
    } else {
      if (input.fundamentalScore != null && input.fundamentalScore < 35) {
        applyCap("Watch", "Weak fundamentals cap");
      }
      if (input.valuationScore != null && input.valuationScore < 25) {
        const qualityAwareCap = input.fundamentalScore != null && input.fundamentalScore >= 70 ? "Hold" : "Watch";
        applyCap(qualityAwareCap, qualityAwareCap === "Hold" ? "Poor valuation quality-aware cap" : "Poor valuation cap");
      }
    }
    if (input.riskScore != null && input.riskScore > 75) {
      applyCap(input.label === "Sell" || input.label === "Reduce" ? input.label : "Watch", "Excessive instrument risk cap");
    }
    if ((input.concentrationPercent ?? 0) > 0.25) {
      applyCap("Hold", "Portfolio concentration cap");
    }
    if (input.duplicateExposure) {
      applyCap("Hold", "Duplicate exposure cap");
    }
    if (input.isCrypto && (input.concentrationPercent ?? 0) > 0.05) {
      applyCap("Watch", "Crypto allocation cap");
    }
    if (input.durationMismatch) {
      applyCap("Hold", "Bond duration and rate regime mismatch cap");
    }

    return { label, guardrails };
  }
}

export const recommendationRuleInternals = { clamp, capLabel };
