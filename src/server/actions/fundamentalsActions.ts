"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function returnPath(formData?: FormData) {
  const raw = String(formData?.get("returnTo") ?? "/fundamentals");
  return raw.startsWith("/") ? raw : "/fundamentals";
}

export async function refreshFundamentalsAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  const symbol = String(formData?.get("symbol") ?? "").trim().toUpperCase() || undefined;
  const force = String(formData?.get("force") ?? "") === "true";
  const result = await container.jobs.fundamentalsRefresh.run({ force, symbol });

  revalidatePath("/fundamentals");
  revalidatePath("/admin/data-sources");
  if (symbol) revalidatePath(`/fundamentals/${symbol}`);

  const params = new URLSearchParams({
    message: result.message
  });
  if (!result.ok || result.failedSymbols.length > 0) {
    params.set("error", result.failedSymbols.length > 0 ? `Failed: ${result.failedSymbols.join(", ")}` : result.message);
  }

  redirect(`${returnPath(formData)}?${params.toString()}`);
}
