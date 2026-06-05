import { createContainer } from "@/server/container";
import { refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
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
    .sort((a, b) => {
      const tierOrder = `${a.watchlistTierLabel ?? ""}-${a.rank}`.localeCompare(`${b.watchlistTierLabel ?? ""}-${b.rank}`);
      if (tierOrder !== 0) return tierOrder;
      const aReturn = a.dailyReturn ?? Number.NEGATIVE_INFINITY;
      const bReturn = b.dailyReturn ?? Number.NEGATIVE_INFINITY;
      if (bReturn !== aReturn) return bReturn - aReturn;
      return (a.instrument.symbol ?? "").localeCompare(b.instrument.symbol ?? "");
    });
}

function assetClassGroupKey(row: InstrumentMarketView) {
  if (["bond_etf", "gold_etf", "cash_proxy"].includes(row.instrument.assetClass)) return "bond_gold_cash";
  return row.instrument.assetClass;
}

function assetClassTitle(key: string) {
  const titles: Record<string, string> = {
    etf: "Equity ETFs",
    bond_gold_cash: "Bond / gold / cash ETFs",
    crypto: "Crypto",
    benchmark: "Benchmarks",
    stock: "Stocks",
    other: "Other instruments"
  };
  return titles[key] ?? key.replaceAll("_", " ");
}

function assetClassOrder(key: string) {
  const order: Record<string, number> = {
    stock: 1,
    etf: 2,
    bond_gold_cash: 3,
    crypto: 4,
    benchmark: 5,
    other: 6
  };
  return order[key] ?? 99;
}

function groupByAssetClass(rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>) {
  return rows.reduce<Record<string, Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>>>((groups, row) => {
    const key = assetClassGroupKey(row);
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
}

function groupStocksBySector(rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>) {
  return rows.reduce<Record<string, Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>>>((groups, row) => {
    const key = row.instrument.canonicalSector ?? row.instrument.sector ?? "Unclassified";
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
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
  const [marketRows, fundamentalsRows] = await Promise.all([
    container.instrumentMarketService.buildInstrumentMarketViews(selectedInstruments, { lookbackYears: 1 }),
    container.fundamentalsRepository.listSummaryRows()
  ]);
  const fundamentalsByInstrumentId = new Map(fundamentalsRows.map((row) => [row.instrument.id, row]));
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
  const groupedRows = groupByAssetClass(rows);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Instruments"
        title="Watchlist directory"
        description="Curated watchlist instruments with tiers, thesis context, market metrics and canonical instrument drilldowns."
        meta={
          <>
            <StatusBadge tone="info">{rows.length} active items</StatusBadge>
            <StatusBadge tone="neutral">{Object.keys(groupedRows).length} groups</StatusBadge>
          </>
        }
        actions={
        <form action={refreshAllDataAction}>
          <input type="hidden" name="returnTo" value="/instruments/watchlist" />
          <SubmitButton pendingLabel="Refreshing data...">Refresh data</SubmitButton>
        </form>
        }
      />

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

      <div className="space-y-6">
        {Object.entries(groupedRows)
          .sort(([a], [b]) => assetClassOrder(a) - assetClassOrder(b) || a.localeCompare(b))
          .map(([groupKey, groupRows]) => {
            if (groupKey === "stock") {
              const sectorGroups = groupStocksBySector(groupRows);
              return (
                <Card key={groupKey}>
                  <CardHeader>
                    <CardTitle>{assetClassTitle(groupKey)}</CardTitle>
                    <CardDescription>{groupRows.length} watchlist stocks grouped by sector. Open a symbol for full context.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(sectorGroups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([sector, sectorRows]) => (
                        <div key={sector} className="space-y-3">
                          <SectionHeader title={sector} description={`${sectorRows.length} instruments`} />
                          <InstrumentDirectoryTable rows={sortRows(sectorRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} emptyMessage="No watchlist instruments matched your filters." />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={groupKey}>
                <CardHeader>
                  <CardTitle>{assetClassTitle(groupKey)}</CardTitle>
                  <CardDescription>{groupRows.length} watchlist instruments. Open a symbol for full context.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InstrumentDirectoryTable rows={sortRows(groupRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} emptyMessage="No watchlist instruments matched your filters." />
                </CardContent>
              </Card>
            );
          })}
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">No watchlist instruments matched your filters.</CardContent>
          </Card>
        ) : null}
      </div>
    </PageContainer>
  );
}
