import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsFilters } from "@/application/ports/repositories/NewsRepository";
import type { NewsThemeSummary } from "@/domain/news/types";

export class NewsDashboardService {
  constructor(private readonly repository: NewsRepository) {}

  async getDashboard(filters?: NewsFilters) {
    const [latestNews, weeklyReconciliations, ingestionLogs, latestWeeklyReconciliation] = await Promise.all([
      this.repository.listNewsWithClassifications({ ...filters, limit: filters?.limit ?? 50 }),
      this.repository.listWeeklyReconciliations(8),
      this.repository.listIngestionLogs(10),
      this.repository.getLatestWeeklyReconciliation()
    ]);

    return {
      latestNews,
      weeklyReconciliations,
      ingestionLogs,
      latestWeeklyReconciliation,
      themeSummary: this.themeSummaryFromCoverage(latestWeeklyReconciliation?.coverageMetadata)
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
