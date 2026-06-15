# QA Checkpoint For ChatGPT Handoff

Last updated: 2026-06-15

This document is a compact checkpoint for continuing QA in a new ChatGPT conversation. It summarizes completed QA layers, current production readiness, unresolved low-priority improvements, and the latest architecture hardening work.

## Current App Status

The app is a personal investment portfolio web app with these major layers implemented:

- Authentication and manual portfolio setup
- Holdings, transactions, cash balances
- Instrument Universe and Watchlist
- FMP price and metadata integration
- Portfolio analytics and benchmark comparisons
- Risk Analytics
- Bond / Fixed Income Intelligence
- Market Vision
- News Intelligence using FMP, NewsData.io, and manual GDELT
- FRED macro indicators
- Fundamentals and Fundamental Trends
- Recommendation Engine V1
- Portfolio Review Engine
- Compliance disclaimers and public methodology page
- Scheduled data refreshes using protected job endpoints

## Current Overall Readiness

Current assessment:

- Ready for controlled use and continued hardening.
- Core architecture is service/repository based.
- UI should not call Supabase, FMP, FRED, NewsData.io, GDELT, or OpenAI directly.
- AI is allowed for Market Vision narrative generation, but not for buy/sell decisions.
- Recommendation Engine V1 is deterministic and should remain non-AI unless explicitly redesigned.

## Latest QA-Relevant Architecture Change

Latest compliance/methodology update:

- First-login disclaimer acknowledgement, sticky footer disclaimer, full disclaimer modal, export/report disclaimer helper, public `/methodology`, and `/legal/disclosures` placeholder are implemented.
- `/methodology` uses neutral public assessment labels and keeps dense formula tables behind accordions for readability.
- Portfolio Review gap analysis language is reframed as deterministic underweighted-category screening.
- Validation for the latest methodology readability pass: typecheck, lint, and build passed.

Earlier price-refresh checkpoint:

Latest commit:

```text
392ce3d Unify portfolio price refresh with instrument metrics
```

Reason:

The app previously had two price paths:

- Portfolio asset prices in `daily_prices`
- Instrument market prices in `instrument_prices` and `instrument_market_metrics`

This created drift between Holdings/Portfolio and Universe/Watchlist freshness.

New flow:

```text
Active Instrument Universe
        -> Master Instrument Price Refresh
        -> instrument_prices
        -> instrument_market_metrics
        -> Portfolio Price Sync
        -> daily_prices
        -> Portfolio Valuation / Holdings / Returns / Risk / Snapshots
```

QA result:

- Typecheck passed.
- Lint passed.
- Full test suite passed: 170 tests.
- Production build passed.
- No database migration was required.

What to verify after deployment:

- Run Daily Data Refresh manually once.
- Confirm `/api/jobs/price-refresh` log includes both:
  - `masterInstrumentRefresh`
  - `portfolioPriceSync`
- Confirm Universe and Watchlist freshness update.
- Confirm Holdings prices match the same latest instrument prices.
- Confirm Portfolio valuation snapshot updates after `portfolio-valuation-refresh`.

## Layer QA Summary

### Instrument Universe And Watchlist

Status:

- Functional and integrated into later layers.
- Canonical taxonomy added for sectors/themes.
- Watchlist tiers and instrument metadata are usable.

Key completed QA items:

- Seeded universe imports were reviewed.
- ETF, bond, gold, cash, crypto, benchmark, and watchlist instruments were checked.
- Duplicate instrument issues were addressed.
- Metadata enrichment preserves raw provider response and manual taxonomy overrides.
- Taxonomy normalization was added so raw FMP sector/theme values are not used directly for intelligence logic.

Remaining low-priority improvements:

- Add stronger manual review workflow for unmapped provider taxonomy values.
- Add better provider/source badges for seeded versus enriched instruments.
- Continue checking stale metadata behavior after scheduled refreshes.

### Portfolio Returns And Benchmark Calculations

Status:

- Major return calculation issues were fixed.
- Portfolio returns were moved toward TWR-style cash-flow-aware methodology where applicable.
- Holdings return issues around purchase date baselines were corrected.
- Benchmark charts and portfolio chart normalization were improved.

Key completed QA items:

- Deposits and withdrawals should not be counted as investment gains/losses.
- Portfolio inception and YTD baselines were reviewed.
- Weekend/holiday benchmark date handling was reviewed.
- Percentage formatting and double multiplication bugs were checked.

