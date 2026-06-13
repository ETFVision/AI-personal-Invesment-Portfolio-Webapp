# ETFVision Database Schema

Last updated: 2026-06-13

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

### Security Master Tables

Primary migrations:

- `supabase/migrations/091_security_master_foundation.sql`
- `supabase/migrations/092_repair_security_master_links.sql`
- `supabase/migrations/093_sync_security_master_identifiers.sql`
- `supabase/migrations/094_security_master_etf_holding_mapping.sql`
- `supabase/migrations/095_backfill_internal_etf_underlying_securities.sql`
- `supabase/migrations/096_security_master_dual_run_qa.sql`
- `supabase/migrations/097_issuer_master_foundation.sql`
- `supabase/migrations/098_issuer_alias_normalization.sql`
- `supabase/migrations/099_clean_issuer_display_names.sql`
- `supabase/migrations/100_issuer_level_lookthrough_rollups.sql`
- `supabase/migrations/102_security_master_phase5_snapshot_identity.sql`
- `supabase/migrations/103_security_master_phase8_monitoring.sql`
- `supabase/migrations/104_security_master_phase6_corporate_actions.sql`
- `supabase/migrations/105_security_master_phase7_provider_reconciliation.sql`

| Table | Purpose |
|---|---|
| `securities_master` | Canonical security records for user-selectable instruments and internal ETF underlying securities. |
| `security_identifiers` | ISIN, CUSIP, FIGI, provider-symbol, exchange-symbol, and alias identifiers linked to canonical securities. |
| `security_aliases` | Explicit symbol/name/provider aliases used by the deterministic resolver. |
| `security_master_dual_run_reports` | Raw-symbol versus canonical security-ID QA report for portfolio look-through grouping. |
| `issuers` | Canonical company/fund issuer records used for issuer-level rollups. |
| `security_issuer_links` | Links securities to issuers with share-class/link-source metadata. |
| `issuer_aliases` | Approved issuer-name variants, such as `Alphabet` -> `Alphabet Inc`. |
| `issuer_duplicate_candidates` | Review queue for possible issuer duplicates; not an automatic merge table. |
| `security_master_mapping_gap_report` | Exportable QA view listing missing mappings, stale identifier refreshes, unmapped ETF holdings and open issuer duplicate candidates. |
| `security_corporate_actions` | Corporate-action readiness event log for ticker changes, mergers, spin-offs, share-class changes, ETF name changes, ETF closures and delistings. |
| `security_lifecycle_links` | Predecessor/successor security links created from approved corporate actions. |
| `security_provider_identifier_observations` | Provider-level identifier observations for future multi-provider reconciliation. |
| `security_identifier_conflicts` | Review queue for conflicting identifiers, provider symbols, names, exchanges and ambiguous provider mappings. |

Important instrument columns added by Security Master:

| Column | Purpose |
|---|---|
| `security_id` | Optional FK-style link from user-selectable instrument to canonical security. |
| `isin`, `cusip`, `figi`, `provider_symbol` | Normalized identifier fields promoted from provider metadata where available. |
| `identifier_quality_score`, `identifier_last_refreshed_at`, `coverage_status` | Identifier freshness/quality diagnostics. |
| `is_user_selectable`, `is_internal_only`, `is_alpha_enabled` | Distinguish visible product universe from internal ETF-underlying securities. |

Security Master semantics:

- Do not make ticker globally unique across all securities.
- `instruments` remains the source of truth for selectable products and app routes.
- `securities_master` is the identity layer for mapping and overlap.
- `issuers` is the company/fund issuer rollup layer above securities.
- `issuer_duplicate_candidates` should be reviewed manually and converted into `issuer_aliases` only when confirmed.
- Corporate-action and provider reconciliation tables are currently readiness/QA layers. They do not automatically rewrite instruments, history, recommendations or telemetry.
- `get_security_master_health_snapshot()` powers Admin/Data Sources Security Master QA coverage.

### Fixed Income Profile Tables

Bond and fixed-income page inputs are stored mainly in `bond_profiles`, with additional fallback metadata on `instruments`.

Primary migrations:

- `supabase/migrations/008_instrument_universe.sql`
- `supabase/migrations/016_bond_intelligence_foundation.sql`
- `supabase/migrations/017_bond_profile_enrichment.sql`

`bond_profiles` columns:

