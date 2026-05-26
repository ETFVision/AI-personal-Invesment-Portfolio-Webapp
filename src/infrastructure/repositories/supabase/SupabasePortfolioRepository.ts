import { PortfolioRepository } from "@/application/ports/repositories/PortfolioRepository";
import {
  Asset,
  CashBalance,
  Holding,
  Portfolio,
  Transaction,
  UserProfile
} from "@/domain/portfolio/types";
import {
  CashBalanceInput,
  HoldingInput,
  SetupPortfolioInput,
  TransactionInput
} from "@/domain/portfolio/validation";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Expected database row was not returned.");
  return data;
}

function mapUser(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    baseCurrency: row.base_currency,
    timezone: row.timezone,
    riskProfile: row.risk_profile
  };
}

function mapPortfolio(row: any): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    baseCurrency: row.base_currency,
    isDefault: row.is_default
  };
}

function mapAsset(row: any): Asset {
  return {
    id: row.id,
    assetType: row.asset_type,
    ticker: row.ticker,
    symbol: row.symbol,
    name: row.name,
    currency: row.currency
  };
}

function mapCash(row: any): CashBalance {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    accountName: row.account_name,
    brokerName: row.broker_name,
    currency: row.currency,
    amount: Number(row.amount),
    asOfDate: row.as_of_date,
    notes: row.notes
  };
}

function mapHolding(row: any): Holding {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    assetType: row.asset_type,
    ticker: row.ticker,
    assetName: row.asset_name,
    accountName: row.account_name,
    brokerName: row.broker_name,
    quantity: Number(row.quantity),
    averageCost: row.average_cost == null ? null : Number(row.average_cost),
    costCurrency: row.cost_currency,
    firstPurchaseDate: row.first_purchase_date,
    notes: row.notes
  };
}

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    transactionType: row.transaction_type,
    assetType: row.asset_type,
    ticker: row.ticker,
    assetName: row.asset_name,
    accountName: row.account_name,
    brokerName: row.broker_name,
    quantity: row.quantity == null ? null : Number(row.quantity),
    price: row.price == null ? null : Number(row.price),
    fees: Number(row.fees),
    grossAmount: row.gross_amount == null ? null : Number(row.gross_amount),
    netAmount: row.net_amount == null ? null : Number(row.net_amount),
    currency: row.currency,
    transactionDate: row.transaction_date,
    notes: row.notes
  };
}

export class SupabasePortfolioRepository implements PortfolioRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async ensureUser(input: { authProvider: string; authProviderUserId: string; email: string | null }) {
    const { data: existing, error: existingError } = await this.db
      .from("users")
      .select("*")
      .eq("auth_provider", input.authProvider)
      .eq("auth_provider_user_id", input.authProviderUserId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return mapUser(existing);

    const { data, error } = await this.db
      .from("users")
      .insert({
        auth_provider: input.authProvider,
        auth_provider_user_id: input.authProviderUserId,
        email: input.email
      })
      .select("*")
      .single();
    return mapUser(requireData(data, error));
  }

  async updateUserProfile(userId: string, input: Partial<Pick<UserProfile, "baseCurrency" | "riskProfile">>) {
    const { error } = await this.db
      .from("users")
      .update({
        base_currency: input.baseCurrency,
        risk_profile: input.riskProfile
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  }

  async getDefaultPortfolio(userId: string) {
    const { data, error } = await this.db
      .from("portfolios")
      .select("*")
      .eq("user_id", userId)
      .eq("is_default", true)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapPortfolio(data) : null;
  }

  async getPortfolioById(portfolioId: string) {
    const { data, error } = await this.db.from("portfolios").select("*").eq("id", portfolioId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapPortfolio(data) : null;
  }

  async createPortfolio(userId: string, input: SetupPortfolioInput) {
    const { data, error } = await this.db
      .from("portfolios")
      .insert({
        user_id: userId,
        name: input.name,
        base_currency: input.baseCurrency,
        is_default: true
      })
      .select("*")
      .single();
    return mapPortfolio(requireData(data, error));
  }

  async updatePortfolio(portfolioId: string, input: SetupPortfolioInput) {
    const { data, error } = await this.db
      .from("portfolios")
      .update({
        name: input.name,
        base_currency: input.baseCurrency
      })
      .eq("id", portfolioId)
      .select("*")
      .single();
    return mapPortfolio(requireData(data, error));
  }

  async listAssets() {
    const { data, error } = await this.db.from("assets").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAsset);
  }

  async findOrCreateAsset(input: { assetType: string; ticker: string | null; assetName: string; currency: string }) {
    if (input.ticker) {
      const { data: existing, error: existingError } = await this.db
        .from("assets")
        .select("*")
        .eq("ticker", input.ticker)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) return mapAsset(existing);
    }

    const { data, error } = await this.db
      .from("assets")
      .insert({
        asset_type: input.assetType,
        ticker: input.ticker,
        symbol: input.ticker,
        name: input.assetName,
        currency: input.currency,
        provider_primary: "manual"
      })
      .select("*")
      .single();
    return mapAsset(requireData(data, error));
  }

  async listCashBalances(portfolioId: string) {
    const { data, error } = await this.db
      .from("cash_balances")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("currency");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCash);
  }

