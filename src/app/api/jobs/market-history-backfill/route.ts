import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 3);
  const maxBatches = Number(request.nextUrl.searchParams.get("maxBatches") ?? 1);

  return runCronJob(request, { jobName: "market-history-backfill", lockTtlSeconds: 25 * 60 }, async () => {
    const container = createContainer();
    const instruments = await container.instrumentService.listInstruments({ isActive: true });
    const coverageBefore = await container.instrumentMarketService.getHistoryCoverageSummary(instruments, batchSize);
    const missingBefore = coverageBefore.missingFiveYear + coverageBefore.missingTwoYearCrypto;

    if (missingBefore > 0) {
      const result = await container.instrumentMarketService.refreshInstrumentPricesInBatches({
        lookbackDays: 1825,
        batchSize,
        maxBatches,
        includeBackfill: true
      });
      const coverageAfter = await container.instrumentMarketService.getHistoryCoverageSummary(instruments, batchSize);
      const missingAfter = coverageAfter.missingFiveYear + coverageAfter.missingTwoYearCrypto;

      return {
        ok: result.errors.length === 0,
        message: `Backfilled ${result.requestedSymbols.length} instrument${result.requestedSymbols.length === 1 ? "" : "s"}. ${missingAfter} remaining.`,
        errors: result.errors,
        metadata: {
          mode: "instrument_history",
          requestedSymbols: result.requestedSymbols,
          updatedCount: result.updatedCount,
          missingSymbols: result.missingSymbols,
          coverageBefore,
          coverageAfter,
          missingBefore,
          missingAfter
        }
      };
    }

    const benchmarkSummary = await container.jobs.refreshBenchmarkData.run({ lookbackDays: 1825 });
    return {
      ok: benchmarkSummary.ok,
      message: `Instrument history is complete. ${benchmarkSummary.message}`,
      errors: benchmarkSummary.ok ? [] : [benchmarkSummary.message],
      metadata: {
        mode: "benchmark_history",
        coverageBefore,
        benchmarks: benchmarkSummary
      }
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
