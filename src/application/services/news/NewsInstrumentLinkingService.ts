import type { Instrument } from "@/domain/universe/types";
import type { NormalizedNewsArticle } from "@/domain/news/types";
import { normalizeSymbol } from "./newsText";

export type LinkedNewsArticle = NormalizedNewsArticle & {
  relatedInstrumentIds: string[];
  linkedSymbols: string[];
  linkConfidence: "high" | "medium" | "low" | "unlinked";
};

export class NewsInstrumentLinkingService {
  link(article: NormalizedNewsArticle, instruments: Instrument[]): LinkedNewsArticle {
    const bySymbol = new Map(
      instruments
        .filter((instrument) => instrument.symbol && instrument.isActive)
        .map((instrument) => [normalizeSymbol(instrument.symbol ?? ""), instrument])
    );
    const symbols = Array.from(new Set([...article.tickers, ...article.rawSymbols].map(normalizeSymbol).filter(Boolean)));
    const matched = symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((instrument): instrument is Instrument => Boolean(instrument));

    const relatedInstrumentIds = Array.from(new Set(matched.map((instrument) => instrument.id)));
    const linkedSymbols = Array.from(new Set(matched.map((instrument) => instrument.symbol).filter((symbol): symbol is string => Boolean(symbol))));

    return {
      ...article,
      relatedInstrumentIds,
      linkedSymbols,
      linkConfidence: relatedInstrumentIds.length > 0 ? "high" : symbols.length > 0 ? "low" : "unlinked"
    };
  }
}
