# Calculation Methodology

Last updated: 2026-06-11 20:34:49 +08:00

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
- Display-only 5Y/10Y/15Y/20Y annualized volatility using the same return-scale formula when sufficient history exists.
- Downside volatility — annualized standard deviation of *negative* daily returns only over the trailing 1Y, `stddev_samp(daily_return) filter (daily_return < 0) * sqrt(252)`. Isolates the dispersion of losing days from total volatility.
- Current drawdown — decline of the latest close from the running all-time peak of the price history; `0` at a fresh high.
- Volatility trend — direction of *near-term* volatility, comparing 30D vs 90D annualized vol: `rising` when `volatility_30d > volatility_90d * 1.15`, `falling` when `volatility_30d < volatility_90d * 0.85`, else `stable` (within ±15%). Short-term signal, display-only; not a long-horizon trend.
- Max drawdown over the available history and over fixed 1Y/3Y/5Y/10Y/15Y/20Y windows.
- Drawdown duration.
- Drawdown bucket.
- Negative return frequency.
- Worst daily return.
- Worst weekly return.
- Risk bucket and risk score.

The 5Y/10Y/15Y/20Y volatility and 10Y/15Y/20Y max-drawdown windows are display-only diagnostics. They do not feed `risk_score`, `risk_bucket`, `volatility_bucket`, confidence, recommendation scoring, guardrails, or label logic. Completeness gates mirror the shorter-window pattern: 5Y, 10Y, and 15Y require history within 30 days of the window start; 20Y allows 120 days because the FMP historical EOD feed is capped near 5,000 bars. As a result, 20Y long-horizon metrics reflect the deepest available history, roughly 19.85 years when the provider cap binds, and are labelled 20Y for presentation consistency.

Important QA rule: daily returns must be decimal returns, not percentage values. A value like `70,857.73%` volatility indicates a return-scale issue and should trigger data QA.

## Holdings Metrics

Holdings and portfolio calculations differ from universe/watchlist metrics:

- Universe/watchlist returns are historical instrument returns.
- Holding returns are position-specific and use transaction cost basis/inception context.
- Holding valuation anchors latest price and latest price date on `instrument_prices`, the price source of truth; `instrument_market_metrics` is used only for derived analytics such as previous close and 52-week range (ref gaps 47/48).
- Holding metrics are stored in `holding_market_metrics`.
- Portfolio current metrics are stored in `portfolio_current_metrics`.

## Portfolio Performance

Primary code:

- `src/application/services/PerformanceService.ts`
- `src/application/services/AnalyticsService.ts`
- `src/application/services/risk/riskMath.ts`

Portfolio performance uses a flow-aware, TWR-style methodology where portfolio snapshots are available. The goal is to measure portfolio return net of external deposits and withdrawals, while treating buys and sells as internal portfolio allocation decisions.

### Portfolio TWR Period Metric

For daily, weekly, monthly, 1Y and YTD metrics:

1. Find the nearest baseline portfolio snapshot on or before the target date. If none exists, the first snapshot after the target date can be used.
2. Collect transactions after the baseline date and up to the current date.
3. Treat external flows as:
   - `deposit_cash` = positive external flow.
   - `withdraw_cash` = negative external flow.
   - Buy, sell, dividend and fee transactions are not external portfolio flows for portfolio-level TWR.
4. Build a chronological snapshot series from the baseline snapshot to the latest current value.
5. For each subperiod:

`periodReturn = (currentTotalValue - netExternalFlow) / previousTotalValue - 1`

6. Chain subperiod returns:

`portfolioReturn = product(1 + periodReturn) - 1`

7. Value change is also shown:

`valueChange = currentTotalValue - baselineTotalValue - deposits + withdrawals`

### Manual Capital Base Override

`AnalyticsService.ts` includes a defensive override for portfolios where transaction history does not fully explain the current capital base. If a manual capital base is configured and recorded capital coverage is materially incomplete, portfolio performance metrics are calculated against the manual capital base:

`manualValueChange = currentTotalValue - manualCapitalBase`

`manualPercentChange = manualValueChange / manualCapitalBase`

This prevents misleading extreme returns when older deposits or cost basis were not fully entered into the transaction ledger.

### Since-Inception Portfolio Metric

If portfolio snapshots exist, since-inception uses the first snapshot as the baseline and the same TWR-style chain above.

If snapshots do not exist, the fallback denominator is:

`max(netRecordedCapital, investedAmount + cashAmount)`

where:

- `netRecordedCapital = deposits - withdrawals`
- `investedAmount + cashAmount` acts as a cost/capital fallback.

Fallback value change:

`currentTotalValue + withdrawals - denominator`

### Holding and Product Performance

Holding metrics are position-specific and are not the same as universe/watchlist historical returns.

For daily, weekly, monthly, 1Y and YTD holding periods:

- Baseline = nearest holding snapshot around the target date.
- Buys after baseline add to denominator.
- Sells after baseline reduce the needed value-change adjustment.
- Dividends/income add to return.
- Fees reduce return.

Formula:

`valueChange = currentMarketValue - baselineMarketValue - buys + sells + income - fees`

`denominator = baselineMarketValue + buys`

`holdingReturn = valueChange / denominator`

If the return is implausibly large for a no-trade period, the service can fall back to instrument price return for that period.

Since-inception holding metric:

`denominator = totalBuys`, or `quantity * averageCost` when total buys are unavailable.

`valueChange = currentMarketValue + sells + income - denominator`

### Cash Performance

Cash metrics are also flow-adjusted:

`valueChange = currentCashAmount - baselineCashAmount - deposits + withdrawals`

`denominator = baselineCashAmount + deposits`

Cash movements are therefore not confused with investment performance.

### Portfolio Risk Snapshot TWR

Risk analytics use the same external-flow logic to build portfolio daily returns:

`portfolioReturn = (currentTotalValue - netExternalFlow) / previousTotalValue - 1`

These returns are chained into a synthetic portfolio level series starting at 100 for volatility and drawdown analysis. This avoids treating deposits as positive investment performance or withdrawals as drawdowns.

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
- Portfolio risk and diversification scores. Diversification measures breadth and correlation; issuer concentration is measured separately in the Concentration section to avoid double-counting.
- Recommendation score and confidence.
- Portfolio Review section scores.
- Macro/FRED trend and theme scores.
