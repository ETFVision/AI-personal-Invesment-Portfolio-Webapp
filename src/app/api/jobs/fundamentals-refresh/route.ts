import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";
  const symbol = request.nextUrl.searchParams.get("symbol") ?? undefined;
  return runCronJob(request, { jobName: "fundamentals-refresh", lockTtlSeconds: 25 * 60 }, () => createContainer().jobs.fundamentalsRefresh.run({ force, symbol }));
}

export async function GET(request: NextRequest) {
  return POST(request);
}
