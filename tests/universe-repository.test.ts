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
