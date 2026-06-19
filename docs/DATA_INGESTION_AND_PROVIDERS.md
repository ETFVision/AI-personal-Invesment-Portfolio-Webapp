# Data Ingestion and Providers

Last updated: 2026-06-18

## Provider Map

| Provider | Adapter | Used for |
|---|---|---|
| FMP | `FmpMarketDataProvider.ts` | Instrument metadata, latest prices, historical prices, FMP news. |
| FMP | `FmpFundamentalsProvider.ts` | Company profiles, statements, ratios, fundamentals scoring inputs. |
| FMP | `FmpEtfExposureProvider.ts` | ETF sector, country, and holdings/look-through exposure where available. |
| FRED | `FredMacroDataProvider.ts` | Macro indicator observations and regime inputs. |
| NewsData.io | `NewsDataNewsProvider.ts` | Macro/world news query groups. Current preferred macro news provider. |
| GDELT | `GdeltNewsProvider.ts` | Separate manual macro/world news source. Not automated because of rate-limit instability. |
| OpenAI | `OpenAiNewsProvider.ts`, `OpenAiMarketVisionProvider.ts`, `OpenAiPortfolioAssistantProvider.ts` | Classification/narrative intelligence. |

## Ingestion Jobs

| Job | Endpoint | Main output |
|---|---|---|
| Instrument price refresh | `/api/jobs/instrument-price-refresh` | Latest raw `instrument_prices`. |
| Daily returns refresh | `/api/jobs/instrument-daily-returns-refresh` | `instrument_daily_returns`. |
| Return anchors refresh | `/api/jobs/instrument-return-anchors-refresh` | `instrument_return_anchors`. |
| Market metrics refresh | `/api/jobs/instrument-market-metrics-refresh` | `instrument_market_metrics`. |
| Risk refresh | `/api/jobs/instrument-risk-refresh` | `instrument_risk_metrics`. |
| Metadata refresh | `/api/jobs/instrument-metadata-refresh` | Instrument metadata/profile fields. |
| Market history backfill | `/api/jobs/market-history-backfill` | Historical `instrument_prices` and benchmark history. |
| Benchmark refresh | `/api/jobs/benchmark-refresh` | Recent benchmark snapshots. |
| ETF look-through | `/api/jobs/etf-lookthrough-refresh` | ETF exposure rows. |
| Fundamentals | `/api/jobs/fundamentals-refresh` | Profiles, statements, ratios, scores, trends. |
| FRED macro | `/api/jobs/fred-macro-ingestion` | Macro observations, trends, regimes. |
| FMP news | `/api/jobs/daily-news-ingestion` | FMP news and classifications. |
| NewsData | `/api/jobs/newsdata-news-ingestion` | NewsData articles and provider metadata. |
| GDELT | `/api/jobs/gdelt-news-ingestion` | Manual GDELT queue refresh. |
| Weekly news reconciliation | `/api/jobs/weekly-news-reconciliation` | Weekly asset/theme summary. |
| Market Vision | `/api/jobs/weekly-market-vision` | Weekly CIO-style AI report. |
| Recommendations | `/api/jobs/recommendation-run` | Deterministic recommendations and telemetry snapshots. |
| Portfolio Review | `/api/jobs/portfolio-review-run` | Portfolio review report and telemetry snapshots. |
| Telemetry evaluation | `/api/jobs/telemetry-evaluation` | Mature 1m/3m/6m/12m outcome evaluations. |
| Portfolio summary | `/api/jobs/portfolio-summary-refresh` | Dashboard/performance summary tables. |

## Security Master Data Flow

FMP metadata and ETF look-through refreshes now feed the Security Master layer:

1. Instrument metadata refresh fetches profile metadata and normalized identifiers where available.
2. Identifier fields such as ISIN/CUSIP/provider symbol are promoted onto `instruments`.
3. `sync_security_master_identifiers_from_instruments()` promotes normalized identifiers into `security_identifiers`.
4. ETF top holdings are mapped through canonical securities using stored identifiers, provider symbols, aliases, and internal-underlying fallback.
5. Issuer sync links securities to issuers for company-level exposure rollups.
6. Portfolio Review refresh stores issuer/security-aware look-through snapshots.

Operational implication:

