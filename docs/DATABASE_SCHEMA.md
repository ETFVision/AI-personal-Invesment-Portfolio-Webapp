# ETFVision Database Schema

Last updated: 2026-06-11 20:11:07 +08:00

Authoritative status: current schema handover summary based on `supabase/migrations`. For exact columns and constraints, inspect the migration files directly.

## Core Portfolio Tables

| Table | Purpose | Migration origin |
|---|---|---|
| `users` | App user profile mirror. | `001_core_mvp_schema.sql` |
| `portfolios` | User portfolios. | `001_core_mvp_schema.sql` |
| `assets` | Portfolio asset records. | `001_core_mvp_schema.sql` |
| `holdings` | Current holdings. | `001_core_mvp_schema.sql`, later derived metric migrations |
| `transactions` | Manual transaction ledger. | `001_core_mvp_schema.sql` |
| `cash_balances` | Portfolio cash balances. | `001_core_mvp_schema.sql` |
| `portfolio_snapshots`, `asset_snapshots`, `cash_snapshots`, `holding_snapshots` | Historical snapshots. | `004`, `005`, `006` |

## Instrument Universe

| Table | Purpose |
|---|---|
| `instruments` | Canonical instrument universe. Includes asset category, ETF category, sector, themes, active status, metadata. |
| `watchlists`, `watchlist_items` | Watchlist grouping and membership. |
| `instrument_tags` | Additional tag metadata. |
| `bond_profiles`, `benchmark_profiles`, `crypto_profiles` | Type-specific profile data. |
| `metadata_refresh_logs` | Older metadata refresh logging. Current job summaries also appear in `job_runs`. |

Product taxonomy is stored on `instruments` via `asset_category` and `etf_category`. Portfolio sector allocation must not use `etf_category` except as a last-resort fallback.

## Market Data and Derived Metrics

| Table | Purpose |
|---|---|
| `instrument_prices` | Raw historical and latest instrument prices. Source of truth for instrument market metrics. |
| `daily_prices` | Original asset daily price table for portfolio assets. |
| `instrument_daily_returns` | Precomputed daily/weekly returns from `instrument_prices`. |
| `instrument_return_anchors` | Latest price, prior close, return baselines, 52-week ranges. |
| `instrument_market_metrics` | Page-facing price, return, and range metrics. |
| `instrument_risk_metrics` | Volatility, drawdown, downside risk and risk score metrics. |
| `holding_market_metrics` | Holding metrics from transaction cost basis and latest instrument data. |
| `portfolio_current_metrics` | Current portfolio derived metrics. |
| `benchmarks`, `benchmark_snapshots` | Benchmark definitions and histories. |

The intended sequence is:

1. Fetch/store latest `instrument_prices`.
2. Refresh `instrument_daily_returns`.
3. Refresh `instrument_return_anchors`.
4. Refresh `instrument_market_metrics`.
5. Refresh `instrument_risk_metrics`.
6. Refresh portfolio valuation and summary tables.

## Fundamentals

| Table | Purpose |
|---|---|
| `company_profiles` | Company profile and market-cap style metadata from FMP. |
| `financial_statements` | Annual and quarterly statements. |
| `financial_ratios` | Provider or derived ratio rows. |
| `fundamental_scores` | Scored fundamentals summary. |
| `fundamental_trends` | Per-metric trend rows. |
| `fundamental_trend_summaries` | Per-instrument trend summaries. |
| `fundamentals_refresh_logs` | Provider refresh diagnostics. |

Current optimization includes fundamentals overview and detail snapshot/read indexes via migrations `085`, `086`, and `087`.

## ETF Look-Through

| Table family | Purpose |
|---|---|
| ETF exposure tables | FMP ETF sector/country/top-holding exposure. Exact names should be checked in ETF exposure migrations and `SupabaseEtfExposureRepository.ts`. |
| Portfolio look-through outputs | Used by portfolio review, dashboard exposure charts, assistant context, and risk pages. |

Documentation gap: the exact final ETF exposure table names are not summarized here because they are split across migrations and repository mappings. Follow up in `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`.

## News and Themes

| Table | Purpose |
|---|---|
| `news_items` | Unified news article rows. |
| `news_classifications` | Asset/theme classification output. |
| `news_groups` | Grouping/aggregation. |
| `weekly_news_reconciliations` | Weekly asset and theme summaries. |
| `news_ingestion_logs` | FMP/general news ingestion logs. |
| `gdelt_query_groups`, `gdelt_ingestion_logs`, `gdelt_article_metadata` | GDELT query queue, logs, provider metadata. |
| `newsdata_query_groups`, `newsdata_ingestion_logs`, `newsdata_article_metadata` | NewsData.io query queue, logs, provider metadata. |

Source quality fields are added to `news_items` by `028_news_source_quality.sql`.

## Macro and Market Vision

| Table | Purpose |
|---|---|
| `macro_indicators` | FRED indicator definitions. |
| `macro_observations` | FRED observations. |
| `macro_trends` | Derived trend signals. |
| `macro_regime_snapshots` | Current macro regime snapshot. |
| `macro_ingestion_logs` | FRED refresh diagnostics. |
| `macro_theme_signals` | Macro-to-theme signals used by Market Vision/theme intelligence. |
| `market_vision_reports` | Weekly AI-generated reports, status, structured metadata. |
| `market_vision_generation_logs` | OpenAI generation logs and cost metadata. |

## Recommendations, Portfolio Review, Telemetry, Assistant

| Table family | Purpose |
|---|---|
| recommendation tables | Stored recommendation outputs and history. Exact names should be verified in recommendation migrations/repositories. |
| `portfolio_review_runs`, `portfolio_review_reports` | Portfolio Review run metadata and report JSON. |
| `telemetry_recommendation_*`, `telemetry_market_vision_*`, `telemetry_portfolio_review_*` | Snapshots and mature outcome evaluations. |
| assistant tables | Conversations, messages, usage/cost tracking. Exact names should be verified in assistant migrations/repositories. |

## Operations

| Table | Purpose |
|---|---|
| `job_runs` | Structured log for protected job endpoint runs. |
| `job_locks` | Overlap lock by job name. |
| Provider-specific log tables | Detailed logs for FMP, FRED, NewsData, GDELT, fundamentals, ETF exposure. |

## RLS and Access

Most tables enable RLS in migrations. Many reference tables allow authenticated read access broadly, while user/portfolio tables are scoped to the authenticated user. Server jobs use `SUPABASE_SERVICE_ROLE_KEY` through `createSupabaseAdminClient`.

Documentation gap: a full RLS policy audit should be performed before commercialization because this document summarizes intent rather than proving every policy.
