# Jobs and Operations

Last updated: 2026-06-23

## Scheduler

Production scheduling is handled by Supabase Cron. GitHub Actions workflows are retained only as manual fallback.

The authoritative schedule is `docs/scheduled-jobs.md`.

## Protected Endpoint Pattern

All protected job endpoints should use:

- `assertCronAuthorized` in `src/server/jobs/cronAuth.ts`.
- Authentication is via `Authorization: Bearer <CRON_SECRET>` header only. Query-parameter secrets (`?secret=`) are not accepted.
- `runCronJob` in `src/server/jobs/runCronJob.ts`.
- `CRON_SECRET`.
- `job_locks`.
- `job_runs`.

## Job Logging

`job_runs` stores:

- job name
- run source
- status
- start and completion timestamps
- duration
- summary
- error message
- metadata

Provider-specific tables store deeper diagnostics.

## Locking

`job_locks` prevents overlapping runs of the same job. If a lock exists and has not expired, the endpoint returns `skipped` with reason `job_already_running`.

## Current Daily Schedule Summary

Since migration `117` the daily chain is anchored to the US market close: it starts at `22:30` UTC (6:30 AM Singapore time) and cascades dependent derived layers at 5-minute intervals, finishing by `23:25` UTC (7:25 AM Singapore time):

1. Instrument prices (single end-of-day pass).
2. Daily returns.
3. Return anchors.
4. Market metrics.
5. Risk metrics (single full-universe pass, `batchSize=350`; previously two passes).
6. Metadata.
7. Benchmarks.
8. Portfolio valuation across all active portfolios.
9. Portfolio summary refresh across all active portfolios.
10. FRED macro.
11. FMP news.
12. NewsData.

Return anchors depend on `instrument_daily_returns`. Since migration `101`, `refresh_instrument_return_anchors()` no longer recomputes daily returns internally; it reads the precomputed daily-return table only. If the anchor job fails, first check that the daily-return job completed and that stale job locks are not blocking the next run.

## Weekly Schedule Summary

Weekly runs Sunday morning Singapore time and stays within Saturday UTC (`23:30` to `23:55`). Since migration `118`, fundamentals run as one bounded-concurrency pass (`FUNDAMENTALS_FETCH_CONCURRENCY=6`); since migration `123` `maxStocksPerRefresh` auto-sizes to the full active stock universe (roughly 159 stocks after the 2026-06-23 expansion):

1. Fundamentals refresh.
2. Weekly news reconciliation.
3. Market Vision.
4. Recommendations (universe-wide; optional portfolio context only).
5. Portfolio Review across all active portfolios.
6. Telemetry evaluation.

## Monthly Schedule Summary

Monthly runs on the first day of the month. Since migration `120` ETF look-through runs as one bounded-concurrency pass (`ETF_LOOKTHROUGH_FETCH_CONCURRENCY=6`); since migration `123` `maxEtfsPerRun` auto-sizes to the eligible-ETF count (roughly 194 eligible equity ETFs after the 2026-06-23 expansion):

1. ETF look-through refresh.
2. Universe validation.

## Deep History Maintenance

Adjusted close is retroactive: dividends, splits, and provider adjustments can rescale historical prices after the original daily bar was stored. The daily price cron appends the latest adjusted EOD bar, but it does not rebuild the full historical price series. The deep market-history backfill was unscheduled in migration `062`, so long-horizon adjusted history needs a planned manual maintenance cycle.

Run a quarterly manual deep market-history backfill, then force-recompute the derived layers that depend on price history:

```sql
select refresh_instrument_daily_returns(null, p_force_full => true);
select refresh_instrument_return_anchors(null);
select refresh_instrument_market_metrics_only(null);
select refresh_instrument_risk_metrics_only(null);
select refresh_instrument_risk_period_drawdowns_only(null);
```

After migration `133`, monitor the daily risk-cron runtime. The added 10Y/15Y/20Y display-only volatility and drawdown windows increase the risk refresh workload, and runtime should stay comfortably inside the job's lock and serverless limits.

## Operational QA Checks

Check these before relying on weekly outputs:

- Admin > Jobs has no recent failed required jobs.
- Instrument prices are fresh.
- Daily returns, anchors, market metrics, and risk metrics are fresh.
- Portfolio summary tables refreshed after valuation.
- NewsData and FMP news ingestion succeeded.
- FRED macro ingestion succeeded.
- Weekly Market Vision and recommendations ran after news/macro updates.

Portfolio valuation, portfolio summary, and Portfolio Review scheduled endpoints fan out across all active portfolios when no `portfolioId` query parameter is supplied. Explicit `portfolioId` runs still process a single portfolio. Sequential fan-out is acceptable for the alpha portfolio count; if active portfolios grow meaningfully, revisit batching or concurrency, especially for Portfolio Review and its 25-minute lock TTL.

## Cache Invalidation Pattern

Each scheduled job that produces data consumed by a shared cached page calls `revalidateTag()` inside an `onSuccess` callback on `runCronJob`. The callback is invoked only after a `success` or `partial_success` status is logged; failures in the callback are swallowed and do not affect the HTTP response.

Pattern:

```typescript
return runCronJob(
  request,
  { jobName: "...", lockTtlSeconds: ..., onSuccess: () => revalidateTag("tag-name") },
  () => container.jobs.someJob.run(...)
);
```

Cache tag to job mapping:

| Job endpoint | Cache tag invalidated |
|---|---|
| `instrument-price-refresh` | `market-data` |
| `instrument-daily-returns-refresh` | `market-data` |
| `instrument-return-anchors-refresh` | `market-data` |
| `instrument-market-metrics-refresh` | `market-data` |
| `instrument-risk-refresh` | `market-data` |
| `instrument-metadata-refresh` | `market-data` |
| `benchmark-refresh` | `market-data` |
| `etf-lookthrough-refresh` | `market-data` |
| `fred-macro-ingestion` | `macro-data` |
| `daily-news-ingestion` | `news-data` |
| `newsdata-news-ingestion` | `news-data` |
| `weekly-news-reconciliation` | `news-data` |
| `weekly-market-vision` | `market-vision-data` |
| `fundamentals-refresh` | `fundamentals-data` |

Pages that consume each tag:

| Cache tag | Pages cached |
|---|---|
| `market-data` | `/instruments/universe` |
| `macro-data` | `/macro`, `/market-vision` (MacroContextSection) |
| `news-data` | `/news`, `/market-vision` (theme intelligence and world-news support data) |
| `market-vision-data` | `/market-vision` (main report) |
| `fundamentals-data` | `/fundamentals` |

Manual cache flush: `POST /api/admin/revalidate` with header `x-admin-secret: <ADMIN_SECRET>` flushes all five tags at once. Requires the `ADMIN_SECRET` environment variable to be set in Vercel.

## Common Failure Modes

- Missing `CRON_SECRET`, `APP_URL`, or provider API key.
- Stale lock after HTTP timeout.
- FMP provider endpoint returning delayed or missing data for a symbol.
- GDELT 429 rate limits.
- Supabase statement timeout for large batch calculations.