  async upsertCashBalance(input: CashBalanceInput) {
    const payload = {
      portfolio_id: input.portfolioId,
      account_name: input.accountName,
      broker_name: input.brokerName,
      currency: input.currency,
      amount: input.amount,
      as_of_date: input.asOfDate,
      notes: input.notes
    };
    const query = input.id
      ? this.db.from("cash_balances").update(payload).eq("id", input.id).eq("portfolio_id", input.portfolioId)
      : this.db.from("cash_balances").insert(payload);
    const { data, error } = await query.select("*").single();
    return mapCash(requireData(data, error));
  }

  async deleteCashBalance(id: string, portfolioId: string) {
    const { error } = await this.db.from("cash_balances").delete().eq("id", id).eq("portfolio_id", portfolioId);
    if (error) throw new Error(error.message);
  }

  async listHoldings(portfolioId: string) {
    const { data, error } = await this.db
      .from("holdings")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_active", true)
      .order("asset_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapHolding);
  }

  async upsertHolding(input: HoldingInput) {
    const asset = await this.findOrCreateAsset({
      assetType: input.assetType,
      ticker: input.ticker ?? null,
      assetName: input.assetName,
      currency: input.costCurrency
    });
    const payload = {
      portfolio_id: input.portfolioId,
      asset_id: asset.id,
      asset_type: input.assetType,
      ticker: input.ticker,
      asset_name: input.assetName,
      account_name: input.accountName,
      broker_name: input.brokerName,
      quantity: input.quantity,
      average_cost: input.averageCost ?? null,
      cost_currency: input.costCurrency,
      first_purchase_date: input.firstPurchaseDate,
      notes: input.notes,
      is_active: true
    };
    const query = input.id
      ? this.db.from("holdings").update(payload).eq("id", input.id).eq("portfolio_id", input.portfolioId)
      : this.db.from("holdings").insert(payload);
    const { data, error } = await query.select("*").single();
    return mapHolding(requireData(data, error));
  }

  async deleteHolding(id: string, portfolioId: string) {
    const { error } = await this.db
      .from("holdings")
      .update({ is_active: false })
      .eq("id", id)
      .eq("portfolio_id", portfolioId);
    if (error) throw new Error(error.message);
  }

  async listTransactions(portfolioId: string) {
    const { data, error } = await this.db
      .from("transactions")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .eq("is_deleted", false)
      .order("transaction_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTransaction);
  }

  async upsertTransaction(input: TransactionInput) {
    const needsAsset = input.transactionType === "buy" || input.transactionType === "sell";
    const asset = needsAsset
      ? await this.findOrCreateAsset({
          assetType: input.assetType ?? "other",
          ticker: input.ticker ?? null,
          assetName: input.assetName || input.ticker || "Manual asset",
          currency: input.currency
        })
      : null;
    const gross = input.quantity && input.price ? input.quantity * input.price : null;
    const signedNet =
      input.transactionType === "buy"
        ? gross == null
          ? null
          : -(gross + input.fees)
        : input.transactionType === "sell"
          ? gross == null
            ? null
            : gross - input.fees
          : null;
    const payload = {
      portfolio_id: input.portfolioId,
      asset_id: asset?.id ?? null,
      transaction_type: input.transactionType,
      asset_type: input.assetType ?? null,
      ticker: input.ticker ?? null,
      asset_name: input.assetName || input.ticker || null,
      account_name: input.accountName,
      broker_name: input.brokerName,
      quantity: input.quantity ?? null,
      price: input.price ?? null,
      fees: input.fees,
      gross_amount: gross,
      net_amount: signedNet,
      currency: input.currency,
      transaction_date: input.transactionDate,
      notes: input.notes,
      source_type: "manual"
    };
    const query = input.id
      ? this.db.from("transactions").update(payload).eq("id", input.id).eq("portfolio_id", input.portfolioId)
      : this.db.from("transactions").insert(payload);
    const { data, error } = await query.select("*").single();
    return mapTransaction(requireData(data, error));
  }

  async deleteTransaction(id: string, portfolioId: string) {
    const { error } = await this.db
      .from("transactions")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("portfolio_id", portfolioId);
    if (error) throw new Error(error.message);
  }
}
