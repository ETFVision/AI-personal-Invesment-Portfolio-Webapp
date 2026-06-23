import type { AssetType } from "@/domain/portfolio/types";
import type { Instrument } from "@/domain/universe/types";
import { alphaEtfCategoryForSymbol, alphaStockSectorForSymbol, type EtfCategory } from "../../../domain/universe/alphaUniverse";

export const CANONICAL_SECTORS = [
  "Technology",
  "Communication Services",
  "Consumer Discretionary",
  "Consumer Staples",
  "Healthcare",
  "Financials",
  "Industrials",
  "Energy",
  "Utilities",
  "Materials",
  "Real Estate",
  "Bonds / Fixed Income",
  "Commodities / Gold",
  "Crypto",
  "Cash / Money Market",
  "Multi-Asset / Broad Market"
] as const;

export const CANONICAL_THEMES = [
  "AI / Automation",
  "Semiconductors",
  "Cloud / Software",
  "Cybersecurity",
  "Digital Platforms",
  "Healthcare Innovation",
  "Pharma / Biotech",
  "Financial Services",
  "Payments / Fintech",
  "Consumer Brands",
  "Defensive Consumer",
  "Energy / Oil & Gas",
  "Clean Energy",
  "Infrastructure / Industrials",
  "Real Estate / REITs",
  "Dividend / Income",
  "Growth",
  "Value",
  "Quality",
  "Defensive",
  "High Beta",
  "Inflation Hedge",
  "Recession Hedge",
  "Interest Rate Sensitive",
  "Long Duration",
  "Short Duration / Cash-like",
  "Treasury Bonds",
  "Corporate Credit",
  "High Yield Credit",
  "Emerging Markets",
  "Global Diversification",
  "Crypto / Digital Assets"
] as const;

export type CanonicalSector = typeof CANONICAL_SECTORS[number];
export type CanonicalTheme = typeof CANONICAL_THEMES[number];

export type TaxonomyNormalizationInput = {
  symbol: string | null;
  name?: string | null;
  assetClass?: string | null;
  instrumentType?: string | null;
  assetType?: AssetType | string | null;
  rawSector?: string | null;
  rawIndustry?: string | null;
  seededThemes?: string[];
  bondProfile?: {
    durationCategory?: string | null;
    treasuryClassification?: string | null;
    creditQuality?: string | null;
    inflationLinked?: boolean | null;
    liquidityRole?: string | null;
  } | null;
};

export type TaxonomyNormalizationResult = {
  canonicalSector: CanonicalSector;
  canonicalThemes: CanonicalTheme[];
  unmappedRawValues: string[];
};

const etfCategorySectors: Record<EtfCategory, CanonicalSector> = {
  US_BROAD_MARKET: "Multi-Asset / Broad Market",
  GLOBAL_EQUITY: "Multi-Asset / Broad Market",
  DEVELOPED_MARKETS: "Multi-Asset / Broad Market",
  EMERGING_MARKETS: "Multi-Asset / Broad Market",
  TECHNOLOGY: "Technology",
  SEMICONDUCTOR: "Technology",
  AI_ROBOTICS: "Technology",
  CYBERSECURITY: "Technology",
  CLOUD_COMPUTING: "Technology",
  HEALTHCARE: "Healthcare",
  FINANCIALS: "Financials",
  INDUSTRIALS: "Industrials",
  CONSUMER_DISCRETIONARY: "Consumer Discretionary",
  CONSUMER_STAPLES: "Consumer Staples",
  ENERGY: "Energy",
  MATERIALS: "Materials",
  UTILITIES: "Utilities",
  COMMUNICATION_SERVICES: "Communication Services",
  REAL_ESTATE: "Real Estate",
  DIVIDEND: "Multi-Asset / Broad Market",
  GROWTH: "Multi-Asset / Broad Market",
  VALUE: "Multi-Asset / Broad Market",
  SMALL_CAP: "Multi-Asset / Broad Market",
  FACTOR_INVESTING: "Multi-Asset / Broad Market",
  OPTION_INCOME: "Multi-Asset / Broad Market",
  MID_CAP: "Multi-Asset / Broad Market",
  ESG_SOCIALLY_RESPONSIBLE: "Multi-Asset / Broad Market",
  MULTI_ASSET_BALANCED: "Multi-Asset / Broad Market",
  BOND: "Bonds / Fixed Income",
  CASH_EQUIVALENT: "Cash / Money Market",
  PREFERRED_STOCK: "Bonds / Fixed Income",
  MUNICIPAL_BOND: "Bonds / Fixed Income",
  EMERGING_MARKET_BOND: "Bonds / Fixed Income",
  COMMODITY: "Commodities / Gold",
  GOLD_PRECIOUS_METALS: "Commodities / Gold",
  CRYPTO_ETF: "Crypto",
  INTERNATIONAL_DIVIDEND: "Multi-Asset / Broad Market",
  COUNTRY: "Multi-Asset / Broad Market",
  AEROSPACE_DEFENSE: "Industrials",
  INFRASTRUCTURE: "Industrials",
  CLEAN_ENERGY: "Energy"
};

