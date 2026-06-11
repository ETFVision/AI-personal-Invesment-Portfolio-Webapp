# Data Ingestion and Providers

Last updated: 2026-06-11 20:11:07 +08:00

## Provider Map

| Provider | Adapter | Used for |
|---|---|---|
| FMP | `FmpMarketDataProvider.ts` | Instrument metadata, latest prices, historical prices, FMP news. |
| FMP | `FmpFundamentalsProvider.ts` | Company profiles, statements, ratios, fundamentals scoring inputs. |
| FMP | `FmpEtfExposureProvider.ts` | ETF sector, country, and holdings/look-through exposure where available. |
| FRED | `FredMacroDataProvider.ts` | Macro indicator observations and regime inputs. |
| NewsData.io | `NewsDataNewsProvider.ts` | Macro/world news query groups. Current preferred macro news provider. |
| GDELT | `GdeltNewsProvider.ts` | Separate manual macro/world news source. Not automated because of rate-limit instability. |
| OpenAI | `OpenAiNewsProvider.ts`, `OpenAiMarketVisionProvider.ts`, `OpenAiPortfolioAssistantProvider.ts` | Classification/narrative intelligence. |

## Ingestion Jobs

| Job | Endpoint | Main output |
|---|---|---|
| Instrument price refresh | `/api/jobs/instrument-price-refresh` | Latest raw `instrument_prices`. |
| Daily returns refresh | `/api/jobs/instrument-daily-returns-refresh` | `instrument_daily_returns`. |
| Return anchors refresh | `/api/jobs/instrument-return-anchors-refresh` | `instrument_return_anchors`. |
| Market metrics refresh | `/api/jobs/instrument-market-metrics-refresh` | `instrument_market_metrics`. |
| Risk refresh | `/api/jobs/instrument-risk-refresh` | `instrument_risk_metrics`. |
| Metadata refresh | `/api/jobs/instrument-metadata-refresh` | Instrument metadata/profile fields. |
| Market history backfill | `/api/jobs/market-history-backfill` | Historical `instrument_prices` and benchmark history. |
| Benchmark refresh | `/api/jobs/benchmark-refresh` | Recent benchmark snapshots. |
| ETF look-through | `/api/jobs/etf-lookthrough-refresh` | ETF exposure rows. |
| Fundamentals | `/api/jobs/fundamentals-refresh` | Profiles, statements, ratios, scores, trends. |
| FRED macro | `/api/jobs/fred-macro-ingestion` | Macro observations, trends, regimes. |
| FMP news | `/api/jobs/daily-news-ingestion` | FMP news and classifications. |
| NewsData | `/api/jobs/newsdata-news-ingestion` | NewsData articles and provider metadata. |
| GDELT | `/api/jobs/gdelt-news-ingestion` | Manual GDELT queue refresh. |
| Weekly news reconciliation | `/api/jobs/weekly-news-reconciliation` | Weekly asset/theme summary. |
| Market Vision | `/api/jobs/weekly-market-vision` | Weekly CIO-style AI report. |
| Recommendations | `/api/jobs/recommendation-run` | Deterministic recommendations and telemetry snapshots. |
| Portfolio Review | `/api/jobs/portfolio-review-run` | Portfolio review report and telemetry snapshots. |
| Telemetry evaluation | `/api/jobs/telemetry-evaluation` | Mature 1m/3m/6m/12m outcome evaluations. |
| Portfolio summary | `/api/jobs/portfolio-summary-refresh` | Dashboard/performance summary tables. |

## Daily Dependency Order

Daily automation should preserve this dependency chain:

1. Instrument prices.
2. Instrument daily returns.
3. Instrument return anchors.
4. Instrument market metrics.
5. Instrument risk metrics.
6. Instrument metadata.
7. Benchmarks.
8. Portfolio valuation.
9. FRED macro.
10. FMP news.
11. NewsData.
12. Portfolio summary refresh.

Exact schedule is in `docs/scheduled-jobs.md`.

## Provider Quality Notes

- FMP is the core market/fundamentals provider. Some tickers can have limited endpoint coverage or delayed end-of-day updates.
- NewsData.io is preferred for scheduled macro/world news because it is less rate-limit fragile than GDELT.
- GDELT should remain manual-only unless future rate-limit behavior is stabilized.
- ETF top-holding availability depends on provider coverage. When top holdings are unavailable, portfolio exposure should fall back to sector/country exposure and mark coverage as limited.
- FRED is stable for macro indicators but economic data updates at different publication cadences.

## Environment Variables

Required in Vercel:

- `FMP_API_KEY`
- `FRED_API_KEY`
- `NEWSDATA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `SCHEDULED_USER_ID`
- `SCHEDULED_PORTFOLIO_ID`

Supabase Vault must contain:

- `APP_URL`
- `CRON_SECRET`

## Manual Refresh UX

Admin > Data Sources centralizes refresh buttons and data-layer coverage cards. Product pages should generally avoid refresh buttons except where intentionally retained.
