import { UniverseRepository } from "@/application/ports/repositories/UniverseRepository";
import {
  BenchmarkProfile,
  BondProfile,
  CryptoProfile,
  Instrument,
  WatchlistTier,
  Watchlist,
  WatchlistItem
} from "@/domain/universe/types";

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

const seededInstruments: InstrumentSeed[] = [
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
  bondEtf("BND", "Vanguard Total Bond Market ETF", "aggregate", "aggregate", "investment_grade", "United States", "medium", "medium", "low", "stability"),
  bondEtf("AGG", "iShares Core U.S. Aggregate Bond ETF", "aggregate", "aggregate", "investment_grade", "United States", "medium", "medium", "low", "stability"),
  bondEtf("SHY", "iShares 1-3 Year Treasury Bond ETF", "short", "treasury", "treasury", "United States", "low", "low", "very_low", "stability"),
  bondEtf("IEF", "iShares 7-10 Year Treasury Bond ETF", "intermediate", "treasury", "treasury", "United States", "medium", "medium", "very_low", "stability"),
  bondEtf("TLT", "iShares 20+ Year Treasury Bond ETF", "long", "treasury", "treasury", "United States", "high", "high", "very_low", "stability"),
  bondEtf("TIP", "iShares TIPS Bond ETF", "intermediate", "inflation-linked", "treasury", "United States", "medium", "low", "very_low", "inflation-hedge"),
  bondEtf("LQD", "iShares iBoxx $ Investment Grade Corporate Bond ETF", "intermediate", "corporate", "investment_grade", "United States", "medium", "medium", "low", "income"),
  bondEtf("HYG", "iShares iBoxx $ High Yield Corporate Bond ETF", "short", "corporate", "high_yield", "United States", "medium", "medium", "medium", "income"),
  bondEtf("SGOV", "iShares 0-3 Month Treasury Bond ETF", "ultra-short", "treasury", "treasury", "United States", "very_low", "very_low", "very_low", "cash-like"),
  bondEtf("BIL", "SPDR Bloomberg 1-3 Month T-Bill ETF", "ultra-short", "treasury", "treasury", "United States", "very_low", "very_low", "very_low", "cash-like"),
  goldEtf("GLD", "SPDR Gold Shares", "United States", "USD", "NYSE Arca"),
  goldEtf("IAU", "iShares Gold Trust", "United States", "USD", "NYSE Arca"),

  // Crypto
  crypto("BTC", "Bitcoin", "Bitcoin", "store-of-value", "high"),
  crypto("ETH", "Ethereum", "Ethereum", "smart-contract", "high"),
  crypto("SOL", "Solana", "Solana", "smart-contract", "high"),

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
  bondProfile("BND", "aggregate", "aggregate", "investment_grade", "United States", "medium", "medium", "low", "stability", "USD"),
  bondProfile("AGG", "aggregate", "aggregate", "investment_grade", "United States", "medium", "medium", "low", "stability", "USD"),
  bondProfile("SHY", "short", "treasury", "treasury", "United States", "low", "low", "very_low", "stability", "USD"),
  bondProfile("IEF", "intermediate", "treasury", "treasury", "United States", "medium", "medium", "very_low", "stability", "USD"),
  bondProfile("TLT", "long", "treasury", "treasury", "United States", "high", "high", "very_low", "stability", "USD"),
  bondProfile("TIP", "intermediate", "treasury", "treasury", "United States", "medium", "low", "very_low", "inflation-hedge", "USD"),
  bondProfile("LQD", "intermediate", "corporate", "investment_grade", "United States", "medium", "medium", "low", "income", "USD"),
  bondProfile("HYG", "short", "corporate", "high_yield", "United States", "medium", "medium", "medium", "income", "USD"),
  bondProfile("SGOV", "ultra-short", "treasury", "treasury", "United States", "very_low", "very_low", "very_low", "cash-like", "USD"),
  bondProfile("BIL", "ultra-short", "treasury", "treasury", "United States", "very_low", "very_low", "very_low", "cash-like", "USD")
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
    isActive: true,
    providerPrimary: extra?.providerPrimary ?? null,
    providerMetadata: extra?.providerMetadata ?? {}
  };
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
      inflationLinked: durationCategory === "intermediate" && symbol === "TIP",
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

function crypto(symbol: string, name: string, chain: string, classification: string, volatilityBucket: string): InstrumentSeed {
  return {
    ...instrument(symbol, name, "crypto", "crypto", "Global", "USD", "Crypto", {
      sector: "Digital Assets",
      industry: "Crypto",
      riskCategory: "crypto",
      volatilityBucket,
      cryptoClassification: classification,
      geoExposure: "Global"
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
  constructor(private readonly repository: UniverseRepository) {}

  async ensureSeededUniverse(): Promise<UniverseSeedResult> {
    await this.repository.upsertInstruments(
      seededInstruments.map((instrument) => ({
        ...instrument,
        metadataLastRefreshedAt: instrument.metadataLastRefreshedAt ?? null,
        providerPrimary: instrument.providerPrimary ?? null,
        providerMetadata: instrument.providerMetadata ?? {}
      }))
    );
    const instruments = await this.repository.listInstruments();
    const instrumentBySymbol = new Map(instruments.map((instrument) => [instrument.symbol?.toUpperCase() ?? "", instrument]));

    await this.repository.updateInstrumentTags(
      seededInstruments
        .filter((instrument) => (instrument.benchmarkTags?.length ?? 0) > 0 || (instrument.thematicTags?.length ?? 0) > 0)
        .map((instrument) => ({
          instrumentId: instrumentBySymbol.get(instrument.symbol?.toUpperCase() ?? "")?.id ?? "",
          benchmarkTags: instrument.benchmarkTags ?? [],
          thematicTags: instrument.thematicTags ?? []
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
      }))
    );

    await this.repository.upsertCryptoProfiles(
      cryptoProfiles.map((profile) => ({
        ...profile,
        instrumentId: instrumentBySymbol.get(profile.symbol ?? "")?.id ?? profile.instrumentId,
        symbol: profile.symbol ?? null
      }))
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
