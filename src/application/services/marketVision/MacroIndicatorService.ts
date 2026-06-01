import type { MacroIndicator } from "@/domain/marketVision/types";

export type MacroIndicatorView = MacroIndicator & {
  direction: "up" | "down" | "flat" | "unknown";
  displayValue: string;
  displayChange: string;
};

function formatNumber(value: number | null, unit: string | null) {
  if (value == null) return "Missing";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  if (unit === "percent") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

export class MacroIndicatorService {
  buildIndicatorViews(indicators: MacroIndicator[]): MacroIndicatorView[] {
    return indicators
      .slice()
      .sort((a, b) => a.category.localeCompare(b.category) || a.indicatorName.localeCompare(b.indicatorName))
      .map((indicator) => {
        const change = indicator.changeValue;
        const direction = change == null ? "unknown" : change > 0 ? "up" : change < 0 ? "down" : "flat";
        return {
          ...indicator,
          direction,
          displayValue: formatNumber(indicator.latestValue, indicator.unit),
          displayChange: change == null ? "No prior value" : formatNumber(change, indicator.unit)
        };
      });
  }
}
