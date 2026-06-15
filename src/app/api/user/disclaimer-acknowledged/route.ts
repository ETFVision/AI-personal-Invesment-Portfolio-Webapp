import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/server/container";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import { DISCLAIMER_STORAGE_KEY } from "@/lib/compliance/disclaimers";

type DisclaimerAcknowledgementBody = {
  acknowledged_at?: unknown;
};

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await createContainer().authProvider.getCurrentUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({})) as DisclaimerAcknowledgementBody;
    if (!isIsoTimestamp(body.acknowledged_at)) {
      return NextResponse.json({ error: "A valid acknowledged_at ISO timestamp is required." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(authUser.id);
    if (getUserError) throw new Error(getUserError.message);

    const userMetadata = {
      ...(userData.user?.user_metadata ?? {}),
      [`${DISCLAIMER_STORAGE_KEY}_acknowledged_at`]: body.acknowledged_at
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: userMetadata
    });
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ acknowledged_at: body.acknowledged_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record disclaimer acknowledgement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
