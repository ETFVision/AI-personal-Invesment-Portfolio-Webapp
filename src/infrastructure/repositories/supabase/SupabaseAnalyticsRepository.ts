import {
  AnalyticsRepository,
  UpsertPortfolioSnapshotInput
} from "@/application/ports/repositories/AnalyticsRepository";
import {
  AssetSnapshot,
  CashSnapshot,
  HoldingSnapshot,
  HoldingValuation,
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

function isMissingSnapshotTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        (error.message?.toLowerCase().includes("snapshot") && error.message?.toLowerCase().includes("does not exist")))
  );
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listPortfolioSnapshots(portfolioId: string, limit = 90) {
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
