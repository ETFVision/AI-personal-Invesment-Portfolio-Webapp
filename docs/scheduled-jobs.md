# Scheduled Data Refresh Jobs

Supabase Cron is the production scheduler. It calls protected Next.js job endpoints on the deployed Vercel app through `pg_net`.

GitHub Actions workflows are retained only as manual fallback runs through `workflow_dispatch`.

## Required Supabase Vault Secrets

Supabase Cron uses Vault secrets to call the app:

- `APP_URL`: deployed Vercel app URL, for example `https://your-app.vercel.app`
- `CRON_SECRET`: same value configured in Vercel as `CRON_SECRET`

The helper function is:

```sql
select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');
```

## Required Vercel Environment Variables

Provider and database variables remain in Vercel:

- `FMP_API_KEY`
- `FRED_API_KEY`
- `NEWSDATA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Portfolio-specific scheduled jobs also need:

- `SCHEDULED_USER_ID`
- `SCHEDULED_PORTFOLIO_ID`

These are used by `/api/jobs/portfolio-valuation-refresh`, `/api/jobs/recommendation-run`, and `/api/jobs/portfolio-review-run` when the job endpoint does not receive query parameters.

## Supabase Schedule

All cron expressions are UTC. Singapore time is UTC+8.

The chain is anchored to the US market close. Migration `117` re-cascades every refresh job at 5-minute intervals starting at `22:30` UTC (18:30 EDT / 17:30 EST), which is 90 to 150 minutes after the 16:00 ET close, so adjusted end-of-day prices have published before the price refresh runs. Stored prices and all derived metrics carry the real US trading date returned by the provider, so the Singapore execution time does not affect the dates they record.

### Daily

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-daily-instrument-price-refresh` | `30 22 * * *` | 6:30 AM daily | `/api/jobs/instrument-price-refresh?source=eod&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300` | Refresh latest instrument end-of-day prices in a single pass (adjusted close at the real US trading date). |
| `app-daily-instrument-daily-returns-refresh` | `35 22 * * *` | 6:35 AM daily | `/api/jobs/instrument-daily-returns-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300` | Refresh precomputed instrument daily returns. |
| `app-daily-instrument-return-anchors-refresh` | `40 22 * * *` | 6:40 AM daily | `/api/jobs/instrument-return-anchors-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh return anchors used by market metrics. Migration 101 makes this read precomputed daily returns rather than recomputing them. |
| `app-daily-instrument-market-metrics-refresh` | `45 22 * * *` | 6:45 AM daily | `/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh stored market metrics. |
| `app-daily-instrument-risk-refresh` | `50 22 * * *` | 6:50 AM daily | `/api/jobs/instrument-risk-refresh?batchSize=350&minObservations=30&lockTtlSeconds=600` | Refresh stored instrument risk metrics for the full universe in a single pass. Migration 117 collapses the previous two passes (`batchSize=200` + `150`) into one; the service chunks the set-based RPC internally (`chunkSize` default 25) with a per-instrument fallback on statement timeout. |
| `app-daily-instrument-metadata-refresh` | `55 22 * * *` | 6:55 AM daily | `/api/jobs/instrument-metadata-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh instrument profile metadata and taxonomy inputs. |
| `app-daily-benchmark-refresh` | `0 23 * * *` | 7:00 AM daily | `/api/jobs/benchmark-refresh?lookbackDays=30` | Keep benchmark comparison series current. |
| `app-daily-portfolio-valuation-refresh` | `5 23 * * *` | 7:05 AM daily | `/api/jobs/portfolio-valuation-refresh` | Create current portfolio valuation snapshots. |
| `app-daily-portfolio-summary-refresh` | `10 23 * * *` | 7:10 AM daily | `/api/jobs/portfolio-summary-refresh` | Refresh portfolio dashboard and performance summary read models after valuation. |
| `app-daily-fred-macro-ingestion` | `15 23 * * *` | 7:15 AM daily | `/api/jobs/fred-macro-ingestion` | Refresh FRED macro indicators and macro signals. |
| `app-daily-fmp-news-ingestion` | `20 23 * * *` | 7:20 AM daily | `/api/jobs/daily-news-ingestion` | Refresh FMP instrument and general market news. |
| `app-daily-newsdata-ingestion` | `25 23 * * *` | 7:25 AM daily | `/api/jobs/newsdata-news-ingestion` | Refresh NewsData macro and world-news query groups. |

The daily chain runs entirely within a single UTC day (`22:30` to `23:25`), so no daily job crosses the midnight-UTC boundary.

### Weekly

Runs every Sunday morning (Singapore time) immediately after the Sunday daily refresh chain, using Friday-close market data that is available before the new trading week starts. The chain begins on Saturday UTC; the final two jobs intentionally roll into Sunday UTC (`* * 0`) as the 5-minute cascade crosses midnight UTC.

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-weekly-fundamentals-refresh-1` | `30 23 * * 6` | 7:30 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 1. |
| `app-weekly-fundamentals-refresh-2` | `35 23 * * 6` | 7:35 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 2. |
| `app-weekly-fundamentals-refresh-3` | `40 23 * * 6` | 7:40 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 3. |
| `app-weekly-news-reconciliation` | `45 23 * * 6` | 7:45 AM Sunday | `/api/jobs/weekly-news-reconciliation` | Build weekly asset and theme news summaries. |
| `app-weekly-market-vision` | `50 23 * * 6` | 7:50 AM Sunday | `/api/jobs/weekly-market-vision` | Generate the weekly CIO-style Market Vision draft and capture Market Vision telemetry snapshots. |
| `app-weekly-recommendation-run` | `55 23 * * 6` | 7:55 AM Sunday | `/api/jobs/recommendation-run` | Refresh recommendation outputs and capture recommendation telemetry snapshots. |
| `app-weekly-portfolio-review-run` | `0 0 * * 0` | 8:00 AM Sunday | `/api/jobs/portfolio-review-run` | Refresh Portfolio Review and capture Portfolio Review telemetry snapshots. |
| `app-weekly-telemetry-evaluation` | `5 0 * * 0` | 8:05 AM Sunday | `/api/jobs/telemetry-evaluation` | Check whether any 1m, 3m, 6m or 12m telemetry horizons have matured and evaluate only those ready observations. |

