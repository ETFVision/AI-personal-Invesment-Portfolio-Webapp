import { NextRequest } from "next/server";
import { createContainer } from "@/server/container";
import { env } from "@/infrastructure/config/env";
import { runCronJob } from "@/server/jobs/runCronJob";

export async function POST(request: NextRequest) {
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? env.SCHEDULED_PORTFOLIO_ID;
  return runCronJob(request, { jobName: "portfolio-dashboard-summary-refresh", lockTtlSeconds: 20 * 60 }, async () => {
    if (!portfolioId) {
      return {
        status: "failed",
        message: "portfolio-dashboard-summary-refresh requires SCHEDULED_PORTFOLIO_ID or portfolioId query parameter.",
        errors: ["Missing portfolioId."]
      };
    }
    const summary = await createContainer().portfolioService.refreshDashboardSummary(portfolioId);
    return {
      status: "success",
      message: summary
        ? `Portfolio dashboard summary refreshed as of ${summary.asOfDate ?? "unknown date"}.`
        : "Portfolio dashboard summary refresh completed with no summary row.",
      portfolioId,
      asOfDate: summary?.asOfDate ?? null,
      latestPriceDate: summary?.latestPriceDate ?? null,
      summaryStatus: summary?.status ?? "insufficient_data"
    };
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