| Column | Purpose |
|---|---|
| `instrument_id` | Primary key and FK to `instruments.id`. |
| `duration_category` | Duration bucket, such as `ultra-short`, `short`, `intermediate`, `long`, or `short/intermediate`. |
| `treasury_classification` | Bond type/classification, such as `treasury`, `aggregate`, `corporate`, `high yield`, `inflation-linked`, or `international`. |
| `inflation_linked` | Whether the ETF is explicitly inflation-linked/TIPS-like. |
| `credit_quality` | Credit quality bucket, such as `government`, `investment grade`, `mixed investment grade`, or `high yield`. |
| `geo_exposure` | Bond geography, such as `US`, `global`, or `international`. |
| `rate_sensitivity` | Low/medium/high rate sensitivity classification. |
| `inflation_sensitivity` | Inflation sensitivity label used by fixed-income scenarios. |
| `recession_sensitivity` | Recession hedge behavior, such as `positive`, `mixed`, or `negative`. |
| `liquidity_role` | Role text such as `cash-like stability`, `core stability`, `recession hedge`, or `income`. |
| `currency` | Bond currency, usually `USD` for current universe. |
| `sec_yield`, `distribution_yield`, `yield_to_maturity`, `yield_as_of_date` | Yield fields where available. |
| `effective_duration`, `average_maturity`, `spread_duration`, `option_adjusted_spread` | Duration/spread risk fields where available. |
| `expense_ratio` | Fund expense ratio where available. |
| `is_manual_override` | Whether the profile was manually overridden. |
| `provider_metadata` | Provider or seeded metadata payload. |

`BondProfileService` can also use seeded fallback profiles for key bond ETFs such as `SGOV`, `BIL`, `SHY`, `IEF`, `TLT`, `BND`, `AGG`, `TIP`, `LQD`, `HYG`, and `BNDX` when provider/profile rows are incomplete.

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

Primary migrations:

- `supabase/migrations/051_etf_lookthrough_exposure.sql`
- `supabase/migrations/052_portfolio_lookthrough_holdings.sql`

Primary repository:

- `src/infrastructure/repositories/supabase/SupabaseEtfExposureRepository.ts`

### Provider ETF Exposure Tables

| Table | Key columns | Purpose | Unique key |
|---|---|---|---|
| `etf_sector_exposures` | `etf_instrument_id`, `etf_symbol`, `sector`, `exposure_weight`, `as_of_date`, `source_provider`, `provider_metadata` | Provider ETF sector allocation rows. | `etf_instrument_id`, `sector`, `as_of_date`, `source_provider` |
| `etf_country_exposures` | `etf_instrument_id`, `etf_symbol`, `country`, `exposure_weight`, `as_of_date`, `source_provider`, `provider_metadata` | Provider ETF geography/country allocation rows. | `etf_instrument_id`, `country`, `as_of_date`, `source_provider` |
| `etf_top_holdings` | `etf_instrument_id`, `etf_symbol`, `holding_symbol`, `holding_name`, `holding_weight`, `as_of_date`, `source_provider`, `provider_metadata` | Provider ETF underlying top holdings. | `etf_instrument_id`, `holding_symbol`, `as_of_date`, `source_provider` |
| `etf_theme_exposures` | `etf_instrument_id`, `etf_symbol`, `theme`, `exposure_weight`, `confidence_score`, `derivation_method`, `as_of_date` | Derived ETF theme exposures, usually from sector/theme mapping. | `etf_instrument_id`, `theme`, `as_of_date`, `derivation_method` |

Exposure weights should be interpreted as provider weights and normalized by the look-through service before use. Providers can return weights as decimals or percentages; the service normalizes values above `1` by dividing by `100`.

### Portfolio Look-Through Output Tables

| Table | Key columns | Purpose | Unique key |
|---|---|---|---|
| `portfolio_lookthrough_exposures` | `portfolio_id`, `exposure_type`, `exposure_name`, `exposure_weight`, `direct_weight`, `etf_lookthrough_weight`, `as_of_date` | Current portfolio exposure output for sector, country, currency, theme, and top-holding views. | `portfolio_id`, `exposure_type`, `exposure_name`, `as_of_date` |
| `portfolio_lookthrough_holdings` | `portfolio_id`, `as_of_date`, `holding_symbol`, `holding_name`, `direct_weight`, `indirect_weight`, `total_weight`, `source_etfs`, `inputs_snapshot` | Direct plus indirect stock-level exposure from ETF holdings. | `portfolio_id`, `holding_symbol`, `as_of_date` |
| `etf_exposure_refresh_logs` | `job_name`, `started_at`, `completed_at`, `status`, `etfs_requested`, `etfs_refreshed`, `sector_rows`, `country_rows`, `top_holding_rows`, `error_message`, `metadata` | ETF exposure refresh diagnostics. | Log table; no business unique key. |

