import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";
  return runCronJob(request, { jobName: "newsdata-news-ingestion", onSuccess: () => revalidateTag("news-data") }, () => createContainer().jobs.newsDataNewsIngestion.run({ force }));
}

export async function GET(request: NextRequest) {
  return POST(request);
}
