import { createContainer } from "@/server/container";
import { seedUniverseAction } from "@/server/actions/universeActions";
import { backfillUniverseHistoryAction, refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { InstrumentMarketView } from "@/domain/universe/types";
import { InstrumentMarketTable } from "@/components/universe/instrument-market-table";

type UniversePageProps = {
  searchParams?: Promise<{
    message?: string;
    metadataMessage?: string;
    metadataError?: string;
    priceMessage?: string;
    priceError?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
    assetClass?: string;
    watchlistTier?: string;
    status?: string;
  }>;
};

function groupByAssetClass(items: InstrumentMarketView[]) {
  const isCryptoProxy = (item: InstrumentMarketView) =>
    item.instrument.instrumentType === "crypto_etf" ||
    item.instrument.riskCategory === "crypto" ||
    item.instrument.assetClass === "crypto";

  return {
    equityEtfs: items.filter((item) => item.instrument.assetClass === "etf" && !isCryptoProxy(item)),
    bonds: items.filter((item) => ["bond_etf", "gold_etf", "cash_proxy"].includes(item.instrument.assetClass)),
    crypto: items.filter(isCryptoProxy),
    stocks: items.filter((item) => item.instrument.assetClass === "stock"),
    other: items.filter((item) => !["etf", "bond_etf", "gold_etf", "cash_proxy", "crypto", "stock"].includes(item.instrument.assetClass) && !isCryptoProxy(item))
  };
}

function splitCryptoRows(rows: InstrumentMarketView[]) {
  return {
    proxies: rows.filter((row) => row.instrument.instrumentType === "crypto_etf"),
    references: rows.filter((row) => row.instrument.assetClass === "crypto")
  };
}

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

function groupStocksBySector(rows: InstrumentMarketView[]) {
  const grouped = new Map<string, InstrumentMarketView[]>();
  for (const row of rows) {
    const sector = row.instrument.sector?.trim() || "Unclassified";
    grouped.set(sector, [...(grouped.get(sector) ?? []), row]);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      if (a === "Unclassified") return 1;
      if (b === "Unclassified") return -1;
      return a.localeCompare(b);
    })
    .map(([sector, items]) => ({ sector, items: rankAndSort(items) }));
}