Telemetry evaluation is scheduled weekly, but the evaluation horizons are not weekly. The job checks all stored snapshots and evaluates only observations whose configured 1m, 3m, 6m or 12m maturity date has arrived.

### Monthly

Runs on the first day of each month in UTC, which is also the first day of the month in US Eastern time (the jobs fire at `23:30`–`23:55` UTC on the 1st = 19:30–19:55 EDT / 18:30–18:55 EST on the 1st). Because `23:xx` UTC plus 8 hours crosses midnight, these surface on the morning of the **2nd** in Singapore time. The whole block fits before midnight UTC, so no monthly job crosses into the next UTC day.

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-monthly-etf-lookthrough-refresh-1` | `30 23 1 * *` | 7:30 AM 2nd (Sing.) | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 1. |
| `app-monthly-etf-lookthrough-refresh-2` | `35 23 1 * *` | 7:35 AM 2nd (Sing.) | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 2. |
| `app-monthly-etf-lookthrough-refresh-3` | `40 23 1 * *` | 7:40 AM 2nd (Sing.) | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 3. |
| `app-monthly-etf-lookthrough-refresh-4` | `45 23 1 * *` | 7:45 AM 2nd (Sing.) | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 4. |
| `app-monthly-etf-lookthrough-refresh-5` | `50 23 1 * *` | 7:50 AM 2nd (Sing.) | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 5. |
| `app-monthly-universe-validation` | `55 23 1 * *` | 7:55 AM 2nd (Sing.) | `/api/jobs/universe-validation` | Revalidate universe metadata and data availability. |

The weekly chain (`* * 6`) and the monthly chain (`1 * *`) share the same `23:30`–`23:55` UTC window and therefore overlap only when the 1st of the month falls on a Saturday UTC (roughly once a quarter). They touch different tables and `job_locks` serialize same-named runs, so the overlap is harmless.

Benchmarks and fundamentals are no longer monthly. Recent benchmark data is refreshed daily, fundamentals are refreshed weekly, and long benchmark history is handled by the manual market-history backfill.

## Fundamentals Refresh Window

The regular fundamentals refresh refetches overlapping recent statement windows:

- 5 annual periods
- 12 quarterly periods

Existing fiscal periods are upserted, so provider corrections refill/update stored rows rather than creating duplicates. New fiscal periods are inserted when companies report.

## Manual Backfills

Admin > Data Sources > Backfill market history runs:

- instrument market history backfill
- benchmark history backfill using roughly five years of history

This is intentionally manual because historical backfills are heavier than daily freshness jobs.

## Excluded From Automation

GDELT is intentionally not automated because its public endpoint has unstable rate-limit behavior. Keep GDELT as manual-only unless a future provider queue makes it reliable enough for unattended scheduling.

## Job Summaries

Each protected job endpoint writes to `job_runs`.

The Admin Jobs page shows:

- job name
- source, such as `supabase cron`, `manual ui`, or fallback `github actions`
- status
- started time in Singapore time
- duration
- summary payload
- error message

Specific provider logs remain in their provider-specific tables, such as `news_ingestion_logs`, `newsdata_ingestion_logs`, `macro_ingestion_logs`, `fundamentals_refresh_logs`, and `etf_exposure_refresh_logs`.

## Overlap Prevention

Each protected job endpoint uses `job_locks`.

If the same job is already running, the endpoint returns a structured `skipped` response and records that skip in `job_runs`.

Locks expire automatically based on the route TTL and are removed when the route finishes normally.

## Manual Fallback Runs

GitHub Actions workflows keep `workflow_dispatch` only.

Use them when Supabase Cron needs a manual fallback, or call the endpoint helper directly:

```bash
APP_URL=https://your-app.vercel.app CRON_SECRET=... bash scripts/call-job-endpoint.sh /api/jobs/fred-macro-ingestion
```

## Debugging

Check in this order:

1. `Admin -> Jobs` in the app.
2. Provider-specific logs under `Admin -> Data Sources`.
3. Supabase `cron.job_run_details` and `net._http_response`.
4. Vercel function logs.
5. GitHub Actions logs only for manually triggered fallback workflows.

Unauthorized requests should return `401`. Missing `CRON_SECRET` in Vercel returns `503`.

## Adding A New Scheduled Job

1. Keep business logic in an app service/job.
2. Add a protected route under `/api/jobs/...`.
3. Wrap the route with `runCronJob`.
4. Add or update a Supabase migration using `cron.schedule`.
5. Stagger the endpoint in dependency order.
6. Document the route here.

Do not put provider API keys or business logic into GitHub Actions.
