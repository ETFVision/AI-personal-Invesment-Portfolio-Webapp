# Instrument Taxonomy Audit

Last updated: 2026-06-12 22:55:00 +08:00

> **Update 2026-06-19:** Canonical sector/theme derivation is now **curated-authoritative** — ETF sector resolves from `ALPHA_ETF_CATEGORIES` and stock sector from `ALPHA_STOCK_SECTORS` (taking precedence over provider sector), `Global Diversification` is no longer blanket-applied to US ETFs, and sector is never inferred from a theme. A one-time backfill corrected existing rows (mis-sectored mapped ETFs 67→0; US sector ETFs with `Global Diversification` 91→0). The provider-sector notes below describe the pre-update state and are retained for history. See `docs/instrument-taxonomy-alpha-universe.md` → "Canonical Sector And Theme Derivation".

## Audit Result

Status: completed for the current commercialisation checkpoint.

The active ETFVision instrument taxonomy is ready for current product use, subject to the separate Data Provider Audit and ETF Holdings Data Audit for provider coverage, top-holding availability, and stale-data checks.

## Scope

This audit verifies the approved active ETF and stock universe, source-of-truth taxonomy mappings, live Supabase active counts, duplicate checks, category coverage, and the separation between ETF product taxonomy and portfolio sector exposure.

Primary source files checked:

- `src/domain/universe/alphaUniverse.ts`
- `src/application/services/UniverseManagementService.ts`
- `src/infrastructure/repositories/supabase/SupabaseUniverseRepository.ts`
- `supabase/migrations/062_instrument_product_taxonomy.sql`
- `docs/INSTRUMENT_TAXONOMY_AND_COVERAGE.md`
- `docs/instrument-taxonomy-alpha-universe.md`

## Source Of Truth

The source-of-truth active universe is defined in `src/domain/universe/alphaUniverse.ts`.

Static source audit result:

| Area | Result |
|---|---:|
| ETF categories | 32 |
| ETF total | 201 |
| ETF unique symbols | 201 |
| Stock sectors | 11 |
| Stock total | 105 |
| Stock unique symbols | 105 |
| ETF duplicate symbols | 0 |
| Stock duplicate symbols | 0 |
| ETF/stock overlap | 0 |
| Empty ETF categories | 0 |
| Empty stock sectors | 0 |

## Live Supabase Verification

Live aggregate verification was run against Supabase on 2026-06-12.

| Check | Result |
|---|---:|
| Total `instruments` rows | 324 |
| Active instruments | 306 |
| Inactive instruments | 18 |
| Active ETF-style products | 201 |
| Active standard ETFs | 196 |
| Active crypto ETFs | 5 |
| Active stocks | 105 |
| Active duplicate symbols | 0 |
| Active ETFs missing `etf_category` | 0 |
| Active stocks missing `sector` | 0 |
| Active instruments missing `asset_category` | 0 |

Active instrument type split:

| `instrument_type` | Count |
|---|---:|
| `etf` | 196 |
| `crypto_etf` | 5 |
| `stock` | 105 |

Active asset category split:

| `asset_category` | Count |
|---|---:|
| `EQUITY` | 264 |
| `BOND` | 21 |
| `REAL_ESTATE` | 10 |
| `COMMODITY` | 6 |
| `CRYPTO` | 5 |

Raw crypto references:

| Symbol | `instrument_type` | `asset_category` | Active |
|---|---|---|---|
| BTC | `crypto` | `CRYPTO` | false |
| ETH | `crypto` | `CRYPTO` | false |
| SOL | `crypto` | `CRYPTO` | false |

## ETF Product Category Counts

Live active ETF product categories:

| `etf_category` | Count |
|---|---:|
| `US_BROAD_MARKET` | 10 |
| `GLOBAL_EQUITY` | 6 |
| `DEVELOPED_MARKETS` | 9 |
| `EMERGING_MARKETS` | 10 |
| `TECHNOLOGY` | 8 |
| `SEMICONDUCTOR` | 5 |
| `AI_ROBOTICS` | 3 |
| `CYBERSECURITY` | 4 |
| `CLOUD_COMPUTING` | 3 |
| `HEALTHCARE` | 7 |
| `FINANCIALS` | 7 |
| `INDUSTRIALS` | 5 |
| `CONSUMER_DISCRETIONARY` | 6 |
| `CONSUMER_STAPLES` | 4 |
| `ENERGY` | 8 |
| `MATERIALS` | 5 |
| `UTILITIES` | 5 |
| `COMMUNICATION_SERVICES` | 4 |
| `REAL_ESTATE` | 10 |
| `DIVIDEND` | 11 |
| `GROWTH` | 5 |
| `VALUE` | 5 |
| `SMALL_CAP` | 7 |
| `BOND` | 16 |
| `CASH_EQUIVALENT` | 5 |
| `COMMODITY` | 3 |
| `GOLD_PRECIOUS_METALS` | 3 |
| `CRYPTO_ETF` | 5 |
| `INTERNATIONAL_DIVIDEND` | 5 |
| `COUNTRY` | 10 |
| `INFRASTRUCTURE` | 4 |
| `CLEAN_ENERGY` | 3 |

## Stock Sector Verification

All 105 active stocks have normalized `canonical_sector`.

Live canonical sector counts:

| `canonical_sector` | Count |
|---|---:|
| Technology | 23 |
| Communication Services | 9 |
| Consumer Discretionary | 14 |
| Financials | 16 |
| Healthcare | 14 |
| Industrials | 11 |
| Energy | 5 |
| Consumer Staples | 5 |
| Real Estate | 3 |
| Utilities | 1 |
| Materials | 4 |

Provider sector note:

Some live `sector` values preserve provider-style terms such as `Financial Services`, `Consumer Cyclical`, `Consumer Defensive`, and `Basic Materials`. These are correctly normalized into `canonical_sector`.

Commercial rule:

- Use `canonical_sector` for stock sector grouping and analytics.
- Treat `sector` as provider/raw display metadata where it differs from the canonical taxonomy.

## Checklist Result

| Check | Result | Evidence |
|---|---|---|
| Approved ETF count confirmed | PASS | 201 active ETF-style products: 196 `etf` + 5 `crypto_etf`. |
| Approved stock count confirmed | PASS | 105 active stocks. |
| No duplicate active symbols | PASS | Live duplicate active symbols: 0. |
| No symbol assigned to multiple source categories | PASS | Static ETF and stock maps have no duplicate symbols. |
| No ETF classified as stock | PASS | No ETF/stock overlap in source map; live type split is clean. |
| No stock classified as ETF | PASS | No ETF/stock overlap in source map; 105 active stocks. |
| ETF category populated | PASS | Active ETFs missing `etf_category`: 0. |
| Stock sector populated | PASS | Active stocks missing `sector`: 0; active stocks missing `canonical_sector`: 0. |
| Asset category populated | PASS | Active instruments missing `asset_category`: 0. |
| Coverage status populated | ACCEPTED WITH NOTE | No physical `coverage_status` column exists. Coverage is currently represented by active/inactive status plus provider coverage tables and freshness diagnostics. Formal coverage status remains part of the Data Provider Audit. |
| `is_active` populated | PASS | 306 active rows and 18 inactive rows confirmed. |
| `is_user_selectable` populated | ACCEPTED WITH NOTE | No physical `is_user_selectable` column exists. Current UI eligibility is derived from `is_active`, feature visibility and page filters. Add a field later only if product-mode eligibility needs to diverge from active status. |

## Important Allocation Rule

ETF product category must not be used as portfolio sector allocation.

Portfolio sector allocation priority remains:

1. ETF holdings look-through sector aggregation, if available.
2. FMP ETF sector breakdown, if holdings look-through is unavailable.
3. ETF category fallback only if no sector exposure exists, and the result must be marked estimated or limited.

Example:

VOO is categorized as `US_BROAD_MARKET` as an ETF product, but portfolio sector charts should reflect its underlying Technology, Financials, Healthcare, Industrials and other sector exposures.

## Future Taxonomy Completion Items

Candidate ETF categories tested but not yet seeded, in priority order:

| Priority | Future category | Candidate symbols | FMP coverage note |
|---|---|---|---|
| 1 | `FACTOR_INVESTING` | QUAL, SPHQ, JQUA, MTUM, USMV, SPLV | Profile, EOD price/history, sector and country exposure available. Top holdings unavailable under current FMP plan. |
| 1 | `OPTION_INCOME` | JEPI, JEPQ, SPYI | Profile, EOD price/history, sector and country exposure available. Top holdings unavailable under current FMP plan. |
| 2 | `MID_CAP` | MDY, IJH, VO | TBD — confirm FMP profile, EOD price, and historical price availability before seeding. Most impactful gap for diversified US equity portfolios. |
| 3 | `ESG_SOCIALLY_RESPONSIBLE` | ESGU, ESGD, ESGE, SUSA | TBD — confirm FMP coverage. Growing segment; lower priority since most current ETF portfolios are not ESG-screened. |
| 3 | `MULTI_ASSET_BALANCED` | AOR, AOM, AOA | TBD — confirm FMP coverage. Niche use case; some investors use a single balanced ETF as their entire holding. |

Priority 1 categories (Factor Investing, Option Income) should be added in the next planned taxonomy expansion after confirming alpha visibility. Priority 2–3 categories should be confirmed for FMP coverage before committing to seeding.

**2026-06-17 correction — International Bond and TIPS removed from this table.**
Cross-check against the live active universe confirmed that BNDX and BNDW (international bond) and TIP and STIP (inflation-protected) are already present in the `BOND` category. A separate `INTERNATIONAL_BOND` or `TIPS_INFLATION_PROTECTED` category is not needed. The Bond category already covers: US aggregate (AGG, BND), US Treasury duration ladder (SHY, IEI, IEF, TLT, VGIT, GOVT), TIPS (TIP, STIP), international (BNDX, BNDW), investment grade corporate (LQD, VCIT), and high yield (HYG, JNK).

## Remaining Follow-Ups

These are not blockers for completing the Instrument Taxonomy Audit, but they should be handled in related audits:

1. Data Provider Audit: add a formal full-universe provider coverage matrix.
2. ETF Holdings Data Audit: document which ETFs have live top holdings, seeded fallback holdings, or only sector/country exposure.
3. Feature Flags/Product Modes Audit: decide whether alpha needs a separate `is_user_selectable` field.
4. Data Freshness UX Audit: decide whether a formal `coverage_status` column is useful, or whether freshness diagnostics are sufficient.

## Conclusion

The Instrument Taxonomy Audit is complete for the current commercialization checkpoint.

The current active universe has the intended 201 ETF-style products and 105 stocks, no active duplicates, no missing active ETF categories, no missing active asset categories, and no missing normalized stock sectors.
