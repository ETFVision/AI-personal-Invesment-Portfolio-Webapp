import { createContainer } from "@/server/container";
import { refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { InstrumentDirectoryTable } from "@/components/instruments/instrument-directory-table";
import type { InstrumentMarketView, WatchlistTier } from "@/domain/universe/types";

type WatchlistPageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
    tier?: WatchlistTier | "";
  }>;
};

const tierLabels: Record<WatchlistTier, string> = {
  core_quality: "Core Quality",
  tactical_thematic: "Tactical / Thematic",
  opportunistic: "Opportunistic"
};

function sortRows(rows: Array<InstrumentMarketView & { watchlistTierLabel?: string }>) {
  return rows
    .slice()
    .sort((a, b) => `${a.watchlistTierLabel ?? ""}-${a.rank}`.localeCompare(`${b.watchlistTierLabel ?? ""}-${b.rank}`));
}

export default async function InstrumentWatchlistPage({ searchParams }: WatchlistPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const tier = params?.tier ?? "";
  const [watchlists, watchlistItems, instruments] = await Promise.all([
    container.watchlistService.listWatchlists(),
    container.watchlistService.listWatchlistItems(),
    container.instrumentService.listInstruments({ query: q || undefined, isActive: true })
  ]);

  const activeItems = watchlistItems.filter((item) => item.isActive && (!tier || item.watchlistTier === tier));
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const watchlistById = new Map(watchlists.map((watchlist) => [watchlist.id, watchlist]));
  const selectedInstruments = activeItems
    .map((item) => instrumentById.get(item.instrumentId))
    .filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument));
  const marketRows = await container.instrumentMarketService.buildInstrumentMarketViews(selectedInstruments, { lookbackYears: 1 });
  const itemByInstrumentId = new Map(activeItems.map((item) => [item.instrumentId, item]));
  const rows = marketRows.map((row) => {
    const item = itemByInstrumentId.get(row.instrument.id);
    const listName = item ? watchlistById.get(item.watchlistId)?.name : null;
    return {
      ...row,
      rank: item?.itemRank ?? row.rank,
      watchlistTierLabel: item ? tierLabels[item.watchlistTier] : listName ?? undefined,
      thesis: item?.rationale ?? null
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Instruments</p>
          <h1 className="text-2xl font-semibold">Watchlist directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Curated watchlist instruments. Open a symbol for the canonical instrument detail page.</p>
        </div>
        <form action={refreshAllDataAction}>
          <input type="hidden" name="returnTo" value="/instruments/watchlist" />
          <SubmitButton pendingLabel="Refreshing data...">Refresh data</SubmitButton>
        </form>
      </div>

      {params?.message || params?.refreshMessage ? (
        <Card>
          <CardContent className={`p-4 text-sm ${params.refreshError ? "text-destructive" : "text-muted-foreground"}`}>
            {params.refreshError ?? params.refreshMessage ?? params.message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <CardDescription>Watchlist is a summary directory; instrument-level tabs live on `/instruments/[symbol]`.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <Input name="q" placeholder="Search symbol or name" defaultValue={q} />
            <select name="tier" defaultValue={tier} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All tiers</option>
              <option value="core_quality">Core Quality</option>
              <option value="tactical_thematic">Tactical / Thematic</option>
              <option value="opportunistic">Opportunistic</option>
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist instruments</CardTitle>
          <CardDescription>{rows.length} active watchlist instruments. Details are intentionally centralized at the instrument page.</CardDescription>
        </CardHeader>
        <CardContent>
          <InstrumentDirectoryTable rows={sortRows(rows)} emptyMessage="No watchlist instruments matched your filters." />
        </CardContent>
      </Card>
    </div>
  );
}