export default async function UniversePage({ searchParams }: UniversePageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const assetClass = params?.assetClass?.trim() ?? "";
  const watchlistTier = params?.watchlistTier?.trim() ?? "";
  const status = params?.status?.trim() ?? "";

  const [instruments, bondProfiles, benchmarkProfiles, cryptoProfiles, logs] = await Promise.all([
    container.instrumentService.listInstruments({
      query: q || undefined,
      assetClass: assetClass || undefined,
      watchlistTier: watchlistTier || undefined,
      isActive: status === "active" ? true : status === "inactive" ? false : undefined
    }),
    container.instrumentService.listBondProfiles(),
    container.instrumentService.listBenchmarkProfiles(),
    container.instrumentService.listCryptoProfiles(),
    container.instrumentService.listMetadataRefreshLogs(10)
  ]);

  const marketViews = await container.instrumentMarketService.buildInstrumentMarketViews(instruments, { lookbackYears: 1 });
  const grouped = groupByAssetClass(marketViews);
  const cryptoRows = splitCryptoRows(grouped.crypto);
  const activeCount = instruments.filter((instrument) => instrument.isActive).length;
  const priceFreshnessBuckets = {
    fresh: marketViews.filter((view) => view.freshnessTone === "text-emerald-600").length,
    stale: marketViews.filter((view) => view.freshnessTone === "text-destructive").length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Curated universe</p>
          <h1 className="text-2xl font-semibold">Instrument Universe</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={seedUniverseAction}>
            <Button type="submit" variant="outline">
              Seed universe
            </Button>
          </form>
          <form action={refreshAllDataAction}>
            <input type="hidden" name="returnTo" value="/universe" />
            <SubmitButton pendingLabel="Refreshing data...">Refresh data</SubmitButton>
          </form>
          <form action={backfillUniverseHistoryAction}>
            <input type="hidden" name="returnTo" value="/universe" />
            <SubmitButton variant="secondary" pendingLabel="Backfilling history...">Backfill history</SubmitButton>
          </form>
        </div>
      </div>

      {params?.message || params?.metadataMessage || params?.priceMessage || params?.refreshMessage ? (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            {params.message ? <div className="text-muted-foreground">{params.message}</div> : null}
            {params.refreshMessage ? (
              <div className={params.refreshError ? "text-destructive" : "text-muted-foreground"}>{params.refreshError ?? params.refreshMessage}</div>
            ) : null}
            {params.metadataMessage ? (
              <div className={params.metadataError ? "text-destructive" : "text-muted-foreground"}>{params.metadataError ?? params.metadataMessage}</div>
            ) : null}
            {params.priceMessage ? (
              <div className={params.priceError ? "text-destructive" : "text-muted-foreground"}>{params.priceError ?? params.priceMessage}</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Refresh status</CardTitle>
          <CardDescription>Refresh data updates latest values. Backfill history fills missing 3Y/5Y rows in smaller chunks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
          <StatusStep label="1" title="Metadata" description="Portfolio and universe classifications" />
          <StatusStep label="2" title="Portfolio" description="Holdings prices and snapshots" />
          <StatusStep label="3" title="Benchmarks" description="Benchmark price history" />
          <StatusStep label="4" title="Universe" description="Instrument prices and freshness" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History backfill</CardTitle>
          <CardDescription>Detailed coverage metrics are available in Settings.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">Use Settings to check 3Y/5Y coverage, then run Backfill history here only when coverage is missing.</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Instruments</CardTitle>
            <CardDescription>Seeded and active universe rows</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{instruments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
            <CardDescription>Available for refresh and analysis</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fresh prices</CardTitle>
            <CardDescription>Updated within 7 days</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{priceFreshnessBuckets.fresh}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stale / missing</CardTitle>
            <CardDescription>Needs attention or refresh</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{priceFreshnessBuckets.stale}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filter instruments</CardTitle>
          <CardDescription>Search and narrow the curated universe without changing the seeded definitions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Search symbol or name" defaultValue={q} />
            <select name="assetClass" defaultValue={assetClass} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All asset classes</option>
              <option value="etf">ETF</option>
              <option value="bond_etf">Bond ETF</option>
              <option value="gold_etf">Gold ETF</option>
              <option value="cash_proxy">Cash proxy</option>
              <option value="crypto">Crypto</option>
              <option value="stock">Stock</option>
            </select>
            <select name="watchlistTier" defaultValue={watchlistTier} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All watchlist tiers</option>
              <option value="core_quality">Core quality</option>
              <option value="tactical_thematic">Tactical / thematic</option>
              <option value="opportunistic">Opportunistic</option>
            </select>
            <div className="flex gap-2">
              <select name="status" defaultValue={status} className="h-10 flex-1 rounded-md border bg-background px-3 text-sm">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <InstrumentGroupSection title="Equity ETF Universe" items={rankAndSort(grouped.equityEtfs)} />
      <InstrumentGroupSection title="Bond / Gold / Cash ETF Universe" items={rankAndSort(grouped.bonds)} />
      <CryptoUniverseSection proxyItems={rankAndSort(cryptoRows.proxies)} referenceItems={rankAndSort(cryptoRows.references)} />
      <StockWatchlistUniverseSection sectorGroups={groupStocksBySector(grouped.stocks)} totalCount={grouped.stocks.length} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ProfileCard
          title="Benchmark profiles"
          description="Curated benchmark proxies assigned to instruments."
          rows={benchmarkProfiles.map((profile) => [
            profile.benchmarkKey,
            profile.benchmarkName,
            profile.instrumentSymbol ?? "Composite",
            profile.providerSymbol ?? "-",
            profile.benchmarkType
          ])}
          headers={["Key", "Name", "Proxy", "Provider", "Type"]}
        />
        <ProfileCard
          title="Bond profiles"
          description="Duration, credit, inflation and rate sensitivity placeholders."
          rows={bondProfiles.map((profile) => [
            profile.symbol ?? "-",
            profile.durationCategory ?? "-",
            profile.treasuryClassification ?? "-",
            profile.creditQuality ?? "-",
            profile.rateSensitivity ?? "-"
          ])}
          headers={["Symbol", "Duration", "Class", "Credit", "Rate"]}
        />
        <ProfileCard
          title="Crypto profiles"
          description="Chain and volatility buckets for current crypto universe."
          rows={cryptoProfiles.map((profile) => [
            profile.symbol ?? "-",
            profile.chain ?? "-",
            profile.marketCapBucket ?? "-",
            profile.custodyRisk ?? "-",
            profile.volatilityBucket ?? "-"
          ])}
          headers={["Symbol", "Chain", "Cap", "Custody", "Volatility"]}
        />
        <ProfileCard
          title="Metadata refresh log"
          description="Most recent instrument metadata refresh jobs."
          rows={logs.map((log) => [log.provider, log.status, String(log.updatedCount), String(log.missingCount), log.createdAt.slice(0, 10)])}
          headers={["Provider", "Status", "Updated", "Missing", "Date"]}
        />
      </section>
    </div>
  );
}

function StatusStep({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {label}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function CryptoUniverseSection({
  proxyItems,
  referenceItems
}: {
  proxyItems: InstrumentMarketView[];
  referenceItems: InstrumentMarketView[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Universe</CardTitle>
        <CardDescription>Active crypto ETF proxies first, followed by inactive raw crypto references.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h3 className="mb-2 text-sm font-medium">Crypto ETF proxies</h3>
          <InstrumentMarketTable rows={proxyItems} emptyMessage="No active crypto ETF proxies." showManagementActions />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">Inactive raw crypto references</h3>
          <InstrumentMarketTable rows={referenceItems} emptyMessage="No inactive raw crypto references." showManagementActions />
        </div>
      </CardContent>
    </Card>
  );
}

function InstrumentGroupSection({ title, items }: { title: string; items: InstrumentMarketView[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{items.length} instruments in this group, ranked by daily return.</CardDescription>
      </CardHeader>
      <CardContent>
        <InstrumentMarketTable rows={items} emptyMessage="No instruments in this group." showManagementActions />
      </CardContent>
    </Card>
  );
}

function StockWatchlistUniverseSection({
  sectorGroups,
  totalCount
}: {
  sectorGroups: Array<{ sector: string; items: InstrumentMarketView[] }>;
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Watchlist Universe</CardTitle>
        <CardDescription>{totalCount} stocks grouped by sector, ranked by daily return within each sector.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sectorGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stocks in this group.</p>
        ) : (
          sectorGroups.map((group) => (
            <div key={group.sector} className="space-y-2">
              <div className="flex items-center justify-between gap-3 border-b pb-2">
                <h3 className="text-sm font-medium">{group.sector}</h3>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} stock{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <InstrumentMarketTable rows={group.items} emptyMessage="No stocks in this sector." showManagementActions />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ProfileCard({
  title,
  description,
  headers,
  rows
}: {
  title: string;
  description: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="py-2 pr-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${title}-${index}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${title}-${index}-${cellIndex}`} className="py-2 pr-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