- After significant metadata/ETF exposure/security-master changes, refresh metadata, ETF look-through, then Portfolio Review before QA-ing issuer-level exposure or Recommendation portfolio fit.
- Existing saved reports may remain symbol-based until regenerated.
- Crypto ETF proxies may not have ISIN/CUSIP from FMP; this is expected and should not block Security Master coverage for equities/ETFs.

## Daily Dependency Order

Daily automation should preserve this dependency chain:

1. Instrument prices.
2. Instrument daily returns.
3. Instrument return anchors.
4. Instrument market metrics.
5. Instrument risk metrics.
6. Instrument metadata.
7. Benchmarks.
8. Portfolio valuation.
9. Portfolio summary refresh.
10. FRED macro.
11. FMP news.
12. NewsData.

Important dependency detail: return anchors read from precomputed `instrument_daily_returns`. They should not recompute daily returns internally. If daily returns are stale or failed, anchors may refresh from stale data or fail to produce fresh market metrics.

Exact schedule is in `docs/scheduled-jobs.md`.

## Provider Quality Notes

- FMP is the core market/fundamentals provider. Some tickers can have limited endpoint coverage or delayed end-of-day updates.
- FMP profile metadata is also used as the primary source for normalized identifiers feeding Security Master.
- Instrument metadata refresh preserves raw FMP sector/industry fields, but canonical ETFVision taxonomy is curated-authoritative: ETF `canonical_sector` comes from `ALPHA_ETF_CATEGORIES` where mapped, stock `canonical_sector` comes from `ALPHA_STOCK_SECTORS` where mapped, and provider sector is only a fallback. Canonical themes are independent descriptors and are not blanket-applied from generic ETF labels such as `ETF`, `Sector ETF`, `Broad Market`, or `US Broad Market`.
- NewsData.io is preferred for scheduled macro/world news because it is less rate-limit fragile than GDELT.
- GDELT should remain manual-only unless future rate-limit behavior is stabilized.
- ETF top-holding availability depends on provider coverage. When top holdings are unavailable, portfolio exposure should fall back to sector/country exposure and mark coverage as limited.
- FRED is stable for macro indicators but economic data updates at different publication cadences.

## Instrument Taxonomy Backfill

The normal metadata job refreshes stale or incomplete provider metadata. When taxonomy rules change but provider metadata is still fresh, run the existing protected metadata job with `taxonomyBackfill=true` to re-normalize active instruments from stored raw fields and curated universe maps without refetching FMP metadata:

```text
POST /api/jobs/instrument-metadata-refresh?taxonomyBackfill=true
```

This path uses the same cron/job authorization wrapper as the standard metadata refresh and writes an `instrument_taxonomy_backfill` metadata refresh log. It should be followed by Portfolio Review refresh when QA depends on stored report snapshots.

## FMP ETF Holdings API Behaviour

**Primary file:** `src/infrastructure/providers/etf/FmpEtfExposureProvider.ts`

**Endpoint:** `GET /stable/etf/holdings?symbol={TICKER}`

### Weight Field Scale

FMP's `weightPercentage` field is always on a 0–100 scale, regardless of the holding's weight:

| Example | `weightPercentage` value | Correct decimal |
|---|---|---|
| NVDA in VOO at 7.89% | `7.89` | `0.0789` |
| XOM in VOO at 0.93% | `0.93` | `0.0093` |

The provider uses a dedicated `normalizePercentage()` function that always divides by 100. The generic `normalizeWeight()` heuristic (`> 1 ? value / 100 : value`) must not be used for `weightPercentage` because it misidentifies values below 1.0 as already-normalised fractions, causing a 100× overstatement for sub-1% holdings.

```typescript
// Always divide by 100 — not conditional on value > 1.
function normalizePercentage(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value / 100;
}
```

If `weightPercentage` is absent, the provider falls back to `normalizeWeight()` for the fields `weight`, `percentage`, `assetPercentage`, `value`. These fields may arrive in either scale depending on the endpoint variant, so the heuristic is appropriate only there.

### Blank-Asset Rows

FMP includes rows with `asset: ""` (empty string) for cash positions, money-market instruments, securities-lending collateral, and derivative positions. Examples from real ETF payloads:

| `asset` | `name` | Meaning |
|---|---|---|
| `""` | `"US Dollar"` | Cash position |
| `""` | `"MKTLIQ 12/31/2049"` | Vanguard market-liquidity fund |
| `""` | `"SLBBH1142"` | Securities-lending collateral |
| `""` | `"CME E-Mini NASDAQ 100"` | Futures contract |

