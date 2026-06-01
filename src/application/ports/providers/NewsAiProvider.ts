import type { NewsCanonicalTheme } from "@/domain/news/types";

export type NewsAiClassificationInput = {
  title: string;
  summary: string | null;
  contentSnippet: string | null;
  tickers: string[];
  publishedAt: string | null;
};

export type NewsAiClassificationOutput = {
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  eventType: string | null;
  classification: "short_term_noise" | "medium_term_theme" | "structural_long_term_shift" | "existential_risk";
  severityScore: number;
  persistenceScore: number;
  confidenceScore: number;
  affectedAssetClasses: string[];
  affectedSectors: string[];
  affectedThemes: string[];
  primaryTheme: NewsCanonicalTheme | null;
  secondaryThemes: NewsCanonicalTheme[];
  themeConfidence: number;
  affectedInstruments: string[];
  affectedMacroCategories: string[];
  reasoningSummary: string;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
};

export type NewsAiReconciliationInput = {
  periodStart: string;
  periodEnd: string;
  articles: Array<{
    title: string;
    summary: string | null;
    classification: string;
    severityScore: number;
    persistenceScore: number;
    affectedAssetClasses: string[];
    affectedMacroCategories: string[];
    primaryTheme: NewsCanonicalTheme | null;
    secondaryThemes: NewsCanonicalTheme[];
    themeConfidence: number;
  }>;
};

export type NewsAiReconciliationOutput = {
  equitiesSummary: string;
  bondsSummary: string;
  goldSummary: string;
  cryptoSummary: string;
  macroSummary: string;
  ratesSummary: string;
  inflationSummary: string;
  currencySummary: string;
  geopoliticalSummary: string;
  keyRisks: string[];
  keyOpportunities: string[];
  portfolioImplications: Record<string, unknown>;
  coverageMetadata?: Record<string, unknown>;
  tokenUsage?: Record<string, unknown>;
  costEstimate?: number | null;
};

export interface NewsAiProvider {
  classifyArticle(input: NewsAiClassificationInput): Promise<NewsAiClassificationOutput>;
  reconcileWeekly(input: NewsAiReconciliationInput): Promise<NewsAiReconciliationOutput>;
}
