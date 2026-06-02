import type { NewsAiProvider } from "@/application/ports/providers/NewsAiProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsCanonicalTheme, NewsClassification, NewsClassificationLabel, NewsItem, NewsSentiment } from "@/domain/news/types";
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
  "Consumer",
  "Healthcare",
  "Financials",
  "Technology",
  "Industrials",
  "Quality",
  "Dividend",
  "Defensive"
];
const cryptoSymbols = new Set(["BTC", "BTCUSD", "ETH", "ETHUSD", "SOL", "SOLUSD", "IBIT", "FBTC", "BITB", "ARKB", "ETHA", "ETHE", "FETH"]);
const bondSymbols = new Set(["BND", "AGG", "SHY", "IEF", "TLT", "TIP", "LQD", "HYG", "SGOV", "BIL", "BNDX"]);
const goldSymbols = new Set(["GLD", "IAU"]);
const companyOrEquityTerms = ["stock", "stocks", "equity", "equities", "s&p 500", "nasdaq", "dow", "spy", "qqq", "earnings", "shares", "forecast", "forecasts"];
const creditTerms = ["credit spread", "credit spreads", "corporate credit", "high yield", "investment grade", "default", "defaults", "loan", "loans", "debt load", "debt market", "bond market"];
const technologyTerms = ["technology", "software", "cloud", "semiconductor", "chip", "chips", "intel", "amd", "broadcom", "dell", "apple", "pc market", "hardware"];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

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

  deterministicFallback(item: NewsItem) {
    const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    const negative = /\b(warn|fall|drop|lawsuit|probe|risk|war|default|recession|inflation|hack|fraud|miss)\b/.test(text);
    const positive = /\b(beat|surge|rise|growth|profit|approval|record|upgrade)\b/.test(text);
    const structural = /\b(ai|semiconductor|energy transition|deglobalization|demographic|regulation)\b/.test(text);
    const symbols = item.tickers.map((ticker) => ticker.toUpperCase());
    const hasTicker = symbols.length > 0;
    const isCrypto = symbols.some((symbol) => cryptoSymbols.has(symbol)) || includesAny(text, ["bitcoin", "ethereum", "solana", "crypto"]);
    const isBond = symbols.some((symbol) => bondSymbols.has(symbol)) || includesAny(text, ["treasury", "bond", "yield curve", "credit spread"]);
    const isCompanyOrEquity = hasTicker || includesAny(text, companyOrEquityTerms);
    const isGold = symbols.some((symbol) => goldSymbols.has(symbol)) ||
      /\bgold\b/.test(text) && !includesAny(text, ["gold rush", "golden", "goldman"]) ||
      includesAny(text, ["gold price", "bullion", "precious metal", "precious metals", "commodity", "commodities"]);
    const isRates = !isCompanyOrEquity && includesAny(text, ["fed", "federal reserve", "interest rate", "rate cut", "rate hike", "yield", "treasury yield"]);
    const isInflation = includesAny(text, ["inflation", "cpi", "pce", "prices"]);
    const isCurrency = includesAny(text, ["dollar", "usd", "currency", "fx"]);
    const isGeopolitical = !isCompanyOrEquity && includesAny(text, ["war", "geopolitical", "sanction", "tariff", "conflict"]);
    const isEquityMarket = isCompanyOrEquity;
    const themeSignals: NewsCanonicalTheme[] = [
      isRates ? "Rates" : null,
      isInflation ? "Inflation" : null,
      includesAny(text, ["jobs", "payroll", "employment", "unemployment", "labor market"]) ? "Employment" : null,
      includesAny(text, ["gdp", "growth", "recession", "slowdown", "expansion"]) ? "Growth" : null,
      isCurrency ? "Currency" : null,
      isGeopolitical ? "Geopolitical" : null,
      includesAny(text, ["oil", "energy", "crude", "natural gas", "xom", "cvx"]) ? "Energy" : null,
      /\b(ai|artificial intelligence|nvidia|nvda)\b/.test(text) ? "AI" : null,
      isBond || includesAny(text, creditTerms) ? "Credit" : null,
      includesAny(text, ["consumer", "retail", "shopping", "costco", "nike", "disney", "netflix"]) ? "Consumer" : null,
      includesAny(text, ["healthcare", "health care", "pharma", "biotech", "drug", "fda", "lilly", "unitedhealth"]) ? "Healthcare" : null,
      includesAny(text, ["bank", "banks", "financial", "financials", "jpmorgan", "goldman", "fintech"]) ? "Financials" : null,
      includesAny(text, technologyTerms) ? "Technology" : null,
      includesAny(text, ["industrial", "industrials", "infrastructure", "manufacturing", "factory", "pentagon", "defense", "aerospace"]) ? "Industrials" : null,
      includesAny(text, ["quality", "strong balance sheet", "cash flow", "profitability", "moat"]) ? "Quality" : null,
      includesAny(text, ["dividend", "yield income", "payout"]) ? "Dividend" : null,
      includesAny(text, ["defensive", "staples", "utilities", "recession proof", "safe haven"]) ? "Defensive" : null
    ].filter((entry): entry is NewsCanonicalTheme => Boolean(entry));
    const primaryTheme = themeSignals[0] ?? (isEquityMarket ? "Technology" : isGold ? "Inflation" : isCrypto ? "Technology" : null);
    const secondaryThemes = Array.from(new Set(themeSignals.filter((theme) => theme !== primaryTheme))).slice(0, 5);
    const affectedAssetClasses = [
      isCrypto ? "crypto" : null,
      isBond ? "bonds" : null,
      isGold ? "gold/commodities" : null,
      !isCrypto && !isBond && !isGold && isEquityMarket ? "equities" : null,
      !isEquityMarket && (isRates || isInflation || isCurrency || isGeopolitical) ? "macro" : null
    ].filter((entry): entry is string => Boolean(entry));
    const affectedMacroCategories = [
      isRates ? "rates" : null,
      isInflation ? "inflation" : null,
      isCurrency ? "currency" : null,
      isGeopolitical ? "geopolitical" : null
    ].filter((entry): entry is string => Boolean(entry));
    const affectedThemes = [
      /\b(ai|artificial intelligence|nvidia|nvda)\b/.test(text) ? "AI / Automation" : null,
      /\b(semiconductor|chip|chips|intel|nvidia|amd|tsm|asml)\b/.test(text) ? "Semiconductors" : null,
      isRates || isBond ? "Interest Rate Sensitive" : null,
      isInflation || isGold ? "Inflation Hedge" : null,
      isCrypto ? "Crypto / Digital Assets" : null
    ].filter((entry): entry is string => Boolean(entry));
    return {
      sentiment: negative ? "negative" as const : positive ? "positive" as const : "neutral" as const,
      eventType: structural ? "theme_update" : "news_update",
      classification: structural ? "medium_term_theme" as const : "short_term_noise" as const,
      severityScore: negative ? 55 : positive ? 45 : 25,
      persistenceScore: structural ? 65 : 20,
      confidenceScore: affectedAssetClasses.length > 0 ? 60 : 40,
      affectedAssetClasses,
      affectedSectors: [],
      affectedThemes: affectedThemes.length > 0 ? affectedThemes : structural ? ["Potential market theme"] : [],
      primaryTheme,
      secondaryThemes,
      themeConfidence: primaryTheme ? 65 : 35,
      affectedInstruments: item.tickers,
      affectedMacroCategories,
      reasoningSummary: "Deterministic fallback classification used because AI news classification is disabled."
    };
  }
}
