import type { NewsRepository } from "@/application/ports/repositories/NewsRepository";
import type { NewsFilters } from "@/application/ports/repositories/NewsRepository";

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
      latestWeeklyReconciliation
    };
  }
}
