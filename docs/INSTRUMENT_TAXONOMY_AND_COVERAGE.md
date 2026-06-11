# Instrument Taxonomy and Coverage

Last updated: 2026-06-11 20:11:07 +08:00

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

The most recent taxonomy work targets:

- 201 ETFs.
- 105 stocks.
- Raw crypto references can remain inactive for now.

Documentation note: verify live production counts using Supabase because inactive/deprecated instruments can remain in the table for history, while active universe counts are what product pages should show.

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
