# Portable PostgreSQL Schema Using Supabase

## 1. Design Goals

This schema is designed for an initial Supabase Postgres deployment while remaining portable to standard PostgreSQL on Cloud SQL.

Principles:

- Use standard PostgreSQL table design.
- Keep Supabase Auth isolated from domain tables.
- Avoid Supabase-only APIs in the data model.
- Use UUID primary keys, but keep UUID generation configurable.
- Use `jsonb` only for flexible metadata, provider payloads, and audit evidence.
- Use normalized tables for core portfolio, pricing, scoring, recommendations, risk, and scenarios.
- Store raw provider references separately from app-level domain concepts.

## 2. Portability Notes

### UUIDs

Recommended portable pattern:

```sql
id uuid primary key
```

Application code can generate UUIDs before insert.

Supabase convenience option, isolated to migrations:

```sql
id uuid primary key default gen_random_uuid()
```

`gen_random_uuid()` requires the `pgcrypto` extension. This is available in Supabase and Cloud SQL PostgreSQL, but it should be treated as a migration-level convenience rather than an application assumption.

### Auth

Do not make domain tables depend directly on `auth.users`.

Use:

```sql
users.auth_provider = 'supabase'
users.auth_provider_user_id = '<supabase auth user id>'
```

This allows migration to another auth provider later.

### Row-Level Security

Supabase RLS policies can be added in Supabase-specific migration files. Keep core table definitions portable.

## 3. Common Conventions

Common columns:

- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `is_active boolean not null default true` where soft deactivation is useful

Common indexes:

- Foreign keys should have indexes.
- User-scoped tables should index `user_id`.
- Time-series tables should index date columns and `(asset_id, date)` or `(portfolio_id, date)`.
- Provider lookup tables should index provider identifiers.

## 4. Tables

## users

Purpose: application user profile, isolated from Supabase Auth.

```sql
create table users (
  id uuid primary key,
  auth_provider text not null,
  auth_provider_user_id text not null,
  email text,
  display_name text,
  base_currency text not null default 'USD',
  timezone text not null default 'UTC',
  risk_profile text,
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_provider_user_id)
);

create index idx_users_email on users (email);
```

Explanation: maps external auth identity to a portable application user. Do not foreign key to Supabase `auth.users` in the portable schema.

## portfolios

Purpose: portfolio containers owned by users.

```sql
create table portfolios (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  base_currency text not null default 'USD',
  strategy_label text,
  target_allocation_model_id uuid,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolios_user_id on portfolios (user_id);
create index idx_portfolios_user_default on portfolios (user_id, is_default);
```

Explanation: supports one or more portfolios per user. `target_allocation_model_id` is nullable to avoid circular creation dependency and can be linked after allocation models exist.

## assets

Purpose: normalized master asset table.

```sql
create table assets (
  id uuid primary key,
  asset_type text not null,
  ticker text,
  symbol text,
  name text not null,
  exchange text,
  currency text,
  country text,
  region text,
  sector text,
  industry text,
  provider_primary text,
  provider_ids jsonb not null default '{}',
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_type on assets (asset_type);
create index idx_assets_ticker on assets (ticker);
create index idx_assets_symbol on assets (symbol);
create index idx_assets_provider_ids on assets using gin (provider_ids);
```

Explanation: stores stocks, ETFs, bond ETFs, gold ETFs, crypto, cash proxies, and benchmark instruments. Provider identifiers are kept in `jsonb` to avoid hard-coding one data vendor.

## cash_balances

Purpose: current or snapshot cash balances by portfolio, account, and currency.

```sql
create table cash_balances (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  account_name text,
  broker_name text,
  currency text not null,
  amount numeric(28, 10) not null,
  as_of_date date not null,
  source_type text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, account_name, currency, as_of_date)
);

create index idx_cash_balances_portfolio on cash_balances (portfolio_id);
create index idx_cash_balances_portfolio_date on cash_balances (portfolio_id, as_of_date);
```

Explanation: supports multi-currency cash and future broker/account separation.

## holdings

Purpose: current position state.