const etfCategoryThemes: Partial<Record<EtfCategory, CanonicalTheme[]>> = {
  US_BROAD_MARKET: ["Quality"],
  GLOBAL_EQUITY: ["Global Diversification"],
  DEVELOPED_MARKETS: ["Global Diversification"],
  EMERGING_MARKETS: ["Emerging Markets", "Global Diversification"],
  TECHNOLOGY: ["Cloud / Software"],
  SEMICONDUCTOR: ["Semiconductors"],
  AI_ROBOTICS: ["AI / Automation"],
  CYBERSECURITY: ["Cybersecurity"],
  CLOUD_COMPUTING: ["Cloud / Software"],
  HEALTHCARE: ["Healthcare Innovation"],
  FINANCIALS: ["Financial Services"],
  INDUSTRIALS: ["Infrastructure / Industrials"],
  CONSUMER_DISCRETIONARY: ["Consumer Brands"],
  CONSUMER_STAPLES: ["Defensive Consumer"],
  ENERGY: ["Energy / Oil & Gas"],
  MATERIALS: ["Infrastructure / Industrials"],
  UTILITIES: ["Defensive"],
  COMMUNICATION_SERVICES: ["Digital Platforms"],
  REAL_ESTATE: ["Real Estate / REITs"],
  DIVIDEND: ["Dividend / Income"],
  GROWTH: ["Growth"],
  VALUE: ["Value"],
  SMALL_CAP: ["High Beta"],
  FACTOR_INVESTING: ["Quality"],
  OPTION_INCOME: ["Dividend / Income"],
  MID_CAP: ["High Beta"],
  ESG_SOCIALLY_RESPONSIBLE: ["Quality"],
  MULTI_ASSET_BALANCED: ["Global Diversification"],
  BOND: ["Recession Hedge", "Interest Rate Sensitive"],
  CASH_EQUIVALENT: ["Short Duration / Cash-like"],
  PREFERRED_STOCK: ["Dividend / Income", "Interest Rate Sensitive"],
  MUNICIPAL_BOND: ["Recession Hedge", "Interest Rate Sensitive"],
  EMERGING_MARKET_BOND: ["Emerging Markets", "Interest Rate Sensitive"],
  COMMODITY: ["Inflation Hedge"],
  GOLD_PRECIOUS_METALS: ["Inflation Hedge"],
  CRYPTO_ETF: ["Crypto / Digital Assets"],
  INTERNATIONAL_DIVIDEND: ["Dividend / Income", "Global Diversification"],
  COUNTRY: ["Global Diversification"],
  AEROSPACE_DEFENSE: ["Infrastructure / Industrials"],
  INFRASTRUCTURE: ["Infrastructure / Industrials"],
  CLEAN_ENERGY: ["Clean Energy"]
};

