# Instrument Taxonomy and Coverage

Last updated: 2026-06-12 22:55:00 +08:00

Audit status: completed for the current commercialization checkpoint. See `docs/INSTRUMENT_TAXONOMY_AUDIT.md`.

## Taxonomy Layers

ETFVision uses separate taxonomy concepts:

| Concept | Purpose | Examples |
|---|---|---|
| `asset_category` | Broad calculation asset class. | `EQUITY`, `BOND`, `COMMODITY`, `REAL_ESTATE`, `CASH`, `CRYPTO`, `UNKNOWN` |
| `instrument_type` / resolver | UI and recommendation type handling. | stock, ETF, bond ETF, crypto proxy, cash-like ETF |
| `etf_category` | ETF product classification only. | `US_BROAD_MARKET`, `GLOBAL_EQUITY`, `TECHNOLOGY`, `BOND`, `GOLD_PRECIOUS_METALS` |
| `canonical_sector` | Stock/sector exposure classification. | `Technology`, `Healthcare`, `Financials` |
| `canonical_themes` | Theme intelligence and recommendation alignment. | `AI`, `Quality`, `Global Diversification` |

## Critical Rule

Do not use `etf_category` for portfolio sector allocation.

Portfolio sector allocation priority:

1. ETF holdings look-through sector aggregation, if available.
2. FMP ETF sector breakdown, if holdings look-through is unavailable.
3. ETF category fallback only if no sector exposure exists; mark as estimated/limited.

Example: VOO can be categorized as `US_BROAD_MARKET` as an ETF product, but its sector allocation should reflect underlying exposure across Technology, Financials, Healthcare, Industrials, and other sectors.

## Current Universe Target

The most recent taxonomy work targets (after the 2026-06-23 universe expansion, +31 ETFs / +54 stocks):

- 232 ETF-style products.
- 159 stocks.
- Raw crypto references remain inactive for now.

Documentation note: verify live production counts using Supabase because inactive/deprecated instruments can remain in the table for history, while active universe counts are what product pages should show.

Latest live Supabase verification on 2026-06-23 (post-expansion):

- 391 active instruments.
- 232 active ETF-style products: 202 `etf` + 27 `bond_etf` + 3 `gold_etf` (by `asset_class`).
- 159 active stocks.
- 0 active duplicate symbols.
- 0 active ETFs missing `etf_category`.
- 0 active stocks missing `canonical_sector`.
- 0 active instruments missing `asset_category`.

Prior verification on 2026-06-12 (pre-expansion): 306 active = 201 ETF-style (196 `etf` + 5 `crypto_etf`) + 105 stocks.

## Instrument Coverage Layers

Coverage should be checked separately:

| Coverage layer | Table/source | Why it matters |
|---|---|---|
| Metadata | `instruments` fields and metadata refresh logs | UI names, taxonomy, categorization. |
| Prices | `instrument_prices` | Raw source for returns and risk. |
| Daily returns | `instrument_daily_returns` | Faster risk/market metric refresh. |
| Return anchors | `instrument_return_anchors` | Faster page-facing return metrics. |
| Market metrics | `instrument_market_metrics` | Universe/watchlist/instrument detail display. |
| Risk metrics | `instrument_risk_metrics` | Instrument detail risk and recommendation risk score. |
| Fundamentals | company/fundamentals tables | Stock scoring and fundamentals pages. |
| ETF exposure | ETF exposure tables | Portfolio exposure, review, assistant context. |

## Active vs Inactive Instruments

The app may keep inactive instruments in Supabase for history or provider limitations. UI lists and scheduled refreshes should filter to active instruments where appropriate. Raw crypto references are intentionally inactive unless a future phase enables them.

## Known Taxonomy Risks

- Some non-US or UCITS ETFs have limited FMP support and may be inactive or excluded.
- Some ETFs do not expose top holdings through FMP; sector/country allocation may still be usable.
- Ticker changes or provider alias issues should be handled by migration or metadata mapping, as with SPLG to SPYM.
- Stock sectors should follow the canonical sector map, not provider free-text labels.
