import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const batchSizeParam = request.nextUrl.searchParams.get("batchSize");
  const batchSize = batchSizeParam == null ? undefined : Number(batchSizeParam);
  const minObservations = Number(request.nextUrl.searchParams.get("minObservations") ?? 30);

  return runCronJob(request, { jobName: "refresh_instrument_risk_metrics", lockTtlSeconds: 12 * 60, onSuccess: () => revalidateTag("market-data") }, async () => {
    const result = await createContainer().instrumentMarketService.refreshInstrumentRiskMetricsInBatches({
      batchSize,
      minObservations
    });

    return {
      status: result.requestedSymbols.length === 0 && result.errors.length === 0 ? "skipped" : undefined,
      ok: result.errors.length === 0,
      message: result.message,
      errors: result.errors,
      metadata: {
        ...result,
        batchSize: batchSize ?? null,
        minObservations
      }
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
