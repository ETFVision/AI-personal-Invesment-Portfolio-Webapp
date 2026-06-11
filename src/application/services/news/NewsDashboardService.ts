import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsFilters } from "@/application/ports/repositories/NewsRepository";
import type { GdeltRepository } from "@/application/ports/repositories/GdeltRepository";
import type { NewsDataRepository } from "@/application/ports/repositories/NewsDataRepository";
import type { NewsCanonicalTheme, NewsThemeCategory, NewsThemeIntelligence, NewsThemeReviewItem, NewsThemeSummary, NewsThemeTrend } from "@/domain/news/types";
import type { GdeltIngestionLog, GdeltQueryGroup, NewsDataIngestionLog, NewsDataQueryGroup } from "@/domain/news/types";
import type { ThemeIntelligenceService } from "./ThemeIntelligenceService";

function isStaleResetFailureLog(queryGroup: GdeltQueryGroup, latestLog: GdeltIngestionLog | null) {
  if (!latestLog || latestLog.status !== "failed") return false;
  if (queryGroup.failureCount === 0 && !queryGroup.lastError) return true;
  const logTime = new Date(latestLog.startedAt).getTime();
  const groupUpdatedAt = new Date(queryGroup.updatedAt).getTime();
  return Number.isFinite(logTime) && Number.isFinite(groupUpdatedAt) && logTime < groupUpdatedAt;
}

