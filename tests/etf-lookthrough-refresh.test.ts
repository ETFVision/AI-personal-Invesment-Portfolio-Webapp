import test from "node:test";
import assert from "node:assert/strict";
import { EtfExposureProviderService } from "../src/application/services/etfLookthrough/EtfExposureProviderService";
import { EtfLookthroughRefreshService } from "../src/application/services/etfLookthrough/EtfLookthroughRefreshService";
import { EtfLookthroughService } from "../src/application/services/etfLookthrough/EtfLookthroughService";
import type { EtfExposureRepository, LatestEtfExposureDates } from "../src/application/ports/repositories/EtfExposureRepository";
import type { EtfExposureProvider } from "../src/application/ports/providers/EtfExposureProvider";
import type { UniverseRepository } from "../src/application/ports/repositories/UniverseRepository";
import type { EtfCountryExposure, EtfExposureProviderSnapshot, EtfExposureRefreshLog, EtfSectorExposure, EtfThemeExposure, EtfTopHolding } from "../src/domain/etfLookthrough/types";
import type { Instrument } from "../src/domain/universe/types";

function instrument(symbol: string, overrides: Partial<Instrument> = {}): Instrument {
  return {
    id: `inst-${symbol}`,
    symbol,
    name: `${symbol} ETF`,
    assetClass: "etf",
    assetCategory: "EQUITY",
    etfCategory: "US_BROAD_MARKET",
    instrumentType: "etf",
    sector: null,
    industry: null,
    canonicalSector: "Technology",
    canonicalThemes: ["Technology"],
    taxonomyIsManualOverride: false,
    taxonomyReviewStatus: "mapped",
    geography: "United States",
    currency: "USD",
    exchange: "NYSE",
    watchlistTier: null,
    benchmarkTags: [],
    thematicTags: [],
    riskCategory: null,
    volatilityBucket: null,
    durationCategory: null,
    treasuryClassification: null,
    inflationLinked: null,
    creditQuality: null,
    geoExposure: "United States",
    rateSensitivity: null,
    inflationSensitivity: null,
    recessionSensitivity: null,
    liquidityRole: null,
    cryptoClassification: null,
    metadataLastRefreshedAt: null,
    providerPrimary: null,
    providerMetadata: {},
    sourceType: "seeded",
    isActive: true,
    ...overrides
  };
}

class FakeUniverseRepository {
  constructor(private readonly instruments: Instrument[]) {}

  async listInstruments() {
    return this.instruments;
  }
}

class FakeEtfExposureRepository {
  latestDateCallCount = 0;
  latestExposureDateForEtfCallCount = 0;
  latestHoldingsDateForEtfCallCount = 0;
  sectorRows: EtfSectorExposure[] = [];
  countryRows: EtfCountryExposure[] = [];
  topHoldingRows: EtfTopHolding[] = [];
  themeRows: EtfThemeExposure[] = [];
  logs: InsertedLog[] = [];

  constructor(private readonly latestDates: Map<string, LatestEtfExposureDates>) {}

  async getLatestEtfExposureDates(instrumentIds: string[]) {
    this.latestDateCallCount += 1;
    return new Map(Array.from(this.latestDates.entries()).filter(([instrumentId]) => instrumentIds.includes(instrumentId)));
  }

  async getLatestExposureDateForEtf(): Promise<string | null> {
    this.latestExposureDateForEtfCallCount += 1;
    throw new Error("per-ETF exposure date lookup should not be called");
  }

  async getLatestHoldingsDateForEtf(): Promise<string | null> {
    this.latestHoldingsDateForEtfCallCount += 1;
    throw new Error("per-ETF holdings date lookup should not be called");
  }

  async upsertSectorExposures(input: EtfSectorExposure[]) {
    this.sectorRows.push(...input);
  }

  async upsertCountryExposures(input: EtfCountryExposure[]) {
    this.countryRows.push(...input);
  }

  async upsertTopHoldings(input: EtfTopHolding[]) {
    this.topHoldingRows.push(...input);
  }

  async upsertThemeExposures(input: EtfThemeExposure[]) {
    this.themeRows.push(...input);
  }

