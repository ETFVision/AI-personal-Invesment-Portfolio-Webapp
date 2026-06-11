import {
  AnalyticsRepository,
  UpsertPortfolioSnapshotInput
} from "@/application/ports/repositories/AnalyticsRepository";
import {
  AssetSnapshot,
  CashSnapshot,
  HoldingMarketMetric,
  HoldingSnapshot,
  HoldingValuation,
  PortfolioCurrentMetric,
  PortfolioDashboardSummary,
  PortfolioPerformanceSummary,
  PortfolioSnapshot
} from "@/domain/portfolio/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function mapPortfolioSnapshot(row: any): PortfolioSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    snapshotDate: row.snapshot_date,
    totalValue: Number(row.total_value),
    cashValue: Number(row.cash_value),
    investedValue: Number(row.invested_value),
    currency: row.currency
  };
}

function mapAssetSnapshot(row: any): AssetSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    snapshotDate: row.snapshot_date,
    marketValue: Number(row.market_value),
    costBasis: row.cost_basis == null ? null : Number(row.cost_basis),
    currency: row.currency
  };
}

function mapHoldingSnapshot(row: any): HoldingSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    holdingId: row.holding_id,
    assetId: row.asset_id,
    snapshotDate: row.snapshot_date,
    quantity: Number(row.quantity),
    marketPrice: row.market_price == null ? null : Number(row.market_price),
    marketValue: Number(row.market_value),
    costBasis: row.cost_basis == null ? null : Number(row.cost_basis),
    unrealizedGainLoss: row.unrealized_gain_loss == null ? null : Number(row.unrealized_gain_loss),
    currency: row.currency
  };
}

function mapCashSnapshot(row: any): CashSnapshot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    cashBalanceId: row.cash_balance_id,
    snapshotDate: row.snapshot_date,
    amount: Number(row.amount),
    currency: row.currency
  };
}

function mapHoldingMarketMetric(row: any): HoldingMarketMetric {
  return {
    holdingId: row.holding_id,
    instrumentId: row.instrument_id,
    latestPrice: row.latest_price == null ? null : Number(row.latest_price),
    latestPriceDate: row.latest_price_date,
    marketValue: Number(row.market_value),
    dailyReturn: row.daily_return == null ? null : Number(row.daily_return),
    weeklyReturn: row.weekly_return == null ? null : Number(row.weekly_return),
    monthlyReturn: row.monthly_return == null ? null : Number(row.monthly_return),
    ytdReturn: row.ytd_return == null ? null : Number(row.ytd_return),
    oneYearReturn: row.one_year_return == null ? null : Number(row.one_year_return),
    threeYearReturn: row.three_year_return == null ? null : Number(row.three_year_return),
    fiveYearReturn: row.five_year_return == null ? null : Number(row.five_year_return),
    sinceInceptionReturn: row.since_inception_return == null ? null : Number(row.since_inception_return),
    fiftyTwoWeekLow: row.fifty_two_week_low == null ? null : Number(row.fifty_two_week_low),
    fiftyTwoWeekHigh: row.fifty_two_week_high == null ? null : Number(row.fifty_two_week_high),
    updatedAt: row.updated_at
  };
}

function mapPortfolioCurrentMetric(row: any): PortfolioCurrentMetric {
  return {
    portfolioId: row.portfolio_id,
    totalCash: Number(row.total_cash),
    totalHoldingsMarketValue: Number(row.total_holdings_market_value),
    totalValueEstimate: Number(row.total_value_estimate),
    investedAmount: Number(row.invested_amount),
    unrealizedGainLoss: Number(row.unrealized_gain_loss),
    unrealizedGainLossPercent: Number(row.unrealized_gain_loss_percent),
    latestPriceDate: row.latest_price_date,
    updatedAt: row.updated_at
  };
}

function mapPortfolioPerformanceSummary(row: any): PortfolioPerformanceSummary {
  return {
    portfolioId: row.portfolio_id,
    asOfDate: row.as_of_date,
    latestPriceDate: row.latest_price_date,
    performance: Array.isArray(row.performance_json) ? row.performance_json : [],
    benchmarkComparisons: Array.isArray(row.benchmark_comparisons_json) ? row.benchmark_comparisons_json : [],
    calculationVersion: row.calculation_version ?? "portfolio-performance-summary-v1",
    status: row.status ?? "fresh",
    staleReason: row.stale_reason ?? null,
    errorMessage: row.error_message ?? null,
    sourceUpdatedAt: row.source_updated_at ?? null,
    updatedAt: row.updated_at
  };
}

