type PortfolioJobStatus = "success" | "partial_success" | "failed";

type PortfolioReadModelSummary = {
  asOfDate?: string | null;
  latestPriceDate?: string | null;
  status?: string | null;
} | null;

export type PortfolioValuationRefreshContainer = {
  portfolioRepository: {
    listActivePortfolioIds(): Promise<string[]>;
  };
  portfolioService: {
    createAnalyticsSnapshot(portfolioId: string): Promise<unknown>;
    refreshDashboardSummary(portfolioId: string): Promise<unknown>;
    refreshPerformanceSummary(portfolioId: string): Promise<unknown>;
  };
};

export type PortfolioSummaryRefreshContainer = {
  portfolioRepository: {
    listActivePortfolioIds(): Promise<string[]>;
  };
  portfolioService: {
    refreshDashboardSummary(portfolioId: string): Promise<PortfolioReadModelSummary>;
    refreshPerformanceSummary(portfolioId: string): Promise<PortfolioReadModelSummary>;
  };
};

export type PortfolioReviewRunContainer = {
  portfolioRepository: {
    listActivePortfolioIds(): Promise<string[]>;
  };
  jobs: {
    portfolioReviewRun: {
      run(input: { portfolioId: string; runType: "scheduled" }): Promise<{
        run: { id: string };
        report?: { id?: string | null; overallPortfolioScore?: number | null } | null;
      }>;
    };
  };
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function emptyPortfolioResult(message: string, portfolioId: string | null) {
  return {
    status: "failed" as const,
    message,
    portfolioId,
    processedCount: 0,
    failedCount: 0,
    processedPortfolioIds: [],
    failedPortfolioIds: [],
    errors: ["No active portfolios found."]
  };
}

function summarizeReadModel(summary: PortfolioReadModelSummary) {
  return {
    asOfDate: summary?.asOfDate ?? null,
    latestPriceDate: summary?.latestPriceDate ?? null,
    status: summary?.status ?? "insufficient_data"
  };
}

export async function runPortfolioValuationRefresh(
  container: PortfolioValuationRefreshContainer,
  portfolioId: string | null
) {
  const portfolioIds = portfolioId ? [portfolioId] : await container.portfolioRepository.listActivePortfolioIds();
  if (portfolioIds.length === 0) {
    return emptyPortfolioResult("Portfolio valuation refresh found no active portfolios.", portfolioId);
  }

  const errors: string[] = [];
  const processedPortfolioIds: string[] = [];
  const failedPortfolioIds: string[] = [];

  for (const id of portfolioIds) {
    try {
      await container.portfolioService.createAnalyticsSnapshot(id);
      await container.portfolioService.refreshDashboardSummary(id);
      await container.portfolioService.refreshPerformanceSummary(id);
      processedPortfolioIds.push(id);
    } catch (error) {
      failedPortfolioIds.push(id);
      errors.push(`${id}: ${errorMessage(error)}`);
    }
  }

  const processedCount = processedPortfolioIds.length;
  const failedCount = failedPortfolioIds.length;
  const status: PortfolioJobStatus =
    processedCount === 0 ? "failed" : failedCount > 0 ? "partial_success" : "success";

  return {
    status,
    message: `Portfolio valuation refresh processed ${processedCount} portfolio(s); ${failedCount} failed.`,
    portfolioId,
    processedCount,
    failedCount,
    processedPortfolioIds,
    failedPortfolioIds,
    errors
  };
}

export async function runPortfolioSummaryRefresh(container: PortfolioSummaryRefreshContainer, portfolioId: string | null) {
  const portfolioIds = portfolioId ? [portfolioId] : await container.portfolioRepository.listActivePortfolioIds();
  if (portfolioIds.length === 0) {
    return emptyPortfolioResult("Portfolio summary refresh found no active portfolios.", portfolioId);
  }

  const errors: string[] = [];
  const processedPortfolioIds: string[] = [];
  const failedPortfolioIds: string[] = [];
  let dashboardSummary: PortfolioReadModelSummary = null;
  let performanceSummary: PortfolioReadModelSummary = null;

  for (const id of portfolioIds) {
    try {
      dashboardSummary = await container.portfolioService.refreshDashboardSummary(id);
      performanceSummary = await container.portfolioService.refreshPerformanceSummary(id);
      processedPortfolioIds.push(id);
    } catch (error) {
      failedPortfolioIds.push(id);
      errors.push(`${id}: ${errorMessage(error)}`);
    }
  }

  const processedCount = processedPortfolioIds.length;
  const failedCount = failedPortfolioIds.length;
  const status: PortfolioJobStatus =
    processedCount === 0 ? "failed" : failedCount > 0 ? "partial_success" : "success";

  return {
    status,
    message: `Portfolio summary refresh processed ${processedCount} portfolio(s); ${failedCount} failed.`,
    portfolioId,
    processedCount,
    failedCount,
    processedPortfolioIds,
    failedPortfolioIds,
    errors,
    dashboardSummary: portfolioId ? summarizeReadModel(dashboardSummary) : undefined,
    performanceSummary: portfolioId ? summarizeReadModel(performanceSummary) : undefined
  };
}

export async function runScheduledPortfolioReviews(container: PortfolioReviewRunContainer, portfolioId: string | null) {
  const portfolioIds = portfolioId ? [portfolioId] : await container.portfolioRepository.listActivePortfolioIds();
  if (portfolioIds.length === 0) {
    return {
      ...emptyPortfolioResult("Portfolio review run found no active portfolios.", portfolioId),
      runCount: 0,
      reportCount: 0
    };
  }

  const errors: string[] = [];
  const processedPortfolioIds: string[] = [];
  const failedPortfolioIds: string[] = [];
  const runIds: string[] = [];
  const reportIds: string[] = [];
  let singleResult = null as Awaited<ReturnType<PortfolioReviewRunContainer["jobs"]["portfolioReviewRun"]["run"]>> | null;

  for (const id of portfolioIds) {
    try {
      const result = await container.jobs.portfolioReviewRun.run({
        portfolioId: id,
        runType: "scheduled"
      });
      singleResult = result;
      processedPortfolioIds.push(id);
      runIds.push(result.run.id);
      if (result.report?.id) reportIds.push(result.report.id);
    } catch (error) {
      failedPortfolioIds.push(id);
      errors.push(`${id}: ${errorMessage(error)}`);
    }
  }

  const processedCount = processedPortfolioIds.length;
  const failedCount = failedPortfolioIds.length;
  const status: PortfolioJobStatus =
    processedCount === 0 ? "failed" : failedCount > 0 ? "partial_success" : "success";

  return {
    status,
    message: `Portfolio review run processed ${processedCount} portfolio(s); ${failedCount} failed; ${runIds.length} run(s), ${reportIds.length} report(s).`,
    portfolioId,
    processedCount,
    failedCount,
    runCount: runIds.length,
    reportCount: reportIds.length,
    processedPortfolioIds,
    failedPortfolioIds,
    runIds,
    reportIds,
    errors,
    runId: portfolioId ? singleResult?.run.id ?? null : undefined,
    reportId: portfolioId ? singleResult?.report?.id ?? null : undefined,
    overallPortfolioScore: portfolioId ? singleResult?.report?.overallPortfolioScore ?? null : undefined,
    run: portfolioId ? singleResult?.run ?? null : undefined
  };
}
