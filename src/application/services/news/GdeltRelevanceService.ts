import type { GdeltProviderArticle } from "@/application/ports/providers/GdeltNewsProvider";

const localNoiseTerms = [
  "local crime",
  "traffic accident",
  "sports",
  "celebrity",
  "weather forecast"
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

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export class GdeltRelevanceService {
  isRelevant(article: GdeltProviderArticle) {
    const title = article.title.trim();
    if (title.length < 20) return false;
    const text = `${title} ${article.summary ?? ""} ${article.sourceName ?? ""}`.toLowerCase();
    if (includesAny(text, localNoiseTerms) && !includesAny(text, macroRelevantTerms)) return false;
    return true;
  }
}
