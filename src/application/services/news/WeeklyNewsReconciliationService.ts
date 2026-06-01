import type { NewsAiProvider } from "@/application/ports/providers/NewsAiProvider";
import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
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

export class WeeklyNewsReconciliationService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly aiProvider?: NewsAiProvider,
    private readonly config = {
      maxArticlesPerWeek: 250,
      enableWeeklyReconciliation: false,
      reconciliationModel: "gpt-5.4-mini"
    }
  ) {}

  async reconcileWeek(periodStart = startOfUtcWeek(), periodEnd = endOfUtcWeek()) {
    const classified = await this.repository.listClassifiedNewsForPeriod(periodStart, periodEnd);
    const limited = classified.slice(0, this.config.maxArticlesPerWeek);
    const grouped = this.groupByBucket(limited);

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
              affectedMacroCategories: item.classification.affectedMacroCategories
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
      modelUsed: this.config.enableWeeklyReconciliation ? this.config.reconciliationModel : "deterministic_fallback",
      tokenUsage: aiOutput?.tokenUsage ?? {},
      costEstimate: aiOutput?.costEstimate ?? null
    });
  }

  groupByBucket(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>) {
    const grouped = new Map<Bucket, typeof items>();
    for (const bucket of buckets) grouped.set(bucket, []);
    for (const item of items) {
      const classes = item.classification.affectedAssetClasses.map((entry) => entry.toLowerCase());
      const macros = item.classification.affectedMacroCategories.map((entry) => entry.toLowerCase());
      const title = item.title.toLowerCase();
      const bucket =
        classes.some((entry) => entry.includes("bond")) ? "bonds" :
        classes.some((entry) => entry.includes("gold") || entry.includes("commodity")) ? "gold" :
        classes.some((entry) => entry.includes("crypto")) ? "crypto" :
        macros.some((entry) => entry.includes("rate")) ? "rates" :
        macros.some((entry) => entry.includes("inflation")) ? "inflation" :
        macros.some((entry) => entry.includes("currency") || entry.includes("usd")) ? "currency" :
        title.includes("war") || title.includes("geopolitical") ? "geopolitical" :
        classes.some((entry) => entry.includes("equity") || entry.includes("stock")) ? "equities" :
        "macro";
      grouped.set(bucket, [...(grouped.get(bucket) ?? []), item]);
    }
    return grouped;
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

  private topHeadlines(items: Awaited<ReturnType<NewsRepository["listClassifiedNewsForPeriod"]>>, sentiment: "positive" | "negative") {
    return items
      .filter((item) => item.classification.sentiment === sentiment)
      .sort((a, b) => b.classification.severityScore - a.classification.severityScore)
      .slice(0, 5)
      .map((item) => item.title);
  }
}