function mapPortfolioDashboardSummary(row: any): PortfolioDashboardSummary {
  return {
    portfolioId: row.portfolio_id,
    asOfDate: row.as_of_date,
    latestPriceDate: row.latest_price_date,
    dashboard: row.dashboard_json,
    calculationVersion: row.calculation_version ?? "portfolio-dashboard-summary-v1",
    status: row.status ?? "fresh",
    staleReason: row.stale_reason ?? null,
    errorMessage: row.error_message ?? null,
    sourceUpdatedAt: row.source_updated_at ?? null,
    updatedAt: row.updated_at
  };
}

function isMissingSnapshotTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("snapshot") && error.message?.toLowerCase().includes("does not exist")))
  );
}

function isMissingPerformanceSummary(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(error && (error.code === "42P01" || message.includes("portfolio_performance_summary")));
}

function isMissingDashboardSummary(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(error && (error.code === "42P01" || message.includes("portfolio_dashboard_summary")));
}

function isMissingDerivedMetrics(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    message.includes("holding_market_metrics") ||
    message.includes("portfolio_current_metrics") ||
    message.includes("refresh_holding_portfolio_metrics") ||
    message.includes("could not find the function")
  );
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listPortfolioSnapshots(portfolioId: string, limit = 500) {
    const { data, error } = await this.db
      .from("portfolio_snapshots")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("snapshot_date", { ascending: false })
      .limit(limit);
    if (isMissingSnapshotTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapPortfolioSnapshot);
  }

  async listAssetSnapshots(portfolioId: string, limit = 500) {
    const { data, error } = await this.db
      .from("asset_snapshots")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("snapshot_date", { ascending: false })
      .limit(limit);
    if (isMissingSnapshotTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAssetSnapshot);
  }

  async listHoldingSnapshots(portfolioId: string, limit = 500) {
    const { data, error } = await this.db
      .from("holding_snapshots")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("snapshot_date", { ascending: false })
      .limit(limit);
    if (isMissingSnapshotTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapHoldingSnapshot);
  }

  async listCashSnapshots(portfolioId: string, limit = 500) {
    const { data, error } = await this.db
      .from("cash_snapshots")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("snapshot_date", { ascending: false })
      .limit(limit);
    if (isMissingSnapshotTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCashSnapshot);
  }

  async refreshHoldingPortfolioMetrics(portfolioId: string) {
    const { error } = await this.db.rpc("refresh_holding_portfolio_metrics", {
      target_portfolio_id: portfolioId
    });
    if (isMissingDerivedMetrics(error)) return;
    if (error) throw new Error(error.message);
  }

  async listHoldingMarketMetrics(portfolioId: string) {
    const { data, error } = await this.db
      .from("holding_market_metrics")
      .select("*")
      .eq("portfolio_id", portfolioId);
    if (isMissingDerivedMetrics(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapHoldingMarketMetric);
  }

  async getPortfolioCurrentMetric(portfolioId: string) {
    const { data, error } = await this.db
      .from("portfolio_current_metrics")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .maybeSingle();
    if (isMissingDerivedMetrics(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapPortfolioCurrentMetric(data) : null;
  }

  async getPortfolioDashboardSummary(portfolioId: string) {
    const { data, error } = await this.db
      .from("portfolio_dashboard_summary")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .maybeSingle();
    if (isMissingDashboardSummary(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapPortfolioDashboardSummary(data) : null;
  }

  async upsertPortfolioDashboardSummary(input: Omit<PortfolioDashboardSummary, "updatedAt">) {
    const { error } = await this.db.from("portfolio_dashboard_summary").upsert(
      {
        portfolio_id: input.portfolioId,
        as_of_date: input.asOfDate,
        latest_price_date: input.latestPriceDate,
        dashboard_json: input.dashboard,
        calculation_version: input.calculationVersion,
        status: input.status,
        stale_reason: input.staleReason,
        error_message: input.errorMessage,
        source_updated_at: input.sourceUpdatedAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "portfolio_id" }
    );
    if (isMissingDashboardSummary(error)) return;
    if (error) throw new Error(error.message);
  }

  async getPortfolioPerformanceSummary(portfolioId: string) {
    const { data, error } = await this.db
      .from("portfolio_performance_summary")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .maybeSingle();
    if (isMissingPerformanceSummary(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapPortfolioPerformanceSummary(data) : null;
  }

  async upsertPortfolioPerformanceSummary(input: Omit<PortfolioPerformanceSummary, "updatedAt">) {
    const { error } = await this.db.from("portfolio_performance_summary").upsert(
      {
        portfolio_id: input.portfolioId,
        as_of_date: input.asOfDate,
        latest_price_date: input.latestPriceDate,
        performance_json: input.performance,
        benchmark_comparisons_json: input.benchmarkComparisons,
        calculation_version: input.calculationVersion,
        status: input.status,
        stale_reason: input.staleReason,
        error_message: input.errorMessage,
        source_updated_at: input.sourceUpdatedAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "portfolio_id" }
    );
    if (isMissingPerformanceSummary(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertPortfolioSnapshot(input: UpsertPortfolioSnapshotInput) {
    const { error } = await this.db.from("portfolio_snapshots").upsert(
      {
        portfolio_id: input.portfolioId,
        snapshot_date: input.snapshotDate,
        total_value: input.totalValue,
        cash_value: input.cashValue,
        invested_value: input.investedValue,
        unrealized_gain_loss: input.unrealizedGainLoss,
        realized_gain_loss: input.realizedGainLoss,
        currency: input.currency,
        asset_class_allocations: input.assetClassAllocations,
        sector_allocations: input.sectorAllocations,
        geography_allocations: input.geographyAllocations,
        currency_allocations: input.currencyAllocations
      },
      { onConflict: "portfolio_id,snapshot_date" }
    );
    if (isMissingSnapshotTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertAssetSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    valuations: HoldingValuation[];
  }) {
    if (input.valuations.length === 0) return;

    const { error } = await this.db.from("asset_snapshots").upsert(
      input.valuations.map((valuation) => {
        const costBasis = valuation.holding.quantity * (valuation.holding.averageCost ?? 0);
        return {
          portfolio_id: input.portfolioId,
          asset_id: valuation.holding.assetId,
          snapshot_date: input.snapshotDate,
          quantity: valuation.holding.quantity,
          market_price: valuation.unitPrice,
          market_value: valuation.value,
          cost_basis: costBasis,
          unrealized_gain_loss: valuation.value - costBasis,
          currency: valuation.valueCurrency
        };
      }),
      { onConflict: "portfolio_id,asset_id,snapshot_date" }
    );
    if (isMissingSnapshotTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertHoldingSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    valuations: HoldingValuation[];
  }) {
    if (input.valuations.length === 0) return;

    const { error } = await this.db.from("holding_snapshots").upsert(
      input.valuations.map((valuation) => {
        const costBasis = valuation.holding.quantity * (valuation.holding.averageCost ?? 0);
        return {
          portfolio_id: input.portfolioId,
          holding_id: valuation.holding.id,
          asset_id: valuation.holding.assetId,
          snapshot_date: input.snapshotDate,
          quantity: valuation.holding.quantity,
          market_price: valuation.unitPrice,
          market_value: valuation.value,
          cost_basis: costBasis,
          unrealized_gain_loss: valuation.value - costBasis,
          currency: valuation.valueCurrency
        };
      }),
      { onConflict: "portfolio_id,holding_id,snapshot_date" }
    );
    if (isMissingSnapshotTable(error)) return;
    if (error) throw new Error(error.message);
  }

  async upsertCashSnapshots(input: {
    portfolioId: string;
    snapshotDate: string;
    cashBalances: Array<{ id: string; amount: number; currency: string }>;
  }) {
    if (input.cashBalances.length === 0) return;

    const { error } = await this.db.from("cash_snapshots").upsert(
      input.cashBalances.map((cash) => ({
        portfolio_id: input.portfolioId,
        cash_balance_id: cash.id,
        snapshot_date: input.snapshotDate,
        amount: cash.amount,
        currency: cash.currency
      })),
      { onConflict: "portfolio_id,cash_balance_id,snapshot_date" }
    );
    if (isMissingSnapshotTable(error)) return;
    if (error) throw new Error(error.message);
  }
}
