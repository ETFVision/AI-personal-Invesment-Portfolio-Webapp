import { Benchmark, BenchmarkSnapshot } from "@/domain/portfolio/types";

export type UpsertBenchmarkInput = {
  benchmarkKey: string;
  name: string;
  benchmarkType: Benchmark["benchmarkType"];
  symbol: string | null;
  currency: string;
  baseValue: number;
  components: Benchmark["components"];
  providerPrimary: string | null;
  metadata: Record<string, unknown>;
  isActive: boolean;
};

export type UpsertBenchmarkSnapshotInput = {
  benchmarkId: string;
  snapshotDate: string;
  closePrice: number | null;
  levelValue: number;
  dailyReturn: number | null;
  drawdown: number | null;
  currency: string;
  provider: string;
  rawPayload: unknown;
};

export interface BenchmarkRepository {
  listBenchmarks(): Promise<Benchmark[]>;
  upsertBenchmarks(input: UpsertBenchmarkInput[]): Promise<void>;
  listBenchmarkSnapshots(benchmarkIds?: string[], limit?: number): Promise<BenchmarkSnapshot[]>;
  upsertBenchmarkSnapshots(input: UpsertBenchmarkSnapshotInput[]): Promise<void>;
}
