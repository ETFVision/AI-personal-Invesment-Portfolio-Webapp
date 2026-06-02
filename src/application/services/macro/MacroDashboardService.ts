import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";

export class MacroDashboardService {
  constructor(private readonly repository: MacroIndicatorRepository) {}

  getDashboard() {
    return this.repository.getDashboard();
  }
}
