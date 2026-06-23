export type AssetCategory = "EQUITY" | "BOND" | "COMMODITY" | "REAL_ESTATE" | "CASH" | "CRYPTO" | "MULTI_ASSET" | "UNKNOWN";

export type EtfCategory =
  | "US_BROAD_MARKET"
  | "GLOBAL_EQUITY"
  | "DEVELOPED_MARKETS"
  | "EMERGING_MARKETS"
  | "TECHNOLOGY"
  | "SEMICONDUCTOR"
  | "AI_ROBOTICS"
  | "CYBERSECURITY"
  | "CLOUD_COMPUTING"
  | "HEALTHCARE"
  | "FINANCIALS"
  | "INDUSTRIALS"
  | "CONSUMER_DISCRETIONARY"
  | "CONSUMER_STAPLES"
  | "ENERGY"
  | "MATERIALS"
  | "UTILITIES"
  | "COMMUNICATION_SERVICES"
  | "REAL_ESTATE"
  | "DIVIDEND"
  | "GROWTH"
  | "VALUE"
  | "SMALL_CAP"
  | "FACTOR_INVESTING"
  | "OPTION_INCOME"
  | "MID_CAP"
  | "ESG_SOCIALLY_RESPONSIBLE"
  | "MULTI_ASSET_BALANCED"
  | "BOND"
  | "CASH_EQUIVALENT"
  | "PREFERRED_STOCK"
  | "MUNICIPAL_BOND"
  | "EMERGING_MARKET_BOND"
  | "COMMODITY"
  | "GOLD_PRECIOUS_METALS"
  | "CRYPTO_ETF"
  | "INTERNATIONAL_DIVIDEND"
  | "COUNTRY"
  | "AEROSPACE_DEFENSE"
  | "INFRASTRUCTURE"
  | "CLEAN_ENERGY";

export const ETF_CATEGORY_LABELS: Record<EtfCategory, string> = {
  US_BROAD_MARKET: "US broad market",
  GLOBAL_EQUITY: "Global equity",
  DEVELOPED_MARKETS: "Developed markets",
  EMERGING_MARKETS: "Emerging markets",
  TECHNOLOGY: "Technology",
  SEMICONDUCTOR: "Semiconductor",
  AI_ROBOTICS: "AI / Robotics",
  CYBERSECURITY: "Cybersecurity",
  CLOUD_COMPUTING: "Cloud computing",
  HEALTHCARE: "Healthcare",
  FINANCIALS: "Financials",
  INDUSTRIALS: "Industrials",
  CONSUMER_DISCRETIONARY: "Consumer discretionary",
  CONSUMER_STAPLES: "Consumer staples",
  ENERGY: "Energy",
  MATERIALS: "Materials",
  UTILITIES: "Utilities",
  COMMUNICATION_SERVICES: "Communication services",
  REAL_ESTATE: "Real estate",
  DIVIDEND: "Dividend",
  GROWTH: "Growth",
  VALUE: "Value",
  SMALL_CAP: "Small cap",
  FACTOR_INVESTING: "Factor investing",
  OPTION_INCOME: "Option income",
  MID_CAP: "Mid cap",
  ESG_SOCIALLY_RESPONSIBLE: "ESG / socially responsible",
  MULTI_ASSET_BALANCED: "Multi-asset / balanced",
  BOND: "Bond",
  CASH_EQUIVALENT: "Cash equivalent",
  PREFERRED_STOCK: "Preferred stock",
  MUNICIPAL_BOND: "Municipal bond",
  EMERGING_MARKET_BOND: "Emerging-market bond",
  COMMODITY: "Commodity",
  GOLD_PRECIOUS_METALS: "Gold / precious metals",
  CRYPTO_ETF: "Crypto ETF",
  INTERNATIONAL_DIVIDEND: "International dividend",
  COUNTRY: "Country",
  AEROSPACE_DEFENSE: "Aerospace & defense",
  INFRASTRUCTURE: "Infrastructure",
  CLEAN_ENERGY: "Clean energy"
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  EQUITY: "Equity",
  BOND: "Bond",
  COMMODITY: "Commodity",
  REAL_ESTATE: "Real estate",
  CASH: "Cash",
  CRYPTO: "Crypto",
  MULTI_ASSET: "Multi-asset",
  UNKNOWN: "Unknown"
};

