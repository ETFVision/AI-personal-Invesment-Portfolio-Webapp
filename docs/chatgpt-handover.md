# ChatGPT Handover Document

Last updated: 2026-06-15

This document is written for a new ChatGPT conversation. It explains the current state, architecture, recent changes, and recommended next steps for the personal investment portfolio web app. It intentionally avoids local coding-agent instructions and focuses on product, architecture, QA, and operating context.

## Project Overview

The app is a personal investment portfolio web app designed to combine portfolio tracking, market data, risk analytics, fundamentals, news intelligence, Market Vision briefings, deterministic recommendations, and portfolio review.

The app is designed around these principles:

- Portfolio data should be manually controllable by the user.
- Market data should be fetched server-side.
- Calculations should be deterministic and auditable.
- AI may summarize and explain, but should not make autonomous buy/sell decisions.
- UI should consume service outputs and should not directly call databases or providers.
- Derived data should be stored where possible to keep pages fast and consistent.

## Current Implemented Layers

Implemented or substantially built:

- Authentication
- Portfolio setup
- Holdings, transactions, and cash
- Instrument Universe
- Watchlist
- FMP price integration
- FMP metadata integration
- Portfolio analytics
- Benchmark comparison
- Risk Analytics
- Bond / Fixed Income Intelligence
- Market Vision
- News Intelligence
- FRED macro indicators
- Fundamentals
- Fundamental Trends
- Recommendation Engine V1
- Portfolio Review Engine
- Compliance disclaimers and public methodology page
- Scheduled data refreshes

## Latest Compliance And Methodology Addendum

Recent updates after the prior QA checkpoint:

- User-facing Insights labels now use neutral Characteristics Score assessment labels: Excellent, Good, Neutral, Weak, Poor, Significant Concerns, Insufficient Data, and Not Applicable.
- First-login disclaimer acknowledgement, sticky footer disclaimer, read-only full disclaimer modal, and export/report disclaimer helper are implemented.
- `/methodology` is a public static page explaining Characteristics Score, Fundamentals Score, Confidence, Guardrails, Portfolio Score, Risk Analytics, Gap Analysis, Market Vision inputs, and limitations.
- `/legal/disclosures` exists as a public legal-disclosures placeholder.
- Dense formula-level methodology tables remain available for transparency but are collapsed behind accordions by default for non-technical readability.
- Portfolio Review gap analysis is now framed as deterministic underweighted-category screening, not as a suggestion or action engine.

## Current Data Providers

### FMP

Used for:

- Instrument prices
- Historical prices
- Instrument metadata
- Fundamentals
- Company profiles
- Financial statements
- Ratios and key metrics
- ETF exposure where available
- FMP news

### FRED

Used for:

- Macro indicators
- Rates
- Inflation
- Growth
- Employment
- Liquidity
- Currency/dollar context
- Commodity macro signals

### NewsData.io

Used for:

- Macro and world-news ingestion
- Same general query group concept as GDELT
- Automated news refreshes

### GDELT

Used for:

- Manual macro/world-news fallback only

Not automated because public GDELT endpoints have unstable rate-limit behavior.

### OpenAI

Used for:

- Market Vision narrative generation

Not used for:

- Buy/sell decisions
- Recommendation scoring
- Trade execution

## Current Core Architecture

The app follows a service/repository style architecture.

High-level pattern:

```text
UI / Page
   -> Server action or protected route
   -> Application service / job
   -> Repository
   -> Supabase tables
```

External providers should be called only from server-side provider/services.

The UI should not directly call:

- Supabase
- FMP
- FRED
- NewsData.io
- GDELT
- OpenAI

## Latest Important Architecture Change: Unified Price Refresh

Latest commit:

```text
392ce3d Unify portfolio price refresh with instrument metrics
```

### Previous Problem

There were two separate price refresh paths:

1. Portfolio asset prices
   - Table: `daily_prices`
   - Used by holdings, portfolio valuation, returns, snapshots, and risk

