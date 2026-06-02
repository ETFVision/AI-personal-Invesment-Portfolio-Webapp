import type { NewsAiProvider } from "@/application/ports/providers/NewsAiProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsCanonicalTheme, NewsClassification, NewsClassificationLabel, NewsItem, NewsSentiment } from "@/domain/news/types";
import { NewsThemeClassificationService } from "./NewsThemeClassificationService";
import { clampScore } from "./newsText";

const sentiments: NewsSentiment[] = ["positive", "neutral", "negative", "mixed"];
const labels: NewsClassificationLabel[] = ["short_term_noise", "medium_term_theme", "structural_long_term_shift", "existential_risk"];
export const canonicalNewsThemes: NewsCanonicalTheme[] = [
  "Rates",
  "Inflation",
  "Growth",
  "Employment",
  "Currency",
  "Geopolitical",
  "Energy",
  "AI",
  "Credit",
  "Trade / Supply Chain",
  "Consumer",
  "Healthcare",
  "Financials",
  "Technology",
  "Industrials",
  "Quality",
  "Dividend",
  "Defensive"
];
export function validateNewsClassificationOutput(input: unknown) {
  const row = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const sentiment = sentiments.includes(row.sentiment as NewsSentiment) ? row.sentiment as NewsSentiment : "neutral";
  const classification = labels.includes(row.classification as NewsClassificationLabel)
    ? row.classification as NewsClassificationLabel
    : "short_term_noise";

  const toStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
  const toTheme = (value: unknown) =>
    typeof value === "string" && canonicalNewsThemes.includes(value as NewsCanonicalTheme)
      ? value as NewsCanonicalTheme
      : null;
  const toThemeArray = (value: unknown) =>
    toStringArray(value).filter((item): item is NewsCanonicalTheme => canonicalNewsThemes.includes(item as NewsCanonicalTheme));

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
    primaryTheme: toTheme(row.primaryTheme),
    secondaryThemes: toThemeArray(row.secondaryThemes),
    themeConfidence: clampScore(row.themeConfidence),
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
    },
    private readonly themeClassificationService = new NewsThemeClassificationService()
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

  async reclassifyLatestDeterministic(limit = this.config.maxArticlesPerDay) {
    const rows = await this.repository.listDeterministicallyClassifiedNews(limit);
    const classifications: Array<Omit<NewsClassification, "id" | "createdAt" | "updatedAt">> = [];

    for (const item of rows) {
      if (!this.shouldClassify(item)) continue;
      classifications.push({
        newsItemId: item.id,
        classificationModel: "deterministic_fallback",
        ...this.deterministicFallback(item)
      });
    }

    await this.repository.upsertClassifications(classifications);
    return { requested: rows.length, reclassified: classifications.length };
  }

  async reclassifyDeterministicForPeriod(periodStart: string, periodEnd: string) {
    const rows = await this.repository.listDeterministicallyClassifiedNewsForPeriod(periodStart, periodEnd);
    const classifications: Array<Omit<NewsClassification, "id" | "createdAt" | "updatedAt">> = [];

    for (const item of rows) {
      if (!this.shouldClassify(item)) continue;
      classifications.push({
        newsItemId: item.id,
        classificationModel: "deterministic_fallback",
        ...this.deterministicFallback(item)
      });
    }

    await this.repository.upsertClassifications(classifications);
    return { requested: rows.length, reclassified: classifications.length, periodStart, periodEnd };
  }

  deterministicFallback(item: NewsItem) {
    const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    const negative = /\b(warn|fall|drop|lawsuit|probe|risk|war|default|recession|inflation|hack|fraud|miss)\b/.test(text);
    const positive = /\b(beat|surge|rise|growth|profit|approval|record|upgrade)\b/.test(text);
    const theme = this.themeClassificationService.classify({
      title: item.title,
      summary: item.summary,
      contentSnippet: item.contentSnippet,
      tickers: item.tickers,
      sourceProvider: item.sourceProvider,
      sourceQualityTier: item.sourceQualityTier
    });
    const structural = theme.structural || /\b(energy transition|deglobalization|demographic|regulation)\b/.test(text);
    return {
      sentiment: negative ? "negative" as const : positive ? "positive" as const : "neutral" as const,
      eventType: structural ? "theme_update" : "news_update",
      classification: structural ? "medium_term_theme" as const : "short_term_noise" as const,
      severityScore: negative ? 55 : positive ? 45 : 25,
      persistenceScore: structural ? 65 : 20,
      confidenceScore: theme.affectedAssetClasses.length > 0 ? 60 : 40,
      affectedAssetClasses: theme.affectedAssetClasses,
      affectedSectors: [],
      affectedThemes: theme.affectedThemes.length > 0 ? theme.affectedThemes : structural ? ["Potential market theme"] : [],
      primaryTheme: theme.primaryTheme,
      secondaryThemes: theme.secondaryThemes,
      themeConfidence: theme.themeConfidence,
      affectedInstruments: item.tickers,
      affectedMacroCategories: theme.affectedMacroCategories,
      reasoningSummary: "Deterministic fallback classification used because AI news classification is disabled."
    };
  }
}
