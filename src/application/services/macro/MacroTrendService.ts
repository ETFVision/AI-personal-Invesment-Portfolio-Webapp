import type { MacroAcceleration, MacroDirection, MacroIndicatorDefinition, MacroObservation, MacroRegimeSnapshot, MacroTrend } from "@/domain/macro/types";

function validObservations(observations: MacroObservation[]) {
  return observations.filter((item) => item.value != null).sort((a, b) => a.observationDate.localeCompare(b.observationDate));
}

function nearestPrior(observations: MacroObservation[], latestDate: string, daysBack: number) {
  const target = new Date(`${latestDate}T00:00:00.000Z`);
  target.setUTCDate(target.getUTCDate() - daysBack);
  const targetDate = target.toISOString().slice(0, 10);
  return observations.filter((item) => item.observationDate <= targetDate).at(-1) ?? null;
}

function changeFrom(latest: MacroObservation, prior: MacroObservation | null) {
  if (latest.value == null || prior?.value == null) return null;
  return latest.value - prior.value;
}

function percentChange(latest: number | null, prior: number | null) {
  if (latest == null || prior == null || prior === 0) return null;
  return (latest / prior) - 1;
}

function direction(change: number | null): MacroDirection {
  if (change == null) return "insufficient_data";
  if (Math.abs(change) < 0.0001) return "stable";
  return change > 0 ? "rising" : "falling";
}

function acceleration(currentChange: number | null, previousChange: number | null): MacroAcceleration {
  if (currentChange == null || previousChange == null) return "insufficient_data";
  const delta = Math.abs(currentChange) - Math.abs(previousChange);
  if (Math.abs(delta) < 0.0001) return "stable";
  return delta > 0 ? "accelerating" : "decelerating";
}

function confidenceFor(count: number, frequency: string | null) {
  const needed = frequency === "quarterly" ? 6 : frequency === "daily" ? 30 : 12;
  return Math.max(0, Math.min(100, Math.round((count / needed) * 100)));
}

function severityFor(indicator: MacroIndicatorDefinition, latest: number | null, oneYearChange: number | null) {
  if (latest == null) return 0;
  if (indicator.category === "inflation") return Math.min(100, Math.round(Math.abs(oneYearChange ?? 0) * 15));
  if (indicator.category === "interest_rates" || indicator.category === "yields") return Math.min(100, Math.round(Math.abs(latest) * 10));
  if (indicator.indicatorCode === "UNRATE") return Math.min(100, Math.round(Math.max(0, latest - 3.5) * 25));
  return Math.min(100, Math.round(Math.abs(oneYearChange ?? 0) * 10));
}

export class MacroTrendService {
  calculateTrend(indicator: MacroIndicatorDefinition, observations: MacroObservation[]): Omit<MacroTrend, "id" | "createdAt" | "updatedAt"> | null {
    const clean = validObservations(observations);
    if (clean.length === 0) return null;
    const latest = clean.at(-1) as MacroObservation;
    const previous = clean.at(-2) ?? null;
    const oneMonth = nearestPrior(clean, latest.observationDate, indicator.frequency === "daily" ? 30 : 45);
    const threeMonth = nearestPrior(clean, latest.observationDate, 100);
    const sixMonth = nearestPrior(clean, latest.observationDate, 190);
    const oneYear = nearestPrior(clean, latest.observationDate, 380);
    const changeValue = changeFrom(latest, previous);
    const previousChange = previous ? changeFrom(previous, clean.at(-3) ?? null) : null;
    const oneYearChange = changeFrom(latest, oneYear);
    return {
      indicatorId: indicator.id,
      asOfDate: latest.observationDate,
      latestValue: latest.value,
      previousValue: previous?.value ?? null,
      changeValue,
      changePercent: percentChange(latest.value, previous?.value ?? null),
      oneMonthChange: changeFrom(latest, oneMonth),
      threeMonthChange: changeFrom(latest, threeMonth),
      sixMonthChange: changeFrom(latest, sixMonth),
      oneYearChange,
      direction: clean.length < 2 ? "insufficient_data" : direction(changeValue),
      acceleration: clean.length < 3 ? "insufficient_data" : acceleration(changeValue, previousChange),
      persistenceScore: Math.min(100, clean.slice(-6).filter((item, index, rows) => index === 0 || (item.value ?? 0) >= (rows[index - 1]?.value ?? 0)).length * 16),
      severityScore: severityFor(indicator, latest.value, oneYearChange),
      confidenceScore: confidenceFor(clean.length, indicator.frequency)
    };
  }

