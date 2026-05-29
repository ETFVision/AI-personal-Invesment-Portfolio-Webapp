import test from "node:test";
import assert from "node:assert/strict";
import { TaxonomyService } from "../src/application/services/taxonomy/TaxonomyService";

const taxonomy = new TaxonomyService();

test("maps broad market ETFs to broad market sector and diversification theme", () => {
  const result = taxonomy.normalize({
    symbol: "VOO",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "Financial Services",
    rawIndustry: "ETF",
    seededThemes: ["broad-market"]
  });

  assert.equal(result.canonicalSector, "Multi-Asset / Broad Market");
  assert.ok(result.canonicalThemes.includes("Global Diversification"));
});

test("maps bond ETFs using duration and credit profile", () => {
  const result = taxonomy.normalize({
    symbol: "TLT",
    assetClass: "bond_etf",
    instrumentType: "etf",
    rawSector: "Fixed Income",
    rawIndustry: "Bond ETF",
    bondProfile: {
      durationCategory: "long",
      treasuryClassification: "treasury",
      creditQuality: "treasury",
      inflationLinked: false
    }
  });

  assert.equal(result.canonicalSector, "Bonds / Fixed Income");
  assert.ok(result.canonicalThemes.includes("Treasury Bonds"));
  assert.ok(result.canonicalThemes.includes("Long Duration"));
  assert.ok(result.canonicalThemes.includes("Interest Rate Sensitive"));
});

test("maps FMP stock sectors into canonical sectors", () => {
  const result = taxonomy.normalize({
    symbol: "JPM",
    assetClass: "stock",
    instrumentType: "stock",
    rawSector: "Financial Services",
    rawIndustry: "Banks"
  });

  assert.equal(result.canonicalSector, "Financials");
  assert.ok(result.canonicalThemes.includes("Financial Services"));
});