```sql
create table holdings (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  asset_id uuid not null references assets(id),
  account_name text,
  broker_name text,
  quantity numeric(28, 10) not null,
  average_cost numeric(28, 10),
  cost_currency text not null,
  first_purchase_date date,
  source_type text not null default 'manual',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, asset_id, account_name)
);

create index idx_holdings_portfolio on holdings (portfolio_id);
create index idx_holdings_asset on holdings (asset_id);
create index idx_holdings_portfolio_asset on holdings (portfolio_id, asset_id);
```

Explanation: stores current holdings. Historical changes are recorded in `transactions`.

## transactions

Purpose: transaction ledger for buys, sells, cash movements, fees, dividends, and manual adjustments.

```sql
create table transactions (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  asset_id uuid references assets(id),
  transaction_type text not null,
  account_name text,
  broker_name text,
  quantity numeric(28, 10),
  price numeric(28, 10),
  fees numeric(28, 10) not null default 0,
  gross_amount numeric(28, 10),
  net_amount numeric(28, 10),
  currency text not null,
  transaction_date date not null,
  source_type text not null default 'manual',
  external_id text,
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_portfolio on transactions (portfolio_id);
create index idx_transactions_asset on transactions (asset_id);
create index idx_transactions_portfolio_date on transactions (portfolio_id, transaction_date);
create index idx_transactions_external on transactions (source_type, external_id);
```

Explanation: source of truth for transaction-mode reconciliation. `external_id` supports future CSV or IBKR deduplication.

## watchlists

Purpose: user-owned collections of watchlist items.

```sql
create table watchlists (
  id uuid primary key,
  user_id uuid not null references users(id),
  name text not null,
  description text,
  watchlist_type text not null default 'personal',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_watchlists_user on watchlists (user_id);
create index idx_watchlists_user_default on watchlists (user_id, is_default);
```

Explanation: supports core quality, tactical/thematic, opportunistic, or custom watchlists.

## watchlist_items

Purpose: assets tracked inside watchlists.

```sql
create table watchlist_items (
  id uuid primary key,
  watchlist_id uuid not null references watchlists(id),
  asset_id uuid not null references assets(id),
  tier text not null,
  status text not null default 'active_monitor',
  portfolio_role text,
  thesis text,
  trigger_summary text,
  trigger_rules jsonb not null default '[]',
  data_refresh_priority text not null default 'normal',
  last_reviewed_at timestamptz,
  added_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watchlist_id, asset_id)
);

create index idx_watchlist_items_watchlist on watchlist_items (watchlist_id);
create index idx_watchlist_items_asset on watchlist_items (asset_id);
create index idx_watchlist_items_tier_status on watchlist_items (tier, status);
```

Explanation: keeps tier, thesis, triggers, and review status separate from the asset master.

## watchlist_reviews

Purpose: weekly or quarterly watchlist review outputs.

```sql
create table watchlist_reviews (
  id uuid primary key,
  watchlist_id uuid not null references watchlists(id),
  review_type text not null,
  period_start date,
  period_end date,
  summary text,
  additions jsonb not null default '[]',
  removals jsonb not null default '[]',
  tier_changes jsonb not null default '[]',
  stale_items jsonb not null default '[]',
  generated_by text not null default 'system',
  created_at timestamptz not null default now()
);

create index idx_watchlist_reviews_watchlist on watchlist_reviews (watchlist_id);
create index idx_watchlist_reviews_period on watchlist_reviews (period_start, period_end);
```

Explanation: stores review artifacts and evidence.

## bond_assets

Purpose: bond-specific asset classification for bond ETFs and future individual bonds.

```sql
create table bond_assets (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  bond_asset_kind text not null default 'bond_etf',
  duration_bucket text,
  credit_quality text,
  bond_type text,
  currency text,
  geographic_exposure text,
  issuer_category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id)
);

create index idx_bond_assets_asset on bond_assets (asset_id);
create index idx_bond_assets_classification on bond_assets (duration_bucket, credit_quality, bond_type);
```

Explanation: normalized bond classification layer. Phase 1 uses `bond_etf`.

## bond_etf_profiles

Purpose: detailed bond ETF metadata.