VT has hundreds of such rows due to its broad international mandate. These rows do not represent equity positions and must not be stored in `etf_top_holdings`.

### holdingSymbol Field Priority

`holdingSymbol` is resolved using `textField(item, ["asset", "ticker", "holdingSymbol"])`.

The key `"symbol"` is intentionally excluded. In FMP's ETF holdings response, `symbol` is always set to the parent ETF ticker (e.g. `"VOO"` for all rows of VOO's holdings), not the holding's ticker. Including `"symbol"` as a fallback caused blank-asset rows to be stored as self-referential holdings (VOO appearing to hold VOO).

When all three keys are empty or absent, `holdingSymbol` resolves to `null` and the row is dropped by the `if (!holdingSymbol || holdingWeight == null) return []` guard.

**Rule:** never add `"symbol"` back to the holdingSymbol field priority list.

### Deduplication

FMP occasionally returns the same `holdingSymbol` more than once (e.g. share-class variants with slightly different weights). The provider deduplicates by symbol, keeping the row with the highest `holdingWeight`. The result is capped at 100 holdings per ETF, sorted descending by weight.

### Seeded Fallback

When no usable holdings rows survive after filtering, the provider returns `seededEtfTopHoldings(symbol, asOfDate, reason)` — a static fallback containing approximate holdings for the handful of ETFs that FMP does not cover under the current plan. This prevents downstream look-through from treating the ETF as zero-holding. The fallback is logged in `providerMetadata.seededReason`.

---

## FMP Fundamentals Data Lineage

Primary files:

- `src/infrastructure/providers/fundamentals/FmpFundamentalsProvider.ts`
- `src/application/services/fundamentals/FundamentalsRefreshService.ts`
- `src/application/services/fundamentals/FundamentalScoringService.ts`
- `src/application/services/fundamentals/FundamentalTrendCalculationService.ts`

Base URL:

- `https://financialmodelingprep.com/stable`

### Endpoints Used

| FMP endpoint | Internal output |
|---|---|
| `profile` | `company_profiles` |
| `income-statement` | `financial_statements` rows with `statement_type = income` |
| `balance-sheet-statement` | `financial_statements` rows with `statement_type = balance_sheet` |
| `cash-flow-statement` | `financial_statements` rows with `statement_type = cash_flow` |
| `ratios` | `financial_ratios` |

The refresh service pulls annual and quarterly fundamentals separately:

- Annual limit: latest 5 periods.
- Quarterly limit: latest 12 periods.
- Each refreshed stock then flows through score calculation and trend calculation.

### Profile Field Mapping

| Internal field | FMP source candidates |
|---|---|
| `company_name` | `companyName`, `companyNameSearch`, `name` |
| `sector` | `sector` |
| `industry` | `industry` |
| `country` | `country` |
| `exchange` | `exchangeShortName`, `exchange` |
| `currency` | `currency` |
| `market_cap` | `marketCap` |
| `beta` | `beta` |
| `description` | `description` |
| `website` | `website` |
| `ceo` | `ceo` |
| `ipo_date` | `ipoDate` |
| `employees` | `fullTimeEmployees`, `employees` |
| `provider_metadata` | Raw provider item |

### Statement Field Mapping

All statement rows map `date`, `reportDate`, or `fillingDate` into `report_date`; `calendarYear` or `fiscalYear` into fiscal year; and quarterly rows include a fiscal quarter when available.

| Internal field | FMP source candidates |
|---|---|
| `revenue` | `revenue` |
| `gross_profit` | `grossProfit` |
| `operating_income` | `operatingIncome` |
| `ebitda` | `ebitda` |
| `net_income` | `netIncome` |
| `eps` | `eps` |
| `diluted_eps` | `epsdiluted`, `dilutedEPS`, `dilutedEps` |
| `total_assets` | `totalAssets` |
| `total_liabilities` | `totalLiabilities` |
| `shareholders_equity` | `totalStockholdersEquity`, `shareholdersEquity` |
| `cash_and_equivalents` | `cashAndCashEquivalents`, `cashAndEquivalents` |
| `total_debt` | `totalDebt` |
| `operating_cash_flow` | `operatingCashFlow`, `netCashProvidedByOperatingActivities` |
| `capital_expenditure` | `capitalExpenditure`, `capitalExpenditures` |
| `free_cash_flow` | `freeCashFlow` |
| `shares_outstanding` | `weightedAverageShsOutDil`, `weightedAverageShsOut`, `sharesOutstanding` |
| `provider_metadata` | Raw provider item |

