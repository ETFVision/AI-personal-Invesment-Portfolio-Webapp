import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const lookbackDays = Number(request.nextUrl.searchParams.get("lookbackDays") ?? 30);
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 50);
  const maxBatches = Number(request.nextUrl.searchParams.get("maxBatches") ?? 8);
  const includeBackfill = request.nextUrl.searchParams.get("includeBackfill") === "true";
  const skipRiskMetrics = request.nextUrl.searchParams.get("skipRiskMetrics") === "true";
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 8 * 60);

  return runCronJob(request, { jobName: "instrument-price-refresh", lockTtlSeconds }, () =>
    createContainer().instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays,
      batchSize,
      maxBatches,
      includeBackfill,
      skipRiskMetrics
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
