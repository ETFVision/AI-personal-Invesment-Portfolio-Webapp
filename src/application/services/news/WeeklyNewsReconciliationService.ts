import type { NewsAiProvider } from "@/application/ports/providers/NewsAiProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import { canonicalNewsThemes } from "./NewsClassificationService";
import { NewsSummaryCorrectionService } from "./NewsSummaryCorrectionService";
import { NewsSummaryEligibilityService } from "./NewsSummaryEligibilityService";
import { endOfUtcWeek, startOfUtcWeek } from "./newsText";

const buckets = [
  "equities",
  "bonds",
  "gold",
  "crypto",
  "macro",
  "rates",
  "inflation",
  "currency",
  "geopolitical"
] as const;

type Bucket = typeof buckets[number];
const cryptoSymbols = new Set(["BTC", "BTCUSD", "ETH", "ETHUSD", "SOL", "SOLUSD", "IBIT", "FBTC", "BITB", "ARKB", "ETHA", "ETHE", "FETH"]);
const bondSymbols = new Set(["BND", "AGG", "SHY", "IEF", "TLT", "TIP", "LQD", "HYG", "SGOV", "BIL", "BNDX"]);
const goldSymbols = new Set(["GLD", "IAU"]);
const equityTerms = ["stock", "stocks", "equity", "equities", "s&p 500", "nasdaq", "dow", "spy", "qqq", "earnings", "shares", "forecast", "forecasts"];
const goldFalsePositiveTerms = ["gold rush", "golden", "goldman"];
const financialGoldTerms = ["gold price", "spot gold", "bullion", "precious metal", "precious metals", "gold etf", "gold futures"];
const fundStructureTerms = ["etf", "etfs", "mutual fund", "mutual funds", "expense ratio", "fund fees", "cheaper than mutual funds"];
const creditRiskTerms = ["credit spread", "credit spreads", "corporate credit", "high yield", "investment grade", "default", "defaults", "loan", "loans", "debt market", "bond market", "treasury yield", "bond yield"];
const hardwareTechnologyTerms = ["dell", "apple", "hardware", "pc market", "computer", "laptop", "device"];
const macroManufacturingTerms = ["ism manufacturing", "manufacturing pmi", "pmi"];
const tradeSupplyChainTerms = ["tariff", "tariffs", "trade war", "export control", "export controls", "supply chain", "semiconductor restrictions"];

function textIncludesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export class WeeklyNewsReconciliationService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly aiProvider?: NewsAiProvider,
    private readonly config = {
      maxArticlesPerWeek: 250,
      enableWeeklyReconciliation: false,
      reconciliationModel: "gpt-5.4-mini"
    },
    private readonly eligibilityService = new NewsSummaryEligibilityService(),
    private readonly correctionService = new NewsSummaryCorrectionService()
  ) {}

  async reconcileWeek(periodStart = startOfUtcWeek(), periodEnd = endOfUtcWeek()) {
    const classified = await this.repository.listClassifiedNewsForPeriod(periodStart, periodEnd);
    const eligible = this.eligibilityService.filter(classified);
    const limited = eligible.slice(0, this.config.maxArticlesPerWeek);
    const grouped = this.groupByBucket(limited);
    const bucketCounts = Object.fromEntries(buckets.map((bucket) => [bucket, grouped.get(bucket)?.length ?? 0]));
    const themeSummaries = this.summarizeThemes(limited);

    const aiOutput =
      this.config.enableWeeklyReconciliation && this.aiProvider
        ? await this.aiProvider.reconcileWeekly({
            periodStart,
            periodEnd,
            articles: limited.map((item) => ({
              title: item.title,
              summary: item.summary,
              classification: item.classification.classification,
              severityScore: item.classification.severityScore,
              persistenceScore: item.classification.persistenceScore,
              affectedAssetClasses: item.classification.affectedAssetClasses,
              affectedMacroCategories: item.classification.affectedMacroCategories,
              primaryTheme: item.classification.primaryTheme,
              secondaryThemes: item.classification.secondaryThemes,
              themeConfidence: item.classification.themeConfidence
            }))
          })
        : null;

    const summaryFor = (bucket: Bucket) =>
      aiOutput?.[`${bucket}Summary` as keyof typeof aiOutput] as string | undefined ??
      this.deterministicSummary(bucket, grouped.get(bucket) ?? []);

    return this.repository.upsertWeeklyReconciliation({
      periodStart,
      periodEnd,
      status: "draft",
      equitiesSummary: summaryFor("equities"),
      bondsSummary: summaryFor("bonds"),
      goldSummary: summaryFor("gold"),
      cryptoSummary: summaryFor("crypto"),
      macroSummary: summaryFor("macro"),
      ratesSummary: summaryFor("rates"),
      inflationSummary: summaryFor("inflation"),
      currencySummary: summaryFor("currency"),
      geopoliticalSummary: summaryFor("geopolitical"),
      keyRisks: aiOutput?.keyRisks ?? this.topHeadlines(limited, "negative"),
      keyOpportunities: aiOutput?.keyOpportunities ?? this.topHeadlines(limited, "positive"),
      portfolioImplications: aiOutput?.portfolioImplications ?? {},
      coverageMetadata: aiOutput?.coverageMetadata ?? {
        periodStart,
        periodEnd,
        classifiedInPeriod: classified.length,
        excludedByEligibility: Math.max(0, classified.length - eligible.length),
        includedInReconciliation: limited.length,
        excludedByWeeklyLimit: Math.max(0, eligible.length - limited.length),
        maxArticlesPerWeek: this.config.maxArticlesPerWeek,
        bucketCounts,
        themeSummaries
      },
      modelUsed: this.config.enableWeeklyReconciliation ? this.config.reconciliationModel : "deterministic_fallback",
      tokenUsage: aiOutput?.tokenUsage ?? {},
      costEstimate: aiOutput?.costEstimate ?? null
    });
  }

  groupByBucket(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>) {
    const grouped = new Map<Bucket, typeof items>();
    for (const bucket of buckets) grouped.set(bucket, []);
    for (const item of items) {
      const bucket = this.inferBucket(item);
      grouped.set(bucket, [...(grouped.get(bucket) ?? []), item]);
    }
    return grouped;
  }

  inferBucket(item: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>[number]): Bucket {
    const classes = item.classification.affectedAssetClasses.map((entry) => entry.toLowerCase());
    const macros = item.classification.affectedMacroCategories.map((entry) => entry.toLowerCase());
    const title = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    const symbols = item.tickers.map((ticker) => ticker.toUpperCase());
    const isEquityLike = item.tickers.length > 0 || textIncludesAny(title, equityTerms);
    const hasGoldSymbol = symbols.some((symbol) => goldSymbols.has(symbol));
    const hasGoldFalsePositiveText = textIncludesAny(title, goldFalsePositiveTerms) && !textIncludesAny(title, financialGoldTerms);
    const hasGoldClass = classes.some((entry) => entry.includes("gold") || entry.includes("commodity"));
    const isFundStructureWithoutCredit = textIncludesAny(title, fundStructureTerms) && !textIncludesAny(title, creditRiskTerms);
    let bucket: Bucket = "macro";
    if (isFundStructureWithoutCredit) bucket = isEquityLike ? "equities" : "macro";
    else if (classes.some((entry) => entry.includes("bond")) || symbols.some((symbol) => bondSymbols.has(symbol))) bucket = "bonds";
    else if (hasGoldFalsePositiveText) bucket = isEquityLike ? "equities" : "macro";
    else if (
      hasGoldSymbol ||
      (!hasGoldFalsePositiveText && (hasGoldClass || /\bgold\b/.test(title)))
    ) bucket = "gold";
    else if (classes.some((entry) => entry.includes("crypto")) || symbols.some((symbol) => cryptoSymbols.has(symbol))) bucket = "crypto";
    else if (!isEquityLike && (macros.some((entry) => entry.includes("rate")) || textIncludesAny(title, ["fed", "interest rate", "rate cut", "rate hike", "treasury yield"]))) bucket = "rates";
    else if (macros.some((entry) => entry.includes("inflation")) || textIncludesAny(title, ["inflation", "cpi", "pce"])) bucket = "inflation";
    else if (macros.some((entry) => entry.includes("currency") || entry.includes("usd")) || textIncludesAny(title, ["usd", "dollar", "currency", "fx"])) bucket = "currency";
    else if (!isEquityLike && (macros.some((entry) => entry.includes("trade_supply_chain")) || textIncludesAny(title, tradeSupplyChainTerms))) bucket = "macro";
    else if (!isEquityLike && (macros.some((entry) => entry.includes("geopolitical")) || textIncludesAny(title, ["war", "geopolitical", "sanction", "tariff", "conflict"]))) bucket = "geopolitical";
    else if (
      classes.some((entry) => entry.includes("equity") || entry.includes("stock")) ||
      isEquityLike
    ) {
      bucket = "equities";
    }
    const corrected = this.correctionService.correctedBucket(item, bucket);
    return buckets.includes(corrected as Bucket) ? corrected as Bucket : bucket;
  }

  private deterministicSummary(bucket: Bucket, items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>) {
    if (items.length === 0) return `No material ${bucket} news was classified for this period.`;
    const top = items
      .slice()
      .sort((a, b) => b.classification.severityScore + b.classification.persistenceScore - (a.classification.severityScore + a.classification.persistenceScore))
      .slice(0, 3)
      .map((item) => item.title);
    return `${items.length} ${bucket} items classified. Main items: ${top.join("; ")}.`;
  }

  summarizeThemes(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>) {
    return canonicalNewsThemes
      .map((theme) => {
        const themeItems = items.filter((item) => this.effectiveThemes(item).includes(theme));
        if (themeItems.length === 0) return null;
        const confidenceTotal = themeItems.reduce((sum, item) => sum + item.classification.themeConfidence, 0);
        const severityTotal = themeItems.reduce((sum, item) => sum + item.classification.severityScore, 0);
        const persistenceTotal = themeItems.reduce((sum, item) => sum + item.classification.persistenceScore, 0);
        return {
          theme,
          count: themeItems.length,
          averageConfidence: Math.round(confidenceTotal / themeItems.length),
          averageSeverity: Math.round(severityTotal / themeItems.length),
          averagePersistence: Math.round(persistenceTotal / themeItems.length),
          structuralCount: themeItems.filter((item) => item.classification.classification === "structural_long_term_shift").length,
          topHeadlines: this.topThemeHeadlines(themeItems)
        };
      })
      .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))
      .sort((a, b) => b.count - a.count || b.averagePersistence - a.averagePersistence || b.averageSeverity - a.averageSeverity);
  }

  private effectiveThemes(item: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>[number]) {
    const text = `${item.title} ${item.summary ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
    const themes = new Set(item.classification.secondaryThemes);
    if (item.classification.primaryTheme) themes.add(item.classification.primaryTheme);
    const isFundStructureWithoutCredit = textIncludesAny(text, fundStructureTerms) && !textIncludesAny(text, creditRiskTerms);
    if (isFundStructureWithoutCredit) themes.delete("Credit");
    if (textIncludesAny(text, macroManufacturingTerms)) themes.delete("Industrials");
    if (textIncludesAny(text, hardwareTechnologyTerms)) {
      themes.delete("Consumer");
      themes.add("Technology");
    }
    return this.correctionService.correctedThemes(item, Array.from(themes));
  }

  private topThemeHeadlines(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>) {
    return items
      .slice()
      .sort((a, b) => b.classification.severityScore + b.classification.persistenceScore - (a.classification.severityScore + a.classification.persistenceScore))
      .slice(0, 3)
      .map((item) => item.title);
  }

  private topHeadlines(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>, sentiment: "positive" | "negative") {
    return items
      .filter((item) => item.classification.sentiment === sentiment)
      .sort((a, b) => b.classification.severityScore - a.classification.severityScore)
      .slice(0, 5)
      .map((item) => item.title);
  }
}
