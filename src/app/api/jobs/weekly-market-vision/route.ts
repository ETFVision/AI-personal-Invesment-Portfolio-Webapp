import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "market-vision-run", onSuccess: () => revalidateTag("market-vision-data") }, () => createContainer().jobs.weeklyMarketVision.run());
}

export async function GET(request: NextRequest) {
  return POST(request);
}
