import assert from "node:assert/strict";
import test from "node:test";
import { deriveProductMode, isRouteEnabledInMode } from "../src/config/productMode";

test("deriveProductMode returns alpha when PRODUCT_MODE is undefined", () => {
  assert.equal(deriveProductMode(undefined), "alpha");
});

test("deriveProductMode returns alpha when PRODUCT_MODE is alpha", () => {
  assert.equal(deriveProductMode("alpha"), "alpha");
});

test("deriveProductMode returns full when PRODUCT_MODE is full", () => {
  assert.equal(deriveProductMode("full"), "full");
});

test("deriveProductMode defaults to alpha for unrecognised values", () => {
  assert.equal(deriveProductMode("preview"), "alpha");
});

test("isRouteEnabledInMode returns false for /news in alpha mode", () => {
  assert.equal(isRouteEnabledInMode("/news", "alpha"), false);
});

test("isRouteEnabledInMode returns true for /portfolio in alpha mode", () => {
  assert.equal(isRouteEnabledInMode("/portfolio", "alpha"), true);
});

test("isRouteEnabledInMode returns true for /methodology in alpha mode", () => {
  assert.equal(isRouteEnabledInMode("/methodology", "alpha"), true);
});

test("isRouteEnabledInMode returns true for /news in full mode", () => {
  assert.equal(isRouteEnabledInMode("/news", "full"), true);
});

test("isRouteEnabledInMode returns false for /admin/jobs in alpha mode", () => {
  assert.equal(isRouteEnabledInMode("/admin/jobs", "alpha"), false);
});

test("isRouteEnabledInMode returns true for /portfolio/holdings sub-path in alpha mode", () => {
  assert.equal(isRouteEnabledInMode("/portfolio/holdings", "alpha"), true);
});