```sql
create table bond_etf_profiles (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  effective_duration numeric(12, 6),
  yield_to_maturity numeric(12, 6),
  sec_yield numeric(12, 6),
  expense_ratio numeric(12, 6),
  aum numeric(28, 4),
  average_volume numeric(28, 4),
  distribution_frequency text,
  stability_role text,
  data_source text,
  data_as_of date,
  raw_profile jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id)
);

create index idx_bond_etf_profiles_asset on bond_etf_profiles (asset_id);
create index idx_bond_etf_profiles_duration on bond_etf_profiles (effective_duration);
```

Explanation: keeps data-provider-specific metadata and raw evidence for auditability.

## daily_prices

Purpose: daily close or latest price snapshots.

```sql
create table daily_prices (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  price_date date not null,
  open_price numeric(28, 10),
  high_price numeric(28, 10),
  low_price numeric(28, 10),
  close_price numeric(28, 10) not null,
  adjusted_close_price numeric(28, 10),
  volume numeric(28, 4),
  currency text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  unique (asset_id, price_date, provider)
);

create index idx_daily_prices_asset_date on daily_prices (asset_id, price_date desc);
create index idx_daily_prices_date on daily_prices (price_date);
```

Explanation: source for performance, risk, benchmarks, scenarios, and scoring.

## portfolio_snapshots

Purpose: daily portfolio-level state.

```sql
create table portfolio_snapshots (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  snapshot_date date not null,
  total_value numeric(28, 10) not null,
  invested_value numeric(28, 10),
  cash_value numeric(28, 10),
  base_currency text not null,
  asset_class_allocations jsonb not null default '{}',
  sector_allocations jsonb not null default '{}',
  geography_allocations jsonb not null default '{}',
  currency_allocations jsonb not null default '{}',
  source_run_id uuid,
  created_at timestamptz not null default now(),
  unique (portfolio_id, snapshot_date)
);

create index idx_portfolio_snapshots_portfolio_date on portfolio_snapshots (portfolio_id, snapshot_date desc);
```

Explanation: supports historical portfolio analytics without recalculating everything from transactions.

## asset_snapshots

Purpose: portfolio asset-level snapshot for holdings and watched assets.

```sql
create table asset_snapshots (
  id uuid primary key,
  portfolio_id uuid references portfolios(id),
  asset_id uuid not null references assets(id),
  snapshot_date date not null,
  quantity numeric(28, 10),
  market_price numeric(28, 10),
  market_value numeric(28, 10),
  cost_basis numeric(28, 10),
  unrealized_gain_loss numeric(28, 10),
  allocation_pct numeric(12, 8),
  currency text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_asset_snapshots_portfolio_date on asset_snapshots (portfolio_id, snapshot_date desc);
create index idx_asset_snapshots_asset_date on asset_snapshots (asset_id, snapshot_date desc);
```

Explanation: stores time-series asset exposure for analytics and recommendations.

## news_items

Purpose: normalized market or asset news metadata.

```sql
create table news_items (
  id uuid primary key,
  provider text not null,
  external_id text,
  title text not null,
  url text,
  source_name text,
  published_at timestamptz,
  summary text,
  related_asset_ids jsonb not null default '[]',
  topics jsonb not null default '[]',
  sentiment_score numeric(12, 6),
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index idx_news_items_published on news_items (published_at desc);
create index idx_news_items_related_assets on news_items using gin (related_asset_ids);
```

Explanation: stores metadata and summaries, not full copyrighted article bodies.

## weekly_news_summaries

Purpose: weekly AI or deterministic synthesis of news.

```sql
create table weekly_news_summaries (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  week_start date not null,
  week_end date not null,
  summary text not null,
  asset_implications jsonb not null default '{}',
  macro_implications jsonb not null default '{}',
  source_news_item_ids jsonb not null default '[]',
  model_provider text,
  model_name text,
  created_at timestamptz not null default now()
);

create index idx_weekly_news_summaries_portfolio_week on weekly_news_summaries (portfolio_id, week_start desc);
```

Explanation: creates bounded weekly summaries to control AI and news API cost.

## market_vision_reports

Purpose: structured Market Vision tab reports.

