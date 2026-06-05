import test from "node:test";
import assert from "node:assert/strict";
import { RefreshPortfolioPricesJob } from "../src/application/jobs/RefreshPortfolioPricesJob";
import type { InstrumentMarketService } from "../src/application/services/InstrumentMarketService";
import type { MarketDataService } from "../src/application/services/MarketDataService";

test("portfolio price refresh is driven by the master instrument price refresh", async () => {
  const calls: string[] = [];
  const instrumentMarketService = {
    async refreshInstrumentPricesInBatches() {
      calls.push("instrument-refresh");
      return {
        requestedSymbols: ["VOO", "MSFT"],
        updatedCount: 2,
        missingSymbols: [],
        errors: [],
        message: "Stored 2 instrument price rows."
      };
    }
  } as unknown as InstrumentMarketService;
  const marketDataService = {
    async syncPortfolioPricesFromInstrumentPrices() {
      calls.push("portfolio-sync");
      return {
        requestedSymbols: ["VOO"],
        fetchedCount: 0,
        skippedCount: 0,
        storedCount: 1,
        errors: [],
        message: "Synced 1 portfolio asset price from instrument prices."
      };
    }
  } as unknown as MarketDataService;

  const job = new RefreshPortfolioPricesJob(marketDataService, instrumentMarketService);
  const result = await job.run({ userId: "user-id", portfolioId: "portfolio-id" });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["instrument-refresh", "portfolio-sync"]);
  assert.ok(result.metadata);
  assert.equal(result.metadata.masterInstrumentRefresh.updatedCount, 2);
  assert.equal(result.metadata.portfolioPriceSync.storedCount, 1);
});
