import type { NewsAiProvider } from "@/application/ports/providers/NewsAiProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsClassification, NewsClassificationLabel, NewsItem, NewsSentiment } from "@/domain/news/types";
import { clampScore } from "./newsText";

const sentiments: NewsSentiment[] = ["positive", "neutral", "negative", "mixed"];
const labels: NewsClassificationLabel[] = ["short_term_noise", "medium_term_theme", "structural_long_term_shift", "existential_risk"];

export function validateNewsClassificationOutput(input: unknown) {
  const row = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const sentiment = sentiments.includes(row.sentiment as NewsSentiment) ? row.sentiment as NewsSentiment : "neutral";
  const classification = labels.includes(row.classification as NewsClassificationLabel)
    ? row.classification as NewsClassificationLabel
    : "short_term_noise";

  const toStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : [];

  return {
    sentiment,
    eventType: typeof row.eventType === "string" ? row.eventType : null,
    classification,
    severityScore: clampScore(row.severityScore),
    persistenceScore: clampScore(row.persistenceScore),
    confidenceScore: clampScore(row.confidenceScore),
    affectedAssetClasses: toStringArray(row.affectedAssetClasses),
    affectedSectors: toStringArray(row.affectedSectors),
    affectedThemes: toStringArray(row.affectedThemes),
    affectedInstruments: toStringArray(row.affectedInstruments),
    affectedMacroCategories: toStringArray(row.affectedMacroCategories),
    reasoningSummary: typeof row.reasoningSummary === "string" ? row.reasoningSummary.slice(0, 800) : "No reliable structured reasoning returned."
  };
}

export class NewsClassificationService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly aiProvider?: NewsAiProvider,
    private readonly config = {
      classificationModel: "gpt-5.4-nano",
      maxArticlesPerDay: 80,
      enableAiClassification: false
    }
  ) {}

  shouldClassify(item: NewsItem) {
    if (item.isDuplicate) return false;
    if (!item.title || item.title.length < 12) return false;
    return true;
  }

  async classifyPending(limit = this.config.maxArticlesPerDay) {
    const pending = await this.repository.listUnclassifiedNews(limit);
    const classifications: Array<Omit<NewsClassification, "id" | "createdAt" | "updatedAt">> = [];

    for (const item of pending) {
      if (!this.shouldClassify(item)) continue;
      const output =
        this.config.enableAiClassification && this.aiProvider
          ? validateNewsClassificationOutput(await this.aiProvider.classifyArticle({
              title: item.title,
              summary: item.summary,
              contentSnippet: item.contentSnippet,
              tickers: item.tickers,
              publishedAt: item.publishedAt
            }))
          : this.deterministicFallback(item);

      classifications.push({
        newsItemId: item.id,
        classificationModel: this.config.enableAiClassification ? this.config.classificationModel : "deterministic_fallback",
        ...output
      });
    }

    await this.repository.upsertClassifications(classifications);
    return { requested: pending.length, classified: classifications.length };
  }

  deterministicFallback(item: NewsItem) {
    const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    const negative = /\b(warn|fall|drop|lawsuit|probe|risk|war|default|recession|inflation|hack|fraud|miss)\b/.test(text);
    const positive = /\b(beat|surge|rise|growth|profit|approval|record|upgrade)\b/.test(text);
    const structural = /\b(ai|semiconductor|energy transition|deglobalization|demographic|regulation)\b/.test(text);
    return {
      sentiment: negative ? "negative" as const : positive ? "positive" as const : "neutral" as const,
      eventType: structural ? "theme_update" : "news_update",
      classification: structural ? "medium_term_theme" as const : "short_term_noise" as const,
      severityScore: negative ? 55 : positive ? 45 : 25,
      persistenceScore: structural ? 65 : 20,
      confidenceScore: 45,
      affectedAssetClasses: [],
      affectedSectors: [],
      affectedThemes: structural ? ["Potential market theme"] : [],
      affectedInstruments: item.tickers,
      affectedMacroCategories: [],
      reasoningSummary: "Deterministic fallback classification used because AI news classification is disabled."
    };
  }
}
