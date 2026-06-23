import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import Module from "node:module";

let aliasResolverInstalled = false;

function installTestAliasResolver() {
  if (aliasResolverInstalled) return;
  aliasResolverInstalled = true;
  const originalResolveFilename = (Module as unknown as { _resolveFilename: (...args: any[]) => string })._resolveFilename;
  (Module as unknown as { _resolveFilename: (...args: any[]) => string })._resolveFilename = function resolveFilename(
    request: string,
    ...rest: any[]
  ) {
    if (request.startsWith("@/")) {
      return originalResolveFilename.call(this, path.resolve(process.cwd(), ".test-build/src", request.slice(2)), ...rest);
    }
    return originalResolveFilename.call(this, request, ...rest);
  };
}

function ensureSupabaseEnv() {
  installTestAliasResolver();
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
}

test("listInstrumentPriceStats reads grouped price stats from RPC", async () => {
  ensureSupabaseEnv();
  const { SupabaseUniverseRepository } = await import("../src/infrastructure/repositories/supabase/SupabaseUniverseRepository.js");
  const calls: Array<{ name: string; params: unknown }> = [];
  const db = {
    async rpc(name: string, params: unknown) {
      calls.push({ name, params });
      return {
        data: [
          {
            instrument_id: "11111111-1111-1111-1111-111111111111",
            earliest_price_date: "2021-01-04",
            latest_price_date: "2026-06-19",
            observation_count: 1375
          }
        ],
        error: null
      };
    }
  };

  const repository = new SupabaseUniverseRepository(db as never);
  const stats = await repository.listInstrumentPriceStats(["11111111-1111-1111-1111-111111111111"]);

  assert.deepEqual(calls, [
    {
      name: "get_instrument_price_stats",
      params: { p_instrument_ids: ["11111111-1111-1111-1111-111111111111"] }
    }
  ]);
  assert.deepEqual(stats, [
    {
      instrumentId: "11111111-1111-1111-1111-111111111111",
      earliestPriceDate: "2021-01-04",
      latestPriceDate: "2026-06-19",
      observationCount: 1375
    }
  ]);
});

test("listInstrumentPriceStats passes null for all-instrument RPC scans and preserves missing-table guard", async () => {
  ensureSupabaseEnv();
  const { SupabaseUniverseRepository } = await import("../src/infrastructure/repositories/supabase/SupabaseUniverseRepository.js");
  const calls: Array<{ name: string; params: unknown }> = [];
  const db = {
    async rpc(name: string, params: unknown) {
      calls.push({ name, params });
      return {
        data: null,
        error: { code: "42P01", message: "relation instrument_prices does not exist" }
      };
    }
  };

  const repository = new SupabaseUniverseRepository(db as never);
  const stats = await repository.listInstrumentPriceStats();

  assert.deepEqual(calls, [
    {
      name: "get_instrument_price_stats",
      params: { p_instrument_ids: null }
    }
  ]);
  assert.deepEqual(stats, []);
});

test("updateInstrumentTags uses batched delete and insert operations", async () => {
  ensureSupabaseEnv();
  const { SupabaseUniverseRepository } = await import("../src/infrastructure/repositories/supabase/SupabaseUniverseRepository.js");
  const calls: Array<{ table: string; op: string; payload?: unknown; column?: string; values?: unknown[] }> = [];
  const db = {
    from(table: string) {
      const query: any = {
        error: null,
        delete() {
          calls.push({ table, op: "delete" });
          return query;
        },
        in(column: string, values: unknown[]) {
          calls.push({ table, op: "in", column, values });
          return query;
        },
        insert(payload: unknown) {
          calls.push({ table, op: "insert", payload });
          return Promise.resolve({ error: null });
        },
        update(payload: unknown) {
          calls.push({ table, op: "update", payload });
          return query;
        }
      };
      return query;
    }
  };
  const repository = new SupabaseUniverseRepository(db as never);

  await repository.updateInstrumentTags([
    { instrumentId: "11111111-1111-1111-1111-111111111111", benchmarkTags: ["sp500"], thematicTags: ["broad-market", "quality"] },
    { instrumentId: "22222222-2222-2222-2222-222222222222", benchmarkTags: [], thematicTags: ["technology"] },
    { instrumentId: "not-a-uuid", benchmarkTags: ["ignored"], thematicTags: ["ignored"] }
  ]);

  assert.equal(calls.filter((call) => call.table === "instruments" && call.op === "update").length, 0);
  assert.deepEqual(calls.filter((call) => call.table === "instrument_tags" && call.op === "in"), [
    {
      table: "instrument_tags",
      op: "in",
      column: "instrument_id",
      values: ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
    }
  ]);
  const inserts = calls.filter((call) => call.table === "instrument_tags" && call.op === "insert");
  assert.equal(inserts.length, 1);
  assert.equal((inserts[0].payload as unknown[]).length, 4);
});

