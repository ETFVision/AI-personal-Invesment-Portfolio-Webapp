import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";
import { runScheduledPortfolioReviews } from "@/server/jobs/portfolioScheduledFanout";

export async function POST(request: NextRequest) {
  const portfolioId = request.nextUrl.searchParams.get("portfolioId");
  return runCronJob(request, { jobName: "portfolio-review-run", lockTtlSeconds: 25 * 60 }, async () => {
    return runScheduledPortfolioReviews(createContainer(), portfolioId);
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