2. Instrument market prices
   - Tables: `instrument_prices`, `instrument_market_metrics`
   - Used by Universe, Watchlist, and Instrument Detail pages

This caused stale/mismatched data. For example, the portfolio price refresh could succeed, while Universe and Watchlist freshness still showed older data.

### New Price Flow

```text
Active Instrument Universe
        -> Master Instrument Price Refresh
        -> instrument_prices
        -> instrument_market_metrics
        -> Portfolio Price Sync
        -> daily_prices
        -> Portfolio Valuation / Holdings / Returns / Risk / Snapshots
```

### New Behavior

`/api/jobs/price-refresh` now:

1. Refreshes the master active instrument universe.
2. Updates `instrument_prices`.
3. Refreshes `instrument_market_metrics`.
4. Syncs matching portfolio holdings from `instrument_market_metrics` into `daily_prices`.

The separate `/api/jobs/instrument-price-refresh` endpoint still exists for manual universe/watchlist catch-up, but daily automation no longer calls it separately.

### Why This Matters

This makes the master instrument universe the source of truth for prices. Portfolio calculations now consume the same derived latest-price layer used by Universe, Watchlist, and Instrument Detail pages.

Benefits:

- Less price drift
- Fewer duplicate provider calls
- More consistent freshness labels
- Portfolio remains a consumer of master instrument data
- Existing portfolio valuation and return formulas remain intact

## Price Tables

### `instrument_prices`

Raw historical instrument prices.

Used for:

- Instrument price history
- Risk calculations
- Derived latest instrument metrics
- Universe and Watchlist metrics
- Instrument Detail pages

### `instrument_market_metrics`

Compact derived latest instrument metrics.

Used for:

- Latest price
- Latest price date
- Daily return
- YTD return
- 1Y, 3Y, 5Y returns
- 52-week low/high
- Observation count
- Freshness

Now also used as the source for portfolio price sync.

### `daily_prices`

Portfolio asset price mirror.

Used for:

- Portfolio valuation
- Holding performance
- Portfolio snapshots
- Dashboard history
- Portfolio returns
- Portfolio risk inputs

Important:

`daily_prices` is now synced from `instrument_market_metrics` for matching portfolio holdings. It is no longer intended to be independently fetched from a smaller holdings-only provider call.

## Scheduled Refreshes

Automated refreshes are handled through protected app job endpoints.

### Daily Refresh

Schedule:

- Primary: 6:30 AM Singapore Time
- Backup: 7:15 AM Singapore Time

Order:

```text
1. /api/jobs/price-refresh
2. /api/jobs/portfolio-valuation-refresh
3. /api/jobs/fred-macro-ingestion
4. /api/jobs/daily-news-ingestion
5. /api/jobs/newsdata-news-ingestion
```

### Weekly Refresh

Schedule:

- Primary: Monday 8:00 AM Singapore Time
- Backup: Monday 8:45 AM Singapore Time

Order:

```text
1. /api/jobs/weekly-news-reconciliation
2. /api/jobs/weekly-market-vision
3. /api/jobs/recommendation-run
4. /api/jobs/portfolio-review-run
```

### Monthly Refresh

Schedule:

- Primary: First day of month, 8:30 AM Singapore Time
- Backup: First day of month, 9:15 AM Singapore Time

Order:

```text
1. /api/jobs/fundamentals-refresh
2. /api/jobs/etf-lookthrough-refresh
3. /api/jobs/benchmark-refresh
4. /api/jobs/universe-validation
```

## Job Environment Requirements

The deployed app needs:

```text
FMP_API_KEY
FRED_API_KEY
NEWSDATA_API_KEY
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
SCHEDULED_USER_ID
SCHEDULED_PORTFOLIO_ID
```

The scheduled workflow caller needs:

```text
APP_URL
CRON_SECRET
```

`CRON_SECRET` must match between the caller and the deployed app.

## Portfolio Holdings Changes

Changing portfolio holdings should not require code changes.

