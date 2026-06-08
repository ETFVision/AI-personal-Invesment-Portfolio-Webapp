import test from "node:test";
import assert from "node:assert/strict";
import { TaxonomyService } from "../src/application/services/taxonomy/TaxonomyService";
import {
  ALPHA_ETF_CATEGORIES,
  ALPHA_ETF_SYMBOLS,
  ALPHA_STOCK_SECTORS,
  ALPHA_STOCK_SYMBOLS,
  alphaEtfCategoryForSymbol,
  alphaStockSectorForSymbol
} from "../src/domain/universe/alphaUniverse";

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

test("alpha universe contains the approved ETF and stock source-of-truth counts", () => {
  assert.equal(ALPHA_ETF_SYMBOLS.length, 215);
  assert.equal(new Set(ALPHA_ETF_SYMBOLS).size, 215);
  assert.equal(ALPHA_STOCK_SYMBOLS.length, 105);
  assert.equal(new Set(ALPHA_STOCK_SYMBOLS).size, 105);

  const etfCategoryCounts = Object.fromEntries(Object.entries(ALPHA_ETF_CATEGORIES).map(([category, symbols]) => [category, symbols.length]));
  assert.equal(etfCategoryCounts.US_BROAD_MARKET, 10);
  assert.equal(etfCategoryCounts.BOND, 15);
  assert.equal(etfCategoryCounts.CASH_EQUIVALENT, 5);
  assert.equal(etfCategoryCounts.CRYPTO_ETF, 5);
  assert.equal(etfCategoryCounts.DIVIDEND, 11);
  assert.equal(etfCategoryCounts.INFRASTRUCTURE, 4);
  assert.equal(etfCategoryCounts.CLEAN_ENERGY, 4);

  const stockSectorCounts = Object.fromEntries(Object.entries(ALPHA_STOCK_SECTORS).map(([sector, symbols]) => [sector, symbols.length]));
  assert.equal(stockSectorCounts.Technology, 23);
  assert.equal(stockSectorCounts.Financials, 16);
  assert.equal(stockSectorCounts.Industrials, 11);
  assert.equal(stockSectorCounts.Utilities, 1);
});

test("ETF product category is separate from portfolio sector taxonomy", () => {
  assert.equal(alphaEtfCategoryForSymbol("VOO"), "US_BROAD_MARKET");
  assert.equal(alphaEtfCategoryForSymbol("VIG"), "DIVIDEND");
  assert.equal(alphaEtfCategoryForSymbol("SHV"), "CASH_EQUIVALENT");
  assert.equal(alphaEtfCategoryForSymbol("IBIT"), "CRYPTO_ETF");

  const result = taxonomy.normalize({
    symbol: "VOO",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "Financial Services",
    rawIndustry: "ETF",
    seededThemes: ["broad-market"]
  });

  assert.equal(result.canonicalSector, "Multi-Asset / Broad Market");
  assert.notEqual(result.canonicalSector, "US_BROAD_MARKET");
});

test("stock sector taxonomy maps approved alpha stocks by symbol", () => {
  assert.equal(alphaStockSectorForSymbol("MSFT"), "Technology");
  assert.equal(alphaStockSectorForSymbol("TSM"), "Technology");
  assert.equal(alphaStockSectorForSymbol("JPM"), "Financials");
  assert.equal(alphaStockSectorForSymbol("PYPL"), "Financials");
  assert.equal(alphaStockSectorForSymbol("BA"), "Industrials");
  assert.equal(alphaStockSectorForSymbol("NEE"), "Utilities");
});
