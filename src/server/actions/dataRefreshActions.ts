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

  const job = await container.jobRunService.runManual("refresh_market_data", async () => {
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

      const benchmarks = await container.jobs.refreshBenchmarkData.run({ lookbackDays: 30 });
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
      batchSize: 25,
      maxBatches: 3,
      includeBackfill: false,
      skipDerivedMetrics: true
    });
    appendMessage(messages, "Universe prices", universePrices.message);
    errors.push(...universePrices.errors);

    const universeMarketMetrics = await container.instrumentMarketService.refreshInstrumentMarketMetricsInBatches({
      batchSize: 25,
      maxBatches: 3
    });
    appendMessage(messages, "Universe market metrics", universeMarketMetrics.message);
    errors.push(...universeMarketMetrics.errors);

    if (portfolio) {
      const dashboard = await container.portfolioService.getDashboard(portfolio.id);
      const riskReport = await container.riskAnalyticsDataService.buildReport(portfolio.id, dashboard);
      await container.riskAnalyticsRepository.upsertRiskReport({
        portfolioId: portfolio.id,
        asOfDate: riskReport.asOfDate,
        report: riskReport
      });
      appendMessage(messages, "Risk metrics", "Updated derived risk analytics.");
    }

    return {
      ok: errors.length === 0,
      message: messages.join(" "),
      errors,
      metadata: {
        messageCount: messages.length,
        errorCount: errors.length
      }
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (messages.length === 0 && job.errors.length > 0) messages.push("Refresh market data failed.");

  revalidatePath("/portfolio");
  revalidatePath("/risk");
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
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("backfill_market_history", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays: 1825,
      batchSize: 8,
      maxBatches: 1,
      includeBackfill: true
    });

    let benchmarkSummary: Awaited<ReturnType<typeof container.jobs.refreshBenchmarkData.run>> | null = null;
    if (result.requestedSymbols.length === 0) {
      benchmarkSummary = await container.jobs.refreshBenchmarkData.run({ lookbackDays: 1825 });
      if (!benchmarkSummary.ok) errors.push(benchmarkSummary.message);
    }

    refreshMessage = benchmarkSummary
      ? `History backfill: ${result.message} Benchmarks: ${benchmarkSummary.message}`
      : `History backfill: ${result.message} Benchmarks will run after instrument history backfill is complete.`;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: {
        instrumentBackfill: result,
        benchmarks: benchmarkSummary,
        skippedBenchmarksUntilInstrumentHistoryComplete: benchmarkSummary == null
      }
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "History backfill failed.";

  revalidatePath("/universe");
  revalidatePath("/watchlists");
  revalidatePath("/portfolio");
  revalidatePath("/risk");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentPricesAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("instrument-price-refresh", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentPricesInBatches({
      lookbackDays: 30,
      batchSize: 75,
      maxBatches: 1,
      includeBackfill: false,
      skipRiskMetrics: true,
      skipDerivedMetrics: true
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument price refresh failed.";

  revalidatePath("/admin/data-sources");
  revalidatePath("/instruments");
  revalidatePath("/universe");
  revalidatePath("/watchlists");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentDailyReturnsAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("instrument-daily-returns-refresh", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentDailyReturnsInBatches({
      batchSize: 25,
      maxBatches: 14
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument daily returns refresh failed.";

  revalidatePath("/admin/data-sources");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentReturnAnchorsAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("instrument-return-anchors-refresh", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentReturnAnchorsInBatches({
      batchSize: 25,
      maxBatches: 14
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument return anchors refresh failed.";

  revalidatePath("/admin/data-sources");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentMarketMetricsAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("instrument-market-metrics-refresh", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentMarketMetricsInBatches({
      batchSize: 25,
      maxBatches: 14
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument market metrics refresh failed.";

  revalidatePath("/admin/data-sources");
  revalidatePath("/instruments");
  revalidatePath("/universe");
  revalidatePath("/watchlists");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentRiskMetricsAction(formData?: FormData) {
  const container = createContainer();
  await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("refresh_instrument_risk_metrics", async () => {
    const result = await container.instrumentMarketService.refreshInstrumentRiskMetricsInBatches({
      batchSize: 200,
      minObservations: 30
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      ok: errors.length === 0,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument risk metrics refresh failed.";

  revalidatePath("/admin/data-sources");
  revalidatePath("/instruments");
  revalidatePath("/risk");
  revalidatePath("/portfolio-review");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshInstrumentMetadataAction(formData?: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const appUser = await container.portfolioService.ensureApplicationUser(authUser);
  const destination = returnPath(formData);
  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("instrument-metadata-refresh", async () => {
    const result = await container.metadataRefreshService.refreshUniverseMetadataInBatches({
      requestedByUserId: appUser.id,
      batchSize: 25,
      maxBatches: 14,
      forceIdentifierRefresh: true
    });
    refreshMessage = result.message;
    errors.push(...result.errors);

    return {
      status: errors.length > 0 ? "partial_success" : "success",
      ok: true,
      message: refreshMessage,
      errors,
      metadata: result
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Instrument metadata refresh failed.";

  revalidatePath("/admin/data-sources");
  revalidatePath("/instruments");
  revalidatePath("/instruments/universe");
  revalidatePath("/instruments/watchlist");
  revalidatePath("/universe");
  revalidatePath("/watchlists");
  revalidatePath("/portfolio");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}

export async function refreshPortfolioSummaryTablesAction(formData?: FormData) {
  const container = createContainer();
  const authUser = await container.authProvider.requireUser();
  const destination = returnPath(formData);
  const { portfolio } = await container.portfolioService.getOrCreateDefaultPortfolio(authUser);
  if (!portfolio) redirect("/setup");

  const errors: string[] = [];
  let refreshMessage = "";

  const job = await container.jobRunService.runManual("portfolio-summary-refresh", async () => {
    const dashboardSummary = await container.portfolioService.refreshDashboardSummary(portfolio.id);
    const performanceSummary = await container.portfolioService.refreshPerformanceSummary(portfolio.id);
    refreshMessage = "Portfolio summary tables refreshed.";

    return {
      ok: true,
      message: refreshMessage,
      errors,
      metadata: {
        dashboardSummary: {
          asOfDate: dashboardSummary?.asOfDate ?? null,
          latestPriceDate: dashboardSummary?.latestPriceDate ?? null,
          status: dashboardSummary?.status ?? "insufficient_data"
        },
        performanceSummary: {
          asOfDate: performanceSummary?.asOfDate ?? null,
          latestPriceDate: performanceSummary?.latestPriceDate ?? null,
          status: performanceSummary?.status ?? "insufficient_data"
        }
      }
    };
  });
  if (job.errors.length > 0 && errors.length === 0) errors.push(...job.errors);
  if (!refreshMessage && job.errors.length > 0) refreshMessage = "Portfolio summary refresh failed.";

  revalidatePath("/admin/data-sources");
  revalidatePath("/portfolio");
  revalidatePath("/holdings");
  revalidatePath("/cash");

  const params = new URLSearchParams({
    refreshMessage
  });
  if (errors.length > 0) params.set("refreshError", errors.join(" | "));

  redirect(`${destination}?${params.toString()}`);
}