The system should automatically handle:

- Adding an existing stock
- Removing a holding
- Adding an existing ETF
- Changing quantities
- Changing cost basis
- Changing transaction history

Data/admin attention may be needed if:

- The symbol is missing from the instrument universe.
- The instrument is inactive.
- The provider symbol format is unusual.
- The asset class is not yet supported.

## Portfolio Valuation Refresh

`portfolio-valuation-refresh` runs after `price-refresh`.

Purpose:

- Calculates current holdings value.
- Includes cash.
- Stores portfolio snapshots.
- Stores holding snapshots.
- Stores cash snapshots.
- Updates allocation history.

Used by:

- Dashboard performance
- Portfolio return history
- Portfolio vs benchmark
- Risk analytics
- Portfolio Review
- Recommendation context

## Instrument Universe And Watchlist

Status:

- Functional and integrated.
- Supports active/inactive instruments.
- Supports canonical sectors and themes.
- Supports ETFs, stocks, bonds, gold, crypto, benchmarks, and watchlist tiers.

Taxonomy:

- Raw provider metadata is stored.
- Canonical sectors/themes are used for intelligence.
- Manual taxonomy overrides should be preserved.

## Portfolio Returns And Benchmarks

Status:

- Major return accuracy bugs were addressed.
- Deposits and withdrawals should not be counted as gains/losses.
- Holding returns should respect purchase-date baselines.
- Benchmark returns should align to comparable date windows.

Important:

- Portfolio return methodology should remain clearly labeled.
- Formula changes should always be QA-tested.

## Risk Analytics

Status:

- Portfolio and instrument risk analytics are implemented.

Includes:

- 30-day volatility
- 90-day volatility
- 1-year volatility
- Annualized volatility using sqrt(252)
- Drawdowns
- Concentration
- Correlation
- Diversification score
- Covariance-based risk contribution
- Instrument-level risk metrics

Instrument risk section should avoid redundant return metrics because returns already appear in Performance.

## Bond / Fixed Income Intelligence

Status:

- Built for bond ETFs only.
- Individual bonds are not supported yet.

Classifications:

- Duration category
- Bond type
- Credit quality
- Geography
- Currency
- Inflation-linked status
- Recession hedge role
- Liquidity/stability role
- Rate sensitivity
- Inflation sensitivity
- Recession sensitivity

## News Intelligence

Status:

- Built as an input layer for Market Vision, future scoring, and future telemetry.

Capabilities:

- Provider abstraction
- FMP news ingestion
- NewsData.io ingestion
- Manual GDELT ingestion
- Deduplication
- Instrument linking
- Source quality scoring
- Asset-class classification
- Theme classification
- Weekly reconciliation

Important:

- News Intelligence does not make recommendations.
- GDELT should remain manual unless rate limits are solved.
- NewsData.io is the preferred automated macro/world-news provider.

## FRED Macro Layer

Status:

- Working and integrated into Market Vision and theme intelligence.

Macro themes include:

- Rates
- Inflation
- Growth
- Employment
- Currency
- Liquidity
- Commodities

Known improvement:

- Recommendation macro-fit scoring is still too neutral for many ETFs and should be expanded later.

## Market Vision

Status:

- Can generate weekly CIO-style reports.

Inputs:

- Weekly news reconciliation
- Theme intelligence
- FRED macro indicators
- Portfolio context
- Risk analytics
- Fixed income context

Important:

- Market Vision should not make buy/sell recommendations.
- It may describe risks, opportunities, and portfolio implications.

## Fundamentals

Status:

- Built for stocks.
- Uses FMP fundamentals and derived calculations.

Includes:

- Company profile
- Financial statements
- Ratios
- Key metrics
- Fundamental scores
- Fundamental trends

Trend basis:

- Short-term: YoY quarterly
- Long-term: Annual

Known improvement:

- Add sector-relative scoring and financial-sector-specific scoring before making fundamentals too dominant in recommendations.

## Recommendation Engine V1

Status:

- Deterministic.
- Non-AI.
- Recommendation history is stored.

Inputs:

- Fundamentals
- Fundamental trends
- Valuation
- Risk
- Portfolio fit
- Theme alignment
- Market Vision alignment
- Macro fit
- Guardrails

Important:

- OpenAI should not make recommendation decisions.
- Market Vision alignment is one component, not an override.
- Guardrails should remain auditable.

## Portfolio Review Engine

Status:

- Built as a deterministic review layer.

Includes:

- Allocation review
- Concentration review
- Risk review
- Macro review
- Theme exposure review
- Fixed income review
- Insight alignment
- Gap analysis findings
- Analytical gap summary
- ETF look-through exposure
- Direct and indirect holdings exposure

Important:

- Gap findings are deterministic analytical outputs, not trade instructions.
- Candidate explanations should explain why an instrument appeared in an underweighted category and should include the relevant disclaimer context.

## ETF Look-Through Exposure

Used by:

- Dashboard sector/geography charts
- Portfolio Review
- Indirect holding exposure
- Candidate diversification logic

Notes:

- FMP provides some ETF sector/country data.
- FMP top-holding coverage can be incomplete.
- Seeded fallback top holdings exist for core ETFs where live data is missing.

## Current QA Status

Latest checks after unified price refresh:

```text
Typecheck: passed
Lint: passed
Tests: passed, 170 tests
Build: passed
```

Current production-readiness assessment:

- Ready for controlled deployment and scheduled refresh verification.
- No critical blocker currently recorded.
- Next practical QA should verify deployed refresh behavior after the latest commit.

## Immediate Next Steps

1. Wait for deployment of commit `392ce3d`.
2. Run Daily Data Refresh manually.
3. Check job logs for:
   - `masterInstrumentRefresh`
   - `portfolioPriceSync`
4. Verify Universe and Watchlist freshness.
5. Verify Holdings latest prices.
6. Verify Portfolio valuation snapshot.
7. Check Dashboard performance and Portfolio Review after refresh.

## Future Improvements

### Data Refresh

- Add trading-day-aware freshness labels.
- Add warnings for holdings that do not map to active instruments.
- Add provider health dashboard.
- Improve scheduled job summaries and data quality indicators.

### Recommendations

- Continue calibration QA.
- Improve macro fit for ETFs.
- Improve confidence score differentiation.
- Improve neutral-score wording.

### Portfolio Review

- Add before/after diversification simulation.
- Improve gap-finding explanations further.
- Add stale-age indicators for ETF exposure.
- Add provider-quality badges.

### News And Market Vision

- Improve source quality review tools.
- Improve evidence/citation display in Market Vision.
- Add better low-confidence classification review workflow.

### Fundamentals

- Add sector-relative scoring.
- Add financial-sector-specific logic.
- Add more sparse-history QA fixtures.

## Important Guardrails

Future work should preserve these rules:

- Do not let AI make buy/sell recommendations.
- Do not call providers directly from UI.
- Do not duplicate price refresh paths.
- Do not overwrite manual taxonomy overrides.
- Do not overwrite manual bond classifications.
- Do not change return formulas without targeted QA.
- Do not automate GDELT unless rate-limit reliability is solved.
- Keep calculations deterministic and auditable.

## Suggested First Message For A New ChatGPT Conversation

```text
I am continuing work on my AI personal investment portfolio web app.

Please use the attached handover and QA checkpoint documents as the source of truth.

Current priority:
Verify and harden the deployed unified price refresh architecture.

Important context:
- Master instrument prices should be the source of truth.
- Portfolio asset prices sync from instrument_market_metrics into daily_prices.
- Portfolio valuation runs after price refresh.
- Do not change metadata, taxonomy, return formulas, fundamentals, risk, recommendations, or portfolio review unless specifically requested.
- AI must not make buy/sell recommendations.

First task:
Help me verify the deployed Daily Data Refresh behavior and diagnose any stale freshness or price mismatch issues.
```
