# ETFVision Instrument Taxonomy And Alpha Universe

## Purpose

The Alpha instrument universe is now represented by ETFVision-owned taxonomy fields instead of raw provider categories.

## Source Of Truth

- ETF universe: 215 approved ETF-style products in `src/domain/universe/alphaUniverse.ts`
- Stock universe: 105 approved stocks in `src/domain/universe/alphaUniverse.ts`
- Crypto references: BTC, ETH and SOL are active raw crypto references for the Crypto universe. Crypto ETF proxies remain ETF-style products.
- Provider categories from FMP remain raw metadata and are not the product taxonomy source of truth.

## Taxonomy Fields

- `asset_category`: high-level calculation/listing category such as `EQUITY`, `BOND`, `COMMODITY`, `REAL_ESTATE`, `CASH`, `CRYPTO`, `MULTI_ASSET`, `UNKNOWN`.
- `etf_category`: ETF product category such as `US_BROAD_MARKET`, `GLOBAL_EQUITY`, `TECHNOLOGY`, `BOND`, `CASH_EQUIVALENT`, `GOLD_PRECIOUS_METALS`, or `CRYPTO_ETF`.
- `sector` / `canonical_sector`: stock sector taxonomy and broad instrument classification.

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
- Clean Energy: `ICLN`, `TAN`, `QCLN`, `PBW`

These can be swapped in `alphaUniverse.ts` without changing schema or page logic.
