import type { EtfExposureRepository } from "@/application/ports/repositories/EtfExposureRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { EtfExposureProviderService } from "./EtfExposureProviderService";
import { EtfLookthroughService } from "./EtfLookthroughService";

export type EtfLookthroughRefreshOptions = {
  enabled: boolean;
  refreshFrequencyDays: number;
  maxEtfsPerRun: number;
  staleAfterDays: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export class EtfLookthroughRefreshService {
  constructor(
    private readonly repository: EtfExposureRepository,
    private readonly universeRepository: UniverseRepository,
    private readonly providerService: EtfExposureProviderService,
    private readonly lookthroughService: EtfLookthroughService,
    private readonly options: EtfLookthroughRefreshOptions
  ) {}

  async refresh(input: { force?: boolean; symbols?: string[] } = {}) {
    const startedAt = new Date().toISOString();
    if (!this.options.enabled && !input.force) {
      return { status: "failed" as const, etfsRequested: 0, etfsRefreshed: 0, sectorRows: 0, countryRows: 0, topHoldingRows: 0, message: "ETF look-through refresh is disabled." };
    }
    const requestedSymbols = new Set((input.symbols ?? []).map((symbol) => symbol.toUpperCase()));
    const instruments = (await this.universeRepository.listInstruments({ isActive: true, limit: 1000 }))
      .filter((instrument) => instrument.assetClass === "etf" && instrument.symbol)
      .filter((instrument) => !["Bonds / Fixed Income", "Commodities / Gold", "Crypto", "Cash / Money Market"].includes(instrument.canonicalSector ?? ""))
      .filter((instrument) => requestedSymbols.size === 0 || requestedSymbols.has(instrument.symbol?.toUpperCase() ?? ""));
    const staleCutoff = daysAgo(input.force ? 0 : this.options.staleAfterDays);
    const eligible: { instrument: (typeof instruments)[0]; latest: string | null; holdingsLatest: string | null }[] = [];
    for (const instrument of instruments) {
      const latest = await this.repository.getLatestExposureDateForEtf(instrument.id);
      if (input.force || !latest || latest < staleCutoff) {
        const holdingsLatest = await this.repository.getLatestHoldingsDateForEtf(instrument.id);
        eligible.push({ instrument, latest, holdingsLatest });
      }
    }
    // Sort by holdings date so ETFs missing holdings are always prioritised first,
    // allowing correct progression across multiple 50-batch passes.
    eligible.sort((a, b) => {
      if (!a.holdingsLatest && !b.holdingsLatest) return 0;
      if (!a.holdingsLatest) return -1;
      if (!b.holdingsLatest) return 1;
      return a.holdingsLatest < b.holdingsLatest ? -1 : 1;
    });
    const selected = eligible.slice(0, this.options.maxEtfsPerRun).map(({ instrument }) => instrument);

    let etfsRefreshed = 0;
    let sectorRows = 0;
    let countryRows = 0;
    let topHoldingRows = 0;
    const errors: string[] = [];

    for (const instrument of selected) {
      try {
        const snapshot = await this.providerService.getEtfExposure(instrument.symbol ?? "");
        const normalized = this.lookthroughService.fromProviderSnapshot(instrument, snapshot, this.providerService.providerName);
        await this.repository.upsertSectorExposures(normalized.sectorExposures);
        await this.repository.upsertCountryExposures(normalized.countryExposures);
        await this.repository.upsertTopHoldings(normalized.topHoldings);
        await this.repository.upsertThemeExposures(normalized.themeExposures);
        etfsRefreshed += 1;
        sectorRows += normalized.sectorExposures.length;
        countryRows += normalized.countryExposures.length;
        topHoldingRows += normalized.topHoldings.length;
      } catch (error) {
        errors.push(`${instrument.symbol}: ${error instanceof Error ? error.message : "ETF look-through refresh failed."}`);
      }
    }

    const status = errors.length === 0 ? "success" : etfsRefreshed > 0 ? "partial_success" : "failed";
    await this.repository.insertRefreshLog({
      jobName: "etf-lookthrough-refresh",
      startedAt,
      completedAt: new Date().toISOString(),
      status,
      etfsRequested: selected.length,
      etfsRefreshed,
      sectorRows,
      countryRows,
      topHoldingRows,
      errorMessage: errors.join(" | ") || null,
      metadata: { asOfDate: today(), requestedSymbols: Array.from(requestedSymbols), staleCutoff }
    });
    return { status, etfsRequested: selected.length, etfsRefreshed, sectorRows, countryRows, topHoldingRows, message: errors.join(" | ") || null };
  }
}
