import { MarketDataProvider } from "@/application/ports/providers/MarketDataProvider";
import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import {
  Instrument,
  InstrumentMarketDetailField,
  InstrumentMarketMetric,
  InstrumentMarketView,
  InstrumentPrice
} from "@/domain/universe/types";
import { InstrumentRiskService } from "./InstrumentRiskService";

export type RefreshInstrumentPricesResult = {
  requestedSymbols: string[];
  updatedCount: number;
  missingSymbols: string[];
  errors: string[];
  message: string;
  derivedMetricsRefreshed?: number;
};

export type InstrumentHistoryCoverageSummary = {
  totalEligible: number;
  completeFiveYear: number;
  availableHistoryComplete: number;
  missingFiveYear: number;
  completeThreeYear: number;
  missingThreeYear: number;
  oneYearOnly: number;
  staleHistory: number;
  cryptoEligible: number;
  completeTwoYearCrypto: number;
  availableCryptoHistoryComplete: number;
  missingTwoYearCrypto: number;
  staleCryptoHistory: number;
  estimatedBackfillClicks: number;
};

export type InstrumentLatestPriceCoverageSummary = {
  totalEligible: number;
  freshCount: number;
  staleCount: number;
  neverPricedCount: number;
  latestExpectedPriceDate: string;
  oldestLatestPriceDate: string | null;
  estimatedManualClicks: number;
};

export type RefreshInstrumentRiskMetricsResult = {
  requestedSymbols: string[];
  updatedCount: number;
  errors: string[];
  message: string;
};

