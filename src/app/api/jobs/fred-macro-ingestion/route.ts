import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";
import { assertCronAuthorized } from "@/server/jobs/cronAuth";

export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;
  const backfill = request.nextUrl.searchParams.get("backfill") === "true";
  const result = await createContainer().jobs.fredMacroIngestion.run({ backfill });
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
