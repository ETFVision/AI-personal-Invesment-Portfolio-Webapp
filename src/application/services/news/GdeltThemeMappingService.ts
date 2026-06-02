import type { NewsCanonicalTheme, NewsClassificationLabel, NewsSentiment } from "@/domain/news/types";

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
  map(input: { title: string; summary: string | null; primaryTheme: NewsCanonicalTheme; category: string }): GdeltThemeMapping {
    const text = `${input.title} ${input.summary ?? ""}`.toLowerCase();
    const secondaryThemes = new Set<NewsCanonicalTheme>();
    if (includesAny(text, ["jobs", "employment", "unemployment", "payroll"])) secondaryThemes.add("Employment");
    if (includesAny(text, ["recession", "gdp", "slowdown", "growth"])) secondaryThemes.add("Growth");
    if (includesAny(text, ["inflation", "cpi", "prices"])) secondaryThemes.add("Inflation");
    if (includesAny(text, ["fed", "central bank", "interest rate", "treasury yield"])) secondaryThemes.add("Rates");
    if (includesAny(text, ["dollar", "currency", "fx"])) secondaryThemes.add("Currency");
    if (includesAny(text, ["war", "conflict", "sanction", "military", "election"])) secondaryThemes.add("Geopolitical");
    if (includesAny(text, ["oil", "opec", "natural gas", "energy"])) secondaryThemes.add("Energy");
    if (includesAny(text, ["tariff", "trade war", "export control", "supply chain"])) secondaryThemes.add("Trade / Supply Chain");
    if (includesAny(text, ["banking stress", "sovereign debt", "credit stress", "debt ceiling"])) secondaryThemes.add("Credit");
    secondaryThemes.delete(input.primaryTheme);

    const severe = includesAny(text, ["war", "conflict", "crisis", "shock", "escalation", "default", "recession"]);
    const structural = includesAny(text, ["export controls", "trade war", "sanctions", "debt crisis", "military escalation"]);
    return {
      primaryTheme: input.primaryTheme,
      secondaryThemes: Array.from(secondaryThemes).slice(0, 5),
      affectedAssetClasses: assetClassByTheme[input.primaryTheme] ?? ["macro"],
      affectedMacroCategories: macroCategoryByTheme[input.primaryTheme] ?? [input.category],
      classification: structural ? "medium_term_theme" : "short_term_noise",
      sentiment: severe ? "negative" : "neutral",
      severityScore: severe ? 65 : 35,
      persistenceScore: structural ? 70 : 45,
      confidenceScore: 70,
      reasoningSummary: `Deterministic GDELT query-group mapping used for ${input.primaryTheme}.`
    };
  }
}