```sql
create table market_vision_reports (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  report_date date not null,
  market_regime text,
  equity_summary text,
  bond_rates_summary text,
  gold_inflation_summary text,
  crypto_summary text,
  macro_summary text,
  portfolio_implications text,
  structured_signals jsonb not null default '{}',
  model_provider text,
  model_name text,
  created_at timestamptz not null default now()
);

create index idx_market_vision_portfolio_date on market_vision_reports (portfolio_id, report_date desc);
```

Explanation: stores explainable market context and structured evidence.

## macro_indicators

Purpose: FRED and macro series observations.

```sql
create table macro_indicators (
  id uuid primary key,
  provider text not null,
  series_id text not null,
  series_name text,
  observation_date date not null,
  value numeric(28, 10),
  units text,
  frequency text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (provider, series_id, observation_date)
);

create index idx_macro_indicators_series_date on macro_indicators (series_id, observation_date desc);
```

Explanation: normalized macro time-series store.

## asset_scores

Purpose: generic scoring for stocks, ETFs, crypto, gold, and watchlist assets.

```sql
create table asset_scores (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  portfolio_id uuid references portfolios(id),
  score_date date not null,
  quality_score numeric(12, 6),
  valuation_score numeric(12, 6),
  momentum_score numeric(12, 6),
  risk_score numeric(12, 6),
  liquidity_score numeric(12, 6),
  portfolio_fit_score numeric(12, 6),
  diversification_score numeric(12, 6),
  conviction_score numeric(12, 6),
  score_inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (asset_id, portfolio_id, score_date)
);

create index idx_asset_scores_asset_date on asset_scores (asset_id, score_date desc);
create index idx_asset_scores_portfolio_date on asset_scores (portfolio_id, score_date desc);
```

Explanation: portfolio-aware and asset-level scoring evidence.

## bond_scores

Purpose: bond-specific scores.

```sql
create table bond_scores (
  id uuid primary key,
  asset_id uuid not null references assets(id),
  portfolio_id uuid references portfolios(id),
  score_date date not null,
  duration_fit_score numeric(12, 6),
  credit_quality_score numeric(12, 6),
  income_score numeric(12, 6),
  stability_score numeric(12, 6),
  recession_hedge_score numeric(12, 6),
  inflation_hedge_score numeric(12, 6),
  liquidity_score numeric(12, 6),
  portfolio_fit_score numeric(12, 6),
  rate_regime_fit_score numeric(12, 6),
  spread_regime_fit_score numeric(12, 6),
  overall_bond_fit_score numeric(12, 6),
  score_inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (asset_id, portfolio_id, score_date)
);

create index idx_bond_scores_asset_date on bond_scores (asset_id, score_date desc);
create index idx_bond_scores_portfolio_date on bond_scores (portfolio_id, score_date desc);
```

Explanation: separates bond intelligence from generic asset scoring.

## recommendations

Purpose: current recommendation records.

```sql
create table recommendations (
  id uuid primary key,
  user_id uuid not null references users(id),
  portfolio_id uuid references portfolios(id),
  recommendation_type text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  title text not null,
  summary text not null,
  rationale text,
  suggested_action text,
  confidence_score numeric(12, 6),
  supporting_data jsonb not null default '{}',
  model_provider text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_recommendations_user_status on recommendations (user_id, status);
create index idx_recommendations_portfolio_created on recommendations (portfolio_id, created_at desc);
```

Explanation: stores actionable AI-assisted and rules-based recommendations.

## recommendation_history

Purpose: audit trail of recommendation state changes and feedback.

```sql
create table recommendation_history (
  id uuid primary key,
  recommendation_id uuid not null references recommendations(id),
  user_id uuid not null references users(id),
  event_type text not null,
  previous_status text,
  new_status text,
  feedback text,
  event_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_recommendation_history_recommendation on recommendation_history (recommendation_id);
create index idx_recommendation_history_user_created on recommendation_history (user_id, created_at desc);
```

Explanation: supports telemetry learning from accepted, rejected, ignored, and completed recommendations.

## telemetry_reviews

Purpose: monthly learning reviews.