export class NewsDashboardService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly themeIntelligenceService: ThemeIntelligenceService,
    private readonly gdeltRepository?: GdeltRepository,
    private readonly newsDataRepository?: NewsDataRepository
  ) {}

  async getDashboard(filters?: NewsFilters) {
    const [articleDashboard, intelligenceDashboard] = await Promise.all([
      this.getArticleDashboard(filters),
      this.getThemeDashboard()
    ]);
    return {
      ...articleDashboard,
      ...intelligenceDashboard
    };
  }

  async getArticleDashboard(filters?: NewsFilters) {
    const [latestNews, stats, weeklyReconciliations, ingestionLogs, gdeltQueryStatuses, newsDataQueryStatuses] = await Promise.all([
      this.repository.listNewsWithClassifications({ ...filters, limit: filters?.limit ?? 50 }),
      this.repository.getDashboardStats(),
      this.repository.listWeeklyReconciliations(1),
      this.repository.listIngestionLogs(10),
      this.getGdeltQueryStatuses(),
      this.getNewsDataQueryStatuses()
    ]);

    return {
      latestNews,
      stats,
      weeklyReconciliations,
      ingestionLogs,
      gdeltQueryStatuses,
      newsDataQueryStatuses,
      latestWeeklyReconciliation: weeklyReconciliations[0] ?? null
    };
  }

  async getThemeDashboard() {
    const latestWeeklyReconciliation = await this.repository.getLatestWeeklyReconciliation();
    const periodStart = latestWeeklyReconciliation?.periodStart;
    const periodEnd = latestWeeklyReconciliation?.periodEnd;
    const cachedThemeIntelligence = this.themeIntelligenceFromCoverage(latestWeeklyReconciliation?.coverageMetadata);
    const themeIntelligence = cachedThemeIntelligence ?? (periodStart && periodEnd
      ? await this.themeIntelligenceService.getThemeIntelligence(periodStart, periodEnd)
      : this.emptyThemeIntelligence());

    return {
      latestWeeklyReconciliation,
      weeklyReconciliations: latestWeeklyReconciliation ? [latestWeeklyReconciliation] : [],
      themeSummary: themeIntelligence.topThemesThisWeek.length
        ? themeIntelligence.topThemesThisWeek
        : this.themeSummaryFromCoverage(latestWeeklyReconciliation?.coverageMetadata),
      themeIntelligence
    };
  }

  private async getGdeltQueryStatuses() {
    if (!this.gdeltRepository) return [];
    const [queryGroups, logs] = await Promise.all([
      this.gdeltRepository.listActiveQueryGroups(),
      this.gdeltRepository.listIngestionLogs(80)
    ]);
    return queryGroups.map((queryGroup) => {
      const latestLog = logs.find((log) => log.queryGroupId === queryGroup.id) ?? null;
      return {
        queryGroup,
        latestLog: isStaleResetFailureLog(queryGroup, latestLog) ? null : latestLog
      };
    });
  }

  private async getNewsDataQueryStatuses() {
    if (!this.newsDataRepository) return [];
    const [queryGroups, logs] = await Promise.all([
      this.newsDataRepository.listActiveQueryGroups(),
      this.newsDataRepository.listIngestionLogs(80)
    ]);
    return queryGroups.map((queryGroup) => {
      const latestLog = logs.find((log) => log.queryGroupId === queryGroup.id) ?? null;
      return {
        queryGroup,
        latestLog: isStaleResetFailureLog(queryGroup as NewsDataQueryGroup, latestLog as NewsDataIngestionLog | null) ? null : latestLog
      };
    });
  }

  private emptyThemeIntelligence(): NewsThemeIntelligence {
    return {
      topThemesThisWeek: [],
      emergingThemes: [],
      persistentThemes: [],
      structuralThemes: [],
      reviewQueue: []
    };
  }

  private themeSummaryFromCoverage(metadata: Record<string, unknown> | undefined): NewsThemeSummary[] {
    const value = metadata?.themeSummaries;
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.normalizeThemeSummary(item))
      .filter((item): item is NewsThemeSummary => Boolean(item))
      .slice(0, 12);
  }

  private themeIntelligenceFromCoverage(metadata: Record<string, unknown> | undefined): NewsThemeIntelligence | null {
    const topThemesThisWeek = this.themeSummaryFromCoverage(metadata).slice(0, 8);
    if (topThemesThisWeek.length === 0) return null;
    const reviewQueueValue = metadata?.themeReviewQueue;
    const reviewQueue = Array.isArray(reviewQueueValue)
      ? reviewQueueValue.map((item) => this.normalizeReviewItem(item)).filter((item): item is NewsThemeReviewItem => Boolean(item)).slice(0, 12)
      : [];
    return {
      topThemesThisWeek,
      emergingThemes: topThemesThisWeek.filter((item) => item.trend === "Rising" && (item.weeksWithData ?? 0) >= 4).slice(0, 5),
      persistentThemes: topThemesThisWeek.filter((item) => (item.rolling4WeekFrequency ?? 0) >= 2 && item.averagePersistence >= 45).slice(0, 5),
      structuralThemes: topThemesThisWeek.filter((item) => item.structuralCount > 0 || item.averagePersistence >= 65).slice(0, 5),
      reviewQueue
    };
  }

  private normalizeThemeSummary(item: unknown): NewsThemeSummary | null {
    if (typeof item !== "object" || item === null) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.theme !== "string" || typeof row.count !== "number") return null;
    return {
      theme: row.theme as NewsCanonicalTheme,
      categories: Array.isArray(row.categories) ? row.categories.filter((entry): entry is NewsThemeCategory => typeof entry === "string") : undefined,
      count: row.count,
      newsItemCount: typeof row.newsItemCount === "number" ? row.newsItemCount : undefined,
      macroSignalCount: typeof row.macroSignalCount === "number" ? row.macroSignalCount : undefined,
      sources: Array.isArray(row.sources) ? row.sources.filter((entry): entry is string => typeof entry === "string") : undefined,
      impactScore: typeof row.impactScore === "number" ? row.impactScore : undefined,
      averageConfidence: typeof row.averageConfidence === "number" ? row.averageConfidence : 0,
      averageSeverity: typeof row.averageSeverity === "number" ? row.averageSeverity : 0,
      averagePersistence: typeof row.averagePersistence === "number" ? row.averagePersistence : 0,
      rolling4WeekFrequency: typeof row.rolling4WeekFrequency === "number" ? row.rolling4WeekFrequency : undefined,
      weeksWithData: typeof row.weeksWithData === "number" ? row.weeksWithData : undefined,
      trend: typeof row.trend === "string" ? row.trend as NewsThemeTrend : undefined,
      structuralCount: typeof row.structuralCount === "number" ? row.structuralCount : 0,
      topHeadlines: Array.isArray(row.topHeadlines) ? row.topHeadlines.filter((entry): entry is string => typeof entry === "string") : [],
      topMacroSignals: Array.isArray(row.topMacroSignals) ? row.topMacroSignals.filter((entry): entry is string => typeof entry === "string") : undefined
    };
  }

  private normalizeReviewItem(item: unknown): NewsThemeReviewItem | null {
    if (typeof item !== "object" || item === null) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.newsItemId !== "string" || typeof row.title !== "string" || typeof row.reason !== "string") return null;
    return {
      newsItemId: row.newsItemId,
      title: row.title,
      publishedAt: typeof row.publishedAt === "string" ? row.publishedAt : null,
      primaryTheme: typeof row.primaryTheme === "string" ? row.primaryTheme as NewsCanonicalTheme : null,
      secondaryThemes: Array.isArray(row.secondaryThemes) ? row.secondaryThemes.filter((entry): entry is NewsCanonicalTheme => typeof entry === "string") : [],
      themeConfidence: typeof row.themeConfidence === "number" ? row.themeConfidence : 0,
      reason: row.reason
    };
  }
}
