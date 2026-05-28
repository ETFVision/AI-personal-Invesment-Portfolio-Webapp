import {
  BenchmarkRepository,
  UpsertBenchmarkInput,
  UpsertBenchmarkSnapshotInput
} from "@/application/ports/repositories/BenchmarkRepository";
import { Benchmark, BenchmarkSnapshot } from "@/domain/portfolio/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function mapBenchmark(row: any): Benchmark {
  return {
    id: row.id,
    benchmarkKey: row.benchmark_key,
    name: row.name,
    benchmarkType: row.benchmark_type,
    symbol: row.symbol,
    currency: row.currency,
    baseValue: Number(row.base_value),
    components: Array.isArray(row.components) ? row.components : [],
    providerPrimary: row.provider_primary,
    metadata: row.metadata ?? {},
    isActive: row.is_active
  };
}

function mapBenchmarkSnapshot(row: any): BenchmarkSnapshot {
  return {
    id: row.id,
    benchmarkId: row.benchmark_id,
    benchmarkKey: row.benchmark_key ?? "",
    snapshotDate: row.snapshot_date,
    closePrice: row.close_price == null ? null : Number(row.close_price),
    levelValue: Number(row.level_value),
    dailyReturn: row.daily_return == null ? null : Number(row.daily_return),
    drawdown: row.drawdown == null ? null : Number(row.drawdown),
    currency: row.currency,
    provider: row.provider
  };
}

function isMissingBenchmarkTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("benchmark") && error.message?.toLowerCase().includes("does not exist")))
  );
}

export class SupabaseBenchmarkRepository implements BenchmarkRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listBenchmarks() {
    const { data, error } = await this.db.from("benchmarks").select("*").order("name");
    if (isMissingBenchmarkTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBenchmark);
  }

  async upsertBenchmarks(input: UpsertBenchmarkInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("benchmarks").upsert(
      input.map((item) => ({
        benchmark_key: item.benchmarkKey,
        name: item.name,
        benchmark_type: item.benchmarkType,
        symbol: item.symbol,
        currency: item.currency,
        base_value: item.baseValue,
        components: item.components,
        provider_primary: item.providerPrimary,
        metadata: item.metadata,
        is_active: item.isActive
      })),
      { onConflict: "benchmark_key" }
    );
    if (isMissingBenchmarkTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async listBenchmarkSnapshots(benchmarkIds?: string[], limit = 500) {
    let query = this.db.from("benchmark_snapshots").select("*, benchmarks(benchmark_key)").order("snapshot_date", { ascending: false }).limit(limit);
    if (benchmarkIds && benchmarkIds.length > 0) {
      query = query.in("benchmark_id", benchmarkIds);
    }
    const { data, error } = await query;
    if (isMissingBenchmarkTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const snapshot = mapBenchmarkSnapshot(row);
      return {
        ...snapshot,
        benchmarkKey: row.benchmarks?.benchmark_key ?? snapshot.benchmarkKey
      };
    });
  }

  async upsertBenchmarkSnapshots(input: UpsertBenchmarkSnapshotInput[]) {
    if (input.length === 0) return;

    const { error } = await this.db.from("benchmark_snapshots").upsert(
      input.map((item) => ({
        benchmark_id: item.benchmarkId,
        snapshot_date: item.snapshotDate,
        close_price: item.closePrice,
        level_value: item.levelValue,
        daily_return: item.dailyReturn,
        drawdown: item.drawdown,
        currency: item.currency,
        provider: item.provider,
        raw_payload: item.rawPayload
      })),
      { onConflict: "benchmark_id,snapshot_date" }
    );
    if (isMissingBenchmarkTable(error)) return;
    if (error) throw new Error(error.message);
  }
}
