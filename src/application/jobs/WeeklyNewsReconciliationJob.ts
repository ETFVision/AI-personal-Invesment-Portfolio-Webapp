import { WeeklyNewsReconciliationService } from "@/application/services/news/WeeklyNewsReconciliationService";

export class WeeklyNewsReconciliationJob {
  constructor(private readonly reconciliationService: WeeklyNewsReconciliationService) {}

  run() {
    return this.reconciliationService.reconcileWeek();
  }
}
