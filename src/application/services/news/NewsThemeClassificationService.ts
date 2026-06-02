import type { NewsCanonicalTheme, SourceQualityTier } from "@/domain/news/types";

export type NewsThemeClassificationInput = {
  title: string;
  summary?: string | null;
  contentSnippet?: string | null;
  tickers?: string[];
  sourceProvider?: string;
  sourceQualityTier?: SourceQualityTier;
  providerPrimaryTheme?: NewsCanonicalTheme | null;
  providerCategory?: string | null;
};

export type NewsThemeClassificationResult = {
  primaryTheme: NewsCanonicalTheme | null;
  secondaryThemes: NewsCanonicalTheme[];
  themeConfidence: number;
  affectedAssetClasses: string[];
  affectedMacroCategories: string[];
  affectedThemes: string[];
  structural: boolean;
};

const cryptoSymbols = new Set(["BTC", "BTCUSD", "ETH", "ETHUSD", "SOL", "SOLUSD", "IBIT", "FBTC", "BITB", "ARKB", "ETHA", "ETHE", "FETH"]);
const bondSymbols = new Set(["BND", "AGG", "SHY", "IEF", "TLT", "TIP", "LQD", "HYG", "SGOV", "BIL", "BNDX"]);
const goldSymbols = new Set(["GLD", "IAU"]);

const tickerThemeMap = new Map<string, NewsCanonicalTheme>([
  ["AAPL", "Technology"], ["MSFT", "Technology"], ["NVDA", "AI"], ["GOOGL", "Technology"], ["META", "Technology"],
  ["AMZN", "Consumer"], ["AMD", "AI"], ["TSM", "Technology"], ["ASML", "Technology"], ["AVGO", "AI"],
  ["ANET", "Technology"], ["PANW", "Technology"], ["CRWD", "Technology"], ["ORCL", "Technology"], ["IBM", "Technology"],
  ["SHOP", "Consumer"], ["NFLX", "Consumer"], ["HD", "Consumer"], ["COST", "Consumer"], ["PG", "Consumer"],
  ["KO", "Consumer"], ["NKE", "Consumer"], ["DIS", "Consumer"], ["JPM", "Financials"], ["GS", "Financials"],
  ["V", "Financials"], ["MA", "Financials"], ["PYPL", "Financials"], ["LLY", "Healthcare"], ["UNH", "Healthcare"],
  ["JNJ", "Healthcare"], ["ISRG", "Healthcare"], ["ABBV", "Healthcare"], ["MRK", "Healthcare"], ["XOM", "Energy"],
  ["CVX", "Energy"], ["NEE", "Energy"], ["CAT", "Industrials"], ["GE", "Industrials"], ["BA", "Industrials"],
  ["XLK", "Technology"], ["VGT", "Technology"], ["SMH", "AI"], ["SOXX", "Technology"], ["XLF", "Financials"],
  ["XLE", "Energy"], ["XLV", "Healthcare"], ["VHT", "Healthcare"], ["XLP", "Consumer"], ["XLU", "Utilities"],
  ["VNQ", "Real Estate"], ["SCHD", "Dividend"], ["VIG", "Dividend"], ["SPY", "Growth"], ["VOO", "Growth"],
  ["IVV", "Growth"], ["VTI", "Growth"], ["QQQ", "Growth"], ["VT", "Growth"], ["ACWI", "Growth"],
  ["VXUS", "Growth"], ["VEA", "Growth"], ["VWO", "Growth"], ["IEMG", "Growth"],
  ["GLD", "Inflation Hedge"], ["IAU", "Inflation Hedge"], ["TLT", "Long Duration"], ["TIP", "Inflation Hedge"]
]);

