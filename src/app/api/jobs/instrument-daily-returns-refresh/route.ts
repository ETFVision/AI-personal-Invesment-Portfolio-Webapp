import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 25);
  const maxBatchesParam = request.nextUrl.searchParams.get("maxBatches");
  const incrementalDaysParam = request.nextUrl.searchParams.get("incrementalDays");
  const maxBatches = maxBatchesParam == null ? undefined : Number(maxBatchesParam);
  const incrementalDays = incrementalDaysParam == null ? undefined : Number(incrementalDaysParam);
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 8 * 60);

  return runCronJob(request, { jobName: "instrument-daily-returns-refresh", lockTtlSeconds, onSuccess: () => revalidateTag("market-data") }, () =>
    createContainer().instrumentMarketService.refreshInstrumentDailyReturnsInBatches({
      batchSize,
      maxBatches,
      incrementalDays
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
