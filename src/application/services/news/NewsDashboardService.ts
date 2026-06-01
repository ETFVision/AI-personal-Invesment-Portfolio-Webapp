import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsFilters } from "@/application/ports/repositories/NewsRepository";
import type { NewsThemeIntelligence, NewsThemeSummary } from "@/domain/news/types";
import type { ThemeIntelligenceService } from "./ThemeIntelligenceService";

export class NewsDashboardService {
  constructor(
    private readonly repository: NewsRepository,
    private readonly themeIntelligenceService: ThemeIntelligenceService
  ) {}

  async getDashboard(filters?: NewsFilters) {
    const [latestNews, weeklyReconciliations, ingestionLogs, latestWeeklyReconciliation] = await Promise.all([
      this.repository.listNewsWithClassifications({ ...filters, limit: filters?.limit ?? 50 }),
      this.repository.listWeeklyReconciliations(8),
      this.repository.listIngestionLogs(10),
      this.repository.getLatestWeeklyReconciliation()
    ]);
    const periodStart = latestWeeklyReconciliation?.periodStart;
    const periodEnd = latestWeeklyReconciliation?.periodEnd;
    const themeIntelligence = periodStart && periodEnd
      ? await this.themeIntelligenceService.getThemeIntelligence(periodStart, periodEnd)
      : this.emptyThemeIntelligence();

    return {
      latestNews,
      weeklyReconciliations,
      ingestionLogs,
      latestWeeklyReconciliation,
      themeSummary: themeIntelligence.topThemesThisWeek.length
        ? themeIntelligence.topThemesThisWeek
        : this.themeSummaryFromCoverage(latestWeeklyReconciliation?.coverageMetadata),
      themeIntelligence
    };
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
