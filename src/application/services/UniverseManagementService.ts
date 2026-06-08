import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import { TaxonomyService } from "@/application/services/taxonomy/TaxonomyService";
import {
  BenchmarkProfile,
  BondProfile,
  CryptoProfile,
  Instrument,
  WatchlistTier,
  Watchlist,
  WatchlistItem
} from "@/domain/universe/types";
import {
  ALPHA_ETF_CATEGORIES,
  ALPHA_STOCK_SECTORS,
  assetCategoryForEtfCategory,
  type AssetCategory,
  type EtfCategory,
  toTitleFromSymbol
} from "@/domain/universe/alphaUniverse";

type InstrumentSeed = Omit<Instrument, "id" | "metadataLastRefreshedAt" | "providerMetadata"> & {
  metadataLastRefreshedAt?: string | null;
  providerPrimary?: string | null;
  providerMetadata?: Record<string, unknown>;
};

type WatchlistSeed = Omit<Watchlist, "id">;
type WatchlistItemSeed = Omit<WatchlistItem, "id" | "watchlistKey" | "name" | "watchlistTier"> & {
  watchlistKey: string;
  symbol: string;
};

const legacySeededInstruments: InstrumentSeed[] = [
  // US broad market and global ETFs
  instrument("SPY", "SPDR S&P 500 ETF Trust", "etf", "ETF", "United States", "USD", "NYSE Arca", { benchmarkTags: ["sp500"], thematicTags: ["broad-market"] }),
  instrument("VOO", "Vanguard S&P 500 ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { benchmarkTags: ["sp500"], thematicTags: ["broad-market"] }),
  instrument("IVV", "iShares Core S&P 500 ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { benchmarkTags: ["sp500"], thematicTags: ["broad-market"] }),
  instrument("VTI", "Vanguard Total Stock Market ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["broad-market"] }),
  instrument("VT", "Vanguard Total World Stock ETF", "etf", "ETF", "Global", "USD", "NYSE Arca", { benchmarkTags: ["global-equities"], thematicTags: ["global"] }),
  instrument("VXUS", "Vanguard Total International Stock ETF", "etf", "ETF", "International", "USD", "NYSE Arca", { thematicTags: ["global"] }),
  instrument("VEA", "Vanguard FTSE Developed Markets ETF", "etf", "ETF", "Developed Markets", "USD", "NYSE Arca", { thematicTags: ["global"] }),
  instrument("ACWI", "iShares MSCI ACWI ETF", "etf", "ETF", "Global", "USD", "NYSE Arca", { benchmarkTags: ["global-equities"], thematicTags: ["global"] }),
  instrument("VWO", "Vanguard FTSE Emerging Markets ETF", "etf", "ETF", "Emerging Markets", "USD", "NYSE Arca", { thematicTags: ["emerging-markets"] }),
  instrument("IEMG", "iShares Core MSCI Emerging Markets ETF", "etf", "ETF", "Emerging Markets", "USD", "NYSE Arca", { thematicTags: ["emerging-markets"] }),

  // Growth / technology
  instrument("QQQ", "Invesco QQQ Trust", "etf", "ETF", "United States", "USD", "NASDAQ", { benchmarkTags: ["nasdaq-100"], thematicTags: ["growth", "technology"] }),
  instrument("VGT", "Vanguard Information Technology ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["technology"] }),
  instrument("XLK", "Technology Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["technology"] }),
  instrument("SMH", "VanEck Semiconductor ETF", "etf", "ETF", "United States", "USD", "NASDAQ", { thematicTags: ["semiconductors", "ai"] }),
  instrument("SOXX", "iShares Semiconductor ETF", "etf", "ETF", "United States", "USD", "NASDAQ", { thematicTags: ["semiconductors", "ai"] }),

  // Defensive / dividend / sector ETFs
  instrument("SCHD", "Schwab U.S. Dividend Equity ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["dividend", "defensive"] }),
  instrument("VIG", "Vanguard Dividend Appreciation ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["dividend", "defensive"] }),
  instrument("XLP", "Consumer Staples Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["defensive", "consumer"] }),
  instrument("XLU", "Utilities Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["defensive", "utilities"] }),
  instrument("XLV", "Health Care Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["healthcare"] }),
  instrument("VHT", "Vanguard Health Care ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["healthcare"] }),
  instrument("XLF", "Financial Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["financials"] }),
  instrument("XLE", "Energy Select Sector SPDR Fund", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["energy"] }),
  instrument("VNQ", "Vanguard Real Estate ETF", "etf", "ETF", "United States", "USD", "NYSE Arca", { thematicTags: ["reits", "real-estate"] }),

  // Bond / gold / cash-like ETFs
  bondEtf("BND", "Vanguard Total Bond Market ETF", "intermediate", "aggregate", "mixed investment grade", "US", "medium", "moderate negative", "mixed", "core stability"),
  bondEtf("AGG", "iShares Core U.S. Aggregate Bond ETF", "intermediate", "aggregate", "mixed investment grade", "US", "medium", "moderate negative", "mixed", "core stability"),
  bondEtf("SHY", "iShares 1-3 Year Treasury Bond ETF", "short", "treasury", "government", "US", "low", "low", "positive", "stability"),
  bondEtf("IEF", "iShares 7-10 Year Treasury Bond ETF", "intermediate", "treasury", "government", "US", "medium", "moderate negative", "positive", "recession hedge"),
  bondEtf("TLT", "iShares 20+ Year Treasury Bond ETF", "long", "treasury", "government", "US", "high", "negative", "positive", "long-duration recession hedge"),
  bondEtf("TIP", "iShares TIPS Bond ETF", "intermediate", "inflation-linked", "government", "US", "medium", "positive", "mixed", "inflation hedge"),
  bondEtf("LQD", "iShares iBoxx $ Investment Grade Corporate Bond ETF", "intermediate", "corporate", "investment grade", "US", "medium", "moderate negative", "negative", "income"),
  bondEtf("HYG", "iShares iBoxx $ High Yield Corporate Bond ETF", "short/intermediate", "high yield", "high yield", "US", "medium", "moderate", "negative", "income with credit risk"),
  bondEtf("SGOV", "iShares 0-3 Month Treasury Bond ETF", "ultra-short", "treasury", "government", "US", "low", "low", "positive", "cash-like stability"),
  bondEtf("BIL", "SPDR Bloomberg 1-3 Month T-Bill ETF", "ultra-short", "treasury", "government", "US", "low", "low", "positive", "cash-like stability"),
  goldEtf("GLD", "SPDR Gold Shares", "United States", "USD", "NYSE Arca"),
  goldEtf("IAU", "iShares Gold Trust", "United States", "USD", "NYSE Arca"),

  // Crypto ETF proxies for investable watchlist coverage
  cryptoEtf("IBIT", "iShares Bitcoin Trust ETF", "Bitcoin", "spot-bitcoin", "NYSE Arca"),
  cryptoEtf("FBTC", "Fidelity Wise Origin Bitcoin Fund", "Bitcoin", "spot-bitcoin", "Cboe BZX"),
  cryptoEtf("ETHA", "iShares Ethereum Trust ETF", "Ethereum", "spot-ethereum", "NASDAQ"),
  cryptoEtf("FETH", "Fidelity Ethereum Fund", "Ethereum", "spot-ethereum", "Cboe BZX"),
  cryptoEtf("BSOL", "Bitwise Solana Staking ETF", "Solana", "spot-solana", "NYSE Arca"),

  // Raw crypto references kept inactive by default; ETF proxies are the primary investable universe.
  crypto("BTC", "Bitcoin", "Bitcoin", "store-of-value", "high", false),
  crypto("ETH", "Ethereum", "Ethereum", "smart-contract", "high", false),
  crypto("SOL", "Solana", "Solana", "smart-contract", "high", false),

  // Core quality watchlist stocks
  stock("AAPL", "Apple", "core_quality", ["quality", "technology"], "Technology", "Consumer Electronics", "United States", "USD", "NASDAQ"),
  stock("MSFT", "Microsoft", "core_quality", ["quality", "technology", "cloud"], "Technology", "Software", "United States", "USD", "NASDAQ"),
  stock("NVDA", "NVIDIA", "core_quality", ["ai", "semiconductors", "growth"], "Technology", "Semiconductors", "United States", "USD", "NASDAQ"),
  stock("GOOGL", "Alphabet", "core_quality", ["quality", "technology", "advertising"], "Communication Services", "Internet Content", "United States", "USD", "NASDAQ"),
  stock("META", "Meta Platforms", "core_quality", ["quality", "technology", "advertising"], "Communication Services", "Internet Content", "United States", "USD", "NASDAQ"),
  stock("AMZN", "Amazon", "core_quality", ["quality", "consumer", "cloud"], "Consumer Discretionary", "Internet Retail", "United States", "USD", "NASDAQ"),
  stock("AMD", "Advanced Micro Devices", "core_quality", ["semiconductors", "ai", "growth"], "Technology", "Semiconductors", "United States", "USD", "NASDAQ"),
  stock("TSM", "Taiwan Semiconductor Manufacturing", "core_quality", ["semiconductors", "ai"], "Technology", "Semiconductor Equipment", "Taiwan", "USD", "NYSE"),
  stock("ASML", "ASML Holding", "core_quality", ["semiconductors", "equipment"], "Technology", "Semiconductor Equipment", "Netherlands", "USD", "NASDAQ"),
  stock("JPM", "JPMorgan Chase", "core_quality", ["financials", "quality"], "Financials", "Banks", "United States", "USD", "NYSE"),
  stock("GS", "Goldman Sachs", "core_quality", ["financials"], "Financials", "Capital Markets", "United States", "USD", "NYSE"),
  stock("LLY", "Eli Lilly", "core_quality", ["healthcare", "quality"], "Healthcare", "Pharmaceuticals", "United States", "USD", "NYSE"),
  stock("UNH", "UnitedHealth Group", "core_quality", ["healthcare", "quality"], "Healthcare", "Managed Health Care", "United States", "USD", "NYSE"),
  stock("JNJ", "Johnson & Johnson", "core_quality", ["healthcare", "defensive"], "Healthcare", "Pharmaceuticals", "United States", "USD", "NYSE"),
  stock("COST", "Costco Wholesale", "core_quality", ["consumer", "quality"], "Consumer Staples", "Discount Stores", "United States", "USD", "NASDAQ"),
  stock("PG", "Procter & Gamble", "core_quality", ["consumer", "defensive"], "Consumer Staples", "Household Products", "United States", "USD", "NYSE"),
  stock("KO", "Coca-Cola", "core_quality", ["consumer", "defensive"], "Consumer Staples", "Beverages", "United States", "USD", "NYSE"),
  stock("XOM", "Exxon Mobil", "core_quality", ["energy", "dividend"], "Energy", "Oil & Gas", "United States", "USD", "NYSE"),
  stock("CVX", "Chevron", "core_quality", ["energy", "dividend"], "Energy", "Oil & Gas", "United States", "USD", "NYSE"),
  stock("CAT", "Caterpillar", "core_quality", ["industrials"], "Industrials", "Farm & Heavy Construction Machinery", "United States", "USD", "NYSE"),
  stock("GE", "GE Aerospace", "core_quality", ["industrials"], "Industrials", "Aerospace & Defense", "United States", "USD", "NYSE"),
  stock("V", "Visa", "core_quality", ["financials", "payments"], "Financials", "Credit Services", "United States", "USD", "NYSE"),
  stock("MA", "Mastercard", "core_quality", ["financials", "payments"], "Financials", "Credit Services", "United States", "USD", "NYSE"),
  stock("HD", "Home Depot", "core_quality", ["consumer", "quality"], "Consumer Discretionary", "Home Improvement Retail", "United States", "USD", "NYSE"),
  stock("MRK", "Merck", "core_quality", ["healthcare", "defensive"], "Healthcare", "Pharmaceuticals", "United States", "USD", "NYSE"),
  stock("ORCL", "Oracle", "core_quality", ["technology", "software"], "Technology", "Software", "United States", "USD", "NYSE"),
  stock("IBM", "IBM", "core_quality", ["technology", "defensive"], "Technology", "IT Services", "United States", "USD", "NYSE"),

  // Tactical / thematic watchlist stocks
  stock("AVGO", "Broadcom", "tactical_thematic", ["ai", "semiconductors"], "Technology", "Semiconductors", "United States", "USD", "NASDAQ"),
  stock("ANET", "Arista Networks", "tactical_thematic", ["ai", "infrastructure"], "Technology", "Networking", "United States", "USD", "NYSE"),
  stock("PANW", "Palo Alto Networks", "tactical_thematic", ["cybersecurity"], "Technology", "Software", "United States", "USD", "NASDAQ"),
  stock("CRWD", "CrowdStrike", "tactical_thematic", ["cybersecurity"], "Technology", "Software", "United States", "USD", "NASDAQ"),
  stock("ISRG", "Intuitive Surgical", "tactical_thematic", ["healthcare", "medical-devices"], "Healthcare", "Medical Devices", "United States", "USD", "NASDAQ"),
  stock("ABBV", "AbbVie", "tactical_thematic", ["healthcare", "biotech"], "Healthcare", "Pharmaceuticals", "United States", "USD", "NYSE"),
  stock("NEE", "NextEra Energy", "tactical_thematic", ["energy-transition", "utilities"], "Utilities", "Electric Utilities", "United States", "USD", "NYSE"),
  stock("NFLX", "Netflix", "tactical_thematic", ["consumer-digital"], "Communication Services", "Entertainment", "United States", "USD", "NASDAQ"),
  stock("SHOP", "Shopify", "tactical_thematic", ["consumer-digital"], "Technology", "Software", "Canada", "USD", "NYSE"),

  // Opportunistic watchlist stocks
  stock("PYPL", "PayPal", "opportunistic", ["payments"], "Financials", "Credit Services", "United States", "USD", "NASDAQ"),
  stock("DIS", "Walt Disney", "opportunistic", ["consumer"], "Communication Services", "Entertainment", "United States", "USD", "NYSE"),
  stock("BA", "Boeing", "opportunistic", ["industrials"], "Industrials", "Aerospace & Defense", "United States", "USD", "NYSE"),
  stock("NKE", "Nike", "opportunistic", ["consumer"], "Consumer Discretionary", "Footwear", "United States", "USD", "NYSE"),
  stock("INTC", "Intel", "opportunistic", ["semiconductors"], "Technology", "Semiconductors", "United States", "USD", "NASDAQ")
];

const alphaEtfSeeds = (Object.entries(ALPHA_ETF_CATEGORIES) as Array<[EtfCategory, string[]]>).flatMap(([category, symbols]) =>
  symbols.map((symbol) => alphaEtf(symbol, category))
);

const alphaStockSeeds = Object.entries(ALPHA_STOCK_SECTORS).flatMap(([sector, symbols]) =>
  symbols.map((symbol) => alphaStock(symbol, sector))
);

const seededInstruments = dedupeInstruments([...legacySeededInstruments, ...alphaEtfSeeds, ...alphaStockSeeds]);

const seededWatchlists: WatchlistSeed[] = [
  {
    watchlistKey: "core_quality",
    name: "Core Quality Watchlist",
    watchlistTier: "core_quality",
    description: "Long-term high-quality businesses with durable franchises.",
    isSystem: true,
    isActive: true,
    humanApprovalRequired: true,
    sourceType: "seeded"
  },
  {
    watchlistKey: "tactical_thematic",
    name: "Tactical / Thematic Watchlist",
    watchlistTier: "tactical_thematic",
    description: "Theme-driven names that are higher conviction but more cyclical.",
    isSystem: true,
    isActive: true,
    humanApprovalRequired: true,
    sourceType: "seeded"
  },
  {
    watchlistKey: "opportunistic",
    name: "Opportunistic Watchlist",
    watchlistTier: "opportunistic",
    description: "Smaller, lower-conviction ideas kept for future review.",
    isSystem: true,
    isActive: true,
    humanApprovalRequired: true,
    sourceType: "seeded"
  }
];

const benchmarkProfiles: BenchmarkProfile[] = [
  benchmarkProfile("sp500", "S&P 500", "equity", "SPY", "SPY", "USD", 100, [], "S&P 500 ETF proxy"),
  benchmarkProfile("nasdaq100", "Nasdaq 100", "equity", "QQQ", "QQQ", "USD", 100, [], "Nasdaq 100 ETF proxy"),
  benchmarkProfile("global_equities", "Global equities", "equity", "VT", "VT", "USD", 100, [], "Global equities ETF proxy"),
  benchmarkProfile("us_aggregate_bonds", "US aggregate bonds", "bond", "BND", "BND", "USD", 100, [], "US aggregate bond ETF proxy"),
  benchmarkProfile("gold", "Gold", "commodity", "GLD", "GLD", "USD", 100, [], "Gold ETF proxy"),
  benchmarkProfile("bitcoin", "Bitcoin", "crypto", "BTC", "BTCUSD", "USD", 100, [], "Bitcoin spot proxy"),
  benchmarkProfile(
    "sixty_forty",
    "60/40 portfolio proxy",
    "composite",
    null,
    null,
    "USD",
    100,
    [
      { symbol: "SPY", weight: 0.6 },
      { symbol: "AGG", weight: 0.4 }
    ],
    "60% S&P 500 + 40% US aggregate bonds"
  )
];

const bondProfiles = [
  bondProfile("BND", "intermediate", "aggregate", "mixed investment grade", "US", "medium", "moderate negative", "mixed", "core stability", "USD"),
  bondProfile("AGG", "intermediate", "aggregate", "mixed investment grade", "US", "medium", "moderate negative", "mixed", "core stability", "USD"),
  bondProfile("SHY", "short", "treasury", "government", "US", "low", "low", "positive", "stability", "USD"),
  bondProfile("IEF", "intermediate", "treasury", "government", "US", "medium", "moderate negative", "positive", "recession hedge", "USD"),
  bondProfile("TLT", "long", "treasury", "government", "US", "high", "negative", "positive", "long-duration recession hedge", "USD"),
  bondProfile("TIP", "intermediate", "inflation-linked", "government", "US", "medium", "positive", "mixed", "inflation hedge", "USD"),
  bondProfile("LQD", "intermediate", "corporate", "investment grade", "US", "medium", "moderate negative", "negative", "income", "USD"),
  bondProfile("HYG", "short/intermediate", "high yield", "high yield", "US", "medium", "moderate", "negative", "income with credit risk", "USD"),
  bondProfile("SGOV", "ultra-short", "treasury", "government", "US", "low", "low", "positive", "cash-like stability", "USD"),
  bondProfile("BIL", "ultra-short", "treasury", "government", "US", "low", "low", "positive", "cash-like stability", "USD")
];

const cryptoProfiles = [
  cryptoProfile("BTC", "Bitcoin", "store-of-value", "large-cap", "medium", "high"),
  cryptoProfile("ETH", "Ethereum", "smart-contract", "large-cap", "medium", "high"),
  cryptoProfile("SOL", "Solana", "smart-contract", "mid-cap", "medium", "high")
];

const watchlistItems: WatchlistItemSeed[] = [
  ...[
    "AAPL",
    "MSFT",
    "NVDA",
    "GOOGL",
    "META",
    "AMZN",
    "AMD",
    "TSM",
    "ASML",
    "JPM",
    "GS",
    "LLY",
    "UNH",
    "JNJ",
    "COST",
    "PG",
    "KO",
    "XOM",
    "CVX",
    "CAT",
    "GE",
    "V",
    "MA",
    "HD",
    "MRK",
    "ORCL",
    "IBM"
  ].map((symbol, index) => item("core_quality", symbol, index + 1)),
  ...["AVGO", "ANET", "PANW", "CRWD", "ISRG", "ABBV", "NEE", "NFLX", "SHOP"].map((symbol, index) =>
    item("tactical_thematic", symbol, index + 1)
  ),
  ...["PYPL", "DIS", "BA", "NKE", "INTC"].map((symbol, index) => item("opportunistic", symbol, index + 1))
];

function mergeTags(existing: string[] | undefined, seeded: string[] | undefined) {
  return Array.from(new Set([...(existing ?? []), ...(seeded ?? [])]));
}

function dedupeInstruments(instruments: InstrumentSeed[]) {
  const bySymbol = new Map<string, InstrumentSeed>();
  for (const instrument of instruments) {
    const symbol = instrument.symbol?.toUpperCase();
    if (!symbol) continue;
    const existing = bySymbol.get(symbol);
    const generatedName = instrument.name === `${symbol} ETF` || instrument.name === symbol;
    bySymbol.set(symbol, {
      ...(existing ?? instrument),
      ...instrument,
      name: generatedName && existing?.name ? existing.name : instrument.name,
      benchmarkTags: mergeTags(existing?.benchmarkTags, instrument.benchmarkTags),
      thematicTags: mergeTags(existing?.thematicTags, instrument.thematicTags),
      durationCategory: instrument.durationCategory ?? existing?.durationCategory ?? null,
      treasuryClassification: instrument.treasuryClassification ?? existing?.treasuryClassification ?? null,
      inflationLinked: instrument.inflationLinked ?? existing?.inflationLinked ?? null,
      creditQuality: instrument.creditQuality ?? existing?.creditQuality ?? null,
      geoExposure: instrument.geoExposure ?? existing?.geoExposure ?? null,
      rateSensitivity: instrument.rateSensitivity ?? existing?.rateSensitivity ?? null,
      inflationSensitivity: instrument.inflationSensitivity ?? existing?.inflationSensitivity ?? null,
      recessionSensitivity: instrument.recessionSensitivity ?? existing?.recessionSensitivity ?? null,
      liquidityRole: instrument.liquidityRole ?? existing?.liquidityRole ?? null,
      cryptoClassification: instrument.cryptoClassification ?? existing?.cryptoClassification ?? null,
      providerMetadata: {
        ...(existing?.providerMetadata ?? {}),
        ...(instrument.providerMetadata ?? {})
      }
    });
  }
  return Array.from(bySymbol.values());
}

function categoryTheme(category: EtfCategory) {
  return category.toLowerCase().replaceAll("_", "-");
}

function alphaEtf(symbol: string, etfCategory: EtfCategory): InstrumentSeed {
  const assetCategory = assetCategoryForEtfCategory(etfCategory);
  const isBond = assetCategory === "BOND";
  const isGold = etfCategory === "GOLD_PRECIOUS_METALS";
  return instrument(
    symbol,
    `${toTitleFromSymbol(symbol)} ETF`,
    isBond ? "bond_etf" : isGold ? "gold_etf" : "etf",
    "etf",
    etfCategory === "GLOBAL_EQUITY" ? "Global" : etfCategory === "DEVELOPED_MARKETS" || etfCategory === "EMERGING_MARKETS" || etfCategory === "INTERNATIONAL_DIVIDEND" || etfCategory === "COUNTRY" ? "International" : "United States",
    "USD",
    "US-listed",
    {
      assetCategory,
      etfCategory,
      sector: isBond ? "Fixed Income" : isGold || etfCategory === "COMMODITY" ? "Commodities" : etfCategory === "REAL_ESTATE" ? "Real Estate" : "ETF",
      industry: "ETF",
      thematicTags: [categoryTheme(etfCategory)],
      riskCategory: isBond ? "fixed_income" : isGold || etfCategory === "COMMODITY" ? "commodity" : etfCategory === "REAL_ESTATE" ? "real_estate" : "equity",
      volatilityBucket: isBond ? "low" : "medium",
      providerMetadata: {
        etfvision: {
          etfCategory,
          assetCategory,
          taxonomySource: "manual_alpha_universe"
        }
      }
    }
  );
}

function alphaStock(symbol: string, sector: string): InstrumentSeed {
  return stock(symbol, toTitleFromSymbol(symbol), "core_quality", [sector.toLowerCase().replaceAll(" ", "-")], sector, sector, "United States", "USD", "US-listed");
}

function instrument(
  symbol: string,
  name: string,
  assetClass: InstrumentSeed["assetClass"],
  instrumentType: string,
  geography: string,
  currency: string,
  exchange: string,
  extra?: Partial<InstrumentSeed>
): InstrumentSeed {
  return {
    symbol,
    name,
    assetClass,
    assetCategory: extra?.assetCategory ?? inferAssetCategory(assetClass, instrumentType),
    etfCategory: extra?.etfCategory ?? null,
    instrumentType,
    sector: extra?.sector ?? null,
    industry: extra?.industry ?? null,
    geography,
    currency,
    exchange,
    watchlistTier: extra?.watchlistTier ?? null,
    benchmarkTags: extra?.benchmarkTags ?? [],
    thematicTags: extra?.thematicTags ?? [],
    riskCategory: extra?.riskCategory ?? null,
    volatilityBucket: extra?.volatilityBucket ?? null,
    durationCategory: extra?.durationCategory ?? null,
    treasuryClassification: extra?.treasuryClassification ?? null,
    inflationLinked: extra?.inflationLinked ?? null,
    creditQuality: extra?.creditQuality ?? null,
    geoExposure: extra?.geoExposure ?? geography,
    rateSensitivity: extra?.rateSensitivity ?? null,
    inflationSensitivity: extra?.inflationSensitivity ?? null,
    recessionSensitivity: extra?.recessionSensitivity ?? null,
    liquidityRole: extra?.liquidityRole ?? null,
    cryptoClassification: extra?.cryptoClassification ?? null,
    sourceType: "seeded",
    isActive: extra?.isActive ?? true,
    canonicalSector: extra?.canonicalSector ?? null,
    canonicalThemes: extra?.canonicalThemes ?? [],
    taxonomyIsManualOverride: extra?.taxonomyIsManualOverride ?? false,
    taxonomyReviewStatus: extra?.taxonomyReviewStatus ?? "mapped",
    providerPrimary: extra?.providerPrimary ?? null,
    providerMetadata: extra?.providerMetadata ?? {}
  };
}

function inferAssetCategory(assetClass: InstrumentSeed["assetClass"], instrumentType: string): AssetCategory {
  if (assetClass === "stock" || assetClass === "etf") return instrumentType === "crypto_etf" ? "CRYPTO" : "EQUITY";
  if (assetClass === "bond_etf") return "BOND";
  if (assetClass === "gold_etf") return "COMMODITY";
  if (assetClass === "cash_proxy") return "CASH";
  if (assetClass === "crypto") return "CRYPTO";
  return "UNKNOWN";
}

function stock(
  symbol: string,
  name: string,
  watchlistTier: WatchlistTier,
  thematicTags: string[],
  sector: string,
  industry: string,
  geography: string,
  currency: string,
  exchange: string
): InstrumentSeed {
  return {
    ...instrument(symbol, name, "stock", "stock", geography, currency, exchange, {
      watchlistTier,
      thematicTags,
      sector,
      industry,
      riskCategory: "equity",
      volatilityBucket: "medium"
    })
  };
}

function bondEtf(
  symbol: string,
  name: string,
  durationCategory: string,
  treasuryClassification: string,
  creditQuality: string,
  geography: string,
  rateSensitivity: string,
  inflationSensitivity: string,
  recessionSensitivity: string,
  liquidityRole: string
): InstrumentSeed {
  return {
    ...instrument(symbol, name, "bond_etf", "etf", geography, "USD", "NYSE Arca", {
      sector: "Fixed Income",
      industry: "Bond ETF",
      riskCategory: "fixed_income",
      volatilityBucket: "low",
      durationCategory,
      treasuryClassification,
      inflationLinked: symbol === "TIP",
      creditQuality,
      geoExposure: geography,
      rateSensitivity,
      inflationSensitivity,
      recessionSensitivity,
      liquidityRole
    })
  };
}

function goldEtf(symbol: string, name: string, geography: string, currency: string, exchange: string): InstrumentSeed {
  return {
    ...instrument(symbol, name, "gold_etf", "etf", geography, currency, exchange, {
      sector: "Commodities",
      industry: "Gold ETF",
      riskCategory: "commodity",
      volatilityBucket: "medium",
      liquidityRole: "inflation-hedge"
    })
  };
}

function cryptoEtf(symbol: string, name: string, underlying: string, classification: string, exchange: string): InstrumentSeed {
  return {
    ...instrument(symbol, name, "etf", "crypto_etf", "United States", "USD", exchange, {
      sector: "Digital Assets",
      industry: "Crypto ETF",
      riskCategory: "crypto",
      volatilityBucket: "high",
      thematicTags: ["crypto", classification],
      benchmarkTags: underlying === "Bitcoin" ? ["bitcoin"] : [],
      cryptoClassification: classification,
      liquidityRole: "crypto-exposure",
      geoExposure: "United States",
      providerMetadata: { underlying }
    })
  };
}

function crypto(symbol: string, name: string, chain: string, classification: string, volatilityBucket: string, isActive = true): InstrumentSeed {
  return {
    ...instrument(symbol, name, "crypto", "crypto", "Global", "USD", "Crypto", {
      sector: "Digital Assets",
      industry: chain,
      riskCategory: "crypto",
      volatilityBucket,
      cryptoClassification: classification,
      geoExposure: "Global",
      isActive
    }),
    providerMetadata: { chain }
  };
}

function benchmarkProfile(
  benchmarkKey: string,
  benchmarkName: string,
  benchmarkType: BenchmarkProfile["benchmarkType"],
  instrumentSymbol: string | null,
  providerSymbol: string | null,
  currency: string,
  baseValue: number,
  components: Array<{ symbol: string; weight: number }>,
  notes: string
): BenchmarkProfile {
  return {
    id: "",
    benchmarkKey,
    benchmarkName,
    benchmarkType,
    instrumentId: null,
    instrumentSymbol,
    providerSymbol,
    currency,
    baseValue,
    components,
    notes,
    isActive: true
  };
}

function bondProfile(
  symbol: string,
  durationCategory: string,
  treasuryClassification: string,
  creditQuality: string,
  geoExposure: string,
  rateSensitivity: string,
  inflationSensitivity: string,
  recessionSensitivity: string,
  liquidityRole: string,
  currency: string
): BondProfile {
  return {
    instrumentId: "",
    symbol,
    durationCategory,
    treasuryClassification,
    inflationLinked: symbol === "TIP",
    creditQuality,
    geoExposure,
    rateSensitivity,
    inflationSensitivity,
    recessionSensitivity,
    liquidityRole,
    currency,
    secYield: null,
    distributionYield: null,
    yieldToMaturity: null,
    yieldAsOfDate: null,
    effectiveDuration: null,
    averageMaturity: null,
    spreadDuration: null,
    optionAdjustedSpread: null,
    expenseRatio: null,
    isManualOverride: false,
    updatedAt: null,
    providerMetadata: {}
  };
}

function cryptoProfile(
  symbol: string,
  chain: string,
  marketCapBucket: string,
  custodyRisk: string,
  volatilityBucket: string,
  riskCategory: string
): CryptoProfile {
  return {
    instrumentId: "",
    symbol,
    chain,
    marketCapBucket,
    custodyRisk,
    volatilityBucket,
    providerMetadata: { riskCategory }
  };
}

function item(watchlistKey: string, symbol: string, itemRank: number): WatchlistItemSeed {
  return {
    watchlistId: "",
    instrumentId: "",
    watchlistKey,
    symbol,
    itemRank,
    rationale: null,
    approvalStatus: "approved",
    isActive: true
  };
}

export type UniverseSeedResult = {
  instruments: number;
  watchlists: number;
  watchlistItems: number;
  bondProfiles: number;
  benchmarkProfiles: number;
  cryptoProfiles: number;
};

export class UniverseManagementService {
  private readonly taxonomyService = new TaxonomyService();

  constructor(private readonly repository: UniverseRepository) {}

  async ensureSeededUniverse(): Promise<UniverseSeedResult> {
    const existingInstruments = await this.repository.listInstruments();
    const existingBySymbol = new Map(existingInstruments.map((instrument) => [instrument.symbol?.toUpperCase() ?? "", instrument]));

    await this.repository.upsertInstruments(
      seededInstruments.map((instrument) => {
        const existing = existingBySymbol.get(instrument.symbol?.toUpperCase() ?? "");
        const thematicTags = mergeTags(existing?.thematicTags, instrument.thematicTags);
        const normalized = this.taxonomyService.normalize({
          symbol: instrument.symbol,
          name: instrument.name,
          assetClass: instrument.assetClass,
          instrumentType: instrument.instrumentType,
          rawSector: instrument.sector,
          rawIndustry: instrument.industry,
          seededThemes: thematicTags,
          bondProfile: instrument
        });
        return {
          ...instrument,
          benchmarkTags: mergeTags(existing?.benchmarkTags, instrument.benchmarkTags),
          thematicTags,
          canonicalSector: existing?.taxonomyIsManualOverride ? existing.canonicalSector : normalized.canonicalSector,
          canonicalThemes: existing?.taxonomyIsManualOverride ? existing.canonicalThemes : normalized.canonicalThemes,
          taxonomyIsManualOverride: existing?.taxonomyIsManualOverride ?? false,
          taxonomyReviewStatus: normalized.unmappedRawValues.length > 0 ? "needs_review" : "mapped",
          metadataLastRefreshedAt: instrument.metadataLastRefreshedAt ?? existing?.metadataLastRefreshedAt ?? null,
          providerPrimary: instrument.providerPrimary ?? existing?.providerPrimary ?? null,
          providerMetadata: Object.keys(instrument.providerMetadata ?? {}).length > 0 ? instrument.providerMetadata ?? {} : existing?.providerMetadata ?? {},
          isActive: existing?.isActive ?? instrument.isActive
        };
      })
    );
    const instruments = await this.repository.listInstruments();
    const instrumentBySymbol = new Map(instruments.map((instrument) => [instrument.symbol?.toUpperCase() ?? "", instrument]));

    await this.repository.updateInstrumentTags(
      seededInstruments
        .filter((instrument) => (instrument.benchmarkTags?.length ?? 0) > 0 || (instrument.thematicTags?.length ?? 0) > 0)
        .map((instrument) => ({
          instrumentId: instrumentBySymbol.get(instrument.symbol?.toUpperCase() ?? "")?.id ?? "",
          benchmarkTags: mergeTags(existingBySymbol.get(instrument.symbol?.toUpperCase() ?? "")?.benchmarkTags, instrument.benchmarkTags),
          thematicTags: mergeTags(existingBySymbol.get(instrument.symbol?.toUpperCase() ?? "")?.thematicTags, instrument.thematicTags)
        }))
        .filter((item) => Boolean(item.instrumentId))
    );

    await this.repository.upsertWatchlists(seededWatchlists);
    const watchlists = await this.repository.listWatchlists();
    const watchlistByKey = new Map(watchlists.map((watchlist) => [watchlist.watchlistKey, watchlist]));

    await this.repository.upsertWatchlistItems(
      watchlistItems
        .map((itemRow) => {
        const watchlist = watchlistByKey.get(itemRow.watchlistKey);
        const instrument = instrumentBySymbol.get(itemRow.symbol.toUpperCase());
        if (!watchlist || !instrument) return null;
        return {
          watchlistId: watchlist.id,
          instrumentId: instrument.id,
          itemRank: itemRow.itemRank,
          rationale: itemRow.rationale,
          approvalStatus: itemRow.approvalStatus,
          isActive: itemRow.isActive
        };
      })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    );

    const insertedWatchlistItems = await this.repository.listWatchlistItems();

    await this.repository.upsertBenchmarkProfiles(
      benchmarkProfiles.map((profile) => ({
        ...profile,
        instrumentId: profile.instrumentSymbol ? instrumentBySymbol.get(profile.instrumentSymbol)?.id ?? null : null,
        instrumentSymbol: profile.instrumentSymbol
      }))
    );

    await this.repository.upsertBondProfiles(
      bondProfiles.map((profile) => ({
        ...profile,
        instrumentId: instrumentBySymbol.get(profile.symbol ?? "")?.id ?? profile.instrumentId,
        symbol: profile.symbol ?? null
      })).filter((profile) => Boolean(profile.instrumentId))
    );

    await this.repository.upsertCryptoProfiles(
      cryptoProfiles.map((profile) => ({
        ...profile,
        instrumentId: instrumentBySymbol.get(profile.symbol ?? "")?.id ?? profile.instrumentId,
        symbol: profile.symbol ?? null
      })).filter((profile) => Boolean(profile.instrumentId))
    );

    return {
      instruments: instruments.length,
      watchlists: watchlists.length,
      watchlistItems: insertedWatchlistItems.length,
      bondProfiles: bondProfiles.length,
      benchmarkProfiles: benchmarkProfiles.length,
      cryptoProfiles: cryptoProfiles.length
    };
  }

  async listInstruments(filters?: { query?: string; assetClass?: string; isActive?: boolean; watchlistTier?: string; limit?: number }) {
    return this.repository.listInstruments(filters);
  }

  async setInstrumentActive(instrumentId: string, isActive: boolean) {
    await this.repository.setInstrumentActive(instrumentId, isActive);
  }
}
