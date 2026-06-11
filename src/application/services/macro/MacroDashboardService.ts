import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";

export class MacroDashboardService {
  constructor(private readonly repository: MacroIndicatorRepository) {}

  getDashboardSummary() {
    return this.repository.getDashboardSummary();
  }

  getDashboard() {
    return this.repository.getDashboard();
  }
}
