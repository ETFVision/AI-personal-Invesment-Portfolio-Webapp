import type { UpsertMacroThemeSignalInput } from "@/application/ports/repositories/MacroIndicatorRepository";
import type { MacroIndicatorDefinition, MacroThemeSignalDirection, MacroTrend } from "@/domain/macro/types";
import type { NewsCanonicalTheme } from "@/domain/news/types";

const ratesCodes = new Set(["FEDFUNDS", "DGS2", "DGS10", "DGS30"]);
const inflationCodes = new Set(["CPIAUCSL", "CPILFESL", "PCEPI", "PCEPILFE"]);
const growthCodes = new Set(["GDP", "INDPRO", "RSAFS"]);
const employmentCodes = new Set(["UNRATE", "PAYEMS"]);
const yieldCurveCodes = new Set(["T10Y2Y", "T10Y3M"]);

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function signalDirection(indicator: MacroIndicatorDefinition, trend: MacroTrend): MacroThemeSignalDirection {
  if (trend.direction === "insufficient_data") return "insufficient_data";
  if (indicator.indicatorCode === "UNRATE") {
    if (trend.direction === "rising") return "falling";
    if (trend.direction === "falling") return "rising";
  }
  return trend.direction;
}

function regimeLabel(indicator: MacroIndicatorDefinition, trend: MacroTrend, direction: MacroThemeSignalDirection) {
  const value = trend.latestValue;
  if (direction === "insufficient_data") return "insufficient_data";
  if (ratesCodes.has(indicator.indicatorCode)) {
    if (indicator.indicatorCode === "FEDFUNDS" && value != null && value >= 4) return direction === "rising" ? "restrictive_and_rising" : "restrictive";
    return direction === "rising" ? "rising_rate_pressure" : direction === "falling" ? "falling_rate_support" : "stable_rates";
  }
  if (inflationCodes.has(indicator.indicatorCode)) return direction === "rising" ? "reaccelerating_inflation" : direction === "falling" ? "moderating_inflation" : "stable_inflation";
  if (growthCodes.has(indicator.indicatorCode)) return direction === "rising" ? "strengthening_growth" : direction === "falling" ? "weakening_growth" : "stable_growth";
  if (indicator.indicatorCode === "UNRATE") return direction === "falling" ? "weakening_labor_market" : direction === "rising" ? "improving_labor_market" : "stable_labor_market";
  if (indicator.indicatorCode === "PAYEMS") return direction === "rising" ? "strengthening_labor_market" : direction === "falling" ? "weakening_labor_market" : "stable_labor_market";
  if (yieldCurveCodes.has(indicator.indicatorCode)) {
    if (value != null && value < 0) return direction === "rising" ? "inverted_but_steepening" : "inverted";
    return direction === "rising" ? "steepening" : direction === "falling" ? "flattening" : "normal_curve";
  }
  if (indicator.indicatorCode === "DTWEXBGS") return direction === "rising" ? "stronger_usd" : direction === "falling" ? "weaker_usd" : "stable_usd";
  if (indicator.indicatorCode === "DCOILWTICO") return direction === "rising" ? "rising_energy_pressure" : direction === "falling" ? "falling_energy_pressure" : "stable_energy";
  return direction;
}

function themeForIndicator(code: string): NewsCanonicalTheme | null {
  if (ratesCodes.has(code)) return "Rates";
  if (inflationCodes.has(code)) return "Inflation";
  if (growthCodes.has(code)) return "Growth";
  if (employmentCodes.has(code)) return "Employment";
  if (yieldCurveCodes.has(code)) return "Yield Curve";
  if (code === "DTWEXBGS") return "Currency";
  if (code === "DCOILWTICO") return "Energy";
  return null;
}

function extraSignals(indicator: MacroIndicatorDefinition, trend: MacroTrend, direction: MacroThemeSignalDirection): NewsCanonicalTheme[] {
  if (indicator.indicatorCode !== "DCOILWTICO") return [];
  const materialMove = Math.abs(trend.oneMonthChange ?? trend.threeMonthChange ?? 0) >= 5;
  return direction === "rising" && materialMove ? ["Inflation"] : [];
}

function explanation(indicator: MacroIndicatorDefinition, trend: MacroTrend, direction: MacroThemeSignalDirection, label: string) {
  const latest = trend.latestValue == null ? "no latest value" : `${trend.latestValue}`;
  return `${indicator.indicatorCode} ${indicator.indicatorName} is ${direction}; latest ${latest}; regime ${label}.`;
}

export class FredThemeSignalService {
  generate(indicators: MacroIndicatorDefinition[], trends: MacroTrend[]): UpsertMacroThemeSignalInput[] {
    const indicatorById = new Map(indicators.map((indicator) => [indicator.id, indicator]));
    const rows: UpsertMacroThemeSignalInput[] = [];

    for (const trend of trends) {
      const indicator = indicatorById.get(trend.indicatorId);
      if (!indicator || indicator.sourceProvider !== "fred") continue;
      const primaryTheme = themeForIndicator(indicator.indicatorCode);
      if (!primaryTheme) continue;
      const direction = signalDirection(indicator, trend);
      const themes = [primaryTheme, ...extraSignals(indicator, trend, direction)];
      for (const theme of themes) {
        const label = regimeLabel(indicator, trend, direction);
        rows.push({
          signalDate: trend.asOfDate,
          sourceProvider: "fred",
          sourceIndicatorCode: indicator.indicatorCode,
          theme,
          themeCategory: "Macro",
          direction,
          regimeLabel: label,
          severityScore: clampScore(trend.severityScore || Math.abs(trend.oneMonthChange ?? trend.oneYearChange ?? 0) * 10),
          persistenceScore: clampScore(trend.persistenceScore),
          confidenceScore: clampScore(trend.confidenceScore),
          explanation: explanation(indicator, trend, direction, label)
        });
      }
    }

    return rows;
  }
}

export const fredThemeSignalInternals = { themeForIndicator, signalDirection, regimeLabel };
