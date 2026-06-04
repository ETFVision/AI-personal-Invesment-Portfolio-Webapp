# Scheduled Data Refresh Jobs

GitHub Actions triggers protected Next.js job endpoints. The workflows do not call FMP, FRED, NewsData.io, OpenAI, or Supabase directly. Provider keys stay in Vercel/app environment variables.

## Required GitHub Secrets

- `APP_URL`: deployed Vercel app URL, for example `https://your-app.vercel.app`
- `CRON_SECRET`: same value configured in Vercel as `CRON_SECRET`

## Required Vercel Environment Variables

Provider and database variables remain in Vercel as usual:

- `FMP_API_KEY`
- `FRED_API_KEY`
- `NEWSDATA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Portfolio-specific scheduled jobs also need:

- `SCHEDULED_USER_ID`
- `SCHEDULED_PORTFOLIO_ID`

These are used by `/api/jobs/price-refresh`, `/api/jobs/portfolio-valuation-refresh`, `/api/jobs/recommendation-run`, and `/api/jobs/portfolio-review-run` when GitHub Actions does not pass query parameters.

## Schedule Table

| Workflow | UTC Cron | Singapore Time | Purpose |
|---|---:|---:|---|
| `daily-data-refresh.yml` | `30 22 * * *` | 6:30 AM daily | Prices, portfolio valuation, FRED, FMP news, NewsData.io |
| `weekly-intelligence-refresh.yml` | `0 0 * * 1` | 8:00 AM Monday | News reconciliation, Market Vision, Recommendations, Portfolio Review |
| `monthly-slow-refresh.yml` | `30 0 1 * *` | 8:30 AM first day monthly | Fundamentals, ETF look-through, benchmarks, universe validation |

GitHub Actions cron uses UTC.

## Endpoint Order

Daily:

1. `/api/jobs/price-refresh`
2. `/api/jobs/portfolio-valuation-refresh`
3. `/api/jobs/fred-macro-ingestion`
4. `/api/jobs/daily-news-ingestion`
5. `/api/jobs/newsdata-news-ingestion`

Weekly:

1. `/api/jobs/weekly-news-reconciliation`
2. `/api/jobs/weekly-market-vision`
3. `/api/jobs/recommendation-run`
4. `/api/jobs/portfolio-review-run`

Monthly:

1. `/api/jobs/fundamentals-refresh`
2. `/api/jobs/etf-lookthrough-refresh`
3. `/api/jobs/benchmark-refresh`
4. `/api/jobs/universe-validation`

GDELT is intentionally not automated because its public endpoint has unstable rate-limit behavior. Keep GDELT as manual-only unless a future provider queue makes it reliable.

## Job Summaries

Each protected job endpoint writes to `job_runs`.

The Admin Jobs page shows:

- job name
- status
- started time in Singapore time
- duration
- summary payload
- error message

Specific provider logs still remain in their provider-specific tables, such as `news_ingestion_logs`, `newsdata_ingestion_logs`, `macro_ingestion_logs`, `fundamentals_refresh_logs`, and `etf_exposure_refresh_logs`.

## Overlap Prevention

Each protected job endpoint uses `job_locks`.

If the same job is already running, the endpoint returns a structured `skipped` response and records that skip in `job_runs`.

Locks expire automatically based on the route TTL, and are removed when the route finishes normally.

## Manual Run

In GitHub:

1. Open the repository.
2. Go to Actions.
3. Select the workflow.
4. Choose **Run workflow**.

The same protected endpoints can also be tested with:

```bash
APP_URL=https://your-app.vercel.app CRON_SECRET=... bash scripts/call-job-endpoint.sh /api/jobs/fred-macro-ingestion
```

## Debugging

Check in this order:

1. GitHub Actions run logs.
2. `Admin -> Jobs` in the app.
3. Provider-specific logs on the relevant page.
4. Vercel function logs.

Unauthorized requests should return `401`. Missing `CRON_SECRET` in Vercel returns `503`.

## Disable A Workflow

In GitHub Actions, disable the workflow from the workflow page.

Alternatively, remove or comment the `schedule` block and keep `workflow_dispatch` for manual runs.

## Adding A New Scheduled Job

1. Keep business logic in an app service/job.
2. Add a protected route under `/api/jobs/...`.
3. Wrap the route with `runCronJob`.
4. Add the endpoint to the appropriate workflow in dependency order.
5. Document the route here.

Do not put provider API keys or business logic into GitHub Actions.
