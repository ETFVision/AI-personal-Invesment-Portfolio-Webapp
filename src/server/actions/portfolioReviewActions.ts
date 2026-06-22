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

export async function clearEtfLookthroughExposureAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  const destination = String(formData?.get("returnTo") ?? "/admin/data-sources");
  const target = destination.startsWith("/") ? destination : "/admin/data-sources";

  try {
    await container.etfExposureRepository.clearAllExposures();
    revalidatePath("/admin/data-sources");
  } catch (error) {
    const params = new URLSearchParams({
      portfolioReviewError: error instanceof Error ? error.message : "ETF exposure clear failed."
    });
    redirect(`${target}?${params.toString()}`);
  }

  redirect(target);
}

export async function refreshEtfLookthroughExposureAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireAdmin();
  const destination = String(formData?.get("returnTo") ?? "/portfolio-review");
  const force = String(formData?.get("force") ?? "") === "true";
  let target = destination.startsWith("/") ? destination : "/portfolio-review";

  try {
    const result = await container.jobs.etfLookthroughRefresh.run({ force });
    revalidatePath("/portfolio-review");
    revalidatePath("/admin/data-sources");
    const params = new URLSearchParams({
      portfolioReviewMessage: `ETF exposure refresh ${result.status}: ${result.etfsRefreshed}/${result.etfsRequested} ETFs refreshed, ${result.sectorRows} sector rows, ${result.countryRows} country rows, ${result.topHoldingRows} top holding rows.`
    });
    if (result.message) params.set("portfolioReviewError", result.message);
    target = `${target}?${params.toString()}`;
  } catch (error) {
    const params = new URLSearchParams({
      portfolioReviewError: error instanceof Error ? error.message : "ETF exposure refresh failed."
    });
    target = `${target}?${params.toString()}`;
  }

  redirect(target);
}
