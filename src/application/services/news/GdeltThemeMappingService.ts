import type { NewsCanonicalTheme, NewsClassificationLabel, NewsSentiment } from "@/domain/news/types";
import { NewsThemeClassificationService } from "./NewsThemeClassificationService";

export type GdeltThemeMapping = {
  primaryTheme: NewsCanonicalTheme;
  secondaryThemes: NewsCanonicalTheme[];
  affectedAssetClasses: string[];
  affectedMacroCategories: string[];
  classification: NewsClassificationLabel;
  sentiment: NewsSentiment;
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
  reasoningSummary: string;
};

const assetClassByTheme: Record<NewsCanonicalTheme, string[]> = {
  Rates: ["rates", "bonds", "macro"],
  Inflation: ["inflation", "macro"],
  Growth: ["macro"],
  Employment: ["macro"],
  "Yield Curve": ["rates", "bonds", "macro"],
  Currency: ["currency", "macro"],
  Geopolitical: ["geopolitical", "macro"],
  Energy: ["gold/commodities", "macro"],
  AI: ["equities"],
  Credit: ["bonds", "macro"],
  "Trade / Supply Chain": ["macro", "equities"],
  Consumer: ["equities"],
  Healthcare: ["equities"],
  Financials: ["equities"],
  Technology: ["equities"],
  Industrials: ["equities"],
  Quality: ["equities"],
  Dividend: ["equities"],
  Defensive: ["equities"]
};

const macroCategoryByTheme: Partial<Record<NewsCanonicalTheme, string[]>> = {
  Rates: ["rates"],
  Inflation: ["inflation"],
  Growth: ["growth"],
  Employment: ["employment"],
  "Yield Curve": ["yield_curve"],
  Currency: ["currency"],
  Geopolitical: ["geopolitical"],
  Energy: ["energy"],
  Credit: ["credit"],
  "Trade / Supply Chain": ["trade_supply_chain"]
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export class GdeltThemeMappingService {
  constructor(private readonly themeClassificationService = new NewsThemeClassificationService()) {}

  map(input: { title: string; summary: string | null; primaryTheme: NewsCanonicalTheme; category: string }): GdeltThemeMapping {
    const text = `${input.title} ${input.summary ?? ""}`.toLowerCase();
    const theme = this.themeClassificationService.classify({
      title: input.title,
      summary: input.summary,
      providerPrimaryTheme: input.primaryTheme,
      providerCategory: input.category,
      sourceProvider: "gdelt"
    });

    const severe = includesAny(text, ["war", "conflict", "crisis", "shock", "escalation", "default", "recession"]);
    const structural = theme.structural || includesAny(text, ["export controls", "trade war", "sanctions", "debt crisis", "military escalation"]);
    return {
      primaryTheme: theme.primaryTheme ?? input.primaryTheme,
      secondaryThemes: theme.secondaryThemes,
      affectedAssetClasses: theme.affectedAssetClasses.length ? theme.affectedAssetClasses : assetClassByTheme[input.primaryTheme] ?? ["macro"],
      affectedMacroCategories: theme.affectedMacroCategories.length ? theme.affectedMacroCategories : macroCategoryByTheme[input.primaryTheme] ?? [input.category],
      classification: structural ? "medium_term_theme" : "short_term_noise",
      sentiment: severe ? "negative" : "neutral",
      severityScore: severe ? 65 : 35,
      persistenceScore: structural ? 70 : 45,
      confidenceScore: Math.max(60, theme.themeConfidence),
      reasoningSummary: `Deterministic GDELT query-group mapping used for ${input.primaryTheme}.`
    };
  }
}
