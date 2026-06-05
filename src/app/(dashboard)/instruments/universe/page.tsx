import { createContainer } from "@/server/container";
import { seedUniverseAction } from "@/server/actions/universeActions";
import { backfillUniverseHistoryAction, refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { SubmitButton } from "@/components/ui/submit-button";
import { InstrumentDirectoryTable } from "@/components/instruments/instrument-directory-table";
import type { InstrumentMarketView } from "@/domain/universe/types";

type UniversePageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
    type?: string;
    status?: string;
  }>;
};

function instrumentBucket(row: InstrumentMarketView) {
  const instrument = row.instrument;
  if (instrument.assetClass === "benchmark" || instrument.benchmarkTags.length > 0) return "benchmark";
  if (instrument.assetClass === "stock") return "stock";
  if (instrument.assetClass === "bond_etf") return "bond_etf";
  if (instrument.assetClass === "gold_etf") return "gold_etf";
  if (instrument.assetClass === "crypto" || instrument.instrumentType === "crypto_etf") return "crypto";
  return "etf";
}

function sortRows(rows: InstrumentMarketView[]) {
  return rows
    .slice()
    .sort((a, b) => {
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
    etf: "Equity ETF universe",
    bond_gold_cash: "Bond / gold / cash ETF universe",
    crypto: "Crypto universe",
    benchmark: "Benchmark universe",
    stock: "Stock watchlist universe",
    other: "Other universe"
  };
  return titles[key] ?? key.replaceAll("_", " ");
}

function assetClassOrder(key: string) {
  const order: Record<string, number> = {
    etf: 1,
    bond_gold_cash: 2,
    crypto: 3,
    benchmark: 4,
    stock: 5,
    other: 6
  };
  return order[key] ?? 99;
}

function groupByAssetClass(rows: InstrumentMarketView[]) {
  return rows.reduce<Record<string, InstrumentMarketView[]>>((groups, row) => {
    const key = assetClassGroupKey(row);
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
}

function groupStocksBySector(rows: InstrumentMarketView[]) {
  return rows.reduce<Record<string, InstrumentMarketView[]>>((groups, row) => {
    const key = row.instrument.canonicalSector ?? row.instrument.sector ?? "Unclassified";
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
}

export default async function InstrumentUniversePage({ searchParams }: UniversePageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const type = params?.type?.trim() ?? "";
  const status = params?.status?.trim() ?? "";
  const instruments = await container.instrumentService.listInstruments({
    query: q || undefined,
    isActive: status === "inactive" ? false : status === "all" ? undefined : true
  });
  const rows = await container.instrumentMarketService.buildInstrumentMarketViews(instruments, { lookbackYears: 1 });
  const fundamentalsRows = await container.fundamentalsRepository.listSummaryRows();
  const fundamentalsByInstrumentId = new Map(fundamentalsRows.map((row) => [row.instrument.id, row]));
  const filteredRows = type ? rows.filter((row) => instrumentBucket(row) === type) : rows;
  const groupedRows = groupByAssetClass(filteredRows);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Instruments"
        title="Universe directory"
        description="Approved investment universe with market metrics, taxonomy, freshness and instrument-level drilldowns."
        meta={
          <>
            <StatusBadge tone="info">{filteredRows.length} instruments</StatusBadge>
            <StatusBadge tone="neutral">{Object.keys(groupedRows).length} groups</StatusBadge>
          </>
        }
        actions={
        <div className="flex flex-wrap gap-2">
          <form action={seedUniverseAction}><Button type="submit" variant="outline">Seed universe</Button></form>
          <form action={refreshAllDataAction}>
            <input type="hidden" name="returnTo" value="/instruments/universe" />
            <SubmitButton pendingLabel="Refreshing data...">Refresh data</SubmitButton>
          </form>
          <form action={backfillUniverseHistoryAction}>
            <input type="hidden" name="returnTo" value="/instruments/universe" />
            <SubmitButton variant="secondary" pendingLabel="Backfilling history...">Backfill history</SubmitButton>
          </form>
        </div>
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
          <CardDescription>Directory filters keep the page tight. Instrument details live on `/instruments/[symbol]`.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Search symbol or name" defaultValue={q} />
            <select name="type" defaultValue={type} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">All types</option>
              <option value="stock">Stocks</option>
              <option value="etf">ETFs</option>
              <option value="bond_etf">Bond ETFs</option>
              <option value="gold_etf">Gold ETFs</option>
              <option value="crypto">Crypto</option>
              <option value="benchmark">Benchmarks</option>
            </select>
            <select name="status" defaultValue={status || "active"} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All status</option>
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
                    <CardDescription>{groupRows.length} stocks grouped by sector and ranked by daily return. Open a symbol for full context.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(sectorGroups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([sector, sectorRows]) => (
                        <div key={sector} className="space-y-3">
                          <SectionHeader title={sector} description={`${sectorRows.length} instruments`} />
                          <InstrumentDirectoryTable rows={sortRows(sectorRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} />
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
                  <CardDescription>{groupRows.length} instruments ranked by daily return. Open a symbol for full context.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InstrumentDirectoryTable rows={sortRows(groupRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} />
                </CardContent>
              </Card>
            );
          })}
      </div>
    </PageContainer>
  );
}