Security Master additions:

- `etf_top_holdings` carries `holding_security_id`, mapping status/confidence/source, and mapping timestamp.
- `portfolio_lookthrough_holdings` carries `holding_security_id`, `holding_issuer_id`, `holding_issuer_name`, mapping status/confidence, and `inputs_snapshot.securityBreakdown`.
- `portfolio_lookthrough_exposures` carries `exposure_security_id`, `exposure_issuer_id`, and `exposure_issuer_name` for top-holding rows.

### Look-Through Allocation Rules

The application must distinguish ETF taxonomy from portfolio exposure:

- `instruments.etf_category` classifies the ETF product itself, such as `US_BROAD_MARKET`, `BOND`, `GOLD_PRECIOUS_METALS`, or `TECHNOLOGY`.
- Portfolio sector allocation must use look-through exposure, not `etf_category`.
- Priority order for portfolio sector allocation:
  1. ETF holdings look-through sector aggregation where available.
  2. Provider ETF sector breakdown where holdings-level sector aggregation is unavailable.
  3. ETF category fallback only if no sector exposure exists; this should be treated as estimated/limited.

Example: `VOO` can be categorized as `US_BROAD_MARKET` for ETF taxonomy, but its portfolio sector allocation should reflect underlying exposure across Technology, Financials, Healthcare, Industrials, and other sectors.

### Exposure Semantics

- Sector, country, currency and top-holding exposures are allocation-style views and should generally add up to approximately 100% after normalization, subject to missing provider coverage and rounding.
- Theme exposures are tag-style views. They can exceed 100% because a holding can map to multiple themes. Do not treat theme exposure as a mutually exclusive allocation pie.
- `direct_weight` is exposure from directly held instruments.
- `etf_lookthrough_weight` or `indirect_weight` is exposure inherited through ETF holdings.
- `total_weight` in `portfolio_lookthrough_holdings` combines direct and indirect stock-level exposure.
- Issuer-level grouped rows preserve security-level drill-down in `inputs_snapshot.securityBreakdown`.
- Direct portfolio holdings should retain their direct asset class for display even if the same issuer/security was first encountered through ETF look-through.

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
| `recommendation_runs`, `instrument_recommendations`, `recommendation_history` | Stored deterministic insight outputs and history. Phase 5 adds optional `security_id` and `issuer_id` to current and historical recommendation rows while preserving historical symbols. |
| `portfolio_review_runs`, `portfolio_review_reports` | Portfolio Review run metadata and report JSON. Phase 5 adds `security_identity_snapshot` metadata for the identity basis used by look-through reports. |
| `telemetry_recommendation_*`, `telemetry_market_vision_*`, `telemetry_portfolio_review_*` | Snapshots and mature outcome evaluations. Phase 5 adds optional `security_id` and `issuer_id` to `telemetry_recommendation_snapshots` and `security_identity_snapshot` to portfolio review telemetry snapshots. |
| assistant tables | Conversations, messages, usage/cost tracking. Exact names should be verified in assistant migrations/repositories. |

Security Master Phase 5 identity propagation is additive:

- `instrument_recommendations.security_id`, `instrument_recommendations.issuer_id`
- `recommendation_history.security_id`, `recommendation_history.issuer_id`
- `telemetry_recommendation_snapshots.security_id`, `telemetry_recommendation_snapshots.issuer_id`
- `portfolio_review_reports.security_identity_snapshot`
- `telemetry_portfolio_review_snapshots.security_identity_snapshot`

Database triggers fill recommendation and telemetry identity fields from `instrument_id` / `symbol` on future writes. These fields support ticker/share-class continuity but do not change scoring, labels, or telemetry outcome calculations.

## Operations

| Table | Purpose |
|---|---|
| `job_runs` | Structured log for protected job endpoint runs. |
| `job_locks` | Overlap lock by job name. |
| Provider-specific log tables | Detailed logs for FMP, FRED, NewsData, GDELT, fundamentals, ETF exposure. |

## RLS and Access

Most tables enable RLS in migrations. Many reference tables allow authenticated read access broadly, while user/portfolio tables are scoped to the authenticated user. Server jobs use `SUPABASE_SERVICE_ROLE_KEY` through `createSupabaseAdminClient`.

Documentation gap: a full RLS policy audit should be performed before commercialization because this document summarizes intent rather than proving every policy.
