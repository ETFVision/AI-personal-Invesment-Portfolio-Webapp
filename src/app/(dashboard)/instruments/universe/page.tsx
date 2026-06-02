import { createContainer } from "@/server/container";
import { seedUniverseAction } from "@/server/actions/universeActions";
import { backfillUniverseHistoryAction, refreshAllDataAction } from "@/server/actions/dataRefreshActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  return rows.slice().sort((a, b) => (a.instrument.symbol ?? "").localeCompare(b.instrument.symbol ?? ""));
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
  const filteredRows = type ? rows.filter((row) => instrumentBucket(row) === type) : rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Instruments</p>
          <h1 className="text-2xl font-semibold">Universe directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approved investment universe. Open a symbol for the canonical instrument detail page.</p>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Active universe</CardTitle>
          <CardDescription>{filteredRows.length} instruments. Summary only; open the symbol for full context.</CardDescription>
        </CardHeader>
        <CardContent>
          <InstrumentDirectoryTable rows={sortRows(filteredRows)} />
        </CardContent>
      </Card>
    </div>
  );
}
