import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const backfill = request.nextUrl.searchParams.get("backfill") === "true";
  return runCronJob(request, { jobName: "fred-refresh" }, () => createContainer().jobs.fredMacroIngestion.run({ backfill }));
}

export async function GET(request: NextRequest) {
  return POST(request);
}
