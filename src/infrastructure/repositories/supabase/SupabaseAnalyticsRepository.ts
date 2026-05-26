import {
  AnalyticsRepository,
  UpsertPortfolioSnapshotInput
} from "@/application/ports/repositories/AnalyticsRepository";
import { HoldingValuation, PortfolioSnapshot } from "@/domain/portfolio/types";
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
}
