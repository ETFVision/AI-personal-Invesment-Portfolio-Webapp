import type { MacroIndicatorRepository } from "@/application/ports/repositories/MacroIndicatorRepository";
import type { MacroIndicatorDefinition, MacroTrend } from "@/domain/macro/types";
import { FredThemeSignalService } from "./FredThemeSignalService";

export class MacroThemeSignalService {
  constructor(
    private readonly repository: MacroIndicatorRepository,
    private readonly fredSignalService = new FredThemeSignalService()
  ) {}

  async refreshFromFredTrends(indicators: MacroIndicatorDefinition[], trends: MacroTrend[]) {
    const signals = this.fredSignalService.generate(indicators, trends);
    await this.repository.upsertMacroThemeSignals(signals);
    return { generated: signals.length };
  }

  listSignalsForPeriod(periodStart: string, periodEnd: string) {
    return this.repository.listMacroThemeSignalsForPeriod(periodStart, periodEnd);
  }
}
