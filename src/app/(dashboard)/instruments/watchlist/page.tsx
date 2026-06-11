import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { InstrumentDirectoryTable } from "@/components/instruments/instrument-directory-table";
import type { InstrumentMarketView, WatchlistTier } from "@/domain/universe/types";
import { ASSET_CATEGORY_LABELS, ETF_CATEGORY_LABELS } from "@/domain/universe/alphaUniverse";

type WatchlistPageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
    asset?: string;
    type?: string;
    sector?: string;
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
  return row.instrument.assetCategory ?? "UNKNOWN";
}

function instrumentBucket(row: InstrumentMarketView) {
  const instrument = row.instrument;
  if (instrument.assetClass === "benchmark" || instrument.benchmarkTags.length > 0) return "benchmark";
  if (instrument.assetClass === "stock") return "stock";
  if (instrument.assetClass === "crypto" && instrument.instrumentType !== "crypto_etf") return "crypto";
  if (instrument.instrumentType.includes("etf") || instrument.assetClass.endsWith("_etf") || instrument.assetClass === "etf") return "etf";
  return "other";
}

function assetClassTitle(key: string) {
  return ASSET_CATEGORY_LABELS[key as keyof typeof ASSET_CATEGORY_LABELS] ?? key.replaceAll("_", " ");
}

