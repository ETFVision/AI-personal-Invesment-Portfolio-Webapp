import type { AssetType } from "@/domain/portfolio/types";
import type { Instrument } from "@/domain/universe/types";

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
  "broad-market": "Global Diversification",
  "us-broad-market": "Global Diversification",
  "multi-sector-etf": "Global Diversification",
  etf: "Global Diversification",
  "sector-etf": "Global Diversification",
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

    if (assetClass === "bond-etf") return cashLikeEtfs.has(symbol) ? "Cash / Money Market" : "Bonds / Fixed Income";
    if (assetClass === "gold-etf") return "Commodities / Gold";
    if (assetClass === "cash" || assetClass === "cash-proxy") return "Cash / Money Market";
    if (assetClass === "crypto" || instrumentType === "crypto-etf") return "Crypto";
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
    const themes = new Set<CanonicalTheme>();

    for (const seededTheme of input.seededThemes ?? []) {
      const canonical = themeFromRaw(seededTheme);
      if (canonical) themes.add(canonical);
    }

    const rawTheme = themeFromRaw(input.rawIndustry) ?? themeFromRaw(input.rawSector);
    if (rawTheme) themes.add(rawTheme);

    if (sectorEtfs[symbol]) {
      if (symbol === "SMH" || symbol === "SOXX") themes.add("Semiconductors");
      if (symbol === "VNQ" || symbol === "XLRE") themes.add("Real Estate / REITs");
    }
    if (broadMarketEtfs.has(symbol)) themes.add(symbol === "VWO" || symbol === "IEMG" ? "Emerging Markets" : "Global Diversification");
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
      const sector = this.normalizeSector(input);
      if (sector === "Technology") themes.add("Cloud / Software");
      else if (sector === "Financials") themes.add("Financial Services");
      else if (sector === "Healthcare") themes.add("Healthcare Innovation");
      else if (sector === "Energy") themes.add("Energy / Oil & Gas");
      else if (sector === "Consumer Staples") themes.add("Defensive Consumer");
      else if (sector === "Industrials") themes.add("Infrastructure / Industrials");
      else themes.add("Quality");
    }

    return Array.from(themes);
  }

  normalize(input: TaxonomyNormalizationInput): TaxonomyNormalizationResult {
    const canonicalSector = this.normalizeSector(input);
    const canonicalThemes = this.normalizeThemes(input);
    const rawValues = [input.rawSector, input.rawIndustry, ...(input.seededThemes ?? [])].filter((value): value is string => Boolean(clean(value)));
    const unmappedRawValues = rawValues.filter((value) => !sectorAliases[key(value)] && !themeFromRaw(value));
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
