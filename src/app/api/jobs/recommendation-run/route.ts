import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";
import { assertCronAuthorized } from "@/server/jobs/cronAuth";

export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;
  const symbol = request.nextUrl.searchParams.get("symbol") ?? undefined;
  const portfolioId = request.nextUrl.searchParams.get("portfolioId") ?? null;
  const runType = request.nextUrl.searchParams.get("runType") ?? "scheduled";
  const result = await createContainer().jobs.recommendationRun.run({ symbol, portfolioId, runType });
  return NextResponse.json({
    run: result.run,
    recommendationsCreated: result.recommendations.length
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
