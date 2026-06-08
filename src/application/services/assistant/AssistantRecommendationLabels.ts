export const ASSISTANT_RECOMMENDATION_LABELS = {
  strongBuy: "Very Favorable Characteristics",
  buy: "Favorable Characteristics",
  hold: "Balanced Characteristics",
  watch: "Review Area",
  reduce: "Elevated Concerns",
  sell: "Significant Concerns"
} as const;

export type AssistantRecommendationLabel = typeof ASSISTANT_RECOMMENDATION_LABELS[keyof typeof ASSISTANT_RECOMMENDATION_LABELS];

export function assistantRecommendationLabel(label: string | null | undefined) {
  const normalized = label?.trim().toLowerCase().replace(/[\s_-]+/g, "_");
  switch (normalized) {
    case "strong_buy":
      return ASSISTANT_RECOMMENDATION_LABELS.strongBuy;
    case "buy":
      return ASSISTANT_RECOMMENDATION_LABELS.buy;
    case "hold":
      return ASSISTANT_RECOMMENDATION_LABELS.hold;
    case "watch":
      return ASSISTANT_RECOMMENDATION_LABELS.watch;
    case "reduce":
      return ASSISTANT_RECOMMENDATION_LABELS.reduce;
    case "sell":
      return ASSISTANT_RECOMMENDATION_LABELS.sell;
    default:
      return label ?? "Unknown";
  }
}
