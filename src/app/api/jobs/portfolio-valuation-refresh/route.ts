import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { runCronJob } from "@/server/jobs/runCronJob";
import { runPortfolioValuationRefresh } from "@/server/jobs/portfolioScheduledFanout";

export async function POST(request: NextRequest) {
  const portfolioId = request.nextUrl.searchParams.get("portfolioId");
  return runCronJob(request, { jobName: "portfolio-valuation-refresh", lockTtlSeconds: 20 * 60 }, async () => {
    return runPortfolioValuationRefresh(createContainer(), portfolioId);
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