export const ALPHA_ETF_CATEGORIES: Record<EtfCategory, string[]> = {
  US_BROAD_MARKET: ["VOO", "SPY", "IVV", "VTI", "ITOT", "SCHB", "SPYM", "RSP", "VV", "ONEQ"],
  GLOBAL_EQUITY: ["VT", "ACWI", "VXUS", "IXUS", "IOO", "SPDW"],
  DEVELOPED_MARKETS: ["VEA", "IEFA", "EFA", "SCHF", "IDEV", "EFV", "HEFA", "FEZ", "EZU"],
  EMERGING_MARKETS: ["VWO", "IEMG", "EEM", "SPEM", "SCHE", "DEM", "AVEM", "EEMS", "EMXC", "FEM"],
  TECHNOLOGY: ["XLK", "VGT", "FTEC", "IYW", "QQQ", "QQQM", "IGM", "XNTK"],
  SEMICONDUCTOR: ["SOXX", "SMH", "PSI", "XSD", "SOXQ"],
  AI_ROBOTICS: ["BOTZ", "ROBO", "AIQ"],
  CYBERSECURITY: ["CIBR", "HACK", "IHAK", "BUG"],
  CLOUD_COMPUTING: ["CLOU", "SKYY", "WCLD"],
  HEALTHCARE: ["XLV", "VHT", "IYH", "FHLC", "XBI", "IBB", "ARKG"],
  FINANCIALS: ["XLF", "VFH", "IYF", "KBE", "KRE", "KBWB", "FNCL"],
  INDUSTRIALS: ["XLI", "VIS", "IYJ", "AIRR", "PRN"],
  CONSUMER_DISCRETIONARY: ["XLY", "VCR", "RCD", "PEJ", "ONLN", "RETL"],
  CONSUMER_STAPLES: ["XLP", "VDC", "FSTA", "KXI"],
  ENERGY: ["XLE", "VDE", "IYE", "IXC", "PXE", "XOP", "OIH", "AMLP"],
  MATERIALS: ["XLB", "VAW", "MXI", "FMAT", "PYZ"],
  UTILITIES: ["XLU", "VPU", "IDU", "FXU", "JXI"],
  COMMUNICATION_SERVICES: ["XLC", "VOX", "FCOM", "IXP"],
  REAL_ESTATE: ["VNQ", "XLRE", "SCHH", "IYR", "RWR", "FREL", "REET", "VNQI", "USRT", "REM"],
  DIVIDEND: ["SCHD", "VYM", "DGRO", "HDV", "SDY", "DVY", "NOBL", "DGRW", "SPYD", "FDVV", "VIG"],
  GROWTH: ["VUG", "SCHG", "IWF", "RPG", "MGK"],
  VALUE: ["VTV", "IWD", "SCHV", "RPV", "VLUE"],
  SMALL_CAP: ["IWM", "VB", "SCHA", "IJR", "VTWO", "SPSM", "AVUV"],
  FACTOR_INVESTING: ["QUAL", "SPHQ", "JQUA", "MTUM", "USMV", "SPLV"],
  OPTION_INCOME: ["JEPI", "JEPQ", "SPYI"],
  MID_CAP: ["MDY", "IJH", "VO"],
  ESG_SOCIALLY_RESPONSIBLE: ["ESGU", "ESGD", "ESGE", "SUSA"],
  MULTI_ASSET_BALANCED: ["AOR", "AOM", "AOA"],
  BOND: ["AGG", "BND", "BNDW", "BNDX", "TLT", "SHY", "IEI", "IEF", "VGIT", "GOVT", "TIP", "STIP", "LQD", "VCIT", "HYG", "JNK"],
  CASH_EQUIVALENT: ["BIL", "SGOV", "SHV", "GBIL", "CLIP"],
  PREFERRED_STOCK: ["PFF", "PGX"],
  MUNICIPAL_BOND: ["MUB", "VTEB"],
  EMERGING_MARKET_BOND: ["EMB", "VWOB"],
  COMMODITY: ["DBC", "PDBC", "COMT"],
  GOLD_PRECIOUS_METALS: ["GLD", "IAU", "SGOL"],
  CRYPTO_ETF: ["IBIT", "FBTC", "ETHA", "FETH", "BSOL"],
  INTERNATIONAL_DIVIDEND: ["IDV", "DWX", "VYMI", "SCHY", "IGRO"],
  COUNTRY: ["EWJ", "DXJ", "JPXN", "MCHI", "FXI", "KWEB", "INDA", "INDY", "EWU", "EWC", "EWG", "EWZ", "EWY", "EWT"],
  AEROSPACE_DEFENSE: ["ITA", "PPA"],
  INFRASTRUCTURE: ["PAVE", "IFRA", "IGF", "GRID"],
  CLEAN_ENERGY: ["ICLN", "QCLN", "PBW"]
};

