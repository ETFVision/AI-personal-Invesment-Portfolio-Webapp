import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  return runCronJob(request, { jobName: "fmp-news-ingestion", onSuccess: () => revalidateTag("news-data") }, () => createContainer().jobs.dailyNewsIngestion.run());
}

export async function GET(request: NextRequest) {
  return POST(request);
}