function assetClassOrder(key: string) {
  const order: Record<string, number> = {
    EQUITY: 1,
    BOND: 2,
    COMMODITY: 3,
    REAL_ESTATE: 4,
    CASH: 5,
    CRYPTO: 6,
    MULTI_ASSET: 7,
    UNKNOWN: 8
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

function groupEtfsByProductCategory(rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>) {
  return rows.reduce<Record<string, Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>>>((groups, row) => {
    const key = row.instrument.etfCategory ?? (row.instrument.instrumentType === "crypto_etf" ? "CRYPTO_ETF" : "UNCATEGORIZED_ETF");
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
}

function productCategoryTitle(key: string) {
  if (key === "CRYPTO_ETF") return "Crypto ETFs";
  if (key === "UNCATEGORIZED_ETF") return "Uncategorized ETFs";
  return ETF_CATEGORY_LABELS[key as keyof typeof ETF_CATEGORY_LABELS] ?? key.replaceAll("_", " ").toLowerCase();
}

function sectorFilterValue(row: InstrumentMarketView) {
  if (row.instrument.assetClass === "stock") return row.instrument.canonicalSector ?? row.instrument.sector ?? "Unclassified";
  if (instrumentBucket(row) === "etf") return row.instrument.etfCategory ?? (row.instrument.instrumentType === "crypto_etf" ? "CRYPTO_ETF" : "UNCATEGORIZED_ETF");
  return row.instrument.canonicalSector ?? row.instrument.sector ?? row.instrument.assetCategory ?? "Unclassified";
}

function sectorFilterLabel(value: string) {
  if (value === "UNCATEGORIZED_ETF") return "Uncategorized ETFs";
  return ETF_CATEGORY_LABELS[value as keyof typeof ETF_CATEGORY_LABELS] ?? value;
}

function uniqueOptions(
  rows: Array<InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }>,
  getValue: (row: InstrumentMarketView & { watchlistTierLabel?: string; thesis?: string | null }) => string | null | undefined,
  getLabel: (value: string) => string = (value) => value
) {
  const options = new Map<string, string>();
  for (const row of rows) {
    const value = getValue(row);
    if (!value) continue;
    options.set(value, getLabel(value));
  }
  return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
}

export default async function InstrumentWatchlistPage({ searchParams }: WatchlistPageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const asset = params?.asset?.trim() ?? "";
  const type = params?.type?.trim() ?? "";
  const sector = params?.sector?.trim() ?? "";
  const tier = params?.tier ?? "";
  const [watchlists, watchlistItems, instruments] = await measureRenderStep("instruments-watchlist:watchlist-base-data", () =>
    Promise.all([
      container.watchlistService.listWatchlists(),
      container.watchlistService.listWatchlistItems(),
      container.instrumentService.listInstruments({ query: q || undefined, isActive: true })
    ])
  );

  const activeItems = watchlistItems.filter((item) => item.isActive && (!tier || item.watchlistTier === tier));
  const instrumentById = new Map(instruments.map((instrument) => [instrument.id, instrument]));
  const watchlistById = new Map(watchlists.map((watchlist) => [watchlist.id, watchlist]));
  const selectedInstruments = activeItems
    .map((item) => instrumentById.get(item.instrumentId))
    .filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument));
  const [marketRows, fundamentalsRows] = await measureRenderStep("instruments-watchlist:market-and-fundamentals-data", () =>
    Promise.all([
      container.instrumentMarketService.buildInstrumentMarketViews(selectedInstruments, { lookbackYears: 1 }),
      container.fundamentalsRepository.listSummaryRows()
    ])
  );
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
  const assetOptions = uniqueOptions(rows, (row) => row.instrument.assetCategory ?? "UNKNOWN", (value) => ASSET_CATEGORY_LABELS[value as keyof typeof ASSET_CATEGORY_LABELS] ?? value);
  const rowsForSectorOptions = rows.filter((row) => (!asset || assetClassGroupKey(row) === asset) && (!type || instrumentBucket(row) === type));
  const sectorOptions = uniqueOptions(rowsForSectorOptions, sectorFilterValue, sectorFilterLabel);
  const filteredRows = rows.filter((row) => {
    if (asset && assetClassGroupKey(row) !== asset) return false;
    if (type && instrumentBucket(row) !== type) return false;
    if (sector && sectorFilterValue(row) !== sector) return false;
    return true;
  });
  const groupedRows = groupByAssetClass(filteredRows);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Instruments"
        title="Watchlist directory"
        description="Curated watchlist instruments with tiers, thesis context, market metrics and canonical instrument drilldowns."
        meta={
          <>
            <StatusBadge tone="info">{filteredRows.length} active items</StatusBadge>
            <StatusBadge tone="neutral">{Object.keys(groupedRows).length} groups</StatusBadge>
          </>
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
          <form method="get" className="grid gap-3 md:grid-cols-6">
            <Input name="q" placeholder="Search symbol or name" defaultValue={q} />
            <select name="asset" defaultValue={asset} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All assets</option>
              {assetOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select name="type" defaultValue={type} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All types</option>
              <option value="etf">ETFs</option>
              <option value="stock">Stocks</option>
              <option value="crypto">Crypto references</option>
              <option value="benchmark">Benchmarks</option>
              <option value="other">Other</option>
            </select>
            <select name="sector" defaultValue={sector} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All sectors/categories</option>
              {sectorOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
            const stockRows = groupRows.filter((row) => row.instrument.assetClass === "stock");
            const etfRows = groupRows.filter((row) => row.instrument.instrumentType.includes("etf") || row.instrument.assetClass.endsWith("_etf") || row.instrument.assetClass === "etf");
            const otherRows = groupRows.filter((row) => !stockRows.includes(row) && !etfRows.includes(row));

            if (stockRows.length > 0 && etfRows.length === 0 && otherRows.length === 0) {
              const sectorGroups = groupStocksBySector(stockRows);
              return (
                <Card key={groupKey}>
                  <CardHeader>
                    <CardTitle>{assetClassTitle(groupKey)}</CardTitle>
                    <CardDescription>{stockRows.length} watchlist stocks grouped by sector. Open a symbol for full context.</CardDescription>
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
                <CardContent className="space-y-6">
                  {etfRows.length > 0 ? (
                    <div className="space-y-4">
                      <SectionHeader title={groupKey === "EQUITY" ? "Equity ETFs" : "ETF products"} description={`${etfRows.length} ETFs grouped by ETFVision product category`} />
                      {Object.entries(groupEtfsByProductCategory(etfRows))
                        .sort(([a], [b]) => productCategoryTitle(a).localeCompare(productCategoryTitle(b)))
                        .map(([category, categoryRows]) => (
                          <div key={category} className="space-y-3 rounded-lg border border-slate-200 p-3">
                            <SectionHeader title={productCategoryTitle(category)} description={`${categoryRows.length} ETFs`} />
                            <InstrumentDirectoryTable rows={sortRows(categoryRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} emptyMessage="No watchlist instruments matched your filters." />
                          </div>
                        ))}
                    </div>
                  ) : null}
                  {stockRows.length > 0 ? (
                    <div className="space-y-4">
                      <SectionHeader title="Stocks" description={`${stockRows.length} stocks grouped by sector`} />
                      {Object.entries(groupStocksBySector(stockRows))
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([sector, sectorRows]) => (
                          <div key={sector} className="space-y-3 rounded-lg border border-slate-200 p-3">
                            <SectionHeader title={sector} description={`${sectorRows.length} stocks`} />
                            <InstrumentDirectoryTable rows={sortRows(sectorRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} emptyMessage="No watchlist instruments matched your filters." />
                          </div>
                        ))}
                    </div>
                  ) : null}
                  {otherRows.length > 0 ? (
                    <div className="space-y-3">
                      <SectionHeader title="Other instruments" description={`${otherRows.length} instruments`} />
                      <InstrumentDirectoryTable rows={sortRows(otherRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} emptyMessage="No watchlist instruments matched your filters." />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        {filteredRows.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">No watchlist instruments matched your filters.</CardContent>
          </Card>
        ) : null}
      </div>
    </PageContainer>
  );
}
