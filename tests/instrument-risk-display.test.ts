import assert from "node:assert/strict";
import test from "node:test";
import {
  generateRiskObservations,
  riskUniverseVolatilityLabel,
  riskVerdictFromVolatilityBucket,
  worstPeriodReturnFromSeries
} from "../src/components/instruments/instrument-risk-display";
import type { InstrumentRiskMetric, PriceSeriesPoint } from "../src/domain/universe/types";

const riskMetric: InstrumentRiskMetric = {
  instrumentId: "instrument-1",
  metricDate: "2026-06-30",
  volatility30d: 0.35,
  volatility90d: 0.25,
  volatility1y: 0.3,
  volatility5y: 0.28,
  volatility10y: null,
  volatility15y: null,
  volatility20y: null,
  volatilityTrend: "rising",
  downsideVolatility: 0.34,
  currentDrawdown1y: -0.08,
  maxDrawdown1y: -0.2,
  currentDrawdown3y: null,
  maxDrawdown3y: null,
  currentDrawdown5y: null,
  maxDrawdown5y: -0.32,
  maxDrawdown10y: null,
  maxDrawdown15y: null,
  maxDrawdown20y: null,
  currentDrawdown: -0.12,
  maxDrawdown: -0.32,
  drawdownDurationDays: 42,
  drawdownBucket: "elevated",
  negativeReturnFrequency: 0.48,
  worstDailyReturn: -0.06,
  worstWeeklyReturn: -0.12,
  riskScore: 55,
  riskBucket: "high",
  volatilityBucket: "high",
  confidenceScore: 90,
  observationCount: 500,
  historyStartDate: "2024-01-01",
  historyEndDate: "2026-06-30",
  calculatedAt: "2026-06-30T00:00:00.000Z"
};

test("risk verdict labels map directly from volatility bucket", () => {
  assert.deepEqual(riskVerdictFromVolatilityBucket("low"), { label: "Lower", tone: "positive", level: 0 });
  assert.deepEqual(riskVerdictFromVolatilityBucket("medium"), { label: "Moderate", tone: "info", level: 1 });
  assert.deepEqual(riskVerdictFromVolatilityBucket("high"), { label: "Elevated", tone: "warning", level: 2 });
  assert.deepEqual(riskVerdictFromVolatilityBucket("very_high"), { label: "Very elevated", tone: "danger", level: 3 });
});

test("risk universe volatility label ranks most volatile instruments", () => {
  const label = riskUniverseVolatilityLabel(
    0.3,
    [
      { instrumentId: "a", volatility1y: 0.6 },
      { instrumentId: "instrument-1", volatility1y: 0.3 },
      { instrumentId: "b", volatility1y: 0.2 },
      { instrumentId: "c", volatility1y: 0.1 }
    ],
    "instrument-1"
  );

  assert.equal(label, "Top 50% most volatile");
});

test("risk observations are deterministic from stored risk metrics", () => {
  const observations = generateRiskObservations({
    riskMetric,
    universeVolatilityLabel: "Top 50% most volatile",
    currentDrawdownFromHigh: -0.1
  });

  assert.deepEqual(observations.map((observation) => observation.key), ["volatility", "drawdown", "downside"]);
  assert.match(observations[0]?.title ?? "", /1Y volatility 30%/);
  assert.equal(observations[0]?.tone, "warning");
  assert.match(observations[1]?.description ?? "", /Currently -12% from peak/);
  assert.equal(observations[2]?.tone, "warning");
});

test("worstPeriodReturnFromSeries selects date-based worst week", () => {
  const series: PriceSeriesPoint[] = [
    { date: "2026-01-01", close: 100 },
    { date: "2026-01-05", close: 120 },
    { date: "2026-01-08", close: 90 },
    { date: "2026-01-15", close: 60 },
    { date: "2026-01-22", close: 75 }
  ];

  assert.ok(Math.abs((worstPeriodReturnFromSeries(series, 7) ?? 0) - (-1 / 3)) < 1e-12);
});
