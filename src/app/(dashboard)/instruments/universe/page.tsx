import { createContainer } from "@/server/container";
import { measureRenderStep } from "@/infrastructure/observability/renderTiming";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, SectionHeader, StatusBadge } from "@/components/ui/professional";
import { InstrumentDirectoryTable } from "@/components/instruments/instrument-directory-table";
import type { InstrumentMarketView } from "@/domain/universe/types";
import { ASSET_CATEGORY_LABELS, ETF_CATEGORY_LABELS } from "@/domain/universe/alphaUniverse";

type UniversePageProps = {
  searchParams?: Promise<{
    message?: string;
    refreshMessage?: string;
    refreshError?: string;
    q?: string;
    asset?: string;
    type?: string;
    sector?: string;
    status?: string;
  }>;
};

function instrumentBucket(row: InstrumentMarketView) {
  const instrument = row.instrument;
  if (instrument.assetClass === "benchmark" || instrument.benchmarkTags.length > 0) return "benchmark";
  if (instrument.assetClass === "stock") return "stock";
  if (instrument.assetClass === "crypto" && instrument.instrumentType !== "crypto_etf") return "crypto";
  if (instrument.instrumentType.includes("etf") || instrument.assetClass.endsWith("_etf") || instrument.assetClass === "etf") return "etf";
  return "other";
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
  return row.instrument.assetCategory ?? "UNKNOWN";
}

function assetClassTitle(key: string) {
  return `${ASSET_CATEGORY_LABELS[key as keyof typeof ASSET_CATEGORY_LABELS] ?? key.replaceAll("_", " ")} universe`;
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

function groupEtfsByProductCategory(rows: InstrumentMarketView[]) {
  return rows.reduce<Record<string, InstrumentMarketView[]>>((groups, row) => {
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

function uniqueOptions(rows: InstrumentMarketView[], getValue: (row: InstrumentMarketView) => string | null | undefined, getLabel: (value: string) => string = (value) => value) {
  const options = new Map<string, string>();
  for (const row of rows) {
    const value = getValue(row);
    if (!value) continue;
    options.set(value, getLabel(value));
  }
  return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
}

export default async function InstrumentUniversePage({ searchParams }: UniversePageProps) {
  const params = await searchParams;
  const container = createContainer();
  await container.authProvider.requireUser();

  const q = params?.q?.trim() ?? "";
  const asset = params?.asset?.trim() ?? "";
  const type = params?.type?.trim() ?? "";
  const sector = params?.sector?.trim() ?? "";
  const status = params?.status?.trim() ?? "";
  const instruments = await measureRenderStep("instruments-universe:instrument-list", () =>
    container.instrumentService.listInstruments({
      query: q || undefined,
      isActive: status === "inactive" ? false : status === "all" ? undefined : true
    })
  );
  const [rows, fundamentalsRows] = await measureRenderStep("instruments-universe:market-and-fundamentals-data", () =>
    Promise.all([
      container.instrumentMarketService.buildInstrumentMarketViews(instruments, { lookbackYears: 1 }),
      container.fundamentalsRepository.listSummaryRowsForInstruments(instruments)
    ])
  );
  const fundamentalsByInstrumentId = new Map(fundamentalsRows.map((row) => [row.instrument.id, row]));
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
        title="Universe directory"
        description="Approved investment universe with market metrics, taxonomy, freshness and instrument-level drilldowns."
        meta={
          <>
            <StatusBadge tone="info">{filteredRows.length} instruments</StatusBadge>
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
          <CardDescription>Directory filters keep the page tight. Instrument details live on `/instruments/[symbol]`.</CardDescription>
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
            const stockRows = groupRows.filter((row) => row.instrument.assetClass === "stock");
            const etfRows = groupRows.filter((row) => row.instrument.instrumentType.includes("etf") || row.instrument.assetClass.endsWith("_etf") || row.instrument.assetClass === "etf");
            const otherRows = groupRows.filter((row) => !stockRows.includes(row) && !etfRows.includes(row));

            if (stockRows.length > 0 && etfRows.length === 0 && otherRows.length === 0) {
              const sectorGroups = groupStocksBySector(stockRows);
              return (
                <Card key={groupKey}>
                  <CardHeader>
                    <CardTitle>{assetClassTitle(groupKey)}</CardTitle>
                    <CardDescription>{stockRows.length} stocks grouped by sector and ranked by daily return. Open a symbol for full context.</CardDescription>
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
                <CardContent className="space-y-6">
                  {etfRows.length > 0 ? (
                    <div className="space-y-4">
                      <SectionHeader title={groupKey === "EQUITY" ? "Equity ETFs" : "ETF products"} description={`${etfRows.length} ETFs grouped by ETFVision product category`} />
                      {Object.entries(groupEtfsByProductCategory(etfRows))
                        .sort(([a], [b]) => productCategoryTitle(a).localeCompare(productCategoryTitle(b)))
                        .map(([category, categoryRows]) => (
                          <div key={category} className="space-y-3 rounded-lg border border-slate-200 p-3">
                            <SectionHeader title={productCategoryTitle(category)} description={`${categoryRows.length} ETFs`} />
                            <InstrumentDirectoryTable rows={sortRows(categoryRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} />
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
                            <InstrumentDirectoryTable rows={sortRows(sectorRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} />
                          </div>
                        ))}
                    </div>
                  ) : null}
                  {otherRows.length > 0 ? (
                    <div className="space-y-3">
                      <SectionHeader title="Other instruments" description={`${otherRows.length} instruments`} />
                      <InstrumentDirectoryTable rows={sortRows(otherRows)} fundamentalsByInstrumentId={fundamentalsByInstrumentId} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </PageContainer>
  );
}