const themeKeywords: Array<{ theme: NewsCanonicalTheme; terms: string[]; macro?: string; structural?: boolean }> = [
  { theme: "Rates", macro: "rates", terms: ["fed", "federal reserve", "central bank", "interest rate", "rate cut", "rate cuts", "rate hike", "rate hikes", "treasury yield", "bond yield"] },
  { theme: "Inflation", macro: "inflation", terms: ["inflation", "cpi", "pce", "price pressure", "prices", "pmi"] },
  { theme: "Growth", macro: "growth", terms: ["gdp", "growth", "recession", "slowdown", "expansion", "soft landing", "economic outlook", "stock market", "s&p 500 futures", "market opens", "wall street"] },
  { theme: "Employment", macro: "employment", terms: ["jobs", "payroll", "employment", "unemployment", "labor market", "wages"] },
  { theme: "Yield Curve", macro: "yield_curve", terms: ["yield curve", "curve inversion", "inverted curve", "10y2y", "10y3m", "steepening", "flattening"] },
  { theme: "Currency", macro: "currency", terms: ["dollar", "usd", "dxy", "currency", "fx", "foreign exchange"] },
  { theme: "Geopolitical", macro: "geopolitical", terms: ["iran", "middle east", "israel", "sanction", "sanctions", "war", "conflict", "military", "missile", "election risk", "political instability", "peace talks", "tariff escalation", "export controls", "trade restrictions", "maritime disruption", "supply chain disruption", "geopolitical"] },
  { theme: "Energy", macro: "energy", terms: ["oil", "opec", "crude", "natural gas", "lng", "energy"] },
  { theme: "Trade / Supply Chain", macro: "trade_supply_chain", terms: ["tariff", "tariffs", "trade war", "export control", "export controls", "supply chain"], structural: true },
  { theme: "Credit", macro: "credit", terms: ["credit spread", "credit spreads", "corporate credit", "high yield", "investment grade", "default", "defaults", "debt market", "bond market"] },
  { theme: "AI", terms: ["ai", "artificial intelligence", "agentic ai", "nvidia", "nvda", "accelerator", "data center"], structural: true },
  { theme: "Technology", terms: ["technology", "software", "cloud", "semiconductor", "chip", "chips", "intel", "amd", "broadcom", "dell", "apple", "pc market", "hardware"] },
  { theme: "Consumer", terms: ["consumer", "retail", "shopping", "costco", "nike", "disney", "netflix", "e-commerce"] },
  { theme: "Healthcare", terms: ["healthcare", "health care", "pharma", "biotech", "drug", "fda", "lilly", "unitedhealth"] },
  { theme: "Financials", terms: ["bank", "banks", "financial", "financials", "jpmorgan", "goldman", "fintech"] },
  { theme: "Industrials", terms: ["industrial", "industrials", "infrastructure", "factory", "pentagon", "defense", "aerospace", "boeing", "caterpillar", "ge aerospace"] },
  { theme: "Real Estate", terms: ["real estate", "reit", "reits", "property", "housing", "mortgage"] },
  { theme: "Utilities", terms: ["utility", "utilities", "power grid", "electric utility", "regulated utility"] },
  { theme: "Materials", terms: ["materials", "mining", "metals", "copper", "lithium", "steel"] },
  { theme: "Quality", terms: ["quality", "strong balance sheet", "cash flow", "profitability", "moat"] },
  { theme: "Value", terms: ["value", "undervalued", "cheap valuation", "valuation discount", "low multiple"] },
  { theme: "Dividend", terms: ["dividend", "yield income", "payout"] },
  { theme: "Defensive", terms: ["defensive", "staples", "recession proof", "safe haven"] },
  { theme: "High Beta", terms: ["high beta", "speculative", "profitless", "volatile", "meme stock", "risk-on"] },
  { theme: "Long Duration", macro: "rates", terms: ["long duration", "duration risk", "duration-sensitive", "long treasury", "long bond"] },
  { theme: "Inflation Hedge", macro: "inflation", terms: ["inflation hedge", "tips", "gold", "bullion", "commodities", "precious metals"] },
  { theme: "Recession Hedge", macro: "growth", terms: ["recession hedge", "flight to safety", "treasury rally", "safe haven treasuries"] }
];

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

function sourceQualityAdjustment(tier?: SourceQualityTier) {
  if (tier === "tier_1") return 8;
  if (tier === "tier_2") return 3;
  return 0;
}

