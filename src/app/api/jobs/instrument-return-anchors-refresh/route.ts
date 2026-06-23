import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 25);
  const maxBatchesParam = request.nextUrl.searchParams.get("maxBatches");
  const maxBatches = maxBatchesParam == null ? undefined : Number(maxBatchesParam);
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 8 * 60);

  return runCronJob(request, { jobName: "instrument-return-anchors-refresh", lockTtlSeconds, onSuccess: () => revalidateTag("market-data") }, () =>
    createContainer().instrumentMarketService.refreshInstrumentReturnAnchorsInBatches({
      batchSize,
      maxBatches
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
