import assert from "node:assert/strict";
import { test } from "node:test";
import { collapseExposureItems, type ExposureBarItem } from "../src/components/ui/charts-utils";

const item = (label: string, value: number): ExposureBarItem => ({
  label,
  value,
  valueLabel: `${Math.round(value * 100)}%`
});

test("collapseExposureItems folds source Other into min-percent rollup", () => {
  const result = collapseExposureItems(
    [
      item("United States", 0.6),
      item("Other", 0.05),
      item("Singapore", 0.003),
      item("Malaysia", 0.002)
    ],
    8,
    0.004
  );

  assert.deepEqual(result.map((entry) => entry.label), ["United States", "Other (3 countries)"]);
  assert.equal(result[1]?.value, 0.055);
  assert.equal(new Set(result.map((entry) => entry.label)).size, result.length);
});

test("collapseExposureItems folds visible source Other into max-items rollup", () => {
  const result = collapseExposureItems(
    [
      item("Technology", 0.4),
      item("Other", 0.3),
      item("Healthcare", 0.2),
      item("Industrials", 0.1)
    ],
    3
  );

  assert.deepEqual(result.map((entry) => entry.label), ["Technology", "Healthcare", "Other"]);
  assert.equal(result[2]?.value, 0.4);
  assert.equal(new Set(result.map((entry) => entry.label)).size, result.length);
});
