import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";
import { assertCronAuthorized } from "@/server/jobs/cronAuth";

export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;
  const result = await createContainer().jobs.weeklyMarketVision.run();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
