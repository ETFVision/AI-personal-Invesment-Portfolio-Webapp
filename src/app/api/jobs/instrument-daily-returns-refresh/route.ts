import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 25);
  const maxBatchesParam = request.nextUrl.searchParams.get("maxBatches");
  const recentWindowDaysParam = request.nextUrl.searchParams.get("recentWindowDays") ?? request.nextUrl.searchParams.get("incrementalDays");
  const forceFull = request.nextUrl.searchParams.get("forceFull") === "true";
  const maxBatches = maxBatchesParam == null ? undefined : Number(maxBatchesParam);
  const recentWindowDays = recentWindowDaysParam == null ? undefined : Number(recentWindowDaysParam);
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 8 * 60);

  return runCronJob(request, { jobName: "instrument-daily-returns-refresh", lockTtlSeconds, onSuccess: () => revalidateTag("market-data") }, () =>
    createContainer().instrumentMarketService.refreshInstrumentDailyReturnsInBatches({
      batchSize,
      maxBatches,
      recentWindowDays,
      forceFull
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