### Ratio Field Mapping

| Internal field | FMP source candidates |
|---|---|
| `pe_ratio` | `priceEarningsRatio`, `peRatio` |
| `forward_pe` | `forwardPE`, `forwardPe` |
| `price_to_sales` | `priceToSalesRatio`, `priceToSales` |
| `price_to_book` | `priceToBookRatio`, `priceToBook` |
| `ev_to_ebitda` | `enterpriseValueMultiple`, `evToEbitda` |
| `ev_to_sales` | `evToSales` |
| `gross_margin` | `grossProfitMargin`, `grossMargin` |
| `operating_margin` | `operatingProfitMargin`, `operatingMargin` |
| `net_margin` | `netProfitMargin`, `netMargin` |
| `roe` | `returnOnEquity`, `roe` |
| `roic` | `returnOnInvestedCapital`, `roic` |
| `roa` | `returnOnAssets`, `roa` |
| `debt_to_equity` | `debtEquityRatio`, `debtToEquity` |
| `net_debt_to_ebitda` | `netDebtToEBITDA`, `netDebtToEbitda` |
| `current_ratio` | `currentRatio` |
| `quick_ratio` | `quickRatio` |
| `free_cash_flow_yield` | `freeCashFlowYield` |
| `revenue_growth` | `revenueGrowth` |
| `eps_growth` | `epsgrowth`, `epsGrowth` |
| `net_income_growth` | `netIncomeGrowth` |
| `free_cash_flow_growth` | `freeCashFlowGrowth` |
| `provider_metadata` | Raw provider item |

### Derived Ratio Fallbacks

`FundamentalsRefreshService` fills missing ratio values when provider ratios are absent, but it does not override provider-supplied values.

Derived inputs:

- Latest income statement.
- Latest balance sheet.
- Latest cash-flow statement.
- Previous comparable statement when growth metrics are needed.
- Profile market cap, or `shares_outstanding * provider profile price` when available.

Derived formulas include:

- `pe_ratio = marketCap / netIncome`
- `price_to_sales = marketCap / revenue`
- `price_to_book = marketCap / shareholdersEquity`
- `gross_margin = grossProfit / revenue`
- `operating_margin = operatingIncome / revenue`
- `net_margin = netIncome / revenue`
- `roe = netIncome / shareholdersEquity`
- `roa = netIncome / totalAssets`
- `debt_to_equity = totalDebt / shareholdersEquity`
- `current_ratio = currentAssets / currentLiabilities` when those raw metadata fields exist.
- `free_cash_flow_yield = freeCashFlow / marketCap`
- `revenue_growth = (latestRevenue - previousRevenue) / abs(previousRevenue)`
- `eps_growth = (latestEPS - previousEPS) / abs(previousEPS)`
- `net_income_growth = (latestNetIncome - previousNetIncome) / abs(previousNetIncome)`
- `free_cash_flow_growth = (latestFreeCashFlow - previousFreeCashFlow) / abs(previousFreeCashFlow)`

Derived ratio rows mark fallback metadata in `provider_metadata.derivedFallbacks`.

### Downstream Use

After profiles, statements and ratios are stored:

1. `FundamentalScoringService` computes `fundamental_scores`.
2. `FundamentalTrendCalculationService` computes `fundamental_trends`.
3. Trend summaries are written to `fundamental_trend_summaries`.
4. Fundamentals overview and instrument detail pages read from the stored tables rather than recalculating provider data on render.

## Environment Variables

Required in Vercel:

- `FMP_API_KEY`
- `FRED_API_KEY`
- `NEWSDATA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `SCHEDULED_USER_ID`
- `SCHEDULED_PORTFOLIO_ID`

Supabase Vault must contain:

- `APP_URL`
- `CRON_SECRET`

## Manual Refresh UX

Admin > Data Sources centralizes refresh buttons and data-layer coverage cards. Product pages should generally avoid refresh buttons except where intentionally retained.