export const ALPHA_STOCK_SECTORS: Record<string, string[]> = {
  Technology: ["AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "ADBE", "CSCO", "AMD", "INTC", "QCOM", "TXN", "NOW", "PLTR", "IBM", "MU", "PANW", "CRWD", "SNOW", "SHOP", "ANET", "ASML", "TSM"],
  "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "TMUS", "VZ", "CMCSA", "CHTR", "SPOT"],
  "Consumer Discretionary": ["AMZN", "TSLA", "HD", "MCD", "NKE", "BKNG", "LOW", "SBUX", "TJX", "MAR", "RCL", "GM", "F", "EBAY", "RACE", "LVMUY"],
  Financials: ["JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP", "BLK", "SCHW", "USB", "C", "PNC", "CB", "BRK.B", "PYPL", "PGR", "AJG", "MRSH", "ICE", "CME", "NDAQ", "SPGI", "MCO", "MSCI", "FDS"],
  Healthcare: ["LLY", "JNJ", "ABBV", "MRK", "UNH", "PFE", "ABT", "TMO", "DHR", "AMGN", "GILD", "BMY", "ISRG", "SYK"],
  Industrials: ["CAT", "HON", "RTX", "UNP", "UPS", "GE", "DE", "LMT", "NOC", "ETN", "BA", "WM", "RSG", "FDX", "CSX", "NSC", "MMM", "EMR", "ITW", "GD"],
  Energy: ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "KMI", "WMB", "OKE", "OXY"],
  "Consumer Staples": ["PG", "KO", "PEP", "COST", "WMT", "MO", "PM", "MDLZ", "CL", "KMB", "GIS", "MNST", "KDP"],
  "Real Estate": ["PLD", "O", "AMT", "EQIX", "DLR", "CCI", "PSA", "WELL", "SPG"],
  Utilities: ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL"],
  Materials: ["LIN", "APD", "ECL", "SHW", "FCX", "NEM", "NUE", "DOW", "CTVA"]
};

const ETF_ASSET_CATEGORY: Partial<Record<EtfCategory, AssetCategory>> = {
  BOND: "BOND",
  CASH_EQUIVALENT: "BOND",
  MULTI_ASSET_BALANCED: "MULTI_ASSET",
  PREFERRED_STOCK: "BOND",
  MUNICIPAL_BOND: "BOND",
  EMERGING_MARKET_BOND: "BOND",
  COMMODITY: "COMMODITY",
  GOLD_PRECIOUS_METALS: "COMMODITY",
  CRYPTO_ETF: "CRYPTO",
  REAL_ESTATE: "REAL_ESTATE"
};

export function assetCategoryForEtfCategory(category: EtfCategory): AssetCategory {
  return ETF_ASSET_CATEGORY[category] ?? "EQUITY";
}

export function alphaEtfCategoryForSymbol(symbol: string | null | undefined): EtfCategory | null {
  const normalized = symbol?.toUpperCase();
  if (!normalized) return null;
  for (const [category, symbols] of Object.entries(ALPHA_ETF_CATEGORIES) as Array<[EtfCategory, string[]]>) {
    if (symbols.includes(normalized)) return category;
  }
  return null;
}

export function alphaStockSectorForSymbol(symbol: string | null | undefined): string | null {
  const normalized = symbol?.toUpperCase();
  if (!normalized) return null;
  for (const [sector, symbols] of Object.entries(ALPHA_STOCK_SECTORS)) {
    if (symbols.includes(normalized)) return sector;
  }
  return null;
}

export function toTitleFromSymbol(symbol: string) {
  return symbol.replace(".", " ").toUpperCase();
}

export const ALPHA_ETF_SYMBOLS = Object.values(ALPHA_ETF_CATEGORIES).flat();
export const ALPHA_STOCK_SYMBOLS = Object.values(ALPHA_STOCK_SECTORS).flat();
