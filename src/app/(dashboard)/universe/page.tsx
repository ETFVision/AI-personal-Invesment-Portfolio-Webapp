import { createContainer } from "@/server/container";
import {
  refreshUniverseMetadataAction,
  saveInstrumentTagsAction,
  seedUniverseAction,
  toggleInstrumentActiveAction
} from "@/server/actions/universeActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAssetTypeLabel } from "@/lib/utils";
import { Instrument } from "@/domain/universe/types";

type UniversePageProps = {
  searchParams?: Promise<{
    message?: string;
    metadataMessage?: string;
    metadataError?: string;
    q?: string;
    assetClass?: string;
    watchlistTier?: string;
    status?: string;
  }>;
};

function freshnessLabel(refreshedAt: string | null) {
  if (!refreshedAt) return { label: "Never", tone: "text-muted-foreground" };
  const refreshed = new Date(refreshedAt);
  const days = Math.max(0, Math.floor((Date.now() - refreshed.getTime()) / 86_400_000));
  if (days <= 7) return { label: `${days}d`, tone: "text-emerald-600" };
  if (days <= 30) return { label: `${days}d`, tone: "text-amber-600" };
  return { label: `${days}d`, tone: "text-destructive" };
}

function groupBy<T extends { assetClass: string }>(items: T[]) {
  return {
    etfs: items.filter((item) => item.assetClass === "etf"),
    bonds: items.filter((item) => ["bond_etf", "gold_etf", "cash_proxy"].includes(item.assetClass)),
    crypto: items.filter((item) => item.assetClass === "crypto"),
    stocks: items.filter((item) => item.assetClass === "stock"),
    other: items.filter((item) => !["etf", "bond_etf", "gold_etf", "cash_proxy", "crypto", "stock"].includes(item.assetClass))
  };
}

export default async function UniversePage({ searchParams }: UniversePageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const assetClass = params?.assetClass?.trim() ?? "";
  const watchlistTier = params?.watchlistTier?.trim() ?? "";
  const status = params?.status?.trim() ?? "";

  const [instruments, watchlists, bondProfiles, benchmarkProfiles, cryptoProfiles, logs] = await Promise.all([
    container.instrumentService.listInstruments({
      query: q || undefined,
      assetClass: assetClass || undefined,
      watchlistTier: watchlistTier || undefined,
      isActive: status === "active" ? true : status === "inactive" ? false : undefined
    }),
    container.watchlistService.listWatchlists(),
    container.instrumentService.listBondProfiles(),
    container.instrumentService.listBenchmarkProfiles(),
    container.instrumentService.listCryptoProfiles(),
    container.instrumentService.listMetadataRefreshLogs(10)
  ]);

  const grouped = groupBy(instruments);
  const activeCount = instruments.filter((instrument) => instrument.isActive).length;
  const freshnessBuckets = {
    fresh: instruments.filter((instrument) => freshnessLabel(instrument.metadataLastRefreshedAt).tone === "text-emerald-600").length,
    stale: instruments.filter((instrument) => freshnessLabel(instrument.metadataLastRefreshedAt).tone === "text-destructive").length
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
          <form action={refreshUniverseMetadataAction}>
            <Button type="submit" variant="secondary">
              Refresh metadata
            </Button>
          </form>
        </div>
      </div>

      {params?.message || params?.metadataMessage ? (
        <Card>
          <CardContent className="p-4 text-sm">
            {params.message ? <div className="text-muted-foreground">{params.message}</div> : null}
            {params.metadataMessage ? <div className={params.metadataError ? "text-destructive" : "text-muted-foreground"}>{params.metadataError ?? params.metadataMessage}</div> : null}
          </CardContent>
        </Card>
      ) : null}

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
            <CardTitle className="text-sm">Fresh metadata</CardTitle>
            <CardDescription>Updated within 7 days</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{freshnessBuckets.fresh}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stale / missing</CardTitle>
            <CardDescription>Needs attention or refresh</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{freshnessBuckets.stale}</CardContent>
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

      <InstrumentGroupSection title="ETF universe" items={grouped.etfs} />
      <InstrumentGroupSection title="Bond / gold / cash universe" items={grouped.bonds} />
      <InstrumentGroupSection title="Crypto universe" items={grouped.crypto} />
      <InstrumentGroupSection title="Stock watchlist universe" items={grouped.stocks} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ProfileCard title="Benchmark profiles" description="Curated benchmark proxies assigned to instruments." rows={benchmarkProfiles.map((profile) => [
          profile.benchmarkKey,
          profile.benchmarkName,
          profile.instrumentSymbol ?? "Composite",
          profile.providerSymbol ?? "-",
          profile.benchmarkType
        ])} headers={["Key", "Name", "Proxy", "Provider", "Type"]} />
        <ProfileCard title="Bond profiles" description="Duration, credit, inflation and rate sensitivity placeholders." rows={bondProfiles.map((profile) => [
          profile.symbol ?? "-",
          profile.durationCategory ?? "-",
          profile.treasuryClassification ?? "-",
          profile.creditQuality ?? "-",
          profile.rateSensitivity ?? "-"
        ])} headers={["Symbol", "Duration", "Class", "Credit", "Rate"]} />
        <ProfileCard title="Crypto profiles" description="Chain and volatility buckets for current crypto universe." rows={cryptoProfiles.map((profile) => [
          profile.symbol ?? "-",
          profile.chain ?? "-",
          profile.marketCapBucket ?? "-",
          profile.custodyRisk ?? "-",
          profile.volatilityBucket ?? "-"
        ])} headers={["Symbol", "Chain", "Cap", "Custody", "Volatility"]} />
        <ProfileCard title="Metadata refresh log" description="Most recent instrument metadata refresh jobs." rows={logs.map((log) => [
          log.provider,
          log.status,
          String(log.updatedCount),
          String(log.missingCount),
          log.createdAt.slice(0, 10)
        ])} headers={["Provider", "Status", "Updated", "Missing", "Date"]} />
      </section>
    </div>
  );
}

