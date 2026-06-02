import type { NewsCanonicalTheme, NewsClassification, NewsItem } from "@/domain/news/types";

type ClassifiedNewsItem = NewsItem & { classification: NewsClassification };

const goldSymbols = new Set(["GLD", "IAU"]);
const bondSymbols = new Set(["BND", "AGG", "SHY", "IEF", "TLT", "TIP", "LQD", "HYG", "SGOV", "BIL", "BNDX"]);
const cryptoSymbols = new Set(["BTC", "BTCUSD", "ETH", "ETHUSD", "SOL", "SOLUSD", "IBIT", "FBTC", "BITB", "ARKB", "ETHA", "ETHE", "FETH"]);
const healthcareSymbols = new Set(["LLY", "UNH", "JNJ", "ISRG", "ABBV", "MRK", "XLV", "VHT"]);
const financialSymbols = new Set(["JPM", "GS", "V", "MA", "PYPL", "XLF"]);
const technologySymbols = new Set(["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMD", "TSM", "ASML", "AVGO", "ANET", "PANW", "CRWD", "ORCL", "IBM", "XLK", "VGT", "SMH", "SOXX"]);

const goldTerms = ["gold price", "spot gold", "gold prices", "bullion", "precious metal", "precious metals", "silver", "kitco", "heraeus"];
const goldFalsePositiveTerms = ["gold rush", "golden", "goldman"];
const oilEnergyTerms = ["oil", "crude", "opec", "natural gas", "lng"];
const currencyTerms = ["peso", "dollar", "us dollar", "usd", "dxy", "currency", "fx", "yen", "euro"];
const geopoliticalTerms = ["iran", "middle east", "israel", "sanction", "sanctions", "war", "conflict", "military", "missile", "election risk", "political instability", "peace talks", "tariff escalation", "export controls", "trade restrictions", "maritime disruption", "supply chain disruption", "geopolitical"];
const aiTerms = ["ai", "artificial intelligence", "agentic ai", "nvidia", "nvda", "semiconductor", "chip", "chips", "data center"];
const healthcareTerms = ["healthcare", "health care", "pharma", "biotech", "drug", "fda", "abbvie", "pfizer", "lilly", "unitedhealth"];
const broadEquityTerms = ["stock", "stocks", "equity", "equities", "s&p 500", "nasdaq", "dow", "wall street", "earnings", "shares"];
const fundStructureTerms = ["etf", "etfs", "mutual fund", "mutual funds", "expense ratio", "fund fees", "cheaper than mutual funds"];
const creditRiskTerms = ["credit spread", "credit spreads", "corporate credit", "high yield", "investment grade", "default", "defaults", "loan", "loans", "debt market", "bond market", "treasury yield", "bond yield"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesTerm(text: string, term: string) {
  const escaped = escapeRegExp(term);
  if (/^[a-z0-9]+$/i.test(term)) return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  return text.includes(term);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => includesTerm(text, term));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export class NewsSummaryCorrectionService {
  correctedBucket(item: ClassifiedNewsItem, inferredBucket: string) {
    const text = `${item.title} ${item.summary ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
    const symbols = item.tickers.map((ticker) => ticker.toUpperCase());
    const hasGoldFalsePositive = includesAny(text, goldFalsePositiveTerms) && !includesAny(text, goldTerms);
    const hasGold = !hasGoldFalsePositive && (symbols.some((symbol) => goldSymbols.has(symbol)) || includesAny(text, goldTerms));
    const hasBond = symbols.some((symbol) => bondSymbols.has(symbol));
    const hasCrypto = symbols.some((symbol) => cryptoSymbols.has(symbol)) || includesAny(text, ["bitcoin", "ethereum", "solana", "crypto"]);
    const hasCurrency = includesAny(text, currencyTerms);
    const hasGeopolitical = includesAny(text, geopoliticalTerms);
    const isEquity = symbols.length > 0 || includesAny(text, broadEquityTerms);
    const isFundStructureWithoutCredit = includesAny(text, fundStructureTerms) && !includesAny(text, creditRiskTerms);

    if (isFundStructureWithoutCredit) return isEquity ? "equities" : "macro";
    if (hasCrypto) return "crypto";
    if (hasGold) return "gold";
    if (hasBond && !hasGold) return "bonds";
    if (hasGeopolitical && !isEquity) return "geopolitical";
    if (hasCurrency && !isEquity) return "currency";
    if (includesAny(text, oilEnergyTerms) && !isEquity) return "macro";
    if (isEquity) return "equities";
    return inferredBucket;
  }

  correctedThemes(item: ClassifiedNewsItem, themes: NewsCanonicalTheme[]) {
    const text = `${item.title} ${item.summary ?? ""} ${item.contentSnippet ?? ""}`.toLowerCase();
    const symbols = item.tickers.map((ticker) => ticker.toUpperCase());
    const next = new Set(themes);
    const isFundStructureWithoutCredit = includesAny(text, fundStructureTerms) && !includesAny(text, creditRiskTerms);
    const hasGoldFalsePositive = includesAny(text, goldFalsePositiveTerms) && !includesAny(text, goldTerms);

    if (isFundStructureWithoutCredit) {
      next.delete("Credit");
    }
    if (hasGoldFalsePositive) {
      next.delete("Inflation");
      next.delete("Energy");
    }

    if (includesAny(text, goldTerms)) {
      next.delete("Credit");
      next.add("Inflation");
      next.add("Energy");
    }
    if (includesAny(text, geopoliticalTerms)) next.add("Geopolitical");
    if (includesAny(text, currencyTerms)) next.add("Currency");
    if (includesAny(text, oilEnergyTerms)) next.add("Energy");
    if (symbols.some((symbol) => healthcareSymbols.has(symbol)) || includesAny(text, healthcareTerms)) {
      next.delete("Financials");
      next.add("Healthcare");
    }
    if (symbols.some((symbol) => financialSymbols.has(symbol))) next.add("Financials");
    if (symbols.some((symbol) => technologySymbols.has(symbol)) || includesAny(text, aiTerms)) {
      next.add("Technology");
      if (includesAny(text, aiTerms)) next.add("AI");
    }
    if (includesAny(text, ["ai infrastructure", "ai buildout", "data center"])) {
      next.delete("Industrials");
      next.delete("Consumer");
      next.add("AI");
      next.add("Technology");
    }

    return unique(Array.from(next)).slice(0, 8);
  }
}