  async insertRefreshLog(input: InsertedLog) {
    this.logs.push(input);
  }
}

type InsertedLog = Omit<EtfExposureRefreshLog, "id" | "createdAt">;

class ConcurrentFakeEtfExposureProvider implements EtfExposureProvider {
  readonly name = "test";
  readonly failedSymbols = new Set<string>();
  readonly requestedSymbols: string[] = [];
  private inFlight = 0;
  maxInFlight = 0;

  async getEtfExposure(symbol: string): Promise<EtfExposureProviderSnapshot> {
    this.requestedSymbols.push(symbol);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      if (this.failedSymbols.has(symbol)) throw new Error("provider failed");
      return {
        symbol,
        asOfDate: "2026-06-01",
        sectorExposures: [{ etfSymbol: symbol, sector: "Technology", exposureWeight: 0.7, asOfDate: "2026-06-01", providerMetadata: {} }],
        countryExposures: [{ etfSymbol: symbol, country: "United States", exposureWeight: 1, asOfDate: "2026-06-01", providerMetadata: {} }],
        topHoldings: [{ etfSymbol: symbol, holdingSymbol: `${symbol}H`, holdingName: `${symbol} Holding`, holdingWeight: 0.1, asOfDate: "2026-06-01", providerMetadata: {} }]
      };
    } finally {
      this.inFlight -= 1;
    }
  }
}

test("ETF look-through refresh uses set-based eligibility and bounded-concurrency waves", async () => {
  const instruments = ["AAA", "BBB", "CCC", "DDD", "EEE"].map((symbol) => instrument(symbol));
  const latestDates = new Map<string, LatestEtfExposureDates>([
    ["inst-AAA", { latestExposureDate: "2026-01-01", latestHoldingsDate: null }],
    ["inst-BBB", { latestExposureDate: "2026-01-01", latestHoldingsDate: "2026-01-01" }],
    ["inst-CCC", { latestExposureDate: "2026-01-01", latestHoldingsDate: "2026-01-01" }],
    ["inst-DDD", { latestExposureDate: "2026-06-20", latestHoldingsDate: "2026-06-20" }]
  ]);
  const repository = new FakeEtfExposureRepository(latestDates);
  const provider = new ConcurrentFakeEtfExposureProvider();
  provider.failedSymbols.add("CCC");
  const service = new EtfLookthroughRefreshService(
    repository as Partial<EtfExposureRepository> as EtfExposureRepository,
    new FakeUniverseRepository(instruments) as Partial<UniverseRepository> as UniverseRepository,
    new EtfExposureProviderService(provider),
    new EtfLookthroughService(),
    {
      enabled: true,
      refreshFrequencyDays: 30,
      maxEtfsPerRun: 2,
      autoSizeMaxEtfsPerRun: true,
      staleAfterDays: 45,
      fetchConcurrency: 2
    }
  );

  const result = await service.refresh();

  assert.equal(repository.latestDateCallCount, 1);
  assert.equal(repository.latestExposureDateForEtfCallCount, 0);
  assert.equal(repository.latestHoldingsDateForEtfCallCount, 0);
  assert.equal(provider.maxInFlight <= 2, true);
  assert.equal(result.status, "partial_success");
  assert.equal(result.etfsRequested, 4);
  assert.equal(result.etfsRefreshed, 3);
  assert.equal(result.sectorRows, 3);
  assert.equal(result.countryRows, 3);
  assert.equal(result.topHoldingRows, 3);
  assert.deepEqual(new Set(provider.requestedSymbols), new Set(["AAA", "BBB", "CCC", "EEE"]));
  assert.equal(provider.requestedSymbols.includes("DDD"), false);
  assert.equal(repository.sectorRows.length, 3);
  assert.equal(repository.countryRows.length, 3);
  assert.equal(repository.topHoldingRows.length, 3);
  assert.equal(repository.themeRows.length, 6);
  assert.equal(repository.logs[0]?.status, "partial_success");
  assert.equal(repository.logs[0]?.etfsRequested, 4);
  assert.equal(repository.logs[0]?.etfsRefreshed, 3);
  assert.match(repository.logs[0]?.errorMessage ?? "", /CCC: provider failed/);
});
