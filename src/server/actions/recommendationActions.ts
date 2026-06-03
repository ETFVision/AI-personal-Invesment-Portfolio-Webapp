"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

export async function runRecommendationsAction(formData?: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const symbol = String(formData?.get("symbol") ?? "").trim() || undefined;
  const destination = String(formData?.get("returnTo") ?? "/recommendations");
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  const result = await container.recommendationService.runRecommendations({
    runType: "manual",
    symbol,
    portfolioId: portfolio?.id ?? null
  });

  revalidatePath("/recommendations");
  revalidatePath("/instruments/[symbol]", "page");

  const params = new URLSearchParams({
    recommendationMessage: `Recommendation run completed: ${result.recommendations.length} recommendations created.`
  });
  if (result.run.status === "failed" && result.run.errorMessage) {
    params.set("recommendationError", result.run.errorMessage);
  }
  redirect(`${destination.startsWith("/") ? destination : "/recommendations"}?${params.toString()}`);
}
