import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? undefined;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? env.SCHEDULED_PORTFOLIO_ID ?? null;
  const runType = request.nextUrl.searchParams.get("runType") ?? "scheduled";
  return runCronJob(request, { jobName: "recommendation-run", lockTtlSeconds: 25 * 60 }, async () => {
    const result = await createContainer().jobs.recommendationRun.run({ symbol, portfolioId, runType });
    return {
      status: "success",
      runId: result.run.id,
      recommendationsCreated: result.recommendations.length,
      run: result.run
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
