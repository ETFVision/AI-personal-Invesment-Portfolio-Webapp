import type { MarketThemeClassification, MarketThemeEvent } from "@/domain/marketVision/types";

export type MarketThemeClassificationInput = {
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
};

export class MarketThemeService {
  classify(input: MarketThemeClassificationInput): MarketThemeClassification {
    const severity = this.clamp(input.severityScore);
    const persistence = this.clamp(input.persistenceScore);
    const confidence = this.clamp(input.confidenceScore);

    if (persistence >= 0.75 && confidence >= 0.6 && severity >= 0.35) return "structural_long_term_shift";
    if (persistence >= 0.4 && confidence >= 0.45) return "medium_term_theme";
    return "short_term_noise";
  }

  summarize(events: MarketThemeEvent[]) {
    return {
      shortTermNoise: events.filter((event) => event.classification === "short_term_noise").length,
      mediumTermThemes: events.filter((event) => event.classification === "medium_term_theme").length,
      structuralLongTermShifts: events.filter((event) => event.classification === "structural_long_term_shift").length
    };
  }

  private clamp(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }
}
