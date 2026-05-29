import { createContainer } from "@/server/container";
import { addWatchlistItemAction, removeWatchlistItemAction } from "@/server/actions/universeActions";
import { refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { InstrumentMarketTable } from "@/components/universe/instrument-market-table";
import { InstrumentMarketView } from "@/domain/universe/types";

type WatchlistsPageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
  }>;
};

function rankAndSort(rows: InstrumentMarketView[]) {
  return rows
    .slice()
    .sort((a, b) => {
      const aReturn = a.dailyReturn ?? Number.NEGATIVE_INFINITY;
      const bReturn = b.dailyReturn ?? Number.NEGATIVE_INFINITY;
      if (aReturn === bReturn) return a.instrument.symbol?.localeCompare(b.instrument.symbol ?? "") ?? 0;
      return bReturn - aReturn;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export default async function WatchlistsPage({ searchParams }: WatchlistsPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const [watchlists, items, instruments] = await Promise.all([
    container.watchlistService.listWatchlists(),
    container.watchlistService.listWatchlistItems(),
    container.instrumentService.listInstruments({
      query: q || undefined,
      isActive: true
    })
  ]);

  const marketViews = await container.instrumentMarketService.buildInstrumentMarketViews(instruments);
  const marketByInstrumentId = new Map(marketViews.map((view) => [view.instrument.id, view]));
  const instrumentOptions = instruments.filter((instrument) => Boolean(instrument.symbol));
  const itemsByWatchlist = new Map<string, typeof items>();
  for (const item of items) {
    const current = itemsByWatchlist.get(item.watchlistId) ?? [];
    current.push(item);
    itemsByWatchlist.set(item.watchlistId, current);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Curated tiers</p>
          <h1 className="text-2xl font-semibold">Watchlist Management</h1>
        </div>
        <form action={refreshAllDataAction}>
          <input type="hidden" name="returnTo" value="/watchlists" />
          <SubmitButton variant="secondary" pendingLabel="Refreshing data...">Refresh data</SubmitButton>
        </form>
      </div>

      {params?.message || params?.refreshMessage ? (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            {params.message ? <div className="text-muted-foreground">{params.message}</div> : null}
            {params.refreshMessage ? (
              <div className={params.refreshError ? "text-destructive" : "text-muted-foreground"}>
                {params.refreshError ?? params.refreshMessage}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add instrument to watchlist</CardTitle>
          <CardDescription>Moves only after a human confirms the watchlist tier and item rank.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addWatchlistItemAction} className="grid gap-3 md:grid-cols-4">
            <select name="watchlistId" className="h-10 rounded-md border bg-background px-3 text-sm">
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              ))}
            </select>
            <select name="instrumentId" className="h-10 rounded-md border bg-background px-3 text-sm">
              {instrumentOptions.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.symbol ?? "-"} {instrument.name}
                </option>
              ))}
            </select>
            <Input name="itemRank" type="number" min="1" placeholder="Rank" />
            <Input name="rationale" placeholder="Rationale (optional)" />
            <div className="md:col-span-4">
              <Button type="submit">Add to watchlist</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter available instruments</CardTitle>
          <CardDescription>Search the active instrument universe without changing the curated seed list.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex gap-2">
            <Input name="q" placeholder="Search symbols or names" defaultValue={q} />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        {watchlists.map((watchlist) => {
          const watchlistItems = itemsByWatchlist.get(watchlist.id) ?? [];
          const rows = rankAndSort(
            watchlistItems
              .map((item) => {
                const marketView = marketByInstrumentId.get(item.instrumentId);
                if (!marketView) return null;
                return {
                  ...marketView,
                  detailFields: [
                    ...marketView.detailFields,
                    { label: "Watchlist", value: watchlist.name },
                    { label: "Watchlist rank", value: item.itemRank == null ? "-" : String(item.itemRank) },
                    { label: "Approval", value: item.approvalStatus },
                    { label: "Rationale", value: item.rationale ?? "-" }
                  ]
                };
              })
              .filter((row): row is InstrumentMarketView => Boolean(row))
          );

          return (
            <Card key={watchlist.id}>
              <CardHeader>
                <CardTitle>{watchlist.name}</CardTitle>
                <CardDescription>{watchlist.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <InstrumentMarketTable rows={rows} emptyMessage="No items assigned yet." />
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