function InstrumentGroupSection({ title, items }: { title: string; items: Instrument[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{items.length} instruments in this group.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instruments in this group.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Watchlist</th>
                  <th className="py-2 pr-3">Tags</th>
                  <th className="py-2 pr-3">Metadata</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((instrument) => {
                  const freshness = freshnessLabel(instrument.metadataLastRefreshedAt);
                  return (
                    <tr key={instrument.id} className="border-b align-top last:border-0">
                      <td className="py-3 pr-3 font-medium">{instrument.symbol ?? "-"}</td>
                      <td className="py-3 pr-3">
                        <div>{instrument.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {instrument.exchange ?? "-"} {instrument.currency ? `• ${instrument.currency}` : ""}
                        </div>
                      </td>
                      <td className="py-3 pr-3">{formatAssetTypeLabel(instrument.assetClass)}</td>
                      <td className="py-3 pr-3">{formatWatchlistTier(instrument.watchlistTier)}</td>
                      <td className="py-3 pr-3">
                        <div className="mb-2 text-xs text-muted-foreground">Benchmark: {instrument.benchmarkTags.join(", ") || "-"}</div>
                        <div className="mb-2 text-xs text-muted-foreground">Theme: {instrument.thematicTags.join(", ") || "-"}</div>
                        <form action={saveInstrumentTagsAction} className="space-y-2">
                          <input type="hidden" name="instrumentId" value={instrument.id} />
                          <Input name="benchmarkTags" defaultValue={instrument.benchmarkTags.join(", ")} placeholder="benchmark tags" className="h-9" />
                          <Input name="thematicTags" defaultValue={instrument.thematicTags.join(", ")} placeholder="thematic tags" className="h-9" />
                          <Button type="submit" size="sm" variant="outline">
                            Save tags
                          </Button>
                        </form>
                      </td>
                      <td className={`py-3 pr-3 ${freshness.tone}`}>{freshness.label}</td>
                      <td className="py-3 pr-3">{instrument.isActive ? "Active" : "Inactive"}</td>
                      <td className="py-3 pr-3">
                        <form action={toggleInstrumentActiveAction}>
                          <input type="hidden" name="instrumentId" value={instrument.id} />
                          <input type="hidden" name="isActive" value={String(!instrument.isActive)} />
                          <Button type="submit" size="sm" variant="secondary">
                            {instrument.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    <th key={header} className="py-2 pr-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${title}-${index}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${title}-${index}-${cellIndex}`} className="py-2 pr-3">{cell}</td>
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

function formatWatchlistTier(value: string | null) {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}
