import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "news-reconciliation" }, () => createContainer().jobs.weeklyNewsReconciliation.run());
}

export async function GET(request: NextRequest) {
  return POST(request);
}
