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

  async refreshInstrumentPrices(input?: { lookbackDays?: number; instrumentIds?: string[] }): Promise<RefreshInstrumentPricesResult> {
    const lookbackDays = input?.lookbackDays ?? 1825;
    const allInstruments = await this.repository.listInstruments({ isActive: true });
    const instruments = input?.instrumentIds?.length
      ? allInstruments.filter((instrument) => input.instrumentIds?.includes(instrument.id))
      : allInstruments;
    const symbols = uniqueSymbols(instruments.map((instrument) => instrument.symbol)).slice(0, 75);

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
    const from = daysAgoIso(lookbackDays);
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

    for (const symbol of symbols) {
      try {
        const instrument = instrumentBySymbol.get(symbol);
        if (!instrument) continue;
        const quotes = await this.provider.getHistoricalPrices(symbol, from, to, { assetClass: instrument.assetClass });
        if (quotes.length === 0) {
          missingSymbols.push(symbol);
          continue;
        }

        for (const quote of quotes) {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Instrument price refresh failed.";
        errors.push(`${symbol}: ${message}`);
      }
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
          ? `Stored ${rows.length} instrument price row${rows.length === 1 ? "" : "s"} for ${symbols.length} instrument${symbols.length === 1 ? "" : "s"}.`
          : `Stored ${rows.length} instrument price row${rows.length === 1 ? "" : "s"} with ${errors.length} issue${errors.length === 1 ? "" : "s"}.`
    };
  }

  async buildInstrumentMarketViews(instruments: Instrument[]): Promise<InstrumentMarketView[]> {
    if (instruments.length === 0) return [];

    const priceRows = await this.repository.listInstrumentPrices(instruments.map((instrument) => instrument.id));
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

}
