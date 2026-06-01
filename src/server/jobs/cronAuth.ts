import { NextRequest, NextResponse } from "next/server";
import { env } from "../../infrastructure/config/env";
import { isCronSecretValid } from "@/application/services/news/cronSecret";

export function assertCronAuthorized(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = request.nextUrl.searchParams.get("secret") ?? bearer;
  if (!isCronSecretValid(env.CRON_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized job request." }, { status: 401 });
  }
  return null;
}
