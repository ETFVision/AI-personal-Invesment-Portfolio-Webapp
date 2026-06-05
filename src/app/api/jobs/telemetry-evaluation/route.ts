import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "telemetry-evaluation", lockTtlSeconds: 20 * 60 }, () =>
    createContainer().jobs.telemetryEvaluation.run()
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
