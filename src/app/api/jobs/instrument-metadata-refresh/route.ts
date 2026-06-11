import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 25);
  const maxBatches = Number(request.nextUrl.searchParams.get("maxBatches") ?? 14);
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 10 * 60);

  return runCronJob(request, { jobName: "instrument-metadata-refresh", lockTtlSeconds }, () =>
    createContainer().metadataRefreshService.refreshUniverseMetadataInBatches({
      batchSize,
      maxBatches
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
