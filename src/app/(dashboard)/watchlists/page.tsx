import { createContainer } from "@/server/container";
import { addWatchlistItemAction, removeWatchlistItemAction } from "@/server/actions/universeActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WatchlistsPageProps = {
  searchParams?: Promise<{
    message?: string;
    q?: string;
  }>;
};

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
      </div>

      {params?.message ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{params.message}</CardContent>
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
          return (
            <Card key={watchlist.id}>
              <CardHeader>
                <CardTitle>{watchlist.name}</CardTitle>
                <CardDescription>{watchlist.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {watchlistItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {watchlistItems.map((item) => (
                      <div key={item.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              {item.symbol ?? "-"} {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Rank {item.itemRank ?? "-"} • {item.approvalStatus}
                            </div>
                          </div>
                          <form action={removeWatchlistItemAction}>
                            <input type="hidden" name="watchlistId" value={watchlist.id} />
                            <input type="hidden" name="instrumentId" value={item.instrumentId} />
                            <Button type="submit" size="sm" variant="outline">
                              Remove
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
