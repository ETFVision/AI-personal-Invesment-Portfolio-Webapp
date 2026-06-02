import type { NewsCanonicalTheme, NewsThemeCategory, NewsThemeIntelligence, NewsThemeReviewItem, NewsThemeSummary, NewsThemeTrend } from "@/domain/news/types";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import { canonicalNewsThemes } from "./NewsClassificationService";
import { NewsSummaryEligibilityService } from "./NewsSummaryEligibilityService";

export const themeHierarchy: Record<NewsCanonicalTheme, NewsThemeCategory[]> = {
  Rates: ["Macro"],
  Inflation: ["Macro"],
  Growth: ["Macro", "Investment"],
  Employment: ["Macro"],
  Currency: ["Macro"],
  Geopolitical: ["Macro"],
  Energy: ["Macro"],
  Technology: ["Sector"],
  Financials: ["Sector"],
  Healthcare: ["Sector"],
  Consumer: ["Sector"],
  Industrials: ["Sector"],
  AI: ["Investment"],
  Quality: ["Investment"],
  Dividend: ["Investment"],
  Defensive: ["Investment"],
  Credit: ["Macro"],
  "Trade / Supply Chain": ["Macro"]
};

type ClassifiedNews = Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const fundStructureTerms = ["etf", "etfs", "mutual fund", "mutual funds", "expense ratio", "fund fees", "cheaper than mutual funds"];
const creditRiskTerms = ["credit spread", "credit spreads", "corporate credit", "high yield", "investment grade", "default", "defaults", "loan", "loans", "debt market", "bond market", "treasury yield", "bond yield"];
const hardwareTechnologyTerms = ["dell", "apple", "hardware", "pc market", "computer", "laptop", "device"];
const macroManufacturingTerms = ["ism manufacturing", "manufacturing pmi", "pmi"];

function textIncludesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function trendFrom(current: number, priorAverage: number, weeksWithData: number): NewsThemeTrend {
  if (weeksWithData <= 1) return "Insufficient history";
  if (weeksWithData < 4) return "Low confidence trend";
  if (current >= priorAverage + 2 || current >= priorAverage * 1.4 && current > priorAverage) return "Rising";
  if (current <= Math.max(0, priorAverage - 2) || current <= priorAverage * 0.6 && current < priorAverage) return "Declining";
  return "Stable";
}

