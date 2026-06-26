import assert from "node:assert/strict";
import test from "node:test";

function setRequiredEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
  process.env.CRON_SECRET ??= "cron-secret";
}

async function loadJobHelpers() {
  setRequiredEnv();
  return import("../src/server/jobs/portfolioScheduledFanout.js");
}

test("portfolio valuation refresh uses explicit portfolioId without listing all portfolios", async () => {
  const { runPortfolioValuationRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => {
        throw new Error("should not list portfolios");
      }
    },
    portfolioService: {
      createAnalyticsSnapshot: async (portfolioId: string) => {
        calls.push(`snapshot:${portfolioId}`);
      },
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
      }
    }
  };

  const result = await runPortfolioValuationRefresh(container, "p1");

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 1);
  assert.deepEqual(calls, ["snapshot:p1", "dashboard:p1", "performance:p1"]);
});

test("portfolio valuation refresh fans out across all active portfolios", async () => {
  const { runPortfolioValuationRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    portfolioService: {
      createAnalyticsSnapshot: async (portfolioId: string) => {
        calls.push(`snapshot:${portfolioId}`);
      },
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
      }
    }
  };

  const result = await runPortfolioValuationRefresh(container, null);

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 2);
  assert.deepEqual(calls, [
    "snapshot:p1",
    "dashboard:p1",
    "performance:p1",
    "snapshot:p2",
    "dashboard:p2",
    "performance:p2"
  ]);
});

test("portfolio valuation refresh isolates one failing portfolio", async () => {
  const { runPortfolioValuationRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    portfolioService: {
      createAnalyticsSnapshot: async (portfolioId: string) => {
        calls.push(`snapshot:${portfolioId}`);
        if (portfolioId === "p1") throw new Error("snapshot failed");
      },
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
      }
    }
  };

  const result = await runPortfolioValuationRefresh(container, null);

  assert.equal(result.status, "partial_success");
  assert.equal(result.processedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.deepEqual(result.failedPortfolioIds, ["p1"]);
  assert.deepEqual(calls, ["snapshot:p1", "snapshot:p2", "dashboard:p2", "performance:p2"]);
});

test("portfolio summary refresh uses explicit portfolioId without listing all portfolios", async () => {
  const { runPortfolioSummaryRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => {
        throw new Error("should not list portfolios");
      }
    },
    portfolioService: {
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
        return { asOfDate: "2026-06-26", latestPriceDate: "2026-06-25", status: "current" };
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
        return { asOfDate: "2026-06-26", latestPriceDate: "2026-06-25", status: "current" };
      }
    }
  };

  const result = await runPortfolioSummaryRefresh(container, "p1");

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 1);
  assert.deepEqual(calls, ["dashboard:p1", "performance:p1"]);
  assert.equal(result.dashboardSummary?.status, "current");
});

test("portfolio summary refresh fans out across all active portfolios", async () => {
  const { runPortfolioSummaryRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    portfolioService: {
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
        return null;
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
        return null;
      }
    }
  };

  const result = await runPortfolioSummaryRefresh(container, null);

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 2);
  assert.deepEqual(calls, ["dashboard:p1", "performance:p1", "dashboard:p2", "performance:p2"]);
});

test("portfolio summary refresh isolates one failing portfolio", async () => {
  const { runPortfolioSummaryRefresh } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    portfolioService: {
      refreshDashboardSummary: async (portfolioId: string) => {
        calls.push(`dashboard:${portfolioId}`);
        if (portfolioId === "p1") throw new Error("summary failed");
        return null;
      },
      refreshPerformanceSummary: async (portfolioId: string) => {
        calls.push(`performance:${portfolioId}`);
        return null;
      }
    }
  };

  const result = await runPortfolioSummaryRefresh(container, null);

  assert.equal(result.status, "partial_success");
  assert.equal(result.processedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.deepEqual(result.failedPortfolioIds, ["p1"]);
  assert.deepEqual(calls, ["dashboard:p1", "dashboard:p2", "performance:p2"]);
});

test("portfolio review run uses explicit portfolioId without listing all portfolios", async () => {
  const { runScheduledPortfolioReviews } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => {
        throw new Error("should not list portfolios");
      }
    },
    jobs: {
      portfolioReviewRun: {
        run: async ({ portfolioId }: { portfolioId: string; runType: "scheduled" }) => {
          calls.push(portfolioId);
          return {
            run: { id: `run-${portfolioId}` },
            report: { id: `report-${portfolioId}`, overallPortfolioScore: 82 }
          };
        }
      }
    }
  };

  const result = await runScheduledPortfolioReviews(container, "p1");

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 1);
  assert.deepEqual(calls, ["p1"]);
  assert.equal(result.runId, "run-p1");
  assert.equal(result.reportId, "report-p1");
});

test("portfolio review run fans out across all active portfolios", async () => {
  const { runScheduledPortfolioReviews } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    jobs: {
      portfolioReviewRun: {
        run: async ({ portfolioId }: { portfolioId: string; runType: "scheduled" }) => {
          calls.push(portfolioId);
          return {
            run: { id: `run-${portfolioId}` },
            report: { id: `report-${portfolioId}`, overallPortfolioScore: 82 }
          };
        }
      }
    }
  };

  const result = await runScheduledPortfolioReviews(container, null);

  assert.equal(result.status, "success");
  assert.equal(result.processedCount, 2);
  assert.equal(result.runCount, 2);
  assert.equal(result.reportCount, 2);
  assert.deepEqual(calls, ["p1", "p2"]);
});

test("portfolio review run isolates one failing portfolio", async () => {
  const { runScheduledPortfolioReviews } = await loadJobHelpers();
  const calls: string[] = [];
  const container = {
    portfolioRepository: {
      listActivePortfolioIds: async () => ["p1", "p2"]
    },
    jobs: {
      portfolioReviewRun: {
        run: async ({ portfolioId }: { portfolioId: string; runType: "scheduled" }) => {
          calls.push(portfolioId);
          if (portfolioId === "p1") throw new Error("review failed");
          return {
            run: { id: `run-${portfolioId}` },
            report: { id: `report-${portfolioId}`, overallPortfolioScore: 82 }
          };
        }
      }
    }
  };

  const result = await runScheduledPortfolioReviews(container, null);

  assert.equal(result.status, "partial_success");
  assert.equal(result.processedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.deepEqual(result.failedPortfolioIds, ["p1"]);
  assert.deepEqual(calls, ["p1", "p2"]);
});
