import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const lookbackDays = Number(request.nextUrl.searchParams.get("lookbackDays") ?? 30);
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 40);
  const maxBatches = Number(request.nextUrl.searchParams.get("maxBatches") ?? 3);
  const includeBackfill = request.nextUrl.searchParams.get("includeBackfill") === "true";

  return runCronJob(request, { jobName: "instrument-price-refresh", lockTtlSeconds: 25 * 60 }, () =>
    createContainer().instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays,
      batchSize,
      maxBatches,
      includeBackfill
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
