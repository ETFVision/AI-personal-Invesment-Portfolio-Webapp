import test from "node:test";
import assert from "node:assert/strict";
import { TaxonomyService } from "../src/application/services/taxonomy/TaxonomyService";
import { buildPortfolioExposureContext } from "../src/application/services/portfolio/PortfolioExposureContextService";
import { benchmarkKeyForEtf } from "../src/application/services/recommendations/EtfRecommendationService";
import {
  ALPHA_ETF_CATEGORIES,
  ALPHA_ETF_SYMBOLS,
  ALPHA_STOCK_SECTORS,
  ALPHA_STOCK_SYMBOLS,
  alphaEtfCategoryForSymbol,
  alphaStockSectorForSymbol,
  assetCategoryForEtfCategory
} from "../src/domain/universe/alphaUniverse";
import type { Instrument } from "../src/domain/universe/types";

const taxonomy = new TaxonomyService();

const expectedEtfCategorySectors: Record<keyof typeof ALPHA_ETF_CATEGORIES, string> = {
  US_BROAD_MARKET: "Multi-Asset / Broad Market",
  GLOBAL_EQUITY: "Multi-Asset / Broad Market",
  DEVELOPED_MARKETS: "Multi-Asset / Broad Market",
  EMERGING_MARKETS: "Multi-Asset / Broad Market",
  TECHNOLOGY: "Technology",
  SEMICONDUCTOR: "Technology",
  AI_ROBOTICS: "Technology",
  CYBERSECURITY: "Technology",
  CLOUD_COMPUTING: "Technology",
  HEALTHCARE: "Healthcare",
  FINANCIALS: "Financials",
  INDUSTRIALS: "Industrials",
  CONSUMER_DISCRETIONARY: "Consumer Discretionary",
  CONSUMER_STAPLES: "Consumer Staples",
  ENERGY: "Energy",
  MATERIALS: "Materials",
  UTILITIES: "Utilities",
  COMMUNICATION_SERVICES: "Communication Services",
  REAL_ESTATE: "Real Estate",
  DIVIDEND: "Multi-Asset / Broad Market",
  GROWTH: "Multi-Asset / Broad Market",
  VALUE: "Multi-Asset / Broad Market",
  SMALL_CAP: "Multi-Asset / Broad Market",
  FACTOR_INVESTING: "Multi-Asset / Broad Market",
  OPTION_INCOME: "Multi-Asset / Broad Market",
  MID_CAP: "Multi-Asset / Broad Market",
  ESG_SOCIALLY_RESPONSIBLE: "Multi-Asset / Broad Market",
  MULTI_ASSET_BALANCED: "Multi-Asset / Broad Market",
  BOND: "Bonds / Fixed Income",
  CASH_EQUIVALENT: "Cash / Money Market",
  PREFERRED_STOCK: "Bonds / Fixed Income",
  MUNICIPAL_BOND: "Bonds / Fixed Income",
  EMERGING_MARKET_BOND: "Bonds / Fixed Income",
  COMMODITY: "Commodities / Gold",
  GOLD_PRECIOUS_METALS: "Commodities / Gold",
  CRYPTO_ETF: "Crypto",
  INTERNATIONAL_DIVIDEND: "Multi-Asset / Broad Market",
  COUNTRY: "Multi-Asset / Broad Market",
  AEROSPACE_DEFENSE: "Industrials",
  INFRASTRUCTURE: "Industrials",
  CLEAN_ENERGY: "Energy"
};

function minimalInstrument(symbol: string, overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: symbol.toLowerCase(),
    symbol,
    name: `${symbol} instrument`,
    assetClass: "etf",
    instrumentType: "etf",
    sector: "Incorrect Provider Sector",
    industry: "Incorrect Provider Industry",
    canonicalSector: null,
    canonicalThemes: [],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "pending",
    geography: null,
    currency: "USD",
    exchange: null,
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: false,
    creditQuality: null,
    geoExposure: null,
    rateSensitivity: null,
    inflationSensitivity: null,
    recessionSensitivity: null,
    liquidityRole: null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "test",
    isActive: true,
    ...overrides
  };
}

