import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols")?.split(",").map((symbol) => symbol.trim()).filter(Boolean);
  const force = request.nextUrl.searchParams.get("force") === "true";
  return runCronJob(request, { jobName: "etf-lookthrough-refresh", lockTtlSeconds: 25 * 60 }, () => createContainer().jobs.etfLookthroughRefresh.run({ force, symbols }));
}

export async function GET(request: NextRequest) {
  return POST(request);
}
