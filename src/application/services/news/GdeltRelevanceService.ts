import type { GdeltProviderArticle } from "@/application/ports/providers/GdeltNewsProvider";

const localNoiseTerms = [
  "local crime",
  "traffic accident",
  "sports",
  "celebrity",
  "weather forecast",
  "dream is to make",
  "gateway to the world",
  "electricity, water",
  "doğalgaz",
  "müjde"
];

const macroRelevantTerms = [
  "market",
  "economy",
  "economic",
  "inflation",
  "rates",
  "central bank",
  "fed",
  "war",
  "conflict",
  "sanction",
  "sanctions",
  "iran",
  "middle east",
  "israel",
  "peace talks",
  "military",
  "missile",
  "currency",
  "oil",
  "energy",
  "trade",
  "tariff",
  "debt",
  "credit",
  "recession",
  "supply chain"
];

const queryTermsByCategory: Record<string, string[]> = {
  macro_rates: ["fed", "federal reserve", "central bank", "interest rate", "rates", "treasury yield", "bond yield"],
  inflation: ["inflation", "cpi", "pce", "prices", "price pressure"],
  growth: ["recession", "growth", "economic slowdown", "jobs report", "gdp", "labor market"],
  currency: ["us dollar", "dollar", "usd", "dxy", "currency", "fx", "peso", "yen", "euro"],
  geopolitical: ["war", "conflict", "geopolitical", "sanction", "sanctions", "military", "missile", "iran", "middle east", "israel", "peace talks", "political instability", "election risk", "maritime disruption", "russia", "china"],
  geopolitical_risk: ["war", "conflict", "geopolitical", "sanction", "sanctions", "military", "missile", "iran", "middle east", "israel", "peace talks", "political instability", "election risk", "maritime disruption", "russia", "china"],
  trade_supply_chain: ["tariff", "tariffs", "trade", "export control", "export controls", "supply chain"],
  energy_commodities: ["oil", "crude", "opec", "natural gas", "lng", "energy", "commodity", "commodities"],
  global_credit: ["credit", "debt", "banking stress", "sovereign", "default", "bond market", "loan"]
};

const financeContextTerms = [
  "market",
  "markets",
  "stock",
  "stocks",
  "wall street",
  "investors",
  "futures",
  "yield",
  "bond",
  "bonds",
  "currency",
  "dollar",
  "oil",
  "gold",
  "economy",
  "economic",
  "central bank",
  "fed"
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function mostlyReadableEnglish(text: string) {
  const letters = Array.from(text).filter((char) => /\p{L}/u.test(char));
  if (letters.length < 12) return false;
  const latinLetters = letters.filter((char) => /\p{Script=Latin}/u.test(char));
  const latinRatio = latinLetters.length / letters.length;
  const commonEnglishWords = text.match(/\b(the|and|for|with|market|markets|stocks|oil|gold|dollar|rate|rates|inflation|economy|global)\b/g)?.length ?? 0;
  return latinRatio >= 0.85 && (commonEnglishWords > 0 || text.length < 120);
}

export class GdeltRelevanceService {
  isRelevant(article: GdeltProviderArticle) {
    const title = article.title.trim();
    if (title.length < 20) return false;
    const text = `${title} ${article.summary ?? ""} ${article.sourceName ?? ""}`.toLowerCase();
    const language = article.language?.toLowerCase() ?? "";
    if (language && !["english", "en"].includes(language)) return false;
    if (!language && !mostlyReadableEnglish(text)) return false;
    if (includesAny(text, localNoiseTerms) && !includesAny(text, macroRelevantTerms)) return false;
    const category = typeof article.providerMetadata.macroCategory === "string" ? article.providerMetadata.macroCategory : "";
    const queryTerms = queryTermsByCategory[category] ?? [];
    if (queryTerms.length > 0 && !includesAny(text, queryTerms)) return false;
    if (!includesAny(text, financeContextTerms) && !includesAny(text, macroRelevantTerms)) return false;
    return true;
  }
}
