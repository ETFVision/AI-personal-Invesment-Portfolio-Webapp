import { MarketDataProvider } from "@/application/ports/providers/MarketDataProvider";
import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import {
  Instrument,
  InstrumentMarketDetailField,
  InstrumentMarketView,
  InstrumentPrice
} from "@/domain/universe/types";

export type RefreshInstrumentPricesResult = {
  requestedSymbols: string[];
  updatedCount: number;
  missingSymbols: string[];
  errors: string[];
  message: string;
};

export type InstrumentHistoryCoverageSummary = {
  totalEligible: number;
  completeFiveYear: number;
  missingFiveYear: number;
  completeThreeYear: number;
  missingThreeYear: number;
  oneYearOnly: number;
  excludedCrypto: number;
  estimatedBackfillClicks: number;
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

function yearsAgoIso(years: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function daysBeforeIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function isStaleOrMissing(latestPriceDate: string | null, asOfDate: string) {
  return !latestPriceDate || latestPriceDate < asOfDate;
}

function needsLongHistoryBackfill(instrument: Instrument, earliestPriceDate: string | null, backfillStartDate: string) {
  if (instrument.assetClass === "crypto" || instrument.instrumentType === "crypto_etf") return false;
  return !earliestPriceDate || earliestPriceDate > backfillStartDate;
}

function isCryptoHistoryExcluded(instrument: Instrument) {
  return instrument.assetClass === "crypto" || instrument.instrumentType === "crypto_etf";
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
    { label: "Sector", value: instrument.sector ?? "-" },
    { label: "Industry", value: instrument.industry ?? "-" },
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
  }): Promise<RefreshInstrumentPricesResult> {
    const lookbackDays = input?.lookbackDays ?? 1825;
    const maxSymbols = Math.max(1, input?.maxSymbols ?? 12);
    const includeBackfill = input?.includeBackfill ?? false;
    const allInstruments = await this.repository.listInstruments({ isActive: true });
    const instruments = input?.instrumentIds?.length
      ? allInstruments.filter((instrument) => input.instrumentIds?.includes(instrument.id))
      : allInstruments;
    const priceStats = await this.repository.listInstrumentPriceStats(instruments.map((instrument) => instrument.id));
    const statsByInstrumentId = new Map(priceStats.map((item) => [item.instrumentId, item]));
    const refreshCutoff = latestExpectedEodDate();
    const backfillStartDate = daysAgoIso(lookbackDays);
    const symbols = uniqueSymbols(
      instruments
        .filter((instrument) => {
          const stats = statsByInstrumentId.get(instrument.id);
          return (
            isStaleOrMissing(stats?.latestPriceDate ?? null, refreshCutoff) ||
            (includeBackfill && needsLongHistoryBackfill(instrument, stats?.earliestPriceDate ?? null, backfillStartDate))
          );
        })
        .slice()
        .sort((a, b) => {
          const aStats = statsByInstrumentId.get(a.id);
          const bStats = statsByInstrumentId.get(b.id);
          const aNeedsRefresh = isStaleOrMissing(aStats?.latestPriceDate ?? null, refreshCutoff);
          const bNeedsRefresh = isStaleOrMissing(bStats?.latestPriceDate ?? null, refreshCutoff);
          if (aNeedsRefresh !== bNeedsRefresh) return aNeedsRefresh ? -1 : 1;
          const aNeedsBackfill = includeBackfill && needsLongHistoryBackfill(a, aStats?.earliestPriceDate ?? null, backfillStartDate);
          const bNeedsBackfill = includeBackfill && needsLongHistoryBackfill(b, bStats?.earliestPriceDate ?? null, backfillStartDate);
          if (aNeedsBackfill !== bNeedsBackfill) return aNeedsBackfill ? -1 : 1;
          const aCount = aStats?.observationCount ?? 0;
          const bCount = bStats?.observationCount ?? 0;
          if (aCount !== bCount) return aCount - bCount;
          return (a.symbol ?? "").localeCompare(b.symbol ?? "");
        })
        .map((instrument) => instrument.symbol)
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
      instruments.map((instrument) => [instrument.symbol?.toUpperCase() ?? "", instrument])
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

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const instrument = instrumentBySymbol.get(symbol);
          if (!instrument) return { rows: [], missingSymbol: null, error: null };
          const stats = statsByInstrumentId.get(instrument.id);
          const shouldBackfill = includeBackfill && needsLongHistoryBackfill(instrument, stats?.earliestPriceDate ?? null, defaultFrom);
          const from = shouldBackfill ? defaultFrom : stats?.latestPriceDate ? daysBeforeIso(stats.latestPriceDate, 7) : defaultFrom;
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
      await this.repository.upsertInstrumentPrices(rows);
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
        includeBackfill: input?.includeBackfill
      });

      result.requestedSymbols.forEach((symbol) => requestedSymbols.add(symbol));
      result.missingSymbols.forEach((symbol) => missingSymbols.add(symbol));
      errors.push(...result.errors);
      updatedCount += result.updatedCount;

      if (result.requestedSymbols.length === 0) break;
      if (result.updatedCount === 0 && result.missingSymbols.length === 0) break;
    }

    return {
      requestedSymbols: Array.from(requestedSymbols),
      updatedCount,
      missingSymbols: Array.from(missingSymbols),
      errors,
      message:
        requestedSymbols.size === 0
          ? "Instrument prices are already fresh."
          : `Stored ${updatedCount} instrument price row${updatedCount === 1 ? "" : "s"} across ${requestedSymbols.size} instrument${requestedSymbols.size === 1 ? "" : "s"}.`
    };
  }

  async buildInstrumentMarketViews(instruments: Instrument[], options?: { lookbackYears?: number }): Promise<InstrumentMarketView[]> {
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

  async getHistoryCoverageSummary(instruments: Instrument[], backfillBatchSize = 12): Promise<InstrumentHistoryCoverageSummary> {
    const activeInstruments = instruments.filter((instrument) => instrument.isActive);
    const stats = await this.repository.listInstrumentPriceStats(activeInstruments.map((instrument) => instrument.id));
    const statsByInstrumentId = new Map(stats.map((item) => [item.instrumentId, item]));
    const threeYearStart = yearsAgoIso(3);
    const fiveYearStart = yearsAgoIso(5);
    let totalEligible = 0;
    let completeFiveYear = 0;
    let completeThreeYear = 0;
    let oneYearOnly = 0;
    let excludedCrypto = 0;

    for (const instrument of activeInstruments) {
      if (isCryptoHistoryExcluded(instrument)) {
        excludedCrypto += 1;
        continue;
      }

      totalEligible += 1;
      const earliestDate = statsByInstrumentId.get(instrument.id)?.earliestPriceDate ?? null;
      if (earliestDate && earliestDate <= fiveYearStart) {
        completeFiveYear += 1;
        completeThreeYear += 1;
        continue;
      }

      if (earliestDate && earliestDate <= threeYearStart) {
        completeThreeYear += 1;
        continue;
      }

      oneYearOnly += 1;
    }

    const missingFiveYear = Math.max(0, totalEligible - completeFiveYear);
    const missingThreeYear = Math.max(0, totalEligible - completeThreeYear);

    return {
      totalEligible,
      completeFiveYear,
      missingFiveYear,
      completeThreeYear,
      missingThreeYear,
      oneYearOnly,
      excludedCrypto,
      estimatedBackfillClicks: Math.ceil(missingFiveYear / Math.max(1, backfillBatchSize))
    };
  }

}
