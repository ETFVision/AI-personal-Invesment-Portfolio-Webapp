import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const lookbackDays = Number(request.nextUrl.searchParams.get("lookbackDays") ?? 30);
  const batchSize = Number(request.nextUrl.searchParams.get("batchSize") ?? 50);
  const maxBatches = Number(request.nextUrl.searchParams.get("maxBatches") ?? 8);
  const includeBackfill = request.nextUrl.searchParams.get("includeBackfill") === "true";
  const skipRiskMetrics = request.nextUrl.searchParams.get("skipRiskMetrics") === "true";
  const skipDerivedMetrics = request.nextUrl.searchParams.get("skipDerivedMetrics") === "true";
  const lockTtlSeconds = Number(request.nextUrl.searchParams.get("lockTtlSeconds") ?? 8 * 60);
  const source = request.nextUrl.searchParams.get("source");
  const eodLookbackDays = Number(request.nextUrl.searchParams.get("lookbackDays") ?? 7);
  const concurrency = Number(request.nextUrl.searchParams.get("concurrency") ?? 12);

  if (source === "eod") {
    return runCronJob(request, { jobName: "instrument-price-refresh", lockTtlSeconds, onSuccess: () => revalidateTag("market-data") }, () =>
      createContainer().instrumentMarketService.refreshInstrumentPricesEod({
        lookbackDays: eodLookbackDays,
        concurrency,
        skipRiskMetrics,
        skipDerivedMetrics
      })
    );
  }

  return runCronJob(request, { jobName: "instrument-price-refresh", lockTtlSeconds, onSuccess: () => revalidateTag("market-data") }, () =>
    createContainer().instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays,
      batchSize,
      maxBatches,
      includeBackfill,
      skipRiskMetrics,
      skipDerivedMetrics
    })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
