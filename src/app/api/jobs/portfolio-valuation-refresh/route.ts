import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? env.SCHEDULED_PORTFOLIO_ID;
  return runCronJob(request, { jobName: "portfolio-valuation-refresh", lockTtlSeconds: 20 * 60 }, async () => {
    if (!portfolioId) {
      return {
        status: "failed",
        message: "portfolio-valuation-refresh requires SCHEDULED_PORTFOLIO_ID or portfolioId query parameter.",
        errors: ["Missing portfolioId."]
      };
    }
    await createContainer().portfolioService.createAnalyticsSnapshot(portfolioId);
    return {
      status: "success",
      message: "Portfolio valuation snapshot refreshed.",
      portfolioId
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