export class ThemeIntelligenceService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly eligibilityService = new NewsSummaryEligibilityService()
  ) {}

  async getThemeIntelligence(periodStart: string, periodEnd: string): Promise<NewsThemeIntelligence> {
    const start = parseDate(periodStart);
    const priorStart = isoDate(shiftDays(start, -21));
    const all = this.eligibilityService.filter(await this.repository.listClassifiedNewsForPeriod(priorStart, periodEnd));
    const current = all.filter((item) => {
      const published = item.publishedAt ? new Date(item.publishedAt) : null;
      return published && published >= start && published <= new Date(`${periodEnd}T23:59:59.999Z`);
    });
    const summaries = this.summarizeThemes(current, all, periodStart, periodEnd);
    return {
      topThemesThisWeek: summaries.slice(0, 8),
      emergingThemes: summaries.filter((item) => item.trend === "Rising" && (item.weeksWithData ?? 0) >= 4).slice(0, 5),
      persistentThemes: summaries.filter((item) => (item.rolling4WeekFrequency ?? 0) >= 2 && item.averagePersistence >= 45).slice(0, 5),
      structuralThemes: summaries.filter((item) => item.structuralCount > 0 || item.averagePersistence >= 65).slice(0, 5),
      reviewQueue: this.reviewQueue(current).slice(0, 12)
    };
  }

  summarizeThemes(current: ClassifiedNews, allWindow: ClassifiedNews, periodStart: string, periodEnd: string): NewsThemeSummary[] {
    return canonicalNewsThemes
      .flatMap((theme): NewsThemeSummary[] => {
        const currentItems = this.itemsForTheme(current, theme);
        if (currentItems.length === 0) return [];
        const weeklyCounts = this.weeklyCountsForTheme(allWindow, theme, periodStart, periodEnd);
        const priorAverage = average(weeklyCounts.slice(0, 3));
        const weeksWithData = weeklyCounts.filter((count) => count > 0).length;
        return [{
          theme,
          categories: themeHierarchy[theme],
          count: currentItems.length,
          averageConfidence: average(currentItems.map((item) => item.classification.themeConfidence)),
          averageSeverity: average(currentItems.map((item) => item.classification.severityScore)),
          averagePersistence: average(currentItems.map((item) => item.classification.persistenceScore)),
          rolling4WeekFrequency: weeklyCounts.reduce((sum, count) => sum + count, 0),
          weeksWithData,
          trend: trendFrom(currentItems.length, priorAverage, weeksWithData),
          structuralCount: currentItems.filter((item) => item.classification.classification === "structural_long_term_shift").length,
          topHeadlines: this.topHeadlines(currentItems)
        }];
      })
      .sort((a, b) => b.count - a.count || b.averagePersistence - a.averagePersistence || b.averageSeverity - a.averageSeverity);
  }

  reviewQueue(items: ClassifiedNews): NewsThemeReviewItem[] {
    return items
      .map((item): NewsThemeReviewItem | null => {
        const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
        const effectiveThemes = this.effectiveThemes(item);
        const theme = effectiveThemes[0] ?? null;
        const reason = this.reviewReason(text, item);
        if (!reason && item.classification.themeConfidence >= 45) return null;
        return {
          newsItemId: item.id,
          title: item.title,
          publishedAt: item.publishedAt,
          primaryTheme: theme,
          secondaryThemes: effectiveThemes.filter((entry) => entry !== theme),
          themeConfidence: item.classification.themeConfidence,
          reason: reason ?? "Low theme confidence; manual review recommended."
        };
      })
      .filter((item): item is NewsThemeReviewItem => Boolean(item));
  }

  private reviewReason(text: string, item: ClassifiedNews[number]) {
    const effectiveThemes = this.effectiveThemes(item);
    const theme = effectiveThemes[0] ?? null;
    const isFundStructureWithoutCredit = textIncludesAny(text, fundStructureTerms) && !textIncludesAny(text, creditRiskTerms);
    if (!theme && isFundStructureWithoutCredit) return null;
    if (!theme) return "Missing primary theme.";
    if (theme === "Credit" && /\b(ai|agentic ai|artificial intelligence|nvidia|semiconductor|chip|software|cloud|technology)\b/.test(text)) return "AI/technology article classified as Credit.";
    if (theme === "Credit" && /\b(etf|etfs|mutual fund|mutual funds|expense ratio|fund fees)\b/.test(text) && !/\b(credit spread|corporate credit|high yield|investment grade|default|loan|debt market|bond market)\b/.test(text)) return "Fund structure article classified as Credit without credit-risk language.";
    if (theme === "Inflation" && /\b(consumer|retail|shopping|nike|costco|disney|netflix)\b/.test(text) && !/\b(inflation|cpi|prices|price pressure)\b/.test(text)) return "Consumer article classified as Inflation without inflation language.";
    if (theme === "Rates" && item.tickers.length > 0 && !/\b(fed|rate|yield|treasury)\b/.test(text)) return "Ticker-linked article classified as Rates without rates language.";
    return null;
  }

  private itemsForTheme(items: ClassifiedNews, theme: NewsCanonicalTheme) {
    return items.filter((item) => this.effectiveThemes(item).includes(theme));
  }

  private effectiveThemes(item: ClassifiedNews[number]): NewsCanonicalTheme[] {
    const text = `${item.title} ${item.summary ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
    const themes = new Set<NewsCanonicalTheme>();
    for (const theme of [item.classification.primaryTheme, ...item.classification.secondaryThemes]) {
      if (theme) themes.add(theme);
    }
    const isFundStructureWithoutCredit = textIncludesAny(text, fundStructureTerms) && !textIncludesAny(text, creditRiskTerms);
    if (isFundStructureWithoutCredit) themes.delete("Credit");
    if (textIncludesAny(text, macroManufacturingTerms)) themes.delete("Industrials");
    if (textIncludesAny(text, hardwareTechnologyTerms)) {
      themes.delete("Consumer");
      themes.add("Technology");
    }
    return Array.from(themes);
  }

  private weeklyCountsForTheme(items: ClassifiedNews, theme: NewsCanonicalTheme, periodStart: string, periodEnd: string) {
    const end = parseDate(periodEnd);
    return [3, 2, 1, 0].map((offset) => {
      const weekStart = shiftDays(parseDate(periodStart), -7 * offset);
      const weekEnd = offset === 0 ? end : shiftDays(weekStart, 6);
      return this.itemsForTheme(items, theme).filter((item) => {
        const published = item.publishedAt ? new Date(item.publishedAt) : null;
        return published && published >= weekStart && published <= new Date(`${isoDate(weekEnd)}T23:59:59.999Z`);
      }).length;
    });
  }

  private topHeadlines(items: ClassifiedNews) {
    return items
      .slice()
      .sort((a, b) => b.classification.severityScore + b.classification.persistenceScore - (a.classification.severityScore + a.classification.persistenceScore))
      .slice(0, 3)
      .map((item) => item.title);
  }
}
