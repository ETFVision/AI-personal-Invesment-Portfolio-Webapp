# Telemetry Learning Layer

## Purpose

Telemetry V1 is an observational learning layer. It records what the app believed at decision time, then evaluates later outcomes across fixed horizons.

It does not:

- change recommendation scoring weights
- change portfolio review logic
- create buy/sell instructions
- use AI to make investment decisions
- auto-apply learned adjustments

## Current Scope

Telemetry V1 tracks:

- Recommendation snapshots
- Recommendation outcomes versus a benchmark
- Factor outcome aggregation
- Market Vision theme snapshots
- Portfolio Review score and suggestion snapshots

Evaluation horizons:

- 1 month
- 3 months
- 6 months
- 12 months

## Capture And Evaluation Cadence

Telemetry has two separate cadences:

- Snapshot capture happens when the source intelligence job runs.
- Outcome evaluation happens when a stored snapshot reaches a fixed maturity horizon.

Current snapshot capture cadence:

- Recommendation snapshots are captured during the weekly recommendation run.
- Market Vision snapshots are captured during weekly Market Vision generation.
- Portfolio Review snapshots are captured during the weekly Portfolio Review run.

The telemetry evaluation job currently runs weekly after the Portfolio Review job. This does not create a weekly evaluation horizon. It checks whether any stored observations have reached their `1m`, `3m`, `6m`, or `12m` maturity date and evaluates only those ready observations.

Manual telemetry evaluation from Admin > Jobs uses the same maturity rules.

## Database Tables

Migration:

- `supabase/migrations/054_telemetry_learning_layer.sql`

Tables:

- `telemetry_recommendation_snapshots`
- `telemetry_recommendation_outcomes`
- `telemetry_factor_outcomes`
- `telemetry_market_vision_snapshots`
- `telemetry_market_vision_outcomes`
- `telemetry_portfolio_review_snapshots`
- `telemetry_portfolio_review_outcomes`

Snapshot tables are append-only by design. Outcome and aggregate tables are upserted as evaluations mature.

## Recommendation Telemetry

At recommendation run time, the app captures:

- portfolio and user context
- instrument id and symbol
- recommendation label
- recommendation score
- confidence score
- benchmark symbol
- price at recommendation
- positive and negative drivers
- scoring components
- guardrails
- factor inputs

Outcome evaluation calculates:

```text
asset_return = end_price / start_price - 1
benchmark_return = benchmark_end / benchmark_start - 1
excess_return = asset_return - benchmark_return
```

Success logic:

- `Buy` / `Strong Buy`: successful when excess return is positive
- `Reduce` / `Sell`: successful when excess return is negative
- `Hold`: successful when excess return is within a narrow range or absolute return remains controlled
- `Watch`: successful when the item does not outperform or remains weak

Rows with missing asset prices are marked `insufficient_data`.
Rows with missing benchmark prices are marked `benchmark_missing`.

## Factor Aggregation

Telemetry groups evaluated outcomes by factor bucket and horizon.

Examples:

- `fundamentals = strong`
- `valuation = weak`
- `risk = mixed`
- `market_vision_alignment = strong`
- `recommendation_label = Buy`

Each aggregate stores:

- observation count
- hit rate
- average asset return
- average benchmark return
- average excess return
- evidence bucket

Evidence buckets:

- fewer than 10 observations: `insufficient_evidence`
- 10 to 29 observations: `early_signal`
- 30 to 99 observations: `moderate_evidence`
- 100 or more observations: `stronger_evidence`

## Market Vision Telemetry

When a Market Vision report is generated, the app captures theme snapshots for:

- Equities
- Bonds
- Gold / Commodities
- Crypto
- Rates
- Inflation
- Growth
- Currency
- Geopolitical

Each snapshot stores a deterministic directional proxy:

- `bullish`
- `neutral`
- `bearish`
- `mixed`

This is currently prepared for future outcome evaluation. It is not yet used to tune Market Vision generation or recommendations.

V1.5 evaluates matured Market Vision snapshots at 1m, 3m, 6m and 12m. The weekly evaluation job only processes Market Vision snapshots whose horizon has matured.

Evaluation uses a deterministic theme-to-proxy mapping. Examples:

- Technology -> `XLK`
- Healthcare -> `XLV`
- Financials -> `XLF`
- Energy -> `XLE`
- Semiconductors -> `SMH`
- Gold / Commodities -> `GLD`
- Rates / Bonds / Credit -> `AGG`
- Inflation -> `TIP`
- International -> `VXUS`
- Emerging Markets -> `VWO`
- Broad Market / Equities -> `VOO`

Formula:

```text
proxy_return = proxy_end_price / proxy_start_price - 1
benchmark_return = benchmark_end / benchmark_start - 1
excess_return = proxy_return - benchmark_return
```

Success logic:

- `bullish`: successful when proxy excess return is positive
- `bearish`: successful when proxy excess return is negative
- `neutral`: successful when excess return stays within a neutral band
- `mixed`: successful when the realized move is not materially adverse

## Portfolio Review Telemetry

When Portfolio Review runs, the app captures:

- portfolio score
- diversification score
- concentration score
- risk score
- fixed income score
- macro fit score
- theme exposure summary
- top risks
- improvement suggestions
- allocation snapshot
- ETF look-through snapshot

This supports future longitudinal review of whether suggestions and risk warnings were useful.

V1.5 evaluates matured Portfolio Review snapshots by comparing the old review snapshot with a later review snapshot for the same portfolio. The weekly evaluation job only processes Portfolio Review snapshots whose horizon has matured.

Stored outcome metrics:

- portfolio return
- benchmark return
- excess return
- portfolio score change
- diversification score change
- concentration score change
- risk score change
- volatility change, when captured
- drawdown change, when captured
- effectiveness classification

Effectiveness classification:

- `effective`: a material score improvement is observed
- `neutral`: changes are small or mixed
- `deteriorated`: a material score deterioration is observed

Portfolio Review telemetry is observational. It does not assume the user acted on a suggestion.

## Confidence Calibration

V1.5 groups evaluated recommendation outcomes into confidence buckets:

- `0-49`
- `50-59`
- `60-69`
- `70-79`
- `80-89`
- `90+`

For each bucket and horizon, telemetry shows:

- observation count
- hit rate
- average excess return

This is intended for future Recommendation Engine calibration review.

## Coverage Metrics

V1.5 tracks telemetry completeness:

```text
coverage = evaluated matured observations / total matured observations
```

Coverage is shown separately for:

- recommendations
- Market Vision
- Portfolio Review

Missing data and missing benchmark outcome counts are also surfaced.

## Services

Core services:

- `TelemetrySnapshotService`
- `TelemetryEvaluationService`
- `TelemetryAggregationService`
- `TelemetryDashboardService`

Repository:

- `TelemetryRepository`
- `SupabaseTelemetryRepository`

Job:

- `TelemetryEvaluationJob`

Protected route:

- `/api/jobs/telemetry-evaluation`

The route uses the same `CRON_SECRET` protection as other scheduled jobs.

## UI

Page:

- `/telemetry`

Navigation:

- `Research -> Telemetry`

Dashboard sections:

- overview metrics
- recommendation outcomes by label and horizon
- coverage metrics
- confidence calibration
- factor best/worst leaderboards
- Market Vision accuracy
- Portfolio Review effectiveness

## Future Improvements

Future phases can add:

- Market Vision outcome evaluation against proxies
- Portfolio Review outcome evaluation against portfolio snapshots
- recommendation calibration reports
- suggested weight changes requiring human approval
- telemetry-aware confidence calibration
- user feedback tracking

Any future weight changes should remain manual-review first.
