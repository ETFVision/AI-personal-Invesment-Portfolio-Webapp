import type { FundamentalsProvider } from "@/application/ports/providers/FundamentalsProvider";
import type { FundamentalsRepository } from "@/application/ports/repositories/FundamentalsRepository";
import { FundamentalScoringService } from "@/application/services/fundamentals/FundamentalScoringService";
import type { CompanyProfile, FinancialRatio, FinancialStatement } from "@/domain/fundamentals/types";

export type FundamentalsRefreshResult = {
  ok: boolean;
  status: "success" | "partial_success" | "failed";
  message: string;
  stocksRequested: number;
  profilesUpdated: number;
  statementsUpdated: number;
  ratiosUpdated: number;
  scoresUpdated: number;
  failedSymbols: string[];
};

function daysBetween(dateIso: string | null, now = new Date()) {
  if (!dateIso) return Number.POSITIVE_INFINITY;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export class FundamentalsRefreshService {
  constructor(
    private readonly repository: FundamentalsRepository,
    private readonly provider: FundamentalsProvider,
    private readonly scoringService: FundamentalScoringService,
    private readonly config: {
      enabled: boolean;
      maxStocksPerRefresh: number;
      refreshFrequencyDays: number;
      staleAfterDays: number;
    }
  ) {}

  async refreshAll(options: { force?: boolean; symbol?: string } = {}): Promise<FundamentalsRefreshResult> {
    const startedAt = new Date().toISOString();
    if (!this.config.enabled) {
      const result = {
        ok: false,
        status: "failed" as const,
        message: "Fundamentals refresh is disabled.",
        stocksRequested: 0,
        profilesUpdated: 0,
        statementsUpdated: 0,
        ratiosUpdated: 0,
        scoresUpdated: 0,
        failedSymbols: []
      };
      await this.repository.insertRefreshLog({
        jobName: "fundamentals-refresh",
        startedAt,
        completedAt: new Date().toISOString(),
        status: result.status,
        stocksRequested: 0,
        profilesUpdated: 0,
        statementsUpdated: 0,
        ratiosUpdated: 0,
        scoresUpdated: 0,
        failedSymbols: [],
        errorMessage: result.message,
        metadata: {}
      });
      return result;
    }

    const eligible = await this.repository.listEligibleStockInstruments(this.config.maxStocksPerRefresh * 3);
    const filtered = options.symbol
      ? eligible.filter((instrument) => instrument.symbol?.toUpperCase() === options.symbol?.toUpperCase())
      : eligible;
    const profiles = await this.repository.getProfiles(filtered.map((instrument) => instrument.id));
    const profileByInstrument = new Map(profiles.map((profile) => [profile.instrumentId, profile]));
    const due = filtered
      .filter((instrument) => {
        if (options.force) return true;
        const existing = profileByInstrument.get(instrument.id);
        return daysBetween(existing?.lastRefreshedAt ?? null) >= this.config.refreshFrequencyDays;
      })
      .slice(0, this.config.maxStocksPerRefresh);

    let profilesUpdated = 0;
    let statementsUpdated = 0;
    let ratiosUpdated = 0;
    let scoresUpdated = 0;
    const failedSymbols: string[] = [];

    for (const instrument of due) {
      const symbol = instrument.symbol?.toUpperCase();
      if (!symbol) continue;
      try {
        const result = await this.provider.getFundamentals(symbol, { period: "annual", limit: 5 });
        const profile: CompanyProfile | null = result.profile
          ? { ...result.profile, instrumentId: instrument.id }
          : null;
        const statements: FinancialStatement[] = result.statements.map((statement) => ({
          ...statement,
          instrumentId: instrument.id
        }));
        const ratios: FinancialRatio[] = result.ratios.map((ratio) => ({
          ...ratio,
          instrumentId: instrument.id
        }));

        if (profile) {
          await this.repository.upsertCompanyProfiles([profile]);
          profilesUpdated += 1;
        }
        await this.repository.upsertFinancialStatements(statements);
        await this.repository.upsertFinancialRatios(ratios);
        statementsUpdated += statements.length;
        ratiosUpdated += ratios.length;

        const score = this.scoringService.calculateScore({
          instrumentId: instrument.id,
          symbol,
          profile,
          ratios,
          statements
        });
        await this.repository.upsertFundamentalScores([score]);
        scoresUpdated += score.overallFundamentalScore == null ? 0 : 1;
      } catch {
        failedSymbols.push(symbol);
      }
    }

    const status = failedSymbols.length === 0 ? "success" : due.length === failedSymbols.length ? "failed" : "partial_success";
    const message =
      due.length === 0
        ? "No fundamentals refresh due."
        : `Fundamentals refreshed for ${due.length - failedSymbols.length}/${due.length} stocks.`;
    await this.repository.insertRefreshLog({
      jobName: "fundamentals-refresh",
      startedAt,
      completedAt: new Date().toISOString(),
      status,
      stocksRequested: due.length,
      profilesUpdated,
      statementsUpdated,
      ratiosUpdated,
      scoresUpdated,
      failedSymbols,
      errorMessage: failedSymbols.length > 0 ? `${failedSymbols.length} symbols failed.` : null,
      metadata: {
        force: Boolean(options.force),
        requestedSymbol: options.symbol ?? null,
        staleAfterDays: this.config.staleAfterDays,
        provider: this.provider.name
      }
    });

    return {
      ok: status !== "failed",
      status,
      message,
      stocksRequested: due.length,
      profilesUpdated,
      statementsUpdated,
      ratiosUpdated,
      scoresUpdated,
      failedSymbols
    };
  }
}

export const fundamentalsRefreshInternals = {
  daysBetween
};
