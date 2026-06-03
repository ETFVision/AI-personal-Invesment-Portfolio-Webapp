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
    return clamp(baseConfidence * (availableWeight / totalWeight));
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
    riskScore?: number | null;
    concentrationPercent?: number | null;
    duplicateExposure?: boolean;
    isCrypto?: boolean;
    durationMismatch?: boolean;
    instrumentType?: string;
  }): GuardrailResult {
    const guardrails: string[] = [];
    let label = input.label;

    if (input.confidenceScore < 50) {
      return { label: "Insufficient Data", guardrails: ["Data confidence below 50"] };
    }
    if (input.fundamentalScore != null && input.fundamentalScore < 35) {
      label = capLabel(label, "Watch");
      guardrails.push("Weak fundamentals cap");
    }
    if (input.valuationScore != null && input.valuationScore < 25) {
      label = capLabel(label, "Watch");
      guardrails.push("Poor valuation cap");
    }
    if (input.riskScore != null && input.riskScore > 75) {
      label = capLabel(label, input.label === "Sell" || input.label === "Reduce" ? input.label : "Watch");
      guardrails.push("Excessive instrument risk cap");
    }
    if ((input.concentrationPercent ?? 0) > 0.25) {
      label = capLabel(label, "Hold");
      guardrails.push("Portfolio concentration cap");
    }
    if (input.duplicateExposure) {
      label = capLabel(label, "Hold");
      guardrails.push("Duplicate exposure cap");
    }
    if (input.isCrypto && (input.concentrationPercent ?? 0) > 0.05) {
      label = capLabel(label, "Watch");
      guardrails.push("Crypto allocation cap");
    }
    if (input.durationMismatch) {
      label = capLabel(label, "Hold");
      guardrails.push("Bond duration and rate regime mismatch cap");
    }

    return { label, guardrails };
  }
}

export const recommendationRuleInternals = { clamp, capLabel };
