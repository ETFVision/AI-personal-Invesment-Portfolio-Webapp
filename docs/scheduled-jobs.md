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

### Daily

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-daily-instrument-price-refresh-1` | `20 21 * * *` | 5:20 AM daily | `/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300` | Refresh latest instrument prices, pass 1. |
| `app-daily-instrument-price-refresh-2` | `25 21 * * *` | 5:25 AM daily | same as above | Refresh latest instrument prices, pass 2. |
| `app-daily-instrument-price-refresh-3` | `30 21 * * *` | 5:30 AM daily | same as above | Refresh latest instrument prices, pass 3. |
| `app-daily-instrument-price-refresh-4` | `35 21 * * *` | 5:35 AM daily | same as above | Refresh latest instrument prices, pass 4. |
| `app-daily-instrument-price-refresh-5` | `40 21 * * *` | 5:40 AM daily | same as above | Refresh latest instrument prices, pass 5. |
| `app-daily-instrument-daily-returns-refresh` | `45 21 * * *` | 5:45 AM daily | `/api/jobs/instrument-daily-returns-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300` | Refresh precomputed instrument daily returns. |
| `app-daily-instrument-return-anchors-refresh` | `55 21 * * *` | 5:55 AM daily | `/api/jobs/instrument-return-anchors-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh return anchors used by market metrics. Migration 101 makes this read precomputed daily returns rather than recomputing them. |
| `app-daily-instrument-market-metrics-refresh` | `5 22 * * *` | 6:05 AM daily | `/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh stored market metrics. |
| `app-daily-instrument-risk-refresh-1` | `15 22 * * *` | 6:15 AM daily | `/api/jobs/instrument-risk-refresh?batchSize=200&minObservations=30&lockTtlSeconds=600` | Refresh stored instrument risk metrics, pass 1. |
| `app-daily-instrument-risk-refresh-2` | `25 22 * * *` | 6:25 AM daily | `/api/jobs/instrument-risk-refresh?batchSize=150&minObservations=30&lockTtlSeconds=600` | Refresh stored instrument risk metrics, pass 2. |
| `app-daily-instrument-metadata-refresh` | `35 22 * * *` | 6:35 AM daily | `/api/jobs/instrument-metadata-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600` | Refresh instrument profile metadata and taxonomy inputs. |
| `app-daily-benchmark-refresh` | `45 22 * * *` | 6:45 AM daily | `/api/jobs/benchmark-refresh?lookbackDays=30` | Keep benchmark comparison series current. |
| `app-daily-portfolio-valuation-refresh` | `55 22 * * *` | 6:55 AM daily | `/api/jobs/portfolio-valuation-refresh` | Create current portfolio valuation snapshots. |
| `app-daily-portfolio-summary-refresh` | `5 23 * * *` | 7:05 AM daily | `/api/jobs/portfolio-summary-refresh` | Refresh portfolio dashboard and performance summary read models after valuation. |
| `app-daily-fred-macro-ingestion` | `15 23 * * *` | 7:15 AM daily | `/api/jobs/fred-macro-ingestion` | Refresh FRED macro indicators and macro signals. |
| `app-daily-fmp-news-ingestion` | `25 23 * * *` | 7:25 AM daily | `/api/jobs/daily-news-ingestion` | Refresh FMP instrument and general market news. |
| `app-daily-newsdata-ingestion` | `35 23 * * *` | 7:35 AM daily | `/api/jobs/newsdata-news-ingestion` | Refresh NewsData macro and world-news query groups. |

### Weekly

Runs every Sunday morning after the Sunday daily refresh chain. This uses Friday-close market data that should already be available before the new trading week starts.

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-weekly-fundamentals-refresh-1` | `50 23 * * 6` | 7:50 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 1. |
| `app-weekly-fundamentals-refresh-2` | `0 0 * * 0` | 8:00 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 2. |
| `app-weekly-fundamentals-refresh-3` | `10 0 * * 0` | 8:10 AM Sunday | `/api/jobs/fundamentals-refresh` | Refresh due fundamentals, pass 3. |
| `app-weekly-news-reconciliation` | `20 0 * * 0` | 8:20 AM Sunday | `/api/jobs/weekly-news-reconciliation` | Build weekly asset and theme news summaries. |
| `app-weekly-market-vision` | `30 0 * * 0` | 8:30 AM Sunday | `/api/jobs/weekly-market-vision` | Generate the weekly CIO-style Market Vision draft and capture Market Vision telemetry snapshots. |
| `app-weekly-recommendation-run` | `40 0 * * 0` | 8:40 AM Sunday | `/api/jobs/recommendation-run` | Refresh recommendation outputs and capture recommendation telemetry snapshots. |
| `app-weekly-portfolio-review-run` | `50 0 * * 0` | 8:50 AM Sunday | `/api/jobs/portfolio-review-run` | Refresh Portfolio Review and capture Portfolio Review telemetry snapshots. |
| `app-weekly-telemetry-evaluation` | `0 1 * * 0` | 9:00 AM Sunday | `/api/jobs/telemetry-evaluation` | Check whether any 1m, 3m, 6m or 12m telemetry horizons have matured and evaluate only those ready observations. |

Telemetry evaluation is scheduled weekly, but the evaluation horizons are not weekly. The job checks all stored snapshots and evaluates only observations whose configured 1m, 3m, 6m or 12m maturity date has arrived.

### Monthly

Runs on the first day of each month.

| Supabase Cron job | UTC Cron | Singapore time | Endpoint | Purpose |
|---|---:|---:|---|---|
| `app-monthly-etf-lookthrough-refresh-1` | `40 0 1 * *` | 8:40 AM first day monthly | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 1. |
| `app-monthly-etf-lookthrough-refresh-2` | `50 0 1 * *` | 8:50 AM first day monthly | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 2. |
| `app-monthly-etf-lookthrough-refresh-3` | `0 1 1 * *` | 9:00 AM first day monthly | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 3. |
| `app-monthly-etf-lookthrough-refresh-4` | `10 1 1 * *` | 9:10 AM first day monthly | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 4. |
| `app-monthly-etf-lookthrough-refresh-5` | `20 1 1 * *` | 9:20 AM first day monthly | `/api/jobs/etf-lookthrough-refresh` | Refresh ETF sector, country and top-holding exposure data, pass 5. |
| `app-monthly-universe-validation` | `30 1 1 * *` | 9:30 AM first day monthly | `/api/jobs/universe-validation` | Revalidate universe metadata and data availability. |

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
