import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Requires ADMIN_SECRET environment variable set in Vercel.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("market-data");
  revalidateTag("macro-data");
  revalidateTag("news-data");
  revalidateTag("market-vision-data");
  revalidateTag("fundamentals-data");

  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
