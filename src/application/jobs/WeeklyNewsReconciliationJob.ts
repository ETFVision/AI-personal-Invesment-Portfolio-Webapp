import { NewsClassificationService } from "../services/news/NewsClassificationService";
import { WeeklyNewsReconciliationService } from "../services/news/WeeklyNewsReconciliationService";
import { endOfUtcWeek, startOfUtcWeek } from "../services/news/newsText";

export class WeeklyNewsReconciliationJob {
  constructor(
    private readonly reconciliationService: WeeklyNewsReconciliationService,
    private readonly classificationService: NewsClassificationService
  ) {}

  async run(date = new Date()) {
    const periodStart = startOfUtcWeek(date);
    const periodEnd = endOfUtcWeek(date);
    await this.classificationService.reclassifyDeterministicForPeriod(periodStart, periodEnd);
    return this.reconciliationService.reconcileWeek(periodStart, periodEnd);
  }
}