```sql
create table telemetry_reviews (
  id uuid primary key,
  user_id uuid not null references users(id),
  portfolio_id uuid references portfolios(id),
  review_month date not null,
  behavior_summary text,
  accepted_recommendations_count integer not null default 0,
  rejected_recommendations_count integer not null default 0,
  ignored_recommendations_count integer not null default 0,
  inferred_preferences jsonb not null default '{}',
  suggested_weight_changes jsonb not null default '[]',
  model_provider text,
  model_name text,
  created_at timestamptz not null default now(),
  unique (user_id, portfolio_id, review_month)
);

create index idx_telemetry_reviews_user_month on telemetry_reviews (user_id, review_month desc);
```

Explanation: stores monthly preference and behavior summaries.

## scoring_weights

Purpose: active scoring weights by user, model, and scope.

```sql
create table scoring_weights (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  scoring_model text not null,
  scope text not null,
  weights jsonb not null,
  version integer not null default 1,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now()
);

create index idx_scoring_weights_user_model on scoring_weights (user_id, scoring_model, is_active);
create index idx_scoring_weights_portfolio_model on scoring_weights (portfolio_id, scoring_model, is_active);
```

Explanation: supports personalization without hard-coding scoring logic.

## scoring_weight_change_suggestions

Purpose: proposed changes from telemetry learning before user/system approval.

```sql
create table scoring_weight_change_suggestions (
  id uuid primary key,
  user_id uuid not null references users(id),
  portfolio_id uuid references portfolios(id),
  telemetry_review_id uuid references telemetry_reviews(id),
  scoring_model text not null,
  current_weights jsonb not null,
  proposed_weights jsonb not null,
  rationale text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_weight_suggestions_user_status on scoring_weight_change_suggestions (user_id, status);
```

Explanation: keeps telemetry learning explainable and reversible.

## benchmarks

Purpose: benchmark definitions.

```sql
create table benchmarks (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  name text not null,
  benchmark_type text not null,
  asset_id uuid references assets(id),
  component_weights jsonb not null default '{}',
  base_currency text not null default 'USD',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_benchmarks_user on benchmarks (user_id);
create index idx_benchmarks_portfolio on benchmarks (portfolio_id);
```

Explanation: supports single-instrument and blended custom benchmarks.

## benchmark_performance

Purpose: benchmark return and risk series.

```sql
create table benchmark_performance (
  id uuid primary key,
  benchmark_id uuid not null references benchmarks(id),
  performance_date date not null,
  value numeric(28, 10),
  daily_return numeric(18, 10),
  cumulative_return numeric(18, 10),
  volatility numeric(18, 10),
  drawdown numeric(18, 10),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (benchmark_id, performance_date)
);

create index idx_benchmark_performance_date on benchmark_performance (benchmark_id, performance_date desc);
```

Explanation: avoids recomputing benchmark history on every dashboard load.

## portfolio_risk_metrics

Purpose: portfolio-level risk snapshots.

```sql
create table portfolio_risk_metrics (
  id uuid primary key,
  portfolio_id uuid not null references portfolios(id),
  metric_date date not null,
  volatility numeric(18, 10),
  max_drawdown numeric(18, 10),
  beta_to_benchmark numeric(18, 10),
  sharpe_ratio numeric(18, 10),
  concentration_score numeric(12, 6),
  single_position_max_pct numeric(12, 8),
  etf_overlap_score numeric(12, 6),
  currency_exposure jsonb not null default '{}',
  sector_exposure jsonb not null default '{}',
  geography_exposure jsonb not null default '{}',
  bond_duration numeric(12, 6),
  high_yield_exposure_pct numeric(12, 8),
  crypto_exposure_pct numeric(12, 8),
  risk_notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (portfolio_id, metric_date)
);

create index idx_portfolio_risk_metrics_portfolio_date on portfolio_risk_metrics (portfolio_id, metric_date desc);
```

Explanation: stores risk analytics snapshots for trend and recommendation use.

## asset_correlations

Purpose: rolling correlation estimates between assets.

```sql
create table asset_correlations (
  id uuid primary key,
  asset_id_a uuid not null references assets(id),
  asset_id_b uuid not null references assets(id),
  correlation_date date not null,
  lookback_days integer not null,
  correlation numeric(18, 10) not null,
  method text not null default 'pearson_daily_returns',
  created_at timestamptz not null default now(),
  unique (asset_id_a, asset_id_b, correlation_date, lookback_days)
);

create index idx_asset_correlations_a_date on asset_correlations (asset_id_a, correlation_date desc);
create index idx_asset_correlations_b_date on asset_correlations (asset_id_b, correlation_date desc);
```

