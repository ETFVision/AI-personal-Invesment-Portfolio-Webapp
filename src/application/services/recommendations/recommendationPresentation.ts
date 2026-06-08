import type { RecommendationLabel } from "@/domain/recommendations/types";

export const ASSESSMENT_LABELS: Record<RecommendationLabel, string> = {
  "Strong Buy": "Very Favorable Characteristics",
  Buy: "Favorable Characteristics",
  Hold: "Balanced Characteristics",
  Watch: "Review Area",
  Reduce: "Elevated Concerns",
  Sell: "Significant Concerns",
  "Insufficient Data": "Insufficient Data",
  "Not Applicable": "Not Applicable"
};

export function assessmentLabel(label: string | null | undefined) {
  return label && label in ASSESSMENT_LABELS ? ASSESSMENT_LABELS[label as RecommendationLabel] : label ?? "Unknown";
}

export function assessmentTone(label: string) {
  const mapped = assessmentLabel(label);
  if (mapped === "Very Favorable Characteristics" || mapped === "Favorable Characteristics") return "positive";
  if (mapped === "Balanced Characteristics") return "info";
  if (mapped === "Review Area") return "warning";
  if (mapped === "Elevated Concerns" || mapped === "Significant Concerns") return "danger";
  return "neutral";
}

export function assessmentClassName(label: string) {
  const tone = assessmentTone(label);
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-900";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-900";
  return "border-border bg-muted text-muted-foreground";
}