Remaining low-priority improvements:

- Continue adding fixtures for cash-only portfolios, partial-history portfolios, and multi-currency portfolios.
- Add clearer UI labels explaining return methodology.
- Continue monitoring benchmark alignment after new benchmark history refreshes.

### Risk Analytics

Status:

- Ready as a deterministic portfolio and instrument risk layer.

Implemented:

- Volatility
- Drawdown
- Concentration
- Correlation
- Diversification score
- Covariance-based risk contribution
- Instrument-level risk metrics

Remaining low-priority improvements:

- Add more edge-case scenarios for cash-only, crypto-heavy, bond-heavy, and sparse-history portfolios.
- Improve period labels on risk metrics where useful.
- Add more visibility into data coverage for risk calculations.

### Bond / Fixed Income Intelligence

Status:

- Ready for bond ETF intelligence.
- Individual bonds are intentionally not supported yet.

Implemented:

- Duration category
- Bond type
- Credit quality
- Geography
- Currency
- Inflation-linked status
- Recession hedge role
- Liquidity/stability role
- Rate, inflation, and recession sensitivity labels

Remaining low-priority improvements:

- Add provider-quality badges for seeded versus provider-enriched bond profile data.
- Add more yield and duration fields if provider coverage improves.
- Continue treating FMP as enough for ETF-level use, but not enough for individual bond intelligence.

### Market Vision

Status:

- Market Vision can generate weekly CIO-style drafts.
- It uses structured inputs from news, themes, FRED macro, portfolio, risk, and fixed income.
- It should not generate buy/sell recommendations.

Remaining low-priority improvements:

- Improve source citation and evidence display.
- Add stronger validation for unsupported claims.
- Improve prompt guardrails around portfolio exposure language.
- Continue tracking OpenAI cost and token usage.

### News Intelligence

Status:

- Functional as a news ingestion, deduplication, classification, source-quality, and weekly reconciliation layer.

Providers:

- FMP for instrument/general market news
- NewsData.io for macro/world-news query groups
- GDELT manual fallback only

Key completed QA items:

- Duplicate handling preserves duplicates instead of deleting them.
- Source quality tiers were added.
- Theme classification now has asset-class and canonical theme dimensions.
- Weekly reconciliation filters noisy/low-quality articles.
- GDELT is not automated due to unstable public rate limits.

Remaining low-priority improvements:

- Add a provider health dashboard.
- Add manual source allow/deny lists.
- Add query tuning history for NewsData.io and GDELT.
- Add manual review queue actions for low-confidence classifications.
- Add source quality histograms.

### FRED Macro Layer

Status:

- FRED ingestion and macro trend services are working.
- FRED macro signals feed Market Vision and theme intelligence.
- Macro fit exists in Recommendation Engine, but ETF macro scoring is still too neutral for many ETFs.

Remaining low-priority improvements:

- Expand ETF macro-fit scoring by sector, geography, theme, and asset sensitivity.
- Add clearer UI wording when macro fit is neutral.
- Add direct macro component for gold ETFs if useful.

### Fundamentals And Fundamental Trends

Status:

- Fundamentals and trend layer are working.
- FMP fundamentals are stored and missing ratios can be derived from statements where possible.

Implemented:

- Company profiles
- Financial statements
- Ratios
- Key metrics
- Fundamental scores
- Growth, margin, profitability, balance sheet, and quality trends

Trend basis:

- Short-term trend: YoY quarterly
- Long-term trend: Annual

Remaining low-priority improvements:

- Add sector-relative scoring.
- Add financial-sector-specific scoring.
- Add clearer labeling for statement period and basis when needed.
- Add more fixtures for sparse financial history.

### Recommendation Engine V1

Status:

- Deterministic and non-AI.
- Uses fundamentals, trends, valuation, risk, portfolio fit, theme alignment, market vision alignment, and macro fit.
- Recommendation history is stored.

Important:

- AI should not make buy/sell recommendations.
- Market Vision is used as one alignment input, not as a decision-maker.

Remaining low-priority improvements:

- Continue calibration QA.
- Improve macro-fit differentiation.
- Improve confidence scoring spread.
- Improve component explanations where scores are neutral or weak.
- Keep guardrails deterministic and auditable.

### Portfolio Review Engine

Status:

