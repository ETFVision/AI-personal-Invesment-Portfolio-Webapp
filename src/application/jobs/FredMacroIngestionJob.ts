import { MacroIndicatorIngestionService } from "@/application/services/macro/MacroIndicatorIngestionService";

export class FredMacroIngestionJob {
  constructor(private readonly ingestionService: MacroIndicatorIngestionService) {}

  run(input: { backfill?: boolean } = {}) {
    return this.ingestionService.ingest(input);
  }
}
