import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";
import { assertCronAuthorized } from "@/server/jobs/cronAuth";

export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId");
  if (!portfolioId) {
    return NextResponse.json({ error: "portfolioId is required for scheduled portfolio review runs." }, { status: 400 });
  }
  const result = await createContainer().jobs.portfolioReviewRun.run({
    portfolioId,
    runType: "scheduled"
  });
  return NextResponse.json({
    run: result.run,
    reportId: result.report?.id ?? null,
    overallPortfolioScore: result.report?.overallPortfolioScore ?? null
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