  classifyRegime(indicators: MacroIndicatorDefinition[], trends: MacroTrend[]): Omit<MacroRegimeSnapshot, "id" | "createdAt" | "updatedAt"> {
    const trendByCode = new Map(trends.map((trend) => {
      const indicator = indicators.find((item) => item.id === trend.indicatorId);
      return [indicator?.indicatorCode ?? "", trend] as const;
    }));
    const value = (code: string) => trendByCode.get(code)?.latestValue ?? null;
    const directionOf = (code: string) => trendByCode.get(code)?.direction ?? "insufficient_data";
    const date = trends.map((trend) => trend.asOfDate).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
    const fedFunds = value("FEDFUNDS");
    const cpiYoY = trendByCode.get("CPIAUCSL")?.oneYearChange ?? null;
    const unemploymentDirection = directionOf("UNRATE");
    const curve10y2y = value("T10Y2Y");
    const dollarDirection = directionOf("DTWEXBGS");
    const oilDirection = directionOf("DCOILWTICO");
    const gdpDirection = directionOf("GDP");
    const nfciDirection = directionOf("NFCI");

    const ratesRegime = fedFunds == null ? "insufficient_data" : fedFunds >= 4 ? "restrictive" : directionOf("FEDFUNDS") === "falling" ? "easing" : "neutral";
    const inflationRegime = cpiYoY == null ? "insufficient_data" : cpiYoY > 4 ? "high_and_sticky" : cpiYoY < 0 ? "moderating" : "benign";
    const employmentRegime = unemploymentDirection === "rising" ? "weakening" : unemploymentDirection === "falling" ? "strong" : unemploymentDirection === "stable" ? "stable" : "insufficient_data";
    const yieldCurveRegime = curve10y2y == null ? "insufficient_data" : curve10y2y < 0 ? "inverted" : directionOf("T10Y2Y") === "rising" ? "steepening" : "normal";
    const growthRegime = gdpDirection === "falling" ? "slowing" : gdpDirection === "rising" ? "expanding" : gdpDirection === "stable" ? "mixed" : "insufficient_data";
    const liquidityRegime = nfciDirection === "rising" ? "tightening" : nfciDirection === "falling" ? "easing" : nfciDirection === "stable" ? "neutral" : "insufficient_data";
    const dollarRegime = dollarDirection === "rising" ? "strengthening" : dollarDirection === "falling" ? "weakening" : dollarDirection === "stable" ? "stable" : "insufficient_data";
    const commoditiesRegime = oilDirection === "rising" ? "rising_energy_pressure" : oilDirection === "falling" ? "falling_energy_pressure" : oilDirection === "stable" ? "stable" : "insufficient_data";

    return {
      snapshotDate: date,
      ratesRegime,
      inflationRegime,
      growthRegime,
      employmentRegime,
      yieldCurveRegime,
      liquidityRegime,
      dollarRegime,
      commoditiesRegime,
      overallMacroSummary: [
        `Rates: ${ratesRegime}`,
        `Inflation: ${inflationRegime}`,
        `Growth: ${growthRegime}`,
        `Yield curve: ${yieldCurveRegime}`
      ].join(". ")
    };
  }
}

export const macroTrendInternals = { direction, acceleration, percentChange };