function uniqueSymbols(symbols: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol))
    )
  );
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function latestExpectedEodDate() {
  const date = new Date();
  date.setUTCHours(date.getUTCHours() + 8);
  date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysAfterIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function yearsAgoIso(years: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function isStatementTimeoutError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("statement timeout");
}

function daysBeforeIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function isStaleOrMissing(latestPriceDate: string | null, asOfDate: string) {
  return !latestPriceDate || latestPriceDate < asOfDate;
}

function historyFreshnessCutoff(asOfDate: string) {
  return daysBeforeIso(asOfDate, 1);
}

function isHistoryCurrent(latestPriceDate: string | null, asOfDate: string) {
  return Boolean(latestPriceDate && latestPriceDate >= historyFreshnessCutoff(asOfDate));
}

function needsLongHistoryBackfill(
  instrument: Instrument,
  earliestPriceDate: string | null,
  backfillStartDate: string,
  cryptoBackfillStartDate = daysAgoIso(730)
) {
  const targetStartDate = isCryptoHistoryExcluded(instrument) ? cryptoBackfillStartDate : backfillStartDate;
  return !earliestPriceDate || earliestPriceDate > daysAfterIso(targetStartDate, 10);
}

function needsHistoryBackfill(
  instrument: Instrument,
  earliestPriceDate: string | null,
  latestPriceDate: string | null,
  backfillStartDate: string,
  cryptoBackfillStartDate: string,
  refreshCutoff: string
) {
  if (earliestPriceDate && isHistoryCurrent(latestPriceDate, refreshCutoff)) return false;
  return (
    needsLongHistoryBackfill(instrument, earliestPriceDate, backfillStartDate, cryptoBackfillStartDate) ||
    !isHistoryCurrent(latestPriceDate, refreshCutoff)
  );
}

function needsMarketMetricRepair(
  stats: { earliestPriceDate: string | null; latestPriceDate: string | null; observationCount: number } | undefined,
  metric: InstrumentMarketMetric | undefined
) {
  if (!stats || stats.observationCount === 0 || !stats.latestPriceDate) return false;
  if (!metric) return true;
  if (!metric.latestPriceDate || metric.latestPriceDate < stats.latestPriceDate) return true;
  if (!metric.historyEndDate || metric.historyEndDate < stats.latestPriceDate) return true;
  if (stats.earliestPriceDate && (!metric.historyStartDate || metric.historyStartDate > stats.earliestPriceDate)) return true;
  return (metric.observationCount ?? 0) < stats.observationCount;
}

function isCryptoHistoryExcluded(instrument: Instrument) {
  return instrument.assetClass === "crypto" || instrument.instrumentType === "crypto_etf";
}

function isRawCryptoReference(instrument: Instrument) {
  return instrument.assetClass === "crypto" && instrument.instrumentType === "crypto";
}

function providerSymbolForInstrument(instrument: Instrument) {
  const symbol = instrument.symbol?.trim().toUpperCase() ?? "";
  if (symbol === "BRK.B") return "BRK-B";
  if (isRawCryptoReference(instrument) && symbol && !symbol.endsWith("USD")) return `${symbol}USD`;
  return symbol;
}

function formatDateLabel(date: string | null) {
  return date ? date.slice(0, 10) : "-";
}

function safeReturn(latest: number | null, baseline: number | null) {
  if (latest == null || baseline == null || !Number.isFinite(latest) || !Number.isFinite(baseline) || baseline === 0) {
    return null;
  }
  return latest / baseline - 1;
}

async function refreshDerivedMetrics(
  repository: UniverseRepository,
  instrumentIds: string[],
  options?: { oneInstrumentAtATime?: boolean; skipRiskMetrics?: boolean }
) {
  if (instrumentIds.length === 0) return;
  if (!options?.oneInstrumentAtATime) {
    await repository.refreshInstrumentDailyReturns(instrumentIds);
    await repository.refreshInstrumentReturnAnchors(instrumentIds);
    await repository.refreshInstrumentMarketMetrics(instrumentIds);
    if (!options?.skipRiskMetrics) await repository.refreshInstrumentRiskMetrics(instrumentIds);
    return;
  }

  for (const instrumentId of instrumentIds) {
    await repository.refreshInstrumentDailyReturns([instrumentId]);
    await repository.refreshInstrumentReturnAnchors([instrumentId]);
    await repository.refreshInstrumentMarketMetrics([instrumentId]);
    if (!options?.skipRiskMetrics) await repository.refreshInstrumentRiskMetrics([instrumentId]);
  }
}

function freshnessTone(priceDate: string | null) {
  if (!priceDate) return { label: "Never", tone: "text-muted-foreground" };
  const days = Math.max(0, Math.floor((Date.now() - new Date(priceDate).getTime()) / 86_400_000));
  if (days <= 1) return { label: "Fresh", tone: "text-emerald-600" };
  if (days <= 7) return { label: `${days}d`, tone: "text-emerald-600" };
  if (days <= 30) return { label: `${days}d`, tone: "text-amber-600" };
  return { label: `${days}d`, tone: "text-destructive" };
}

function liquidityLabel(instrument: Instrument) {
  if (instrument.assetClass === "crypto") return "Liquid / volatile";
  if (["etf", "bond_etf", "gold_etf", "stock"].includes(instrument.assetClass)) return "Liquid";
  return "Moderate";
}

function makeDetailFields(instrument: Instrument, latestPriceDate: string | null, historyCount: number): InstrumentMarketDetailField[] {
  return [
    { label: "Exchange", value: instrument.exchange ?? "-" },
    { label: "Currency", value: instrument.currency ?? "-" },
    { label: "Geography", value: instrument.geography ?? "-" },
    { label: "Canonical sector", value: instrument.canonicalSector ?? "-" },
    { label: "Canonical themes", value: instrument.canonicalThemes.join(", ") || "-" },
    { label: "Raw provider sector", value: instrument.sector ?? "-" },
    { label: "Raw provider industry", value: instrument.industry ?? "-" },
    { label: "Manual override", value: instrument.taxonomyIsManualOverride ? "Yes" : "No" },
    { label: "Taxonomy status", value: instrument.taxonomyReviewStatus },
    { label: "Watchlist tier", value: instrument.watchlistTier ? instrument.watchlistTier.replaceAll("_", " ") : "-" },
    { label: "Benchmark tags", value: instrument.benchmarkTags.join(", ") || "-" },
    { label: "Thematic tags", value: instrument.thematicTags.join(", ") || "-" },
    { label: "History coverage", value: `${historyCount} row${historyCount === 1 ? "" : "s"}` },
    { label: "Latest date", value: formatDateLabel(latestPriceDate) }
  ];
}

function pickBaseline(series: InstrumentPrice[], cutoffDate: string) {
  const eligible = series.filter((point) => point.priceDate >= cutoffDate);
  return eligible.length > 0 ? eligible[0] : null;
}

export class InstrumentMarketService {
  constructor(
    private readonly repository: UniverseRepository,
    private readonly provider: MarketDataProvider
  ) {}

  async refreshInstrumentPrices(input?: {
    lookbackDays?: number;
    instrumentIds?: string[];
    maxSymbols?: number;
    includeBackfill?: boolean;
    skipRiskMetrics?: boolean;
    skipDerivedMetrics?: boolean;
  }): Promise<RefreshInstrumentPricesResult> {
    const lookbackDays = input?.lookbackDays ?? 1825;
    const maxSymbols = Math.max(1, input?.maxSymbols ?? 12);
    const includeBackfill = input?.includeBackfill ?? false;
    const allInstruments = includeBackfill
      ? await this.repository.listInstruments({ isActive: true })
      : (await this.repository.listInstruments()).filter((instrument) => instrument.isActive || isRawCryptoReference(instrument));
    const instruments = input?.instrumentIds?.length
      ? allInstruments.filter((instrument) => input.instrumentIds?.includes(instrument.id))
      : allInstruments;
    const priceStats = await this.repository.listInstrumentPriceStats(instruments.map((instrument) => instrument.id));
    const statsByInstrumentId = new Map(priceStats.map((item) => [item.instrumentId, item]));
    const refreshCutoff = latestExpectedEodDate();
    const backfillStartDate = daysAgoIso(lookbackDays);
    const cryptoBackfillStartDate = daysAgoIso(Math.min(lookbackDays, 730));
    const symbols = uniqueSymbols(
      instruments
        .filter((instrument) => {
          const stats = statsByInstrumentId.get(instrument.id);
          if (!includeBackfill) return isStaleOrMissing(stats?.latestPriceDate ?? null, refreshCutoff);
          return needsHistoryBackfill(
            instrument,
            stats?.earliestPriceDate ?? null,
            stats?.latestPriceDate ?? null,
            backfillStartDate,
            cryptoBackfillStartDate,
            refreshCutoff
          );
        })
        .slice()
        .sort((a, b) => {
          const aStats = statsByInstrumentId.get(a.id);
          const bStats = statsByInstrumentId.get(b.id);
          const aNeedsRefresh = includeBackfill
            ? needsHistoryBackfill(
                a,
                aStats?.earliestPriceDate ?? null,
                aStats?.latestPriceDate ?? null,
                backfillStartDate,
                cryptoBackfillStartDate,
                refreshCutoff
              )
            : isStaleOrMissing(aStats?.latestPriceDate ?? null, refreshCutoff);
          const bNeedsRefresh = includeBackfill
            ? needsHistoryBackfill(
                b,
                bStats?.earliestPriceDate ?? null,
                bStats?.latestPriceDate ?? null,
                backfillStartDate,
                cryptoBackfillStartDate,
                refreshCutoff
              )
            : isStaleOrMissing(bStats?.latestPriceDate ?? null, refreshCutoff);
          if (aNeedsRefresh !== bNeedsRefresh) return aNeedsRefresh ? -1 : 1;
          const aNeedsBackfill =
            includeBackfill &&
            needsHistoryBackfill(
              a,
              aStats?.earliestPriceDate ?? null,
              aStats?.latestPriceDate ?? null,
              backfillStartDate,
              cryptoBackfillStartDate,
              refreshCutoff
            );
          const bNeedsBackfill =
            includeBackfill &&
            needsHistoryBackfill(
              b,
              bStats?.earliestPriceDate ?? null,
              bStats?.latestPriceDate ?? null,
              backfillStartDate,
              cryptoBackfillStartDate,
              refreshCutoff
            );
          if (aNeedsBackfill !== bNeedsBackfill) return aNeedsBackfill ? -1 : 1;
          const aCount = aStats?.observationCount ?? 0;
          const bCount = bStats?.observationCount ?? 0;
          if (aCount !== bCount) return aCount - bCount;
          return (a.symbol ?? "").localeCompare(b.symbol ?? "");
        })
        .map(providerSymbolForInstrument)
    ).slice(0, maxSymbols);

    if (symbols.length === 0) {
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [],
        message: "No active instrument symbols were found for price refresh."
      };
    }

    const instrumentBySymbol = new Map(
      instruments.flatMap((instrument) => {
        const localSymbol = instrument.symbol?.toUpperCase() ?? "";
        const providerSymbol = providerSymbolForInstrument(instrument);
        return [
          [localSymbol, instrument],
          [providerSymbol, instrument]
        ];
      })
    );
    const defaultFrom = backfillStartDate;
    const to = todayIsoDate();
    const rows: Array<{
      instrumentId: string;
      provider: string;
      symbol: string;
      priceDate: string;
      closePrice: number;
      currency: string | null;
      rawPayload: unknown;
    }> = [];
    const missingSymbols: string[] = [];
    const errors: string[] = [];

    if (!includeBackfill) {
      try {
        const latestQuotes = await this.provider.getLatestPrices(symbols);
        const returnedSymbols = new Set(latestQuotes.map((quote) => quote.symbol.toUpperCase()));
        for (const quote of latestQuotes) {
          const instrument = instrumentBySymbol.get(quote.symbol.toUpperCase());
          if (!instrument) continue;
          rows.push({
            instrumentId: instrument.id,
            provider: this.provider.name,
            symbol: quote.symbol.toUpperCase(),
            priceDate: quote.asOfDate,
            closePrice: quote.price,
            currency: quote.currency ?? instrument.currency ?? "USD",
            rawPayload: quote.raw
          });
        }
        missingSymbols.push(...symbols.filter((symbol) => !returnedSymbols.has(symbol)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Instrument latest price refresh failed.";
        errors.push(message);
      }

      if (rows.length > 0) {
        const updatedInstrumentIds = Array.from(new Set(rows.map((row) => row.instrumentId)));
        await this.repository.upsertInstrumentPrices(rows);
        if (!input?.skipDerivedMetrics) {
          await refreshDerivedMetrics(this.repository, updatedInstrumentIds, { oneInstrumentAtATime: true, skipRiskMetrics: true });
        }
      }

      return {
        requestedSymbols: symbols,
        updatedCount: rows.length,
        missingSymbols,
        errors,
        message:
          errors.length === 0
            ? `Stored ${rows.length} latest instrument price row${rows.length === 1 ? "" : "s"} for ${symbols.length} instrument${symbols.length === 1 ? "" : "s"}. Run again to continue the next batch if needed.`
            : `Stored ${rows.length} latest instrument price row${rows.length === 1 ? "" : "s"} with ${errors.length} issue${errors.length === 1 ? "" : "s"}. Run again to continue the next batch if needed.`
      };
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const instrument = instrumentBySymbol.get(symbol);
          if (!instrument) return { rows: [], missingSymbol: null, error: null };
          if (isRawCryptoReference(instrument) && !includeBackfill) {
            const latestQuotes = await this.provider.getLatestPrices([providerSymbolForInstrument(instrument)]);
            if (latestQuotes.length === 0) {
              return { rows: [], missingSymbol: symbol, error: null };
            }

            return {
              rows: latestQuotes.map((quote) => ({
                instrumentId: instrument.id,
                provider: this.provider.name,
                symbol: quote.symbol.toUpperCase(),
                priceDate: quote.asOfDate,
                closePrice: quote.price,
                currency: quote.currency ?? instrument.currency ?? "USD",
                rawPayload: quote.raw
              })),
              missingSymbol: null,
              error: null
            };
          }
          const stats = statsByInstrumentId.get(instrument.id);
          const targetBackfillStart = isCryptoHistoryExcluded(instrument) ? cryptoBackfillStartDate : defaultFrom;
          const shouldBackfill = includeBackfill && needsLongHistoryBackfill(instrument, stats?.earliestPriceDate ?? null, defaultFrom, cryptoBackfillStartDate);
          const shouldRefreshStaleHistory = includeBackfill && !isHistoryCurrent(stats?.latestPriceDate ?? null, refreshCutoff);
          const from = shouldBackfill
            ? targetBackfillStart
            : shouldRefreshStaleHistory && stats?.latestPriceDate
              ? daysBeforeIso(stats.latestPriceDate, 7)
              : stats?.latestPriceDate
                ? daysBeforeIso(stats.latestPriceDate, 7)
                : targetBackfillStart;
        const quotes = await this.provider.getHistoricalPrices(symbol, from, to, { assetClass: instrument.assetClass });
        if (quotes.length === 0) {
            return { rows: [], missingSymbol: symbol, error: null };
        }

          return {
            rows: quotes.map((quote) => ({
            instrumentId: instrument.id,
            provider: this.provider.name,
            symbol: quote.symbol.toUpperCase(),
            priceDate: quote.asOfDate,
            closePrice: quote.price,
            currency: quote.currency ?? instrument.currency ?? "USD",
            rawPayload: quote.raw
            })),
            missingSymbol: null,
            error: null
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Instrument price refresh failed.";
          return { rows: [], missingSymbol: null, error: `${symbol}: ${message}` };
        }
      })
    );

    for (const result of results) {
      rows.push(...result.rows);
      if (result.missingSymbol) missingSymbols.push(result.missingSymbol);
      if (result.error) errors.push(result.error);
    }

    if (rows.length > 0) {
      const updatedInstrumentIds = Array.from(new Set(rows.map((row) => row.instrumentId)));
      await this.repository.upsertInstrumentPrices(rows);
      if (!input?.skipDerivedMetrics) {
        await refreshDerivedMetrics(this.repository, updatedInstrumentIds, {
          oneInstrumentAtATime: includeBackfill,
          skipRiskMetrics: includeBackfill || Boolean(input?.skipRiskMetrics)
        });
      }
    }

    return {
      requestedSymbols: symbols,
      updatedCount: rows.length,
      missingSymbols,
      errors,
      message:
        errors.length === 0
          ? `Stored ${rows.length} instrument price row${rows.length === 1 ? "" : "s"} for ${symbols.length} instrument${symbols.length === 1 ? "" : "s"}. Run again to continue the next batch if needed.`
          : `Stored ${rows.length} instrument price row${rows.length === 1 ? "" : "s"} with ${errors.length} issue${errors.length === 1 ? "" : "s"}. Run again to continue the next batch if needed.`
    };
  }

  async refreshInstrumentPricesInBatches(input?: {
    lookbackDays?: number;
    batchSize?: number;
    maxBatches?: number;
    includeBackfill?: boolean;
    skipRiskMetrics?: boolean;
    skipDerivedMetrics?: boolean;
  }): Promise<RefreshInstrumentPricesResult> {
    const maxBatches = Math.max(1, input?.maxBatches ?? 8);
    const batchSize = Math.max(1, input?.batchSize ?? 12);
    const requestedSymbols = new Set<string>();
    const missingSymbols = new Set<string>();
    const errors: string[] = [];
    let updatedCount = 0;

    for (let index = 0; index < maxBatches; index += 1) {
      const result = await this.refreshInstrumentPrices({
        lookbackDays: input?.lookbackDays,
        maxSymbols: batchSize,
        includeBackfill: input?.includeBackfill,
        skipRiskMetrics: input?.skipRiskMetrics,
        skipDerivedMetrics: input?.skipDerivedMetrics
      });

      result.requestedSymbols.forEach((symbol) => requestedSymbols.add(symbol));
      result.missingSymbols.forEach((symbol) => missingSymbols.add(symbol));
      errors.push(...result.errors);
      updatedCount += result.updatedCount;

      if (result.requestedSymbols.length === 0) break;
      if (result.updatedCount === 0 && result.missingSymbols.length === 0) break;
    }

    const derivedMetricsRefreshed = input?.skipDerivedMetrics
      ? 0
      : await this.refreshStaleInstrumentDerivedMetrics({
          batchSize,
          skipRiskMetrics: Boolean(input?.skipRiskMetrics)
        });
    const derivedMetricLabel = input?.skipRiskMetrics ? "derived market metrics" : "derived market and risk metrics";

    return {
      requestedSymbols: Array.from(requestedSymbols),
      updatedCount,
      missingSymbols: Array.from(missingSymbols),
      errors,
      message:
        requestedSymbols.size === 0 && derivedMetricsRefreshed > 0
          ? `Instrument prices are already fresh. Rebuilt ${derivedMetricLabel} for ${derivedMetricsRefreshed} instrument${derivedMetricsRefreshed === 1 ? "" : "s"}.`
          : requestedSymbols.size === 0
            ? "Instrument prices are already fresh."
          : `Stored ${updatedCount} instrument price row${updatedCount === 1 ? "" : "s"} across ${requestedSymbols.size} instrument${requestedSymbols.size === 1 ? "" : "s"}.`
      ,
      derivedMetricsRefreshed
    };
  }

  async refreshInstrumentMarketMetricsInBatches(input?: { batchSize?: number; maxBatches?: number }): Promise<RefreshInstrumentPricesResult> {
    const batchSize = Math.max(1, input?.batchSize ?? 25);
    const maxBatches = Math.max(1, input?.maxBatches ?? 3);
    let refreshed = 0;

    for (let index = 0; index < maxBatches; index += 1) {
      const count = await this.refreshStaleInstrumentMarketMetricsOnly({ batchSize });
      refreshed += count;
      if (count === 0) break;
    }

    return {
      requestedSymbols: [],
      updatedCount: refreshed,
      missingSymbols: [],
      errors: [],
      derivedMetricsRefreshed: refreshed,
      message:
        refreshed === 0
          ? "Instrument market metrics are already current."
          : `Refreshed market metrics for ${refreshed} instrument${refreshed === 1 ? "" : "s"}.`
    };
  }

  async refreshInstrumentDailyReturnsInBatches(input?: { batchSize?: number; maxBatches?: number }): Promise<RefreshInstrumentPricesResult> {
    const batchSize = Math.max(1, input?.batchSize ?? 25);
    const maxBatches = Math.max(1, input?.maxBatches ?? 3);
    const instruments = await this.repository.listInstruments({ isActive: true });
    const selected = instruments.slice(0, batchSize * maxBatches);
    const instrumentIds = selected.map((instrument) => instrument.id);
    const rpcChunkSize = Math.min(batchSize, 25);

    if (instrumentIds.length === 0) {
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [],
        message: "No active instruments were found for daily returns refresh."
      };
    }

    for (let index = 0; index < instrumentIds.length; index += rpcChunkSize) {
      await this.repository.refreshInstrumentDailyReturns(instrumentIds.slice(index, index + rpcChunkSize));
    }

    return {
      requestedSymbols: selected.map((instrument) => instrument.symbol ?? instrument.id),
      updatedCount: selected.length,
      missingSymbols: [],
      errors: [],
      message: `Refreshed daily returns for ${selected.length} instrument${selected.length === 1 ? "" : "s"}.`
    };
  }

  async refreshInstrumentReturnAnchorsInBatches(input?: { batchSize?: number; maxBatches?: number }): Promise<RefreshInstrumentPricesResult> {
    const batchSize = Math.max(1, input?.batchSize ?? 25);
    const maxBatches = Math.max(1, input?.maxBatches ?? 3);
    const instruments = await this.repository.listInstruments({ isActive: true });
    const selected = instruments.slice(0, batchSize * maxBatches);
    const instrumentIds = selected.map((instrument) => instrument.id);
    const rpcChunkSize = Math.min(batchSize, 25);

    if (instrumentIds.length === 0) {
      return {
        requestedSymbols: [],
        updatedCount: 0,
        missingSymbols: [],
        errors: [],
        message: "No active instruments were found for return anchors refresh."
      };
    }

    for (let index = 0; index < instrumentIds.length; index += rpcChunkSize) {
      await this.repository.refreshInstrumentReturnAnchors(instrumentIds.slice(index, index + rpcChunkSize));
    }

    return {
      requestedSymbols: selected.map((instrument) => instrument.symbol ?? instrument.id),
      updatedCount: selected.length,
      missingSymbols: [],
      errors: [],
      message: `Refreshed return anchors for ${selected.length} instrument${selected.length === 1 ? "" : "s"}.`
    };
  }

  async refreshStaleInstrumentDerivedMetrics(input?: { batchSize?: number; skipRiskMetrics?: boolean }): Promise<number> {
    const batchSize = Math.max(1, input?.batchSize ?? 12);
    const instruments = await this.repository.listInstruments({ isActive: true });
    const instrumentIds = instruments.map((instrument) => instrument.id);
    const [stats, metrics] = await Promise.all([
      this.repository.listInstrumentPriceStats(instrumentIds),
      this.repository.listInstrumentMarketMetrics(instrumentIds)
    ]);
    const statsByInstrumentId = new Map(stats.map((item) => [item.instrumentId, item]));
    const metricsByInstrumentId = new Map(metrics.map((item) => [item.instrumentId, item]));
    const selectedInstrumentIds = instruments
      .filter((instrument) => needsMarketMetricRepair(statsByInstrumentId.get(instrument.id), metricsByInstrumentId.get(instrument.id)))
      .slice()
      .sort((a, b) => {
        const aMetric = metricsByInstrumentId.get(a.id);
        const bMetric = metricsByInstrumentId.get(b.id);
        if (Boolean(aMetric) !== Boolean(bMetric)) return aMetric ? 1 : -1;
        const aLatest = aMetric?.latestPriceDate ?? "";
        const bLatest = bMetric?.latestPriceDate ?? "";
        if (aLatest !== bLatest) return aLatest.localeCompare(bLatest);
        return (a.symbol ?? "").localeCompare(b.symbol ?? "");
      })
      .slice(0, batchSize)
      .map((instrument) => instrument.id);

    if (selectedInstrumentIds.length === 0) return 0;
    await refreshDerivedMetrics(this.repository, selectedInstrumentIds, { skipRiskMetrics: Boolean(input?.skipRiskMetrics) });
    return selectedInstrumentIds.length;
  }

  async refreshStaleInstrumentMarketMetricsOnly(input?: { batchSize?: number }): Promise<number> {
    const batchSize = Math.max(1, input?.batchSize ?? 25);
    const instruments = await this.repository.listInstruments({ isActive: true });
    const instrumentIds = instruments.map((instrument) => instrument.id);
    const [anchors, metrics] = await Promise.all([
      this.repository.listInstrumentReturnAnchors(instrumentIds),
      this.repository.listInstrumentMarketMetrics(instrumentIds)
    ]);
    const anchorsByInstrumentId = new Map(anchors.map((item) => [item.instrumentId, item]));
    const metricsByInstrumentId = new Map(metrics.map((item) => [item.instrumentId, item]));
    const selectedInstrumentIds = instruments
      .filter((instrument) => {
        const anchor = anchorsByInstrumentId.get(instrument.id);
        if (!anchor?.asOfDate) return false;
        const metric = metricsByInstrumentId.get(instrument.id);
        return !metric || metric.latestPriceDate !== anchor.asOfDate;
      })
      .slice()
      .sort((a, b) => {
        const aMetric = metricsByInstrumentId.get(a.id);
        const bMetric = metricsByInstrumentId.get(b.id);
        if (Boolean(aMetric) !== Boolean(bMetric)) return aMetric ? 1 : -1;
        const aLatest = aMetric?.latestPriceDate ?? "";
        const bLatest = bMetric?.latestPriceDate ?? "";
        if (aLatest !== bLatest) return aLatest.localeCompare(bLatest);
        return (a.symbol ?? "").localeCompare(b.symbol ?? "");
      })
      .slice(0, batchSize)
      .map((instrument) => instrument.id);

    if (selectedInstrumentIds.length === 0) return 0;
    await this.repository.refreshInstrumentMarketMetricsOnly(selectedInstrumentIds);
    return selectedInstrumentIds.length;
  }

  async refreshInstrumentRiskMetricsInBatches(input?: {
    batchSize?: number;
    minObservations?: number;
  }): Promise<RefreshInstrumentRiskMetricsResult> {
    const batchSize = Math.max(1, input?.batchSize ?? 10);
    const minObservations = Math.max(1, input?.minObservations ?? 30);
    const instruments = await this.repository.listInstruments({ isActive: true });
    const instrumentIds = instruments.map((instrument) => instrument.id);
    const [anchors, riskMetrics] = await Promise.all([
      this.repository.listInstrumentReturnAnchors(instrumentIds),
      this.repository.listInstrumentRiskMetrics(instrumentIds)
    ]);
    const anchorsByInstrumentId = new Map(anchors.map((item) => [item.instrumentId, item]));
    const riskByInstrumentId = new Map<string, (typeof riskMetrics)[number]>();
    for (const riskMetric of riskMetrics) {
      if (!riskByInstrumentId.has(riskMetric.instrumentId)) {
        riskByInstrumentId.set(riskMetric.instrumentId, riskMetric);
      }
    }
    const selected = instruments
      .filter((instrument) => {
        const anchor = anchorsByInstrumentId.get(instrument.id);
        if (!anchor?.asOfDate) return false;
        if ((anchor.observationCount ?? 0) < minObservations) return false;
        const riskMetric = riskByInstrumentId.get(instrument.id);
        if (!riskMetric) return true;
        return !riskMetric.metricDate || riskMetric.metricDate < anchor.asOfDate;
      })
      .slice()
      .sort((a, b) => {
        const aRisk = riskByInstrumentId.get(a.id);
        const bRisk = riskByInstrumentId.get(b.id);
        if (Boolean(aRisk) !== Boolean(bRisk)) return aRisk ? 1 : -1;
        const aCalculatedAt = aRisk?.metricDate ?? aRisk?.calculatedAt ?? "";
        const bCalculatedAt = bRisk?.metricDate ?? bRisk?.calculatedAt ?? "";
        if (aCalculatedAt !== bCalculatedAt) return aCalculatedAt.localeCompare(bCalculatedAt);
        return (a.symbol ?? "").localeCompare(b.symbol ?? "");
      })
      .slice(0, batchSize);

    const errors: string[] = [];
    const requestedSymbols: string[] = [];
    let updatedCount = 0;

    for (const instrument of selected) {
      try {
        await this.refreshInstrumentRiskMetricsForInstrument(instrument);
        if (instrument.symbol) requestedSymbols.push(instrument.symbol);
        updatedCount += 1;
      } catch (error) {
        errors.push(`${instrument.symbol}: ${error instanceof Error ? error.message : "Risk metrics refresh failed."}`);
      }
    }

    return {
      requestedSymbols,
      updatedCount,
      errors,
      message:
        selected.length === 0
          ? "All eligible instrument risk metrics are current."
          : `Refreshed risk metrics for ${updatedCount}/${selected.length} instrument${selected.length === 1 ? "" : "s"}.`
    };
  }

  private async refreshInstrumentRiskMetricsForInstrument(instrument: Instrument): Promise<void> {
    try {
      await this.repository.refreshInstrumentRiskMetricsOnly([instrument.id]);
      return;
    } catch (error) {
      if (!isStatementTimeoutError(error)) throw error;
    }

    const prices = await this.repository.listInstrumentPrices([instrument.id], yearsAgoIso(5));
    if (prices.length < 30) {
      throw new Error("Risk metrics refresh timed out and not enough stored price history was available for fallback calculation.");
    }
    const riskService = new InstrumentRiskService(this.repository);
    const metric = riskService.calculate(instrument, prices);
    await this.repository.upsertInstrumentRiskMetrics([metric]);
  }

  async buildInstrumentMarketViews(instruments: Instrument[], options?: { lookbackYears?: number }): Promise<InstrumentMarketView[]> {
    if (instruments.length === 0) return [];

    const metrics = await this.repository.listInstrumentMarketMetrics(instruments.map((instrument) => instrument.id));
    if (metrics.length > 0) {
      const metricsByInstrumentId = new Map(metrics.map((metric) => [metric.instrumentId, metric]));
      const missingMetricInstruments = instruments.filter((instrument) => !metricsByInstrumentId.has(instrument.id));
      const fallbackViews = await this.buildInstrumentMarketViewsFromPrices(missingMetricInstruments, options);
      const fallbackByInstrumentId = new Map(fallbackViews.map((view) => [view.instrument.id, view]));

      return instruments.map((instrument) => {
        const metric = metricsByInstrumentId.get(instrument.id);
        if (!metric) {
          return fallbackByInstrumentId.get(instrument.id) ?? this.emptyMarketView(instrument);
        }
        return this.marketViewFromMetric(instrument, metric);
      });
    }

    return this.buildInstrumentMarketViewsFromPrices(instruments, options);
  }

  private async buildInstrumentMarketViewsFromPrices(instruments: Instrument[], options?: { lookbackYears?: number }): Promise<InstrumentMarketView[]> {
    if (instruments.length === 0) return [];

    const lookbackYears = Math.max(1, options?.lookbackYears ?? 5);
    const priceRows = await this.repository.listInstrumentPrices(instruments.map((instrument) => instrument.id), yearsAgoIso(lookbackYears));
    const priceByInstrument = new Map<string, InstrumentPrice[]>();
    for (const row of priceRows) {
      const current = priceByInstrument.get(row.instrumentId) ?? [];
      current.push(row);
      priceByInstrument.set(row.instrumentId, current);
    }

    return instruments.map((instrument) => {
      const series = (priceByInstrument.get(instrument.id) ?? []).slice().sort((a, b) => a.priceDate.localeCompare(b.priceDate));
      const latest = series.at(-1) ?? null;
      const previous = series.length > 1 ? series.at(-2) ?? null : null;
      const dailyReturn = safeReturn(latest?.closePrice ?? null, previous?.closePrice ?? null);
      const latestPrice = latest?.closePrice ?? null;
      const latestDate = latest?.priceDate ?? null;
      const ytdBaseline = pickBaseline(series, `${new Date().getUTCFullYear()}-01-01`);
      const oneYearBaseline = pickBaseline(series, daysAgoIso(365));
      const threeYearBaseline = pickBaseline(series, yearsAgoIso(3));
      const fiveYearBaseline = pickBaseline(series, yearsAgoIso(5));
      const fiftyTwoWeekSeries = series.filter((point) => point.priceDate >= daysAgoIso(365));
      const fiftyTwoWeekLow = fiftyTwoWeekSeries.length > 0 ? Math.min(...fiftyTwoWeekSeries.map((point) => point.closePrice)) : null;
      const fiftyTwoWeekHigh = fiftyTwoWeekSeries.length > 0 ? Math.max(...fiftyTwoWeekSeries.map((point) => point.closePrice)) : null;
      const freshness = freshnessTone(latestDate);

      return {
        instrument,
        rank: 0,
        latestPrice,
        latestPriceDate: latestDate,
        dailyReturn,
        ytdReturn: safeReturn(latestPrice, ytdBaseline?.closePrice ?? null),
        oneYearReturn: safeReturn(latestPrice, oneYearBaseline?.closePrice ?? null),
        threeYearReturn: safeReturn(latestPrice, threeYearBaseline?.closePrice ?? null),
        fiveYearReturn: safeReturn(latestPrice, fiveYearBaseline?.closePrice ?? null),
        fiftyTwoWeekLow,
        fiftyTwoWeekHigh,
        liquidity: liquidityLabel(instrument),
        freshnessLabel: freshness.label,
        freshnessTone: freshness.tone,
        priceObservationCount: series.length,
        priceHistoryStart: series[0]?.priceDate ?? null,
        priceHistoryEnd: latestDate,
        detailFields: makeDetailFields(instrument, latestDate, series.length)
      };
    });
  }

  private marketViewFromMetric(instrument: Instrument, metric: InstrumentMarketMetric): InstrumentMarketView {
    const freshness = freshnessTone(metric.latestPriceDate);
    return {
      instrument,
      rank: 0,
      latestPrice: metric.latestPrice,
      latestPriceDate: metric.latestPriceDate,
      dailyReturn: metric.dailyReturn,
      ytdReturn: metric.ytdReturn,
      oneYearReturn: metric.oneYearReturn,
      threeYearReturn: metric.threeYearReturn,
      fiveYearReturn: metric.fiveYearReturn,
      fiftyTwoWeekLow: metric.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: metric.fiftyTwoWeekHigh,
      liquidity: liquidityLabel(instrument),
      freshnessLabel: freshness.label,
      freshnessTone: freshness.tone,
      priceObservationCount: metric.observationCount,
      priceHistoryStart: metric.historyStartDate,
      priceHistoryEnd: metric.historyEndDate,
      detailFields: makeDetailFields(instrument, metric.latestPriceDate, metric.observationCount)
    };
  }

  private emptyMarketView(instrument: Instrument): InstrumentMarketView {
    const freshness = freshnessTone(null);
    return {
      instrument,
      rank: 0,
      latestPrice: null,
      latestPriceDate: null,
      dailyReturn: null,
      ytdReturn: null,
      oneYearReturn: null,
      threeYearReturn: null,
      fiveYearReturn: null,
      fiftyTwoWeekLow: null,
      fiftyTwoWeekHigh: null,
      liquidity: liquidityLabel(instrument),
      freshnessLabel: freshness.label,
      freshnessTone: freshness.tone,
      priceObservationCount: 0,
      priceHistoryStart: null,
      priceHistoryEnd: null,
      detailFields: makeDetailFields(instrument, null, 0)
    };
  }

  async getHistoryCoverageSummary(instruments: Instrument[], backfillBatchSize = 12): Promise<InstrumentHistoryCoverageSummary> {
    const activeInstruments = instruments.filter((instrument) => instrument.isActive);
    const metrics = await this.repository.listInstrumentMarketMetrics(activeInstruments.map((instrument) => instrument.id));
    const metricsByInstrumentId = new Map(metrics.map((item) => [item.instrumentId, item]));
    const stats =
      metrics.length > 0
        ? []
        : await this.repository.listInstrumentPriceStats(activeInstruments.map((instrument) => instrument.id));
    const statsByInstrumentId = new Map(stats.map((item) => [item.instrumentId, item]));
    const threeYearCompleteBy = daysAfterIso(yearsAgoIso(3), 10);
    const fiveYearCompleteBy = daysAfterIso(yearsAgoIso(5), 10);
    const twoYearCryptoCompleteBy = daysAfterIso(yearsAgoIso(2), 10);
    const refreshCutoff = latestExpectedEodDate();
    let totalEligible = 0;
    let completeFiveYear = 0;
    let availableHistoryComplete = 0;
    let completeThreeYear = 0;
    let oneYearOnly = 0;
    let staleHistory = 0;
    let cryptoEligible = 0;
    let completeTwoYearCrypto = 0;
    let availableCryptoHistoryComplete = 0;
    let staleCryptoHistory = 0;

    for (const instrument of activeInstruments) {
      if (isCryptoHistoryExcluded(instrument)) {
        cryptoEligible += 1;
        const metric = metricsByInstrumentId.get(instrument.id);
        const stat = statsByInstrumentId.get(instrument.id);
        const earliestDate = metric?.historyStartDate ?? stat?.earliestPriceDate ?? null;
        const latestDate = metric?.historyEndDate ?? metric?.latestPriceDate ?? stat?.latestPriceDate ?? null;
        const current = isHistoryCurrent(latestDate, refreshCutoff);
        if (!current) staleCryptoHistory += 1;
        if (earliestDate && current) availableCryptoHistoryComplete += 1;
        if (earliestDate && earliestDate <= twoYearCryptoCompleteBy && current) {
          completeTwoYearCrypto += 1;
        }
        continue;
      }

      totalEligible += 1;
      const metric = metricsByInstrumentId.get(instrument.id);
      const stat = statsByInstrumentId.get(instrument.id);
      const earliestDate = metric?.historyStartDate ?? stat?.earliestPriceDate ?? null;
      const latestDate = metric?.historyEndDate ?? metric?.latestPriceDate ?? stat?.latestPriceDate ?? null;
      const current = isHistoryCurrent(latestDate, refreshCutoff);
      if (!current) staleHistory += 1;
      if (earliestDate && current) availableHistoryComplete += 1;
      if (earliestDate && earliestDate <= fiveYearCompleteBy && current) {
        completeFiveYear += 1;
        completeThreeYear += 1;
        continue;
      }

      if (earliestDate && earliestDate <= threeYearCompleteBy && current) {
        completeThreeYear += 1;
        continue;
      }

      oneYearOnly += 1;
    }

    const missingFiveYear = Math.max(0, totalEligible - availableHistoryComplete);
    const missingThreeYear = Math.max(0, totalEligible - Math.max(completeThreeYear, availableHistoryComplete));
    const missingTwoYearCrypto = Math.max(0, cryptoEligible - availableCryptoHistoryComplete);

    return {
      totalEligible,
      completeFiveYear,
      availableHistoryComplete,
      missingFiveYear,
      completeThreeYear,
      missingThreeYear,
      oneYearOnly,
      staleHistory,
      cryptoEligible,
      completeTwoYearCrypto,
      availableCryptoHistoryComplete,
      missingTwoYearCrypto,
      staleCryptoHistory,
      estimatedBackfillClicks: Math.ceil((missingFiveYear + missingTwoYearCrypto) / Math.max(1, backfillBatchSize))
    };
  }

  async getLatestPriceCoverageSummary(instruments: Instrument[], refreshBatchSize = 75): Promise<InstrumentLatestPriceCoverageSummary> {
    const activeInstruments = instruments.filter((instrument) => instrument.isActive || isRawCryptoReference(instrument));
    const metrics = await this.repository.listInstrumentMarketMetrics(activeInstruments.map((instrument) => instrument.id));
    const metricsByInstrumentId = new Map(metrics.map((item) => [item.instrumentId, item]));
    const stats =
      metrics.length > 0
        ? []
        : await this.repository.listInstrumentPriceStats(activeInstruments.map((instrument) => instrument.id));
    const statsByInstrumentId = new Map(stats.map((item) => [item.instrumentId, item]));
    const refreshCutoff = latestExpectedEodDate();
    let freshCount = 0;
    let staleCount = 0;
    let neverPricedCount = 0;
    let oldestLatestPriceDate: string | null = null;

    for (const instrument of activeInstruments) {
      const metric = metricsByInstrumentId.get(instrument.id);
      const stat = statsByInstrumentId.get(instrument.id);
      const latestDate = metric?.latestPriceDate ?? metric?.historyEndDate ?? stat?.latestPriceDate ?? null;
      if (!latestDate) {
        neverPricedCount += 1;
        continue;
      }
      if (!oldestLatestPriceDate || latestDate < oldestLatestPriceDate) {
        oldestLatestPriceDate = latestDate;
      }
      if (isStaleOrMissing(latestDate, refreshCutoff)) {
        staleCount += 1;
      } else {
        freshCount += 1;
      }
    }

    const totalEligible = activeInstruments.length;
    const actionable = staleCount + neverPricedCount;
    return {
      totalEligible,
      freshCount,
      staleCount,
      neverPricedCount,
      latestExpectedPriceDate: refreshCutoff,
      oldestLatestPriceDate,
      estimatedManualClicks: Math.ceil(actionable / Math.max(1, refreshBatchSize))
    };
  }

}
