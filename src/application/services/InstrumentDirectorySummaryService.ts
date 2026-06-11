import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import type { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import type { InstrumentMarketService } from "@/application/services/InstrumentMarketService";
import type { InstrumentDirectorySummaryRow, InstrumentDirectoryWatchlistItem } from "@/domain/instruments/directorySummary";
import type { Instrument } from "@/domain/universe/types";

export class InstrumentDirectorySummaryService {
  constructor(
    private readonly universeRepository: UniverseRepository,
    private readonly fundamentalsRepository: FundamentalsRepository,
    private readonly instrumentMarketService: InstrumentMarketService
  ) {}

  listSummaries() {
    return this.universeRepository.listInstrumentDirectorySummaries();
  }

  async refreshSummaries() {
    const instruments = await this.universeRepository.listDirectoryInstruments({ isActive: undefined });
    const [marketViews, fundamentalsRows, watchlists, watchlistItems] = await Promise.all([
      this.instrumentMarketService.buildInstrumentDirectoryMarketViews(instruments),
      this.fundamentalsRepository.listSummaryRowsForInstruments(instruments),
      this.universeRepository.listWatchlists(),
      this.universeRepository.listWatchlistItems()
    ]);
    const marketViewByInstrumentId = new Map(marketViews.map((row) => [row.instrument.id, row]));
    const fundamentalsByInstrumentId = new Map(fundamentalsRows.map((row) => [row.instrument.id, row]));
    const watchlistById = new Map(watchlists.map((watchlist) => [watchlist.id, watchlist]));
    const watchlistItemsByInstrumentId = new Map<string, InstrumentDirectoryWatchlistItem[]>();

    for (const item of watchlistItems) {
      const watchlist = watchlistById.get(item.watchlistId);
      const rows = watchlistItemsByInstrumentId.get(item.instrumentId) ?? [];
      rows.push({
        watchlistId: item.watchlistId,
        watchlistName: watchlist?.name ?? null,
        watchlistTier: item.watchlistTier,
        itemRank: item.itemRank,
        rationale: item.rationale,
        isActive: item.isActive
      });
      watchlistItemsByInstrumentId.set(item.instrumentId, rows);
    }

    const sourceUpdatedAt = new Date().toISOString();
    const rows = instruments
      .map((instrument): InstrumentDirectorySummaryRow | null => {
        const marketView = marketViewByInstrumentId.get(instrument.id);
        if (!marketView) return null;
        return {
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          name: instrument.name,
          assetClass: instrument.assetClass,
          assetCategory: instrument.assetCategory ?? null,
          instrumentType: instrument.instrumentType,
          stockSector: stockSector(instrument),
          etfCategory: instrument.etfCategory ?? null,
          isActive: instrument.isActive,
          latestPriceDate: marketView.latestPriceDate,
          dailyReturn: marketView.dailyReturn,
          marketView,
          fundamentalsSummary: fundamentalsByInstrumentId.get(instrument.id) ?? null,
          watchlistItems: watchlistItemsByInstrumentId.get(instrument.id) ?? [],
          calculationVersion: "instrument-directory-summary-v1",
          status: "fresh",
          sourceUpdatedAt,
          updatedAt: null
        };
      })
      .filter((row): row is InstrumentDirectorySummaryRow => Boolean(row));

    await this.universeRepository.upsertInstrumentDirectorySummaries(rows);

    return {
      status: "success",
      message: `Instrument directory summary refreshed for ${rows.length} instruments.`,
      updatedCount: rows.length,
      activeCount: rows.filter((row) => row.isActive).length,
      watchlistCount: rows.filter((row) => row.watchlistItems.some((item) => item.isActive)).length,
      latestPriceDate: latestDate(rows.map((row) => row.latestPriceDate))
    };
  }
}

function stockSector(instrument: Instrument) {
  return instrument.assetClass === "stock"
    ? instrument.canonicalSector ?? instrument.sector ?? "Unclassified"
    : instrument.canonicalSector ?? instrument.sector ?? null;
}

function latestDate(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}
