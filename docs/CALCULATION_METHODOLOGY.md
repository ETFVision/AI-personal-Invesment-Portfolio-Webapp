# Calculation Methodology

Last updated: 2026-06-11 20:11:07 +08:00

## Market Data Source of Truth

Raw instrument price history is stored in `instrument_prices`. Derived tables are refreshed from this source, not calculated ad hoc on pages.

## Instrument Daily Returns

Implemented in `supabase/migrations/075_precompute_instrument_daily_returns.sql`.

For each instrument and price date:

- `previous_close_price` = prior available close.
- `five_day_close_price` = close from five trading observations earlier.
- `daily_return` = `close_price / previous_close_price - 1`.
- `weekly_return` = `close_price / five_day_close_price - 1`.

Rows are keyed by `(instrument_id, price_date)`.

## Return Anchors

Implemented in `supabase/migrations/077_precompute_instrument_return_anchors.sql`.

For each instrument:

- Latest price and as-of date.
- Previous close and previous price date.
- Daily return.
- YTD baseline price.
- 1Y/3Y/5Y baseline prices.
- 52-week low/high.
- Observation count and history date range.

These anchors are used to speed up `instrument_market_metrics`.

## Instrument Market Metrics

Stored in `instrument_market_metrics`.

Current intent:

- Pull latest price, prior close, return baselines, and 52-week range from `instrument_return_anchors`.
- Calculate display returns such as daily, YTD, 1Y, 3Y, and 5Y where anchors exist.
- Store a single current row per instrument for page reads.

Documentation gap: verify the exact latest market metric SQL in migrations `076`, `078`, `079`, `080`, and repository/service code if formula-level precision is required.

## Instrument Risk Metrics

Stored in `instrument_risk_metrics`.

Risk metrics are based on precomputed daily returns and include:

- 30D/90D/1Y annualized volatility using `stddev_samp(daily_return) * sqrt(252)`.
- Downside volatility.
- Current drawdown.
- Max drawdown.
- Drawdown duration.
- Drawdown bucket.
- Negative return frequency.
- Worst daily return.
- Worst weekly return.
- Risk bucket and risk score.

Important QA rule: daily returns must be decimal returns, not percentage values. A value like `70,857.73%` volatility indicates a return-scale issue and should trigger data QA.

## Holdings Metrics

Holdings and portfolio calculations differ from universe/watchlist metrics:

- Universe/watchlist returns are historical instrument returns.
- Holding returns are position-specific and use transaction cost basis/inception context.
- Holding metrics are stored in `holding_market_metrics`.
- Portfolio current metrics are stored in `portfolio_current_metrics`.

## Portfolio Performance

Portfolio performance should use flow-aware methodology where implemented. Recent risk page snapshot work moved toward TWR-based portfolio risk/performance context.

Documentation gap: exact TWR formula and all cash-flow treatment should be verified in `PerformanceService.ts`, `AnalyticsService.ts`, and relevant Supabase functions before external/commercial claims.

## Portfolio Summaries

`portfolio_performance_summary` caches:

- Performance series JSON.
- Benchmark comparison JSON.
- As-of and latest price dates.

`portfolio_dashboard_summary` caches:

- Dashboard JSON used by `/portfolio`, `/holdings`, and `/cash`.

## Benchmark Metrics

Benchmarks are refreshed separately. Recent benchmark data is refreshed daily; long history is handled by market history backfill.

## Display Units

Internal returns and volatility should be decimals. UI formatting converts to percentages. The app should avoid mixing decimal and percent-scale numbers in storage.

## Score Methodology Reference

Formula-level scoring details are documented in [Score Methodology](SCORE_METHODOLOGY.md), including:

- Fundamentals score.
- Fundamental trend score.
- Instrument risk score.
- Portfolio risk and diversification scores.
- Recommendation score and confidence.
- Portfolio Review section scores.
- Macro/FRED trend and theme scores.