test("maps broad market ETFs to broad market sector without blanket global theme", () => {
  const result = taxonomy.normalize({
    symbol: "VOO",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "Financial Services",
    rawIndustry: "ETF",
    seededThemes: ["broad-market"]
  });

  assert.equal(result.canonicalSector, "Multi-Asset / Broad Market");
  assert.equal(result.canonicalThemes.includes("Global Diversification"), false);
  assert.ok(result.canonicalThemes.includes("Quality"));
});

test("maps curated sector ETFs to authoritative sectors without global diversification theme", () => {
  for (const [symbol, expectedSector] of [
    ["FXU", "Utilities"],
    ["VPU", "Utilities"],
    ["IYH", "Healthcare"],
    ["VFH", "Financials"],
    ["VDE", "Energy"]
  ] as const) {
    const result = taxonomy.normalize({
      symbol,
      assetClass: "etf",
      instrumentType: "etf",
      rawSector: "ETF",
      rawIndustry: "ETF",
      seededThemes: ["sector-etf"]
    });

    assert.equal(result.canonicalSector, expectedSector);
    assert.notEqual(result.canonicalSector, "Multi-Asset / Broad Market");
    assert.equal(result.canonicalThemes.includes("Global Diversification"), false);
  }
});

test("keeps global diversification theme for genuinely global and ex-US ETFs", () => {
  const vt = taxonomy.normalize({
    symbol: "VT",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "ETF",
    rawIndustry: "ETF",
    seededThemes: ["global-equity"]
  });
  const vxus = taxonomy.normalize({
    symbol: "VXUS",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "ETF",
    rawIndustry: "ETF",
    seededThemes: ["global-equity"]
  });
  const xlu = taxonomy.normalize({
    symbol: "XLU",
    assetClass: "etf",
    instrumentType: "etf",
    rawSector: "Utilities",
    rawIndustry: "Sector ETF",
    seededThemes: ["sector-etf"]
  });

  assert.equal(vt.canonicalSector, "Multi-Asset / Broad Market");
  assert.equal(vxus.canonicalSector, "Multi-Asset / Broad Market");
  assert.ok(vt.canonicalThemes.includes("Global Diversification"));
  assert.ok(vxus.canonicalThemes.includes("Global Diversification"));
  assert.equal(xlu.canonicalThemes.includes("Global Diversification"), false);
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

test("stock sector source of truth overrides incorrect provider sectors", () => {
  const result = taxonomy.normalize({
    symbol: "MSFT",
    assetClass: "stock",
    instrumentType: "stock",
    rawSector: "Financial Services",
    rawIndustry: "Software - Infrastructure"
  });

  assert.equal(result.canonicalSector, "Technology");
  assert.ok(result.canonicalThemes.includes("Cloud / Software"));
});

test("alpha universe contains the approved ETF and stock source-of-truth counts", () => {
  assert.equal(ALPHA_ETF_SYMBOLS.length, 232);
  assert.equal(new Set(ALPHA_ETF_SYMBOLS).size, 232);
  assert.equal(ALPHA_STOCK_SYMBOLS.length, 159);
  assert.equal(new Set(ALPHA_STOCK_SYMBOLS).size, 159);

  const etfCategoryCounts = Object.fromEntries(Object.entries(ALPHA_ETF_CATEGORIES).map(([category, symbols]) => [category, symbols.length]));
  assert.equal(etfCategoryCounts.US_BROAD_MARKET, 10);
  assert.equal(etfCategoryCounts.BOND, 16);
  assert.equal(etfCategoryCounts.CASH_EQUIVALENT, 5);
  assert.equal(etfCategoryCounts.CRYPTO_ETF, 5);
  assert.equal(etfCategoryCounts.DIVIDEND, 11);
  assert.equal(etfCategoryCounts.FACTOR_INVESTING, 6);
  assert.equal(etfCategoryCounts.OPTION_INCOME, 3);
  assert.equal(etfCategoryCounts.MID_CAP, 3);
  assert.equal(etfCategoryCounts.ESG_SOCIALLY_RESPONSIBLE, 4);
  assert.equal(etfCategoryCounts.MULTI_ASSET_BALANCED, 3);
  assert.equal(etfCategoryCounts.PREFERRED_STOCK, 2);
  assert.equal(etfCategoryCounts.MUNICIPAL_BOND, 2);
  assert.equal(etfCategoryCounts.EMERGING_MARKET_BOND, 2);
  assert.equal(etfCategoryCounts.COUNTRY, 14);
  assert.equal(etfCategoryCounts.AEROSPACE_DEFENSE, 2);
  assert.equal(etfCategoryCounts.INFRASTRUCTURE, 4);
  assert.equal(etfCategoryCounts.CLEAN_ENERGY, 3);
  for (const removedSymbol of ["IWDA", "VWRA", "VGK", "URTH", "VEU", "THNQ", "TAN", "RHS", "RGI", "RYH", "RYT", "RYF", "SLY", "EWCO", "IRBO"]) {
    assert.equal(alphaEtfCategoryForSymbol(removedSymbol), null);
  }

  const stockSectorCounts = Object.fromEntries(Object.entries(ALPHA_STOCK_SECTORS).map(([sector, symbols]) => [sector, symbols.length]));
  assert.equal(stockSectorCounts.Technology, 23);
  assert.equal(stockSectorCounts.Financials, 26);
  assert.equal(stockSectorCounts.Industrials, 20);
  assert.equal(stockSectorCounts.Utilities, 8);
  assert.equal(stockSectorCounts["Real Estate"], 9);
  assert.equal(stockSectorCounts["Consumer Staples"], 13);
  assert.equal(stockSectorCounts.Energy, 12);
  assert.equal(stockSectorCounts.Materials, 9);
});

test("ETF product category is separate from portfolio sector taxonomy", () => {
  assert.equal(alphaEtfCategoryForSymbol("VOO"), "US_BROAD_MARKET");
  assert.equal(alphaEtfCategoryForSymbol("VIG"), "DIVIDEND");
  assert.equal(alphaEtfCategoryForSymbol("SHV"), "CASH_EQUIVALENT");
  assert.equal(alphaEtfCategoryForSymbol("IBIT"), "CRYPTO_ETF");
  assert.equal(alphaEtfCategoryForSymbol("MTUM"), "FACTOR_INVESTING");
  assert.equal(alphaEtfCategoryForSymbol("PFF"), "PREFERRED_STOCK");
  assert.equal(alphaEtfCategoryForSymbol("MUB"), "MUNICIPAL_BOND");
  assert.equal(alphaEtfCategoryForSymbol("MDY"), "MID_CAP");

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
  assert.equal(result.canonicalThemes.includes("Global Diversification"), false);
});

test("new ETF categories resolve canonical sector, asset category, and benchmark", () => {
  const expectations = [
    ["FACTOR_INVESTING", "MTUM", "Multi-Asset / Broad Market", "EQUITY", "sp500"],
    ["OPTION_INCOME", "JEPI", "Multi-Asset / Broad Market", "EQUITY", "sp500"],
    ["MID_CAP", "MDY", "Multi-Asset / Broad Market", "EQUITY", "sp500"],
    ["ESG_SOCIALLY_RESPONSIBLE", "ESGU", "Multi-Asset / Broad Market", "EQUITY", "sp500"],
    ["MULTI_ASSET_BALANCED", "AOR", "Multi-Asset / Broad Market", "MULTI_ASSET", "global_equities"],
    ["PREFERRED_STOCK", "PFF", "Bonds / Fixed Income", "BOND", "us_aggregate_bonds"],
    ["MUNICIPAL_BOND", "MUB", "Bonds / Fixed Income", "BOND", "us_aggregate_bonds"],
    ["EMERGING_MARKET_BOND", "EMB", "Bonds / Fixed Income", "BOND", "us_aggregate_bonds"],
    ["AEROSPACE_DEFENSE", "ITA", "Industrials", "EQUITY", "sp500"]
  ] as const;

  for (const [category, symbol, expectedSector, expectedAssetCategory, expectedBenchmark] of expectations) {
    assert.equal(alphaEtfCategoryForSymbol(symbol), category);
    assert.equal(assetCategoryForEtfCategory(category), expectedAssetCategory);
    const instrument = minimalInstrument(symbol, { etfCategory: category } as Partial<Instrument>);
    assert.equal(taxonomy.normalizeInstrument(instrument).canonicalSector, expectedSector);
    assert.equal(benchmarkKeyForEtf(instrument), expectedBenchmark);
  }
});

test("stock sector taxonomy maps approved alpha stocks by symbol", () => {
  assert.equal(alphaStockSectorForSymbol("MSFT"), "Technology");
  assert.equal(alphaStockSectorForSymbol("TSM"), "Technology");
  assert.equal(alphaStockSectorForSymbol("JPM"), "Financials");
  assert.equal(alphaStockSectorForSymbol("PYPL"), "Financials");
  assert.equal(alphaStockSectorForSymbol("SPGI"), "Financials");
  assert.equal(alphaStockSectorForSymbol("BA"), "Industrials");
  assert.equal(alphaStockSectorForSymbol("GD"), "Industrials");
  assert.equal(alphaStockSectorForSymbol("EQIX"), "Real Estate");
  assert.equal(alphaStockSectorForSymbol("RACE"), "Consumer Discretionary");
  assert.equal(alphaStockSectorForSymbol("NEE"), "Utilities");
  assert.equal(alphaStockSectorForSymbol("DUK"), "Utilities");
  assert.equal(alphaStockSectorForSymbol("MDLZ"), "Consumer Staples");
  assert.equal(alphaStockSectorForSymbol("MPC"), "Energy");
  assert.equal(alphaStockSectorForSymbol("FCX"), "Materials");
});

test("curated alpha universe maps normalizeInstrument to expected canonical sectors", () => {
  for (const [category, symbols] of Object.entries(ALPHA_ETF_CATEGORIES) as Array<[keyof typeof ALPHA_ETF_CATEGORIES, string[]]>) {
    for (const symbol of symbols) {
      const result = taxonomy.normalizeInstrument(minimalInstrument(symbol));
      assert.equal(result.canonicalSector, expectedEtfCategorySectors[category], `${symbol} should normalize from ${category}`);
    }
  }

  for (const [sector, symbols] of Object.entries(ALPHA_STOCK_SECTORS)) {
    for (const symbol of symbols) {
      const result = taxonomy.normalizeInstrument(minimalInstrument(symbol, {
        assetClass: "stock",
        instrumentType: "stock"
      }));
      assert.equal(result.canonicalSector, sector, `${symbol} should normalize from stock sector source of truth`);
    }
  }
});

test("generic provider labels and alpha ETF category slugs do not create noisy taxonomy review items", () => {
  for (const rawValue of [
    "ETF",
    "Multi-sector ETF",
    "Bond ETF",
    "Sector ETF",
    "Digital Assets",
    "Consumer Cyclical",
    "Financial Services",
    "Basic Materials",
    "Cash Equivalent",
    "Crypto ETF",
    "Gold ETF"
  ]) {
    const result = taxonomy.normalize({
      symbol: "TEST",
      assetClass: "etf",
      instrumentType: "etf",
      rawSector: rawValue,
      rawIndustry: rawValue
    });
    assert.deepEqual(result.unmappedRawValues, []);
  }

  for (const category of Object.keys(ALPHA_ETF_CATEGORIES)) {
    const seededTheme = category.toLowerCase().replaceAll("_", "-");
    const result = taxonomy.normalize({
      symbol: ALPHA_ETF_CATEGORIES[category as keyof typeof ALPHA_ETF_CATEGORIES][0],
      assetClass: "etf",
      instrumentType: category === "CRYPTO_ETF" ? "crypto_etf" : "etf",
      rawSector: "ETF",
      rawIndustry: "ETF",
      seededThemes: [seededTheme]
    });
    assert.deepEqual(result.unmappedRawValues, [], `${category} should be an accepted seeded taxonomy theme`);
  }
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
