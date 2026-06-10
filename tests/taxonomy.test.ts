import test from "node:test";
import assert from "node:assert/strict";
import { TaxonomyService } from "../src/application/services/taxonomy/TaxonomyService";
import { buildPortfolioExposureContext } from "../src/application/services/portfolio/PortfolioExposureContextService";
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
  assert.equal(ALPHA_ETF_SYMBOLS.length, 201);
  assert.equal(new Set(ALPHA_ETF_SYMBOLS).size, 201);
  assert.equal(ALPHA_STOCK_SYMBOLS.length, 105);
  assert.equal(new Set(ALPHA_STOCK_SYMBOLS).size, 105);

  const etfCategoryCounts = Object.fromEntries(Object.entries(ALPHA_ETF_CATEGORIES).map(([category, symbols]) => [category, symbols.length]));
  assert.equal(etfCategoryCounts.US_BROAD_MARKET, 10);
  assert.equal(etfCategoryCounts.BOND, 16);
  assert.equal(etfCategoryCounts.CASH_EQUIVALENT, 5);
  assert.equal(etfCategoryCounts.CRYPTO_ETF, 5);
  assert.equal(etfCategoryCounts.DIVIDEND, 11);
  assert.equal(etfCategoryCounts.INFRASTRUCTURE, 4);
  assert.equal(etfCategoryCounts.CLEAN_ENERGY, 3);
  for (const removedSymbol of ["IWDA", "VWRA", "VGK", "URTH", "VEU", "THNQ", "TAN", "RHS", "RGI", "RYH", "RYT", "RYF", "SLY", "EWCO", "IRBO"]) {
    assert.equal(alphaEtfCategoryForSymbol(removedSymbol), null);
  }

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

test("portfolio exposure context prefers ETF look-through sectors over direct ETF taxonomy", () => {
  const dashboard = {
    allocationByType: [{ label: "ETF", value: 100, percent: 1 }],
    allocationBySector: [{ label: "Multi-Asset / Broad Market", value: 100, percent: 1 }],
    allocationByGeography: [{ label: "United States", value: 100, percent: 1 }]
  } as any;
  const report = {
    inputsSnapshot: {
      lookthroughExposure: {
        sectorExposures: [
          { exposureType: "sector", exposureName: "Technology", exposureWeight: 0.32, directWeight: 0, etfLookthroughWeight: 0.32 },
          { exposureType: "sector", exposureName: "Financials", exposureWeight: 0.14, directWeight: 0, etfLookthroughWeight: 0.14 }
        ],
        countryExposures: [
          { exposureType: "country", exposureName: "US", exposureWeight: 0.72, directWeight: 0, etfLookthroughWeight: 0.72 }
        ],
        coverage: { etfCount: 1, etfsWithSectorExposure: 1, etfsWithCountryExposure: 1, etfsWithTopHoldings: 1, lookthroughWeight: 1, fallbackWeight: 0 }
      }
    }
  };

  const context = buildPortfolioExposureContext(dashboard, report as any);

  assert.equal(context.sectorSource, "lookthrough");
  assert.equal(context.geographySource, "lookthrough");
  assert.equal(context.sectorAllocation[0].label, "Technology");
  assert.equal(context.geographyAllocation[0].label, "United States");
  assert.notEqual(context.sectorAllocation[0].label, "Multi-Asset / Broad Market");
});

test("portfolio exposure context keeps direct fallback when look-through is unavailable", () => {
  const dashboard = {
    allocationByType: [{ label: "ETF", value: 100, percent: 1 }],
    allocationBySector: [{ label: "Multi-Asset / Broad Market", value: 100, percent: 1 }],
    allocationByGeography: [{ label: "United States", value: 100, percent: 1 }]
  } as any;

  const context = buildPortfolioExposureContext(dashboard, null);

  assert.equal(context.sectorSource, "direct_metadata");
  assert.equal(context.geographySource, "direct_metadata");
  assert.equal(context.sectorAllocation[0].label, "Multi-Asset / Broad Market");
  assert.ok(context.diagnostics.some((item) => item.includes("direct metadata fallback")));
});
