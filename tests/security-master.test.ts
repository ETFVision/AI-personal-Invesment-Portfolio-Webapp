import test from "node:test";
import assert from "node:assert/strict";
import { SecurityMasterService, normalizeTickerSymbol, type SecurityMasterRecord } from "../src/application/services/securityMaster/SecurityMasterService";

const apple: SecurityMasterRecord = {
  id: "sec-apple",
  canonicalSymbol: "AAPL",
  canonicalName: "Apple Inc.",
  securityType: "STOCK",
  primaryExchange: "NASDAQ",
  isin: "US0378331005",
  cusip: "037833100"
};

const brkB: SecurityMasterRecord = {
  id: "sec-brkb",
  canonicalSymbol: "BRK.B",
  canonicalName: "Berkshire Hathaway Inc. Class B",
  securityType: "STOCK",
  primaryExchange: "NYSE",
  isin: "US0846707026",
  cusip: "084670702"
};

const meta: SecurityMasterRecord = {
  id: "sec-meta",
  canonicalSymbol: "META",
  canonicalName: "Meta Platforms Inc.",
  securityType: "STOCK",
  primaryExchange: "NASDAQ",
  isin: "US30303M1027",
  cusip: "30303M102"
};

const goog: SecurityMasterRecord = {
  id: "sec-goog",
  canonicalSymbol: "GOOG",
  canonicalName: "Alphabet Inc. Class C",
  securityType: "STOCK",
  primaryExchange: "NASDAQ",
  isin: "US02079K1079"
};

const googl: SecurityMasterRecord = {
  id: "sec-googl",
  canonicalSymbol: "GOOGL",
  canonicalName: "Alphabet Inc. Class A",
  securityType: "STOCK",
  primaryExchange: "NASDAQ",
  isin: "US02079K3059"
};

const service = new SecurityMasterService({
  securities: [apple, brkB, meta, goog, googl],
  identifiers: [
    { securityId: apple.id, identifierType: "PROVIDER_SYMBOL", identifierValue: "AAPL", source: "financial_modeling_prep", isPrimary: true },
    { securityId: brkB.id, identifierType: "PROVIDER_SYMBOL", identifierValue: "BRK-B", source: "financial_modeling_prep", isPrimary: true },
    { securityId: meta.id, identifierType: "PROVIDER_SYMBOL", identifierValue: "META", source: "financial_modeling_prep", isPrimary: true }
  ],
  aliases: [
    { securityId: brkB.id, oldSymbol: "BRK-B", newSymbol: "BRK.B", aliasType: "SYMBOL_FORMAT_VARIANT" },
    { securityId: brkB.id, oldSymbol: "BRK/B", newSymbol: "BRK.B", aliasType: "SYMBOL_FORMAT_VARIANT" },
    { securityId: meta.id, oldSymbol: "FB", newSymbol: "META", aliasType: "TICKER_CHANGE", effectiveDate: "2022-06-09" }
  ]
});

test("normalizes known ticker symbol variants without broad ticker merging", () => {
  assert.equal(normalizeTickerSymbol("brk-b"), "BRK.B");
  assert.equal(normalizeTickerSymbol("BRK/B"), "BRK.B");
  assert.equal(normalizeTickerSymbol("GOOG"), "GOOG");
  assert.equal(normalizeTickerSymbol("GOOGL"), "GOOGL");
});

test("resolves by ISIN before weaker symbol inputs", () => {
  const result = service.resolveSecurity({ isin: "US0378331005", symbol: "WRONG" });
  assert.equal(result.status, "MAPPED");
  assert.equal(result.security?.id, apple.id);
  assert.equal(result.matchedBy, "ISIN");
  assert.equal(result.confidenceScore, 95);
});

test("resolves by exchange and symbol when strong identifiers are unavailable", () => {
  const result = service.resolveSecurity({ exchange: "NASDAQ", symbol: "AAPL" });
  assert.equal(result.status, "MAPPED");
  assert.equal(result.security?.id, apple.id);
  assert.equal(result.matchedBy, "EXCHANGE_SYMBOL");
});

test("resolves configured provider and symbol aliases", () => {
  const providerResult = service.resolveSecurity({ provider: "financial_modeling_prep", providerSymbol: "BRK-B" });
  assert.equal(providerResult.status, "MAPPED");
  assert.equal(providerResult.security?.id, brkB.id);
  assert.equal(providerResult.matchedBy, "PROVIDER_SYMBOL");

  const aliasResult = service.resolveSecurity({ symbol: "FB" });
  assert.equal(aliasResult.status, "MAPPED");
  assert.equal(aliasResult.security?.id, meta.id);
  assert.equal(aliasResult.matchedBy, "ALIAS");
});

test("does not merge GOOG and GOOGL without an explicit rule", () => {
  const googResult = service.resolveSecurity({ exchange: "NASDAQ", symbol: "GOOG" });
  const googlResult = service.resolveSecurity({ exchange: "NASDAQ", symbol: "GOOGL" });

  assert.equal(googResult.status, "MAPPED");
  assert.equal(googResult.security?.id, goog.id);
  assert.equal(googlResult.status, "MAPPED");
  assert.equal(googlResult.security?.id, googl.id);
  assert.notEqual(googResult.security?.id, googlResult.security?.id);
});

test("returns unmapped for unknown symbols instead of creating silent matches", () => {
  const result = service.resolveSecurity({ exchange: "NYSE", symbol: "UNKNOWN" });
  assert.equal(result.status, "UNMAPPED");
  assert.equal(result.security, null);
  assert.equal(result.candidates.length, 0);
});

test("reports ambiguous low-confidence name fallback matches", () => {
  const duplicateNameService = new SecurityMasterService({
    securities: [
      { ...goog, canonicalName: "Duplicate Corp." },
      { ...googl, canonicalName: "Duplicate Corp." }
    ]
  });
  const result = duplicateNameService.resolveSecurity({ name: "Duplicate Corp." });
  assert.equal(result.status, "AMBIGUOUS");
  assert.equal(result.matchedBy, "NAME_FALLBACK");
  assert.equal(result.candidates.length, 2);
});