- Ready as a deterministic portfolio review layer.
- Provides review sections, non-execution suggestions, ETF look-through, indirect holdings, and candidate rationale.

Implemented:

- Allocation review
- Concentration review
- Risk review
- Macro review
- Theme exposure review
- Fixed income review
- Insight alignment
- Gap analysis findings
- Analytical gap summary

Remaining low-priority improvements:

- Add before/after diversification simulation for gap findings if the feature remains product-appropriate.
- Add provider-quality badges for ETF exposure data.
- Add stale-age indicators for ETF exposure snapshots.
- Add more edge-case fixtures.
- Improve gap-finding explanation templates over time.

## Scheduled Refresh QA

Current daily order:

```text
1. /api/jobs/price-refresh
2. /api/jobs/portfolio-valuation-refresh
3. /api/jobs/fred-macro-ingestion
4. /api/jobs/daily-news-ingestion
5. /api/jobs/newsdata-news-ingestion
```

Current weekly order:

```text
1. /api/jobs/weekly-news-reconciliation
2. /api/jobs/weekly-market-vision
3. /api/jobs/recommendation-run
4. /api/jobs/portfolio-review-run
```

Current monthly order:

```text
1. /api/jobs/fundamentals-refresh
2. /api/jobs/etf-lookthrough-refresh
3. /api/jobs/benchmark-refresh
4. /api/jobs/universe-validation
```

Automated schedules:

- Daily primary: 6:30 AM Singapore Time
- Daily backup: 7:15 AM Singapore Time
- Weekly primary: Monday 8:00 AM Singapore Time
- Weekly backup: Monday 8:45 AM Singapore Time
- Monthly primary: First day of month, 8:30 AM Singapore Time
- Monthly backup: First day of month, 9:15 AM Singapore Time

Known checks:

- GitHub secrets must include `APP_URL` and `CRON_SECRET`.
- Vercel env must include `CRON_SECRET`, `SCHEDULED_USER_ID`, and `SCHEDULED_PORTFOLIO_ID`.
- Unauthorized browser requests to job endpoints should return 401.
- Jobs are logged in `job_runs`.
- Provider-specific logs remain in their own tables.

## Admin Data Sources / UI Cleanup QA

Latest branch reviewed:

- `codex/admin-data-source-cleanup`
- Commit: `48753e0 Centralize data source diagnostics in admin`

Status:

- Ready for Vercel preview approval before merge to `main`.

What changed:

- Centralized provider diagnostics, refresh controls, backfill controls, and report-generation operations under `Admin -> Data Sources`.
- Removed operational refresh buttons from product-facing pages.
- Removed the source diagnostics shortcut from `News & Themes`.
- Moved Market Vision draft-generation controls and latest weekly-news reconciliation operations to Admin.
- Reworked `News & Themes` so latest fetched news appears below filters, with a scrollable article list and external source links.
- Moved Market Vision macro/world-news input below Portfolio Implications and made source headlines clickable.
- Prior performance-loading branch is already merged into `main` and remains the base for this branch.

QA result:

- Critical issues: none.
- Medium-priority issues: none.
- Low-priority follow-up: consider tabs or accordions for `Admin -> Data Sources` if the page becomes too dense after production use.

Validation:

- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 171 tests.
- `npm.cmd run build` passed.

## Critical Open Issues

None currently recorded as blocking.

## Medium-Priority Open Issues

- Verify deployed unified price refresh behavior after Vercel deployment.
- Ensure portfolio valuation refresh always runs after successful price refresh.
- Continue monitoring NewsData.io quality and GDELT manual reliability.
- Continue recommendation calibration QA before changing scoring weights further.

## Low-Priority Backlog

- Trading-day-aware freshness labels instead of simple calendar age.
- Provider health dashboard.
- Manual taxonomy/news classification review workflows.
- Better ETF exposure data quality indicators.
- More portfolio review simulation tools.
- More explicit confidence/data coverage labeling.
- More fixtures for edge cases across risk, returns, fundamentals, and portfolio review.

## Guardrails For Future Work

- Do not add AI buy/sell recommendations.
- Do not let Market Vision directly override deterministic guardrails.
- Do not call providers directly from UI components.
- Do not duplicate price refresh paths again.
- Do not overwrite manual taxonomy or manual bond classifications.
- Do not change return formulas without targeted QA.
- Keep all business logic in service/repository layers.
