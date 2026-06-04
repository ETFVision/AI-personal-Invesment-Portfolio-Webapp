import type { PortfolioLookthroughExposure } from "./types";

const sectorAliases: Record<string, string> = {
  "information technology": "Technology",
  technology: "Technology",
  tech: "Technology",
  "health care": "Healthcare",
  healthcare: "Healthcare",
  financial: "Financials",
  financials: "Financials",
  "consumer cyclical": "Consumer Discretionary",
  "consumer discretionary": "Consumer Discretionary",
  "consumer defensive": "Consumer Staples",
  "consumer staples": "Consumer Staples",
  communication: "Communication Services",
  communications: "Communication Services",
  "communication services": "Communication Services",
  industrial: "Industrials",
  industrials: "Industrials",
  energy: "Energy",
  utilities: "Utilities",
  utility: "Utilities",
  materials: "Materials",
  "basic materials": "Materials",
  realestate: "Real Estate",
  "real estate": "Real Estate",
  reits: "Real Estate",
  "fixed income": "Bonds / Fixed Income",
  bond: "Bonds / Fixed Income",
  bonds: "Bonds / Fixed Income",
  "bond etf": "Bonds / Fixed Income",
  gold: "Commodities / Gold",
  "precious metals": "Commodities / Gold",
  commodities: "Commodities / Gold",
  cash: "Cash / Money Market",
  "money market": "Cash / Money Market",
  crypto: "Crypto",
  "digital assets": "Crypto",
  "broad market": "Multi-Asset / Broad Market",
  "multi asset": "Multi-Asset / Broad Market",
  "multi-asset": "Multi-Asset / Broad Market",
  "multi-asset / broad market": "Multi-Asset / Broad Market"
};

const countryAliases: Record<string, string> = {
  us: "United States",
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states": "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom"
};

function compactKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeExposureName(exposureType: PortfolioLookthroughExposure["exposureType"], name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const key = compactKey(trimmed);
  if (exposureType === "sector") return sectorAliases[key] ?? trimmed;
  if (exposureType === "country") return countryAliases[key] ?? trimmed;
  return trimmed;
}

export function consolidatePortfolioLookthroughExposures(rows: PortfolioLookthroughExposure[]) {
  const grouped = new Map<string, PortfolioLookthroughExposure>();
  for (const row of rows) {
    const exposureName = normalizeExposureName(row.exposureType, row.exposureName);
    if (!exposureName) continue;
    const current = grouped.get(exposureName);
    if (!current) {
      grouped.set(exposureName, { ...row, exposureName });
      continue;
    }
    current.exposureWeight += row.exposureWeight;
    current.directWeight += row.directWeight;
    current.etfLookthroughWeight += row.etfLookthroughWeight;
  }
  return Array.from(grouped.values()).sort((a, b) => b.exposureWeight - a.exposureWeight);
}
