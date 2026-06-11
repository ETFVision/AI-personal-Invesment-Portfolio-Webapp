import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? env.SCHEDULED_PORTFOLIO_ID;
  return runCronJob(request, { jobName: "portfolio-summary-refresh", lockTtlSeconds: 20 * 60 }, async () => {
    if (!portfolioId) {
      return {
        status: "failed",
        message: "portfolio-summary-refresh requires SCHEDULED_PORTFOLIO_ID or portfolioId query parameter.",
        errors: ["Missing portfolioId."]
      };
    }

    const container = createContainer();
    const dashboardSummary = await container.portfolioService.refreshDashboardSummary(portfolioId);
    const performanceSummary = await container.portfolioService.refreshPerformanceSummary(portfolioId);

    return {
      status: "success",
      message: "Portfolio summary tables refreshed.",
      portfolioId,
      dashboardSummary: {
        asOfDate: dashboardSummary?.asOfDate ?? null,
        latestPriceDate: dashboardSummary?.latestPriceDate ?? null,
        status: dashboardSummary?.status ?? "insufficient_data"
      },
      performanceSummary: {
        asOfDate: performanceSummary?.asOfDate ?? null,
        latestPriceDate: performanceSummary?.latestPriceDate ?? null,
        status: performanceSummary?.status ?? "insufficient_data"
      }
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
