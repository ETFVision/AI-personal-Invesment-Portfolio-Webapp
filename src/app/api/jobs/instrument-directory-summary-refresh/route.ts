import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "instrument-directory-summary-refresh", lockTtlSeconds: 10 * 60 }, () =>
    createContainer().instrumentDirectorySummaryService.refreshSummaries()
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
