-- Lightweight fundamentals overview source for the /fundamentals page.
--
-- This view keeps overview rendering away from full statements, ratios and
-- detailed trend rows. Full fundamentals remain available from instrument detail.

create or replace view fundamentals_overview_metrics as
with latest_scores as (
  select distinct on (instrument_id)
    instrument_id,
    symbol,
    as_of_date,
    growth_score,
    profitability_score,
    valuation_score,
    balance_sheet_score,
    cash_flow_score,
    quality_score,
    overall_fundamental_score,
    score_confidence
  from fundamental_scores
  order by instrument_id, as_of_date desc
),
latest_trends as (
  select distinct on (instrument_id)
    instrument_id,
    symbol,
    as_of_date,
    overall_trend_score,
    overall_confidence_score,
    overall_trend_direction,
    improving_metrics_count,
    deteriorating_metrics_count,
    stable_metrics_count,
    volatile_metrics_count,
    insufficient_data_metrics_count,
    growth_trend_score,
    margin_trend_score,
    profitability_trend_score,
    balance_sheet_trend_score,
    quality_trend_score,
    warnings
  from fundamental_trend_summaries
  order by instrument_id, as_of_date desc
),
latest_profiles as (
  select distinct on (instrument_id)
    instrument_id,
    symbol,
    company_name,
    sector,
    industry,
    country,
    exchange,
    currency,
    market_cap,
    beta,
    ipo_date,
    employees,
    last_refreshed_at,
    provider
  from company_profiles
  order by instrument_id, last_refreshed_at desc nulls last
)
select
  i.id as instrument_id,
  i.symbol,
  i.name,
  i.asset_class,
  i.asset_category,
  i.etf_category,
  i.instrument_type,
  i.sector as instrument_sector,
  i.industry as instrument_industry,
  i.canonical_sector,
  i.canonical_themes,
  i.taxonomy_is_manual_override,
  i.taxonomy_review_status,
  i.geography,
  i.currency as instrument_currency,
  i.exchange as instrument_exchange,
  i.watchlist_tier,
  i.benchmark_tags,
  i.thematic_tags,
  i.risk_category,
  i.volatility_bucket,
  i.duration_category,
  i.treasury_classification,
  i.inflation_linked,
  i.credit_quality,
  i.geo_exposure,
  i.rate_sensitivity,
  i.inflation_sensitivity,
  i.recession_sensitivity,
  i.liquidity_role,
  i.crypto_classification,
  i.metadata_last_refreshed_at,
  i.provider_primary,
  i.source_type,
  i.is_active,
  p.company_name,
  p.sector as profile_sector,
  p.industry as profile_industry,
  p.country as profile_country,
  p.exchange as profile_exchange,
  p.currency as profile_currency,
  p.market_cap,
  p.beta,
  p.ipo_date,
  p.employees,
  p.last_refreshed_at,
  p.provider as profile_provider,
  s.as_of_date as score_as_of_date,
  s.growth_score,
  s.profitability_score,
  s.valuation_score,
  s.balance_sheet_score,
  s.cash_flow_score,
  s.quality_score,
  s.overall_fundamental_score,
  s.score_confidence,
  t.as_of_date as trend_as_of_date,
  t.overall_trend_score,
  t.overall_confidence_score,
  t.overall_trend_direction,
  t.improving_metrics_count,
  t.deteriorating_metrics_count,
  t.stable_metrics_count,
  t.volatile_metrics_count,
  t.insufficient_data_metrics_count,
  t.growth_trend_score,
  t.margin_trend_score,
  t.profitability_trend_score,
  t.balance_sheet_trend_score,
  t.quality_trend_score,
  t.warnings as trend_warnings
from instruments i
left join latest_profiles p on p.instrument_id = i.id
left join latest_scores s on s.instrument_id = i.id
left join latest_trends t on t.instrument_id = i.id
where i.is_active = true
  and i.asset_class = 'stock';
