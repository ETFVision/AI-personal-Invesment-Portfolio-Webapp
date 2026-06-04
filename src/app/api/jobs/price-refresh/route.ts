import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? env.SCHEDULED_USER_ID;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? env.SCHEDULED_PORTFOLIO_ID;
  return runCronJob(request, { jobName: "price-refresh", lockTtlSeconds: 25 * 60 }, () =>
    createContainer().jobs.refreshPortfolioPrices.run({ userId, portfolioId })
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
