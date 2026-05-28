import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";

export class WatchlistService {
  constructor(private readonly repository: UniverseRepository) {}

  listWatchlists() {
    return this.repository.listWatchlists();
  }

  listWatchlistItems(watchlistIds?: string[]) {
    return this.repository.listWatchlistItems(watchlistIds);
  }

  addInstrumentToWatchlist(input: {
    watchlistId: string;
    instrumentId: string;
    itemRank?: number | null;
    rationale?: string | null;
  }) {
    return this.repository.upsertWatchlistItems([
      {
        watchlistId: input.watchlistId,
        instrumentId: input.instrumentId,
        itemRank: input.itemRank ?? null,
        rationale: input.rationale ?? null,
        approvalStatus: "approved",
        isActive: true
      }
    ]);
  }

  removeInstrumentFromWatchlist(input: { watchlistId: string; instrumentId: string }) {
    return this.repository.upsertWatchlistItems([
      {
        watchlistId: input.watchlistId,
        instrumentId: input.instrumentId,
        itemRank: null,
        rationale: null,
        approvalStatus: "removed",
        isActive: false
      }
    ]);
  }
}