test("updateInstrumentMetadata batches current-row fetch, instrument upsert, and taxonomy writes", async () => {
  ensureSupabaseEnv();
  const { SupabaseUniverseRepository } = await import("../src/infrastructure/repositories/supabase/SupabaseUniverseRepository.js");
  const calls: Array<{ table: string; op: string; payload?: unknown; options?: unknown; column?: string; values?: unknown[]; value?: unknown }> = [];
  const currentRows = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      symbol: "AAA",
      name: "AAA Old",
      asset_class: "stock",
      instrument_type: "stock",
      source_type: "seeded",
      is_active: true,
      provider_metadata: { old: true },
      taxonomy_is_manual_override: false,
      canonical_sector: "Technology",
      canonical_themes: ["Quality"]
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      symbol: "BBB",
      name: "BBB Old",
      asset_class: "stock",
      instrument_type: "stock",
      source_type: "seeded",
      is_active: true,
      provider_metadata: {},
      taxonomy_is_manual_override: false,
      canonical_sector: "Financials",
      canonical_themes: ["Financial Services"]
    }
  ];
  const db = {
    from(table: string) {
      const query: any = {
        error: null,
        select(payload: unknown) {
          calls.push({ table, op: "select", payload });
          return query;
        },
        in(column: string, values: unknown[]) {
          calls.push({ table, op: "in", column, values });
          if (table === "instruments" && calls.some((call) => call.table === table && call.op === "select")) {
            return Promise.resolve({ data: currentRows, error: null });
          }
          return query;
        },
        upsert(payload: unknown, options?: unknown) {
          calls.push({ table, op: "upsert", payload, options });
          return Promise.resolve({ error: null });
        },
        delete() {
          calls.push({ table, op: "delete" });
          return query;
        },
        eq(column: string, value: unknown) {
          calls.push({ table, op: "eq", column, value });
          return Promise.resolve({ error: null });
        },
        insert(payload: unknown) {
          calls.push({ table, op: "insert", payload });
          return Promise.resolve({ error: null });
        }
      };
      return query;
    }
  };
  const repository = new SupabaseUniverseRepository(db as never);

  await repository.updateInstrumentMetadata([
    {
      provider: "fmp",
      symbol: "AAA",
      name: "AAA New",
      exchange: "NYSE",
      currency: "USD",
      country: "US",
      region: "United States",
      sector: "Technology",
      industry: "Software",
      isin: "US0000000001",
      cusip: null,
      figi: null,
      providerSymbol: "AAA",
      rawPayload: { symbol: "AAA" },
      canonicalSector: "Technology",
      canonicalThemes: ["Quality", "Growth"],
      unmappedRawValues: []
    },
    {
      provider: "fmp",
      symbol: "BBB",
      name: "BBB New",
      exchange: "NASDAQ",
      currency: "USD",
      country: "US",
      region: "United States",
      sector: "Financial Services",
      industry: "Banks",
      isin: null,
      cusip: null,
      figi: "BBG000000002",
      providerSymbol: "BBB",
      rawPayload: { symbol: "BBB" },
      canonicalSector: "Financials",
      canonicalThemes: ["Financial Services"],
      unmappedRawValues: []
    }
  ]);

  assert.equal(calls.filter((call) => call.table === "instruments" && call.op === "select").length, 1);
  assert.deepEqual(calls.find((call) => call.table === "instruments" && call.op === "in"), {
    table: "instruments",
    op: "in",
    column: "symbol",
    values: ["AAA", "BBB"]
  });
  assert.equal(calls.filter((call) => call.table === "instruments" && call.op === "upsert").length, 2);
  assert.equal((calls.find((call) => call.table === "instrument_sector_mappings" && call.op === "upsert")?.payload as unknown[]).length, 2);
  assert.equal((calls.find((call) => call.table === "instrument_theme_mappings" && call.op === "insert")?.payload as unknown[]).length, 3);
});

test("metadata refresh batches auto-cover active universe and sync Security Master once", async () => {
  ensureSupabaseEnv();
  const { MetadataRefreshService } = await import("../src/application/services/MetadataRefreshService.js");
  const instruments: any[] = Array.from({ length: 5 }, (_, index) => ({
    id: `inst-${index + 1}`,
    symbol: `T${index + 1}`,
    name: `Ticker ${index + 1}`,
    assetClass: "stock",
    instrumentType: "stock",
    sector: null,
    industry: null,
    canonicalSector: null,
    canonicalThemes: [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "pending",
    geography: null,
    currency: "USD",
    exchange: "NYSE",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: null,
    creditQuality: null,
    geoExposure: null,
    rateSensitivity: null,
    inflationSensitivity: null,
    recessionSensitivity: null,
    liquidityRole: null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    identifierLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "seeded",
    isActive: true
  }));
  const requestedBatches: string[][] = [];
  let syncCount = 0;
  const repository = {
    async listInstruments(filters?: { isActive?: boolean }) {
      return filters?.isActive ? instruments.filter((instrument) => instrument.isActive) : instruments;
    },
    async updateInstrumentMetadata(input: Array<{ symbol: string }>) {
      for (const item of input) {
        const instrument = instruments.find((candidate) => candidate.symbol === item.symbol);
        if (instrument) instrument.metadataLastRefreshedAt = "2026-06-23T00:00:00.000Z";
      }
    },
    async syncSecurityMasterIdentifiersFromInstruments() {
      syncCount += 1;
    },
    async insertMetadataRefreshLog() {}
  };
  const provider = {
    name: "test_provider",
    async getAssetMetadata(symbols: string[]) {
      requestedBatches.push(symbols);
      return symbols.map((symbol) => ({
        symbol,
        name: `${symbol} Name`,
        exchange: "NYSE",
        currency: "USD",
        country: "US",
        region: "United States",
        sector: "Technology",
        industry: "Software",
        isin: null,
        cusip: null,
        figi: null,
        raw: { symbol }
      }));
    }
  };
  const service = new MetadataRefreshService(repository as never, provider as never);

  const result = await service.refreshUniverseMetadataInBatches({ batchSize: 2 });

  assert.deepEqual(requestedBatches, [["T1", "T2"], ["T3", "T4"], ["T5"]]);
  assert.equal(result.updatedCount, 5);
  assert.equal(result.requestedSymbols.length, 5);
  assert.equal(syncCount, 1);
});
