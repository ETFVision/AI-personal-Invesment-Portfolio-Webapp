import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const lookbackDaysParam = request.nextUrl.searchParams.get("lookbackDays");
  const lookbackDays = lookbackDaysParam ? Number(lookbackDaysParam) : undefined;
  return runCronJob(request, { jobName: "benchmark-refresh", lockTtlSeconds: 25 * 60 }, () =>
    createContainer().jobs.refreshBenchmarkData.run({ lookbackDays })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
