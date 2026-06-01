import test from "node:test";
import assert from "node:assert/strict";
import { formatPercent } from "../src/lib/utils";

test("formatPercent treats decimal returns as percentages once", () => {
  assert.equal(formatPercent(0.1339), "13.39%");
  assert.equal(formatPercent(1.1504), "115.04%");
});
