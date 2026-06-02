import type { MacroDashboard, MacroDashboardIndicator } from "@/domain/macro/types";

export type MacroContextCard = {
  label: string;
  value: string;
  description: string;
};

export type MacroContextIndicator = {
  code: string;
  name: string;
  category: string;
  latestValue: string;
  oneYearChange: string;
  direction: string;
  asOfDate: string;
  severityScore: number;
};

export type MacroIntegrationContext = {
  regimeCards: MacroContextCard[];
  keyIndicators: MacroContextIndicator[];
  marketVisionContext: string[];
  bondContext: string[];
  riskContext: string[];
};

function titleCase(value: string | null | undefined) {
  return (value ?? "insufficient_data")
    .replaceAll("_", " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatValue(value: number | null | undefined, unit: string | null | undefined) {
  if (value == null) return "No data";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  if (unit === "percent") return `${formatted}%`;
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatChange(value: number | null | undefined, unit: string | null | undefined) {
  if (value == null) return "No 1Y comparison";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatValue(value, unit)}`;
}

function byCode(dashboard: MacroDashboard, code: string) {
  return dashboard.indicators.find((indicator) => indicator.indicatorCode === code) ?? null;
}

function indicatorView(indicator: MacroDashboardIndicator): MacroContextIndicator {
  return {
    code: indicator.indicatorCode,
    name: indicator.indicatorName,
    category: titleCase(indicator.category),
    latestValue: formatValue(indicator.latestTrend?.latestValue ?? indicator.latestObservation?.value ?? null, indicator.unit),
    oneYearChange: formatChange(indicator.latestTrend?.oneYearChange ?? null, indicator.unit),
    direction: titleCase(indicator.latestTrend?.direction),
    asOfDate: indicator.latestTrend?.asOfDate ?? indicator.latestObservation?.observationDate ?? "No date",
    severityScore: indicator.latestTrend?.severityScore ?? 0
  };
}

export class MacroContextService {
  buildContext(dashboard: MacroDashboard): MacroIntegrationContext {
    const regime = dashboard.latestRegime;
    const fedFunds = byCode(dashboard, "FEDFUNDS");
    const tenYear = byCode(dashboard, "DGS10");
    const curve = byCode(dashboard, "T10Y2Y");
    const cpi = byCode(dashboard, "CPIAUCSL");
    const corePce = byCode(dashboard, "PCEPILFE");
    const unemployment = byCode(dashboard, "UNRATE");
    const dollar = byCode(dashboard, "DTWEXBGS");
    const oil = byCode(dashboard, "DCOILWTICO");
    const liquidity = byCode(dashboard, "NFCI");

    const keyIndicators = [fedFunds, tenYear, curve, cpi, corePce, unemployment, dollar, oil, liquidity]
      .filter((indicator): indicator is MacroDashboardIndicator => Boolean(indicator))
      .map(indicatorView);

    const regimeCards: MacroContextCard[] = [
      { label: "Rates", value: titleCase(regime?.ratesRegime), description: fedFunds ? `Fed funds ${formatValue(fedFunds.latestTrend?.latestValue, fedFunds.unit)}.` : "Needs FRED rate data." },
      { label: "Inflation", value: titleCase(regime?.inflationRegime), description: cpi ? `CPI 1Y index change ${formatChange(cpi.latestTrend?.oneYearChange, cpi.unit)}.` : "Needs FRED inflation data." },
      { label: "Growth", value: titleCase(regime?.growthRegime), description: unemployment ? `Unemployment ${formatValue(unemployment.latestTrend?.latestValue, unemployment.unit)}.` : "Needs growth and labour data." },
      { label: "Yield curve", value: titleCase(regime?.yieldCurveRegime), description: curve ? `10Y-2Y spread ${formatValue(curve.latestTrend?.latestValue, curve.unit)}.` : "Needs yield curve data." },
      { label: "Liquidity", value: titleCase(regime?.liquidityRegime), description: liquidity ? `NFCI direction ${titleCase(liquidity.latestTrend?.direction)}.` : "Needs liquidity data." },
      { label: "Dollar", value: titleCase(regime?.dollarRegime), description: dollar ? `USD index direction ${titleCase(dollar.latestTrend?.direction)}.` : "Needs dollar index data." },
      { label: "Commodities", value: titleCase(regime?.commoditiesRegime), description: oil ? `WTI direction ${titleCase(oil.latestTrend?.direction)}.` : "Needs commodities data." }
    ];

    return {
      regimeCards,
      keyIndicators,
      marketVisionContext: [
        `Rates backdrop: ${titleCase(regime?.ratesRegime)} with ${fedFunds ? `Fed funds at ${formatValue(fedFunds.latestTrend?.latestValue, fedFunds.unit)}` : "no Fed funds value yet"}.`,
        `Inflation backdrop: ${titleCase(regime?.inflationRegime)} using stored CPI/Core PCE trend inputs.`,
        `Yield-curve backdrop: ${titleCase(regime?.yieldCurveRegime)} with ${curve ? `10Y-2Y spread at ${formatValue(curve.latestTrend?.latestValue, curve.unit)}` : "no spread value yet"}.`,
        `Risk backdrop: liquidity is ${titleCase(regime?.liquidityRegime)}, dollar regime is ${titleCase(regime?.dollarRegime)}, commodities regime is ${titleCase(regime?.commoditiesRegime)}.`
      ],
      bondContext: [
        `Rate regime: ${titleCase(regime?.ratesRegime)}. Duration sensitivity should be interpreted against stored Treasury and Fed funds trends.`,
        `Inflation regime: ${titleCase(regime?.inflationRegime)}. TIPS and nominal duration exposure can be reviewed against CPI/Core PCE trends.`,
        `Yield curve: ${titleCase(regime?.yieldCurveRegime)}. Treasury recession-hedge role can be assessed with the 10Y-2Y and 10Y-3M spreads.`,
        `Liquidity regime: ${titleCase(regime?.liquidityRegime)}. Credit exposure should be read with liquidity and financial conditions in mind.`
      ],
      riskContext: [
        `Macro risk state: rates ${titleCase(regime?.ratesRegime)}, inflation ${titleCase(regime?.inflationRegime)}, liquidity ${titleCase(regime?.liquidityRegime)}.`,
        `Yield-curve state: ${titleCase(regime?.yieldCurveRegime)}. This is context only and does not alter portfolio volatility calculations.`,
        `Dollar and commodities: USD is ${titleCase(regime?.dollarRegime)} and energy pressure is ${titleCase(regime?.commoditiesRegime)}.`,
        `Highest-severity macro indicators: ${keyIndicators.slice().sort((a, b) => b.severityScore - a.severityScore).slice(0, 3).map((item) => item.code).join(", ") || "none yet"}.`
      ]
    };
  }
}
