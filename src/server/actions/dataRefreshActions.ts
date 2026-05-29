"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function returnPath(formData?: FormData) {
  const raw = String(formData?.get("returnTo") ?? "/portfolio");
  return raw.startsWith("/") ? raw : "/portfolio";
}

function appendMessage(parts: string[], label: string, message: string) {
  if (message) parts.push(`${label}: ${message}`);
}

export async function refreshAllDataAction(formData?: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const messages: string[] = [];
  const errors: string[] = [];

  const { user, portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);

  if (portfolio) {
    const portfolioMetadata = await container.assetMetadataService.refreshPortfolioAssetMetadata({
      userId: user.id,
      portfolioId: portfolio.id
    });
    appendMessage(messages, "Portfolio metadata", portfolioMetadata.message);
    errors.push(...portfolioMetadata.errors);

    const portfolioPrices = await container.jobs.refreshPortfolioPrices.run({
      userId: user.id,
      portfolioId: portfolio.id
    });
    appendMessage(messages, "Portfolio prices", portfolioPrices.message);
    if (!portfolioPrices.ok) errors.push(portfolioPrices.message);
    const storedPortfolioPriceCount =
      portfolioPrices.metadata &&
      typeof portfolioPrices.metadata === "object" &&
      "storedCount" in portfolioPrices.metadata &&
      typeof portfolioPrices.metadata.storedCount === "number"
        ? portfolioPrices.metadata.storedCount
        : 0;
    if (portfolioPrices.ok && storedPortfolioPriceCount > 0) {
      await container.portfolioService.createAnalyticsSnapshot(portfolio.id);
    }

    const benchmarks = await container.jobs.refreshBenchmarkData.run({ lookbackDays: 365 });
    appendMessage(messages, "Benchmarks", benchmarks.message);
    if (!benchmarks.ok) errors.push(benchmarks.message);
  }

  const appUser = await container.portfolioService.ensureApplicationUser(authUser);
  const universeMetadata = await container.metadataRefreshService.refreshUniverseMetadataInBatches({
    requestedByUserId: appUser.id,
    batchSize: 24,
    maxBatches: 4
  });
  appendMessage(messages, "Universe metadata", universeMetadata.message);
  errors.push(...universeMetadata.errors);

  const universePrices = await container.instrumentMarketService.refreshInstrumentPricesInBatches({
    lookbackDays: 30,
    batchSize: 12,
    maxBatches: 8,
    includeBackfill: false
  });
  appendMessage(messages, "Universe prices", universePrices.message);
  errors.push(...universePrices.errors);

  revalidatePath("/portfolio");
  revalidatePath("/setup");
  revalidatePath("/holdings");
  revalidatePath("/universe");
  revalidatePath("/watchlists");

  const params = new URLSearchParams({
    refreshMessage: messages.join(" ")
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function backfillUniverseHistoryAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);

  const result = await container.instrumentMarketService.refreshInstrumentPricesInBatches({
    lookbackDays: 1825,
    batchSize: 6,
    maxBatches: 2,
    includeBackfill: true
  });

  revalidatePath("/universe");
  revalidatePath("/watchlists");

  const params = new URLSearchParams({
    refreshMessage: `History backfill: ${result.message}`
  });
  if (result.errors.length > 0) params.set("refreshError", result.errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}