const acceptedTaxonomyKeys = new Set([
  ...Object.keys(etfCategorySectors).map((category) => category.toLowerCase().replaceAll("_", "-"))
]);

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function key(value: string | null | undefined) {
  return clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function includesAny(value: string, needles: string[]) {
  const normalized = key(value);
  return needles.some((needle) => normalized.includes(needle));
}

const sectorAliases: Record<string, CanonicalSector> = {
  technology: "Technology",
  "information-technology": "Technology",
  "communication-services": "Communication Services",
  communications: "Communication Services",
  "consumer-cyclical": "Consumer Discretionary",
  "consumer-discretionary": "Consumer Discretionary",
  "consumer-defensive": "Consumer Staples",
  "consumer-staples": "Consumer Staples",
  healthcare: "Healthcare",
  "health-care": "Healthcare",
  financial: "Financials",
  financials: "Financials",
  "financial-services": "Financials",
  industrials: "Industrials",
  industrial: "Industrials",
  energy: "Energy",
  utilities: "Utilities",
  materials: "Materials",
  "basic-materials": "Materials",
  "real-estate": "Real Estate",
  reit: "Real Estate",
  reits: "Real Estate",
  "fixed-income": "Bonds / Fixed Income",
  bonds: "Bonds / Fixed Income",
  bond: "Bonds / Fixed Income",
  "bond-etf": "Bonds / Fixed Income",
  commodities: "Commodities / Gold",
  commodity: "Commodities / Gold",
  gold: "Commodities / Gold",
  "gold-etf": "Commodities / Gold",
  crypto: "Crypto",
  "digital-assets": "Crypto",
  "crypto-etf": "Crypto",
  cash: "Cash / Money Market",
  "money-market": "Cash / Money Market",
  "cash-equivalent": "Cash / Money Market",
  "broad-market": "Multi-Asset / Broad Market",
  "multi-sector-etf": "Multi-Asset / Broad Market",
  "multi-asset": "Multi-Asset / Broad Market",
  "sector-etf": "Multi-Asset / Broad Market",
  etf: "Multi-Asset / Broad Market"
};

const themeAliases: Record<string, CanonicalTheme> = {
  ai: "AI / Automation",
  automation: "AI / Automation",
  "ai-robotics": "AI / Automation",
  semiconductors: "Semiconductors",
  semiconductor: "Semiconductors",
  cloud: "Cloud / Software",
  "cloud-computing": "Cloud / Software",
  software: "Cloud / Software",
  cybersecurity: "Cybersecurity",
  "digital-platforms": "Digital Platforms",
  advertising: "Digital Platforms",
  "internet-content": "Digital Platforms",
  "consumer-digital": "Digital Platforms",
  healthcare: "Healthcare Innovation",
  "medical-devices": "Healthcare Innovation",
  pharma: "Pharma / Biotech",
  pharmaceuticals: "Pharma / Biotech",
  biotech: "Pharma / Biotech",
  financials: "Financial Services",
  "financial-services": "Financial Services",
  banks: "Financial Services",
  payments: "Payments / Fintech",
  fintech: "Payments / Fintech",
  consumer: "Consumer Brands",
  "consumer-discretionary": "Consumer Brands",
  "consumer-brands": "Consumer Brands",
  "defensive-consumer": "Defensive Consumer",
  "consumer-staples": "Defensive Consumer",
  energy: "Energy / Oil & Gas",
  "oil-gas": "Energy / Oil & Gas",
  "energy-transition": "Clean Energy",
  "clean-energy": "Clean Energy",
  infrastructure: "Infrastructure / Industrials",
  industrials: "Infrastructure / Industrials",
  "industrial": "Infrastructure / Industrials",
  materials: "Infrastructure / Industrials",
  utilities: "Defensive",
  "communication-services": "Digital Platforms",
  reits: "Real Estate / REITs",
  "real-estate": "Real Estate / REITs",
  dividend: "Dividend / Income",
  "international-dividend": "Dividend / Income",
  income: "Dividend / Income",
  growth: "Growth",
  value: "Value",
  "small-cap": "High Beta",
  quality: "Quality",
  defensive: "Defensive",
  "high-beta": "High Beta",
  "inflation-hedge": "Inflation Hedge",
  "recession-hedge": "Recession Hedge",
  duration: "Long Duration",
  "long-duration": "Long Duration",
  "interest-rate-sensitive": "Interest Rate Sensitive",
  "cash-equivalent": "Short Duration / Cash-like",
  "cash-like": "Short Duration / Cash-like",
  "short-duration": "Short Duration / Cash-like",
  treasury: "Treasury Bonds",
  bond: "Treasury Bonds",
  bonds: "Treasury Bonds",
  "bond-etf": "Treasury Bonds",
  corporate: "Corporate Credit",
  "high-yield": "High Yield Credit",
  "high-yield-credit": "High Yield Credit",
  "emerging-markets": "Emerging Markets",
  "developed-markets": "Global Diversification",
  country: "Global Diversification",
  global: "Global Diversification",
  "global-equity": "Global Diversification",
  "global-diversification": "Global Diversification",
  crypto: "Crypto / Digital Assets",
  "digital-assets": "Crypto / Digital Assets",
  "crypto-etf": "Crypto / Digital Assets",
  "spot-bitcoin": "Crypto / Digital Assets",
  "spot-ethereum": "Crypto / Digital Assets",
  "spot-solana": "Crypto / Digital Assets",
  commodity: "Inflation Hedge",
  commodities: "Inflation Hedge",
  "gold-etf": "Inflation Hedge",
  "gold-precious-metals": "Inflation Hedge",
  "clean-energy-etf": "Clean Energy"
};

const sectorEtfs: Record<string, CanonicalSector> = {
  XLK: "Technology",
  VGT: "Technology",
  XLC: "Communication Services",
  XLY: "Consumer Discretionary",
  XLP: "Consumer Staples",
  XLV: "Healthcare",
  VHT: "Healthcare",
  XLF: "Financials",
  XLI: "Industrials",
  XLE: "Energy",
  XLU: "Utilities",
  XLB: "Materials",
  XLRE: "Real Estate",
  VNQ: "Real Estate",
  SMH: "Technology",
  SOXX: "Technology"
};

const broadMarketEtfs = new Set(["SPY", "VOO", "IVV", "VTI", "VT", "VXUS", "VEA", "ACWI", "VWO", "IEMG", "QQQ", "SCHD", "VIG"]);
const cashLikeEtfs = new Set(["SGOV", "BIL"]);

function themeFromRaw(value: string | null | undefined) {
  const direct = themeAliases[key(value)];
  if (direct) return direct;
  const raw = clean(value);
  if (!raw) return null;
  if (includesAny(raw, ["semiconductor"])) return "Semiconductors";
  if (includesAny(raw, ["software", "cloud", "it-services"])) return "Cloud / Software";
  if (includesAny(raw, ["bank", "capital-market", "credit-services"])) return "Financial Services";
  if (includesAny(raw, ["pharma", "biotech"])) return "Pharma / Biotech";
  if (includesAny(raw, ["aerospace", "machinery", "networking"])) return "Infrastructure / Industrials";
  if (includesAny(raw, ["oil", "gas"])) return "Energy / Oil & Gas";
  if (includesAny(raw, ["retail", "footwear", "beverage", "household"])) return "Consumer Brands";
  return null;
}

export class TaxonomyService {
  canonicalSectors = CANONICAL_SECTORS;
  canonicalThemes = CANONICAL_THEMES;

  normalizeSector(input: TaxonomyNormalizationInput): CanonicalSector {
    const symbol = clean(input.symbol).toUpperCase();
    const assetClass = key(input.assetClass ?? input.assetType);
    const instrumentType = key(input.instrumentType);
    const etfCategory = alphaEtfCategoryForSymbol(symbol);
    const stockSector = alphaStockSectorForSymbol(symbol);

    if (assetClass === "bond-etf") return cashLikeEtfs.has(symbol) ? "Cash / Money Market" : "Bonds / Fixed Income";
    if (assetClass === "gold-etf") return "Commodities / Gold";
    if (assetClass === "cash" || assetClass === "cash-proxy") return "Cash / Money Market";
    if (assetClass === "crypto" || instrumentType === "crypto-etf") return "Crypto";
    if ((assetClass === "etf" || instrumentType === "etf") && etfCategory) return etfCategorySectors[etfCategory];
    if ((assetClass === "stock" || instrumentType === "stock") && stockSector && CANONICAL_SECTORS.includes(stockSector as CanonicalSector)) {
      return stockSector as CanonicalSector;
    }
    if (sectorEtfs[symbol]) return sectorEtfs[symbol];
    if ((assetClass === "etf" || instrumentType === "etf") && broadMarketEtfs.has(symbol)) return "Multi-Asset / Broad Market";

    const rawSector = sectorAliases[key(input.rawSector)];
    if (rawSector) return rawSector;
    const rawIndustry = sectorAliases[key(input.rawIndustry)];
    if (rawIndustry) return rawIndustry;

    if (assetClass === "etf") return "Multi-Asset / Broad Market";
    return "Multi-Asset / Broad Market";
  }

  normalizeThemes(input: TaxonomyNormalizationInput): CanonicalTheme[] {
    const symbol = clean(input.symbol).toUpperCase();
    const assetClass = key(input.assetClass ?? input.assetType);
    const instrumentType = key(input.instrumentType);
    const etfCategory = alphaEtfCategoryForSymbol(symbol);
    const themes = new Set<CanonicalTheme>();

    for (const seededTheme of input.seededThemes ?? []) {
      const canonical = themeFromRaw(seededTheme);
      if (canonical) themes.add(canonical);
    }

    for (const categoryTheme of etfCategory ? etfCategoryThemes[etfCategory] ?? [] : []) {
      themes.add(categoryTheme);
    }

    const rawTheme = etfCategory ? null : themeFromRaw(input.rawIndustry) ?? themeFromRaw(input.rawSector);
    if (rawTheme) themes.add(rawTheme);

    if (sectorEtfs[symbol]) {
      if (symbol === "SMH" || symbol === "SOXX") themes.add("Semiconductors");
      if (symbol === "VNQ" || symbol === "XLRE") themes.add("Real Estate / REITs");
    }
    if (!etfCategory && broadMarketEtfs.has(symbol)) themes.add(symbol === "VWO" || symbol === "IEMG" ? "Emerging Markets" : "Quality");
    if (assetClass === "bond-etf") {
      themes.add("Recession Hedge");
      if (input.bondProfile?.treasuryClassification === "treasury") themes.add("Treasury Bonds");
      if (input.bondProfile?.treasuryClassification === "corporate") themes.add("Corporate Credit");
      if (input.bondProfile?.creditQuality === "high_yield") themes.add("High Yield Credit");
      if (input.bondProfile?.durationCategory === "long") themes.add("Long Duration");
      if (input.bondProfile?.durationCategory === "ultra-short" || cashLikeEtfs.has(symbol)) themes.add("Short Duration / Cash-like");
      if (input.bondProfile?.inflationLinked) themes.add("Inflation Hedge");
      themes.add("Interest Rate Sensitive");
    }
    if (assetClass === "gold-etf") themes.add("Inflation Hedge");
    if (assetClass === "crypto" || instrumentType === "crypto-etf") themes.add("Crypto / Digital Assets");

    if (themes.size === 0) {
      themes.add("Quality");
    }

    return Array.from(themes);
  }

  normalize(input: TaxonomyNormalizationInput): TaxonomyNormalizationResult {
    const canonicalSector = this.normalizeSector(input);
    const canonicalThemes = this.normalizeThemes(input);
    const rawValues = [input.rawSector, input.rawIndustry, ...(input.seededThemes ?? [])].filter((value): value is string => Boolean(clean(value)));
    const unmappedRawValues = rawValues.filter((value) => !sectorAliases[key(value)] && !themeFromRaw(value) && !acceptedTaxonomyKeys.has(key(value)));
    return { canonicalSector, canonicalThemes, unmappedRawValues };
  }

  normalizeInstrument(instrument: Instrument): TaxonomyNormalizationResult {
    return this.normalize({
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      instrumentType: instrument.instrumentType,
      rawSector: instrument.sector,
      rawIndustry: instrument.industry,
      seededThemes: instrument.thematicTags,
      bondProfile: instrument
    });
  }
}
