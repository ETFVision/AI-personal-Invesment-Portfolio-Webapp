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

export interface PortfolioRepository {
  ensureUser(input: {
    authProvider: string;
    authProviderUserId: string;
    email: string | null;
  }): Promise<UserProfile>;
  updateUserProfile(userId: string, input: Partial<Pick<UserProfile, "baseCurrency" | "riskProfile">>): Promise<void>;
  getDefaultPortfolio(userId: string): Promise<Portfolio | null>;
  getFirstDefaultPortfolio(): Promise<Portfolio | null>;
  getPortfolioById(portfolioId: string): Promise<Portfolio | null>;
  listActivePortfolioIds(): Promise<string[]>;
  createPortfolio(userId: string, input: SetupPortfolioInput): Promise<Portfolio>;
  updatePortfolio(portfolioId: string, input: SetupPortfolioInput): Promise<Portfolio>;
  listAssets(): Promise<Asset[]>;
  findOrCreateAsset(input: {
    assetType: string;
    ticker: string | null;
    assetName: string;
    currency: string;
  }): Promise<Asset>;
  listCashBalances(portfolioId: string): Promise<CashBalance[]>;
  upsertCashBalance(input: CashBalanceInput): Promise<CashBalance>;
  deleteCashBalance(id: string, portfolioId: string): Promise<void>;
  listHoldings(portfolioId: string): Promise<Holding[]>;
  upsertHolding(input: HoldingInput): Promise<Holding>;
  deleteHolding(id: string, portfolioId: string): Promise<void>;
  listTransactions(portfolioId: string): Promise<Transaction[]>;
  upsertTransaction(input: TransactionInput): Promise<Transaction>;
  deleteTransaction(id: string, portfolioId: string): Promise<void>;
}
