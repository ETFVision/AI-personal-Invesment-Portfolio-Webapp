# ETFVision Instrument Taxonomy And Alpha Universe

## Purpose

The Alpha instrument universe is now represented by ETFVision-owned taxonomy fields instead of raw provider categories.

## Source Of Truth

- ETF universe: 201 approved ETF-style products in `src/domain/universe/alphaUniverse.ts`
- Stock universe: 105 approved stocks in `src/domain/universe/alphaUniverse.ts`
- Crypto references: BTC, ETH and SOL remain inactive raw crypto references for now. Crypto ETF proxies remain active ETF-style products.
- Provider categories from FMP remain raw metadata and are not the product taxonomy source of truth.

## Taxonomy Fields

- `asset_category`: high-level calculation/listing category such as `EQUITY`, `BOND`, `COMMODITY`, `REAL_ESTATE`, `CASH`, `CRYPTO`, `MULTI_ASSET`, `UNKNOWN`.
- `etf_category`: ETF product category such as `US_BROAD_MARKET`, `GLOBAL_EQUITY`, `TECHNOLOGY`, `BOND`, `CASH_EQUIVALENT`, `GOLD_PRECIOUS_METALS`, or `CRYPTO_ETF`.
- `sector` / `canonical_sector`: stock sector taxonomy and broad instrument classification.
- `canonical_themes`: independent, additive theme tags (e.g. `AI / Automation`, `Quality`, `Defensive`, `Global Diversification`). Many-to-many and overlapping — not a sector.

## Canonical Sector And Theme Derivation (curated-authoritative)

As of 2026-06-19, `canonical_sector` and `canonical_themes` are derived **authoritatively from the curated alpha-universe maps**, taking precedence over provider (FMP) sector/industry for instruments in the universe. This is implemented in `TaxonomyService` and applies on metadata refresh.

- **ETF sector:** resolved from `ALPHA_ETF_CATEGORIES` (symbol → `EtfCategory`) via an explicit `EtfCategory → canonical_sector` mapping, **before** any provider raw-sector fallback. Sector categories map to their sector (e.g. `UTILITIES → Utilities`, `HEALTHCARE → Healthcare`, `FINANCIALS → Financials`); thematic-tech categories (`SEMICONDUCTOR`, `AI_ROBOTICS`, `CYBERSECURITY`, `CLOUD_COMPUTING`, `TECHNOLOGY`) collapse to `Technology`; genuinely broad / geo / style / single-country / dividend categories (`US_BROAD_MARKET`, `GLOBAL_EQUITY`, `DEVELOPED_MARKETS`, `EMERGING_MARKETS`, `COUNTRY`, `DIVIDEND`, `GROWTH`, `VALUE`, `SMALL_CAP`, `INTERNATIONAL_DIVIDEND`) map to `Multi-Asset / Broad Market`; asset-class categories map to their canonical bucket (`BOND → Bonds / Fixed Income`, `COMMODITY`/`GOLD_PRECIOUS_METALS → Commodities / Gold`, `CASH_EQUIVALENT → Cash / Money Market`, `CRYPTO_ETF → Crypto`).
- **Stock sector:** resolved from `ALPHA_STOCK_SECTORS` (symbol → sector) as the source of truth, before provider fallback (e.g. a provider mislabel cannot override `MSFT → Technology`).
- **Themes are independent of sector.** They come from curated per-category theme sets and seeded tags — never blanket-applied and never derived mechanically from the sector. `Global Diversification` is applied **only** to genuinely global/ex-US categories (`GLOBAL_EQUITY`, `DEVELOPED_MARKETS`, `EMERGING_MARKETS`, `COUNTRY`, `INTERNATIONAL_DIVIDEND`), not to US sector or US broad-market ETFs.
- **Sector is never inferred from a theme.** Classification consumers (e.g. Portfolio Review `candidateRole`) use sector + asset class + the curated category, not theme tags.
- **Backfill:** existing rows are re-normalized via the CRON-protected, override-respecting, idempotent taxonomy backfill at `/api/jobs/instrument-metadata-refresh?taxonomyBackfill=true` (`MetadataRefreshService.backfillCanonicalTaxonomy`). It skips `taxonomy_is_manual_override` rows. Because the derivation lives in shared `TaxonomyService`, scheduled metadata refreshes stay correct going forward.
- **Coverage caveat:** the curated maps cover the approved alpha universe (201 ETFs, 105 stocks). Any instrument outside those lists still falls back to provider sector and should be spot-checked.

See `docs/DATA_INGESTION_AND_PROVIDERS.md` and `docs/PORTFOLIO_REVIEW_METHODOLOGY.md` for consumer-side detail.

## Important Allocation Rule

Do not use `etf_category` for portfolio sector allocation.

Portfolio sector allocation must use:

1. ETF holding look-through sector aggregation, if available.
2. FMP ETF sector breakdown, if holding look-through is unavailable.
3. ETF category fallback only if no sector exposure exists, and the result must be treated as estimated or limited.

Example: VOO is classified as `US_BROAD_MARKET` as an ETF product, but portfolio sector charts should show its underlying Technology, Financials, Healthcare, and other sector exposures.

## UI Usage

- Universe and Watchlist top-level grouping uses `asset_category`.
- ETFs are subgrouped by `etf_category`.
- Stocks are subgrouped by canonical sector.
- Cash-equivalent ETFs are grouped under the Bond asset category with `CASH_EQUIVALENT` as the ETF product category.
- Crypto ETF proxies and raw crypto references are grouped under the Crypto asset category.
- Dashboard and Portfolio Review sector charts remain look-through exposure views, not ETF product-category views.

## Notes

The Infrastructure and Clean Energy categories were completed with liquid standard candidates:

- Infrastructure: `PAVE`, `IFRA`, `IGF`, `GRID`
- Clean Energy: `ICLN`, `QCLN`, `PBW`

These can be swapped in `alphaUniverse.ts` without changing schema or page logic.

Provider-limited / non-US listing ETFs removed from the active Alpha universe after market-history QA:

- `IWDA`, `VWRA`, `VGK`, `URTH`, `VEU`, `THNQ`, `TAN`
- `RHS`, `RGI`, `RYH`, `RYT`, `RYF`, `SLY`, `EWCO`, `IRBO`
