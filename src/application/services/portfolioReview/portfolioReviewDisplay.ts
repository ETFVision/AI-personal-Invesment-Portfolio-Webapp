import type { PortfolioLookthroughHolding } from "@/domain/etfLookthrough/types";

export function portfolioReviewMetricLabel(value: string) {
  const labels: Record<string, string> = {
    countryCount: "Countries >=1%",
    lookthroughCountryCount: "Look-through countries >=3%"
  };
  if (labels[value]) return labels[value];
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function cleanHoldingSymbol(symbol: string) {
  return symbol.replace(/\.[A-Z]{1,4}$/i, "");
}

export function sharedCompanyDisplayName(symbol: string, holdings: PortfolioLookthroughHolding[] = []) {
  const normalized = symbol.toUpperCase();
  const holding = holdings.find((item) => item.holdingSymbol?.toUpperCase() === normalized);
  return holding?.holdingIssuerName || holding?.holdingName || cleanHoldingSymbol(symbol);
}
