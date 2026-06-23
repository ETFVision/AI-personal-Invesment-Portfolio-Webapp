import type { EtfExposureRepository } from "@/application/ports/repositories/EtfExposureRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { Instrument } from "@/domain/universe/types";
import { EtfExposureProviderService } from "./EtfExposureProviderService";
import { EtfLookthroughService } from "./EtfLookthroughService";

export type EtfLookthroughRefreshOptions = {
  enabled: boolean;
  refreshFrequencyDays: number;
  maxEtfsPerRun: number;
  autoSizeMaxEtfsPerRun?: boolean;
  staleAfterDays: number;
  fetchConcurrency: number;
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
    const instruments = (await this.universeRepository.listInstruments({ isActive: true }))
      .filter((instrument) => instrument.assetClass === "etf" && instrument.symbol)
      .filter((instrument) => !["Bonds / Fixed Income", "Commodities / Gold", "Crypto", "Cash / Money Market"].includes(instrument.canonicalSector ?? ""))
      .filter((instrument) => requestedSymbols.size === 0 || requestedSymbols.has(instrument.symbol?.toUpperCase() ?? ""));
    const staleCutoff = daysAgo(input.force ? 0 : this.options.staleAfterDays);
    const latestDates = await this.repository.getLatestEtfExposureDates(instruments.map((instrument) => instrument.id));
    const eligible: { instrument: (typeof instruments)[0]; latest: string | null; holdingsLatest: string | null }[] = [];
    for (const instrument of instruments) {
      const dates = latestDates.get(instrument.id);
      const latest = dates?.latestExposureDate ?? null;
      if (input.force || !latest || latest < staleCutoff) {
        const holdingsLatest = dates?.latestHoldingsDate ?? null;
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
    const maxEtfsForRun = this.options.autoSizeMaxEtfsPerRun ? eligible.length : this.options.maxEtfsPerRun;
    const selected = eligible.slice(0, maxEtfsForRun).map(({ instrument }) => instrument);

    let etfsRefreshed = 0;
    let sectorRows = 0;
    let countryRows = 0;
    let topHoldingRows = 0;
    const errors: string[] = [];
    const concurrency = Math.max(1, this.options.fetchConcurrency);

    for (let index = 0; index < selected.length; index += concurrency) {
      const results = await Promise.all(selected.slice(index, index + concurrency).map((instrument) => this.refreshEtf(instrument)));
      for (const result of results) {
        etfsRefreshed += result.etfsRefreshed;
        sectorRows += result.sectorRows;
        countryRows += result.countryRows;
        topHoldingRows += result.topHoldingRows;
        if (result.error) errors.push(result.error);
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

  private async refreshEtf(instrument: Instrument): Promise<{ etfsRefreshed: 0 | 1; sectorRows: number; countryRows: number; topHoldingRows: number; error: string | null }> {
    try {
      const snapshot = await this.providerService.getEtfExposure(instrument.symbol ?? "");
      const normalized = this.lookthroughService.fromProviderSnapshot(instrument, snapshot, this.providerService.providerName);
      await Promise.all([
        this.repository.upsertSectorExposures(normalized.sectorExposures),
        this.repository.upsertCountryExposures(normalized.countryExposures),
        this.repository.upsertTopHoldings(normalized.topHoldings),
        this.repository.upsertThemeExposures(normalized.themeExposures)
      ]);
      return {
        etfsRefreshed: 1,
        sectorRows: normalized.sectorExposures.length,
        countryRows: normalized.countryExposures.length,
        topHoldingRows: normalized.topHoldings.length,
        error: null
      };
    } catch (error) {
      return {
        etfsRefreshed: 0,
        sectorRows: 0,
        countryRows: 0,
        topHoldingRows: 0,
        error: `${instrument.symbol}: ${error instanceof Error ? error.message : "ETF look-through refresh failed."}`
      };
    }
  }
}
