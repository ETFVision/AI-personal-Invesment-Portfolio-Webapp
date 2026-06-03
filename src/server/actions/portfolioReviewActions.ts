"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

export async function runPortfolioReviewAction(formData?: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  const destination = String(formData?.get("returnTo") ?? "/portfolio-review");

  if (!portfolio) {
    redirect("/setup");
  }

  const result = await container.portfolioReviewRunService.run({
    portfolioId: portfolio.id,
    runType: "manual"
  });

  revalidatePath("/portfolio-review");
  revalidatePath("/portfolio");

  const params = new URLSearchParams({
    portfolioReviewMessage: result.report
      ? `Portfolio review completed with score ${result.report.overallPortfolioScore ?? "insufficient data"}.`
      : "Portfolio review run completed."
  });
  if (result.run.status === "failed" && result.run.errorMessage) {
    params.set("portfolioReviewError", result.run.errorMessage);
  }

  redirect(`${destination.startsWith("/") ? destination : "/portfolio-review"}?${params.toString()}`);
}
