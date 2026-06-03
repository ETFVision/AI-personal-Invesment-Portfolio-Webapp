import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsFilters } from "@/application/ports/repositories/NewsRepository";
import type { GdeltRepository } from "@/application/ports/repositories/GdeltRepository";
import type { NewsDataRepository } from "@/application/ports/repositories/NewsDataRepository";
import type { NewsThemeIntelligence, NewsThemeSummary } from "@/domain/news/types";
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
    const [latestNews, stats, weeklyReconciliations, ingestionLogs, latestWeeklyReconciliation, gdeltQueryStatuses, newsDataQueryStatuses] = await Promise.all([
      this.repository.listNewsWithClassifications({ ...filters, limit: filters?.limit ?? 50 }),
      this.repository.getDashboardStats(),
      this.repository.listWeeklyReconciliations(8),
      this.repository.listIngestionLogs(10),
      this.repository.getLatestWeeklyReconciliation(),
      this.getGdeltQueryStatuses(),
      this.getNewsDataQueryStatuses()
    ]);
    const periodStart = latestWeeklyReconciliation?.periodStart;
    const periodEnd = latestWeeklyReconciliation?.periodEnd;
    const themeIntelligence = periodStart && periodEnd
      ? await this.themeIntelligenceService.getThemeIntelligence(periodStart, periodEnd)
      : this.emptyThemeIntelligence();

    return {
      latestNews,
      stats,
      weeklyReconciliations,
      ingestionLogs,
      gdeltQueryStatuses,
      newsDataQueryStatuses,
      latestWeeklyReconciliation,
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
      .filter((item): item is NewsThemeSummary => {
        if (typeof item !== "object" || item === null) return false;
        const row = item as Record<string, unknown>;
        return typeof row.theme === "string" && typeof row.count === "number";
      })
      .slice(0, 12);
  }
}