Explanation: used for diversification and risk analytics. Application code should store asset pairs in canonical order to avoid duplicates.

## scenario_tests

Purpose: scenario definitions.

```sql
create table scenario_tests (
  id uuid primary key,
  user_id uuid references users(id),
  portfolio_id uuid references portfolios(id),
  name text not null,
  scenario_type text not null,
  description text,
  assumptions jsonb not null default '{}',
  is_template boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scenario_tests_user on scenario_tests (user_id);
create index idx_scenario_tests_portfolio on scenario_tests (portfolio_id);
```

Explanation: stores reusable scenarios such as rates up, recession, inflation shock, or crypto drawdown.

## scenario_results

Purpose: scenario run outputs.

```sql
create table scenario_results (
  id uuid primary key,
  scenario_test_id uuid not null references scenario_tests(id),
  portfolio_id uuid not null references portfolios(id),
  run_date timestamptz not null default now(),
  estimated_portfolio_impact numeric(28, 10),
  estimated_portfolio_impact_pct numeric(18, 10),
  asset_impacts jsonb not null default '[]',
  asset_class_impacts jsonb not null default '{}',
  explanation text,
  created_at timestamptz not null default now()
);

create index idx_scenario_results_test_date on scenario_results (scenario_test_id, run_date desc);
create index idx_scenario_results_portfolio_date on scenario_results (portfolio_id, run_date desc);
```

Explanation: stores results separately from definitions for historical comparison.

## allocation_models

Purpose: target allocation models.

```sql
create table allocation_models (
  id uuid primary key,
  user_id uuid references users(id),
  name text not null,
  risk_profile text,
  base_currency text not null default 'USD',
  target_allocations jsonb not null,
  constraints jsonb not null default '{}',
  description text,
  is_template boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_allocation_models_user on allocation_models (user_id);
create index idx_allocation_models_template on allocation_models (is_template, risk_profile);
```

Explanation: supports ETF-first allocation templates and user-specific models.

## allocation_recommendations

Purpose: initial capital and rebalancing recommendations.

```sql
create table allocation_recommendations (
  id uuid primary key,
  user_id uuid not null references users(id),
  portfolio_id uuid references portfolios(id),
  allocation_model_id uuid references allocation_models(id),
  recommendation_type text not null,
  input_capital_amount numeric(28, 10),
  input_currency text,
  recommended_allocations jsonb not null,
  recommended_orders jsonb not null default '[]',
  rationale text,
  warnings jsonb not null default '[]',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index idx_allocation_recommendations_user_created on allocation_recommendations (user_id, created_at desc);
create index idx_allocation_recommendations_portfolio_created on allocation_recommendations (portfolio_id, created_at desc);
```

Explanation: stores allocation engine outputs without executing trades.

## 5. Suggested Relationship Additions

After all tables exist, add the nullable FK from `portfolios.target_allocation_model_id`:

```sql
alter table portfolios
  add constraint fk_portfolios_target_allocation_model
  foreign key (target_allocation_model_id)
  references allocation_models(id);
```

## 6. Supabase-Isolated Enhancements

These can live in Supabase-specific migration files:

- Enable `pgcrypto` for `gen_random_uuid()`.
- Add RLS policies by `users.auth_provider_user_id`.
- Add `updated_at` triggers.
- Add storage bucket policies.
- Add Supabase Auth user creation webhook to create an app `users` row.

Keep these separate from the portable schema so Cloud SQL migration remains straightforward.

## 7. Implementation Notes

- Application repositories should query these tables through a provider-agnostic data access layer.
- UI components should never call Supabase directly.
- Store provider payloads in `raw_payload`, `raw_profile`, or `metadata`, but keep first-class fields for important business logic.
- Keep AI-generated outputs tied to structured input evidence through `supporting_data`, `score_inputs`, and report tables.
- Prefer application-generated UUIDs for maximum portability.