export class NewsThemeClassificationService {
  classify(input: NewsThemeClassificationInput): NewsThemeClassificationResult {
    const text = `${input.title} ${input.summary ?? ""} ${input.contentSnippet ?? ""}`.toLowerCase();
    const symbols = (input.tickers ?? []).map((ticker) => ticker.toUpperCase());
    const tickerThemes = unique(symbols.map((symbol) => tickerThemeMap.get(symbol)).filter((theme): theme is NewsCanonicalTheme => Boolean(theme)));
    const keywordThemes: NewsCanonicalTheme[] = [];
    const macroCategories: string[] = [];
    const structuralSignals: boolean[] = [];

    for (const signal of themeKeywords) {
      if (!includesAny(text, signal.terms)) continue;
      keywordThemes.push(signal.theme);
      if (signal.macro) macroCategories.push(signal.macro);
      structuralSignals.push(Boolean(signal.structural));
    }

    const hasGoldFalsePositiveText = includesAny(text, ["gold rush", "golden", "goldman"]);
    const hasFinancialGoldText = includesAny(text, ["gold price", "spot gold", "bullion", "precious metal", "precious metals", "gold etf", "gold futures"]);
    const isCrypto = symbols.some((symbol) => cryptoSymbols.has(symbol)) || includesAny(text, ["bitcoin", "ethereum", "solana", "crypto"]);
    const isBond = symbols.some((symbol) => bondSymbols.has(symbol)) || includesAny(text, ["treasury", "bond", "yield curve", "credit spread"]);
    const isGold = symbols.some((symbol) => goldSymbols.has(symbol)) ||
      /\bgold\b/.test(text) && !hasGoldFalsePositiveText ||
      includesAny(text, ["gold price", "bullion", "precious metal", "precious metals", "commodity", "commodities"]);
    const hasTicker = symbols.length > 0;
    const isBroadMarket = includesAny(text, ["s&p 500", "nasdaq", "dow", "stock market", "wall street", "market opens"]);
    const isEquity = hasTicker || isBroadMarket || includesAny(text, ["stock", "stocks", "equity", "equities", "earnings", "shares", "forecast", "forecasts"]);

    const orderedThemes = unique([
      ...keywordThemes,
      ...tickerThemes,
      input.providerPrimaryTheme ?? null
    ].filter((theme): theme is NewsCanonicalTheme => Boolean(theme)));

    if (includesAny(text, ["etf", "etfs", "mutual fund", "expense ratio", "fund fees"]) && !includesAny(text, ["credit spread", "corporate credit", "high yield", "investment grade", "default", "bond market"])) {
      const creditIndex = orderedThemes.indexOf("Credit");
      if (creditIndex >= 0) orderedThemes.splice(creditIndex, 1);
    }
    if (includesAny(text, ["ism manufacturing", "manufacturing pmi"]) && !isEquity) {
      const industrialIndex = orderedThemes.indexOf("Industrials");
      if (industrialIndex >= 0) orderedThemes.splice(industrialIndex, 1);
    }
    if (hasGoldFalsePositiveText && !hasFinancialGoldText && !symbols.some((symbol) => goldSymbols.has(symbol))) {
      for (const theme of ["Inflation", "Inflation Hedge"] as NewsCanonicalTheme[]) {
        const themeIndex = orderedThemes.indexOf(theme);
        if (themeIndex >= 0) orderedThemes.splice(themeIndex, 1);
      }
      for (let index = macroCategories.length - 1; index >= 0; index--) {
        if (macroCategories[index] === "inflation") macroCategories.splice(index, 1);
      }
    }

    const fallbackTheme: NewsCanonicalTheme | null = isCrypto ? "Technology" : isGold ? "Inflation" : isBond ? "Credit" : isBroadMarket ? "Growth" : null;
    const primaryTheme = orderedThemes[0] ?? fallbackTheme;
    const secondaryThemes = orderedThemes.filter((theme) => theme !== primaryTheme).slice(0, 5);
    const isMacro = macroCategories.length > 0 || Boolean(input.providerPrimaryTheme && ["Rates", "Inflation", "Growth", "Employment", "Yield Curve", "Currency", "Geopolitical", "Energy", "Credit", "Trade / Supply Chain", "Long Duration", "Inflation Hedge", "Recession Hedge"].includes(input.providerPrimaryTheme));
    const affectedAssetClasses = unique([
      isCrypto ? "crypto" : null,
      isBond ? "bonds" : null,
      isGold ? "gold/commodities" : null,
      isEquity && !isCrypto && !isBond && !isGold ? "equities" : null,
      isMacro && !isGold ? "macro" : null
    ].filter((item): item is string => Boolean(item)));

    const affectedThemes = [
      primaryTheme === "AI" ? "AI / Automation" : null,
      includesAny(text, ["semiconductor", "chip", "chips", "intel", "nvidia", "amd", "tsm", "asml"]) ? "Semiconductors" : null,
      primaryTheme === "Technology" || secondaryThemes.includes("Technology") ? "Cloud / Software" : null,
      primaryTheme === "Rates" || isBond ? "Interest Rate Sensitive" : null,
      primaryTheme === "Inflation" || isGold ? "Inflation Hedge" : null,
      primaryTheme === "Long Duration" ? "Long Duration" : null,
      primaryTheme === "Inflation Hedge" ? "Inflation Hedge" : null,
      primaryTheme === "Recession Hedge" ? "Recession Hedge" : null,
      isCrypto ? "Crypto / Digital Assets" : null
    ].filter((item): item is string => Boolean(item));

    const baseConfidence = primaryTheme
      ? 50 + Math.min(20, keywordThemes.length * 5) + Math.min(10, tickerThemes.length * 4) + sourceQualityAdjustment(input.sourceQualityTier)
      : 30;
    return {
      primaryTheme,
      secondaryThemes,
      themeConfidence: Math.min(90, baseConfidence),
      affectedAssetClasses,
      affectedMacroCategories: unique([...macroCategories, input.providerCategory ?? null].filter((item): item is string => Boolean(item))).slice(0, 8),
      affectedThemes: unique(affectedThemes),
      structural: structuralSignals.some(Boolean)
    };
  }
}
