# Jobs and Operations

Last updated: 2026-06-13 14:58:29 +08:00

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

Daily starts around 5:20 AM Singapore time and runs dependent derived layers with wider spacing:

1. Five instrument price passes.
2. Daily returns.
3. Return anchors.
4. Market metrics.
5. Risk metrics.
6. Metadata.
7. Benchmarks.
8. Portfolio valuation.
9. Portfolio summary refresh.
10. FRED macro.
11. FMP news.
12. NewsData.

Return anchors depend on `instrument_daily_returns`. Since migration `101`, `refresh_instrument_return_anchors()` no longer recomputes daily returns internally; it reads the precomputed daily-return table only. If the anchor job fails, first check that the daily-return job completed and that stale job locks are not blocking the next run.

## Weekly Schedule Summary

Weekly runs Sunday morning after daily refresh:

1. Fundamentals passes.
2. Weekly news reconciliation.
3. Market Vision.
4. Recommendations.
5. Portfolio Review.
6. Telemetry evaluation.

## Monthly Schedule Summary

Monthly runs first day:

1. ETF look-through passes.
2. Universe validation.

## Operational QA Checks

Check these before relying on weekly outputs:

- Admin > Jobs has no recent failed required jobs.
- Instrument prices are fresh.
- Daily returns, anchors, market metrics, and risk metrics are fresh.
- Portfolio summary tables refreshed after valuation.
- NewsData and FMP news ingestion succeeded.
- FRED macro ingestion succeeded.
- Weekly Market Vision and recommendations ran after news/macro updates.

## Common Failure Modes

- Missing `CRON_SECRET`, `APP_URL`, or provider API key.
- Stale lock after HTTP timeout.
- FMP provider endpoint returning delayed or missing data for a symbol.
- GDELT 429 rate limits.
- Supabase statement timeout for large batch calculations.
