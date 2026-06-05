const DEFAULT_BENCHMARK = "SPY";

const proxyMap: Array<{ pattern: RegExp; proxy: string; category: "sector" | "macro" | "theme" | "asset_class" }> = [
  { pattern: /technology|software|cloud/i, proxy: "XLK", category: "sector" },
  { pattern: /healthcare|health care|biotech|pharma/i, proxy: "XLV", category: "sector" },
  { pattern: /financial|banks|fintech/i, proxy: "XLF", category: "sector" },
  { pattern: /industrial|infrastructure/i, proxy: "XLI", category: "sector" },
  { pattern: /energy|oil|gas/i, proxy: "XLE", category: "sector" },
  { pattern: /consumer/i, proxy: "XLY", category: "sector" },
  { pattern: /utilities/i, proxy: "XLU", category: "sector" },
  { pattern: /real estate|reit/i, proxy: "XLRE", category: "sector" },
  { pattern: /materials/i, proxy: "XLB", category: "sector" },
  { pattern: /communication/i, proxy: "XLC", category: "sector" },
  { pattern: /semiconductor/i, proxy: "SMH", category: "theme" },
  { pattern: /\bai\b|automation/i, proxy: "XLK", category: "theme" },
  { pattern: /gold|commod/i, proxy: "GLD", category: "asset_class" },
  { pattern: /international|global/i, proxy: "VXUS", category: "asset_class" },
  { pattern: /emerging/i, proxy: "VWO", category: "asset_class" },
  { pattern: /rates|bonds|fixed income|credit/i, proxy: "AGG", category: "macro" },
  { pattern: /inflation/i, proxy: "TIP", category: "macro" },
  { pattern: /crypto|bitcoin|digital asset/i, proxy: "IBIT", category: "asset_class" },
  { pattern: /equities|broad market|growth/i, proxy: "VOO", category: "asset_class" }
];

export function marketVisionProxyForTheme(theme: string) {
  const match = proxyMap.find((item) => item.pattern.test(theme));
  return {
    proxySymbol: match?.proxy ?? DEFAULT_BENCHMARK,
    benchmarkSymbol: DEFAULT_BENCHMARK,
    category: match?.category ?? "theme"
  };
}
