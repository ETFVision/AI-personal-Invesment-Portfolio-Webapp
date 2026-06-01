-- Bond Intelligence Foundation seed normalization.
-- Curated classifications stay deterministic and should not be overwritten by provider metadata refreshes.

insert into instruments (
  symbol,
  name,
  asset_class,
  instrument_type,
  sector,
  industry,
  canonical_sector,
  canonical_themes,
  geography,
  currency,
  exchange,
  benchmark_tags,
  thematic_tags,
  risk_category,
  volatility_bucket,
  duration_category,
  treasury_classification,
  inflation_linked,
  credit_quality,
  geo_exposure,
  rate_sensitivity,
  inflation_sensitivity,
  recession_sensitivity,
  liquidity_role,
  provider_metadata,
  source_type,
  is_active
)
values
  (
    'BNDX',
    'Vanguard Total International Bond ETF',
    'bond_etf',
    'etf',
    'Fixed Income',
    'Bond ETF',
    'Bonds / Fixed Income',
    '["Global Diversification", "Interest Rate Sensitive"]'::jsonb,
    'Global',
    'USD',
    'NASDAQ',
    '[]'::jsonb,
    '["bond", "global", "stability"]'::jsonb,
    'fixed_income',
    'low',
    'intermediate',
    'international',
    false,
    'investment grade',
    'global',
    'medium',
    'moderate',
    'mixed',
    'international diversification',
    '{}'::jsonb,
    'seeded',
    true
  )
on conflict (symbol) do update
set
  name = excluded.name,
  asset_class = excluded.asset_class,
  instrument_type = excluded.instrument_type,
  sector = excluded.sector,
  industry = excluded.industry,
  canonical_sector = case when instruments.taxonomy_is_manual_override then instruments.canonical_sector else excluded.canonical_sector end,
  canonical_themes = case when instruments.taxonomy_is_manual_override then instruments.canonical_themes else excluded.canonical_themes end,
  geography = excluded.geography,
  currency = excluded.currency,
  exchange = excluded.exchange,
  thematic_tags = excluded.thematic_tags,
  risk_category = excluded.risk_category,
  volatility_bucket = excluded.volatility_bucket,
  duration_category = excluded.duration_category,
  treasury_classification = excluded.treasury_classification,
  inflation_linked = excluded.inflation_linked,
  credit_quality = excluded.credit_quality,
  geo_exposure = excluded.geo_exposure,
  rate_sensitivity = excluded.rate_sensitivity,
  inflation_sensitivity = excluded.inflation_sensitivity,
  recession_sensitivity = excluded.recession_sensitivity,
  liquidity_role = excluded.liquidity_role,
  source_type = excluded.source_type,
  is_active = excluded.is_active;

with seeded(symbol, duration_category, bond_type, inflation_linked, credit_quality, geo_exposure, rate_sensitivity, inflation_sensitivity, recession_sensitivity, liquidity_role, currency) as (
  values
    ('SGOV', 'ultra-short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'cash-like stability', 'USD'),
    ('BIL', 'ultra-short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'cash-like stability', 'USD'),
    ('SHY', 'short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'stability', 'USD'),
    ('IEF', 'intermediate', 'treasury', false, 'government', 'US', 'medium', 'moderate negative', 'positive', 'recession hedge', 'USD'),
    ('TLT', 'long', 'treasury', false, 'government', 'US', 'high', 'negative', 'positive', 'long-duration recession hedge', 'USD'),
    ('BND', 'intermediate', 'aggregate', false, 'mixed investment grade', 'US', 'medium', 'moderate negative', 'mixed', 'core stability', 'USD'),
    ('AGG', 'intermediate', 'aggregate', false, 'mixed investment grade', 'US', 'medium', 'moderate negative', 'mixed', 'core stability', 'USD'),
    ('TIP', 'intermediate', 'inflation-linked', true, 'government', 'US', 'medium', 'positive', 'mixed', 'inflation hedge', 'USD'),
    ('LQD', 'intermediate', 'corporate', false, 'investment grade', 'US', 'medium', 'moderate negative', 'negative', 'income', 'USD'),
    ('HYG', 'short/intermediate', 'high yield', false, 'high yield', 'US', 'medium', 'moderate', 'negative', 'income with credit risk', 'USD'),
    ('BNDX', 'intermediate', 'international', false, 'investment grade', 'global', 'medium', 'moderate', 'mixed', 'international diversification', 'USD')
)
update instruments i
set
  asset_class = 'bond_etf',
  canonical_sector = case when i.taxonomy_is_manual_override then i.canonical_sector else 'Bonds / Fixed Income' end,
  canonical_themes = case
    when i.taxonomy_is_manual_override then i.canonical_themes
    when seeded.symbol in ('SGOV', 'BIL') then '["Short Duration / Cash-like", "Treasury Bonds", "Interest Rate Sensitive"]'::jsonb
    when seeded.symbol = 'TIP' then '["Inflation Hedge", "Treasury Bonds", "Interest Rate Sensitive"]'::jsonb
    when seeded.symbol = 'HYG' then '["Dividend / Income", "Corporate Credit", "High Yield Credit"]'::jsonb
    when seeded.symbol = 'LQD' then '["Dividend / Income", "Corporate Credit", "Interest Rate Sensitive"]'::jsonb
    when seeded.symbol = 'BNDX' then '["Global Diversification", "Interest Rate Sensitive"]'::jsonb
    else '["Recession Hedge", "Treasury Bonds", "Interest Rate Sensitive"]'::jsonb
  end,
  duration_category = seeded.duration_category,
  treasury_classification = seeded.bond_type,
  inflation_linked = seeded.inflation_linked,
  credit_quality = seeded.credit_quality,
  geo_exposure = seeded.geo_exposure,
  rate_sensitivity = seeded.rate_sensitivity,
  inflation_sensitivity = seeded.inflation_sensitivity,
  recession_sensitivity = seeded.recession_sensitivity,
  liquidity_role = seeded.liquidity_role,
  currency = seeded.currency
from seeded
where i.symbol = seeded.symbol;

insert into bond_profiles (
  instrument_id,
  duration_category,
  treasury_classification,
  inflation_linked,
  credit_quality,
  geo_exposure,
  rate_sensitivity,
  inflation_sensitivity,
  recession_sensitivity,
  liquidity_role,
  currency,
  provider_metadata
)
select
  i.id,
  seeded.duration_category,
  seeded.bond_type,
  seeded.inflation_linked,
  seeded.credit_quality,
  seeded.geo_exposure,
  seeded.rate_sensitivity,
  seeded.inflation_sensitivity,
  seeded.recession_sensitivity,
  seeded.liquidity_role,
  seeded.currency,
  jsonb_build_object('source', 'seeded_bond_intelligence_foundation')
from (
  values
    ('SGOV', 'ultra-short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'cash-like stability', 'USD'),
    ('BIL', 'ultra-short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'cash-like stability', 'USD'),
    ('SHY', 'short', 'treasury', false, 'government', 'US', 'low', 'low', 'positive', 'stability', 'USD'),
    ('IEF', 'intermediate', 'treasury', false, 'government', 'US', 'medium', 'moderate negative', 'positive', 'recession hedge', 'USD'),
    ('TLT', 'long', 'treasury', false, 'government', 'US', 'high', 'negative', 'positive', 'long-duration recession hedge', 'USD'),
    ('BND', 'intermediate', 'aggregate', false, 'mixed investment grade', 'US', 'medium', 'moderate negative', 'mixed', 'core stability', 'USD'),
    ('AGG', 'intermediate', 'aggregate', false, 'mixed investment grade', 'US', 'medium', 'moderate negative', 'mixed', 'core stability', 'USD'),
    ('TIP', 'intermediate', 'inflation-linked', true, 'government', 'US', 'medium', 'positive', 'mixed', 'inflation hedge', 'USD'),
    ('LQD', 'intermediate', 'corporate', false, 'investment grade', 'US', 'medium', 'moderate negative', 'negative', 'income', 'USD'),
    ('HYG', 'short/intermediate', 'high yield', false, 'high yield', 'US', 'medium', 'moderate', 'negative', 'income with credit risk', 'USD'),
    ('BNDX', 'intermediate', 'international', false, 'investment grade', 'global', 'medium', 'moderate', 'mixed', 'international diversification', 'USD')
) as seeded(symbol, duration_category, bond_type, inflation_linked, credit_quality, geo_exposure, rate_sensitivity, inflation_sensitivity, recession_sensitivity, liquidity_role, currency)
join instruments i on i.symbol = seeded.symbol
on conflict (instrument_id) do update
set
  duration_category = excluded.duration_category,
  treasury_classification = excluded.treasury_classification,
  inflation_linked = excluded.inflation_linked,
  credit_quality = excluded.credit_quality,
  geo_exposure = excluded.geo_exposure,
  rate_sensitivity = excluded.rate_sensitivity,
  inflation_sensitivity = excluded.inflation_sensitivity,
  recession_sensitivity = excluded.recession_sensitivity,
  liquidity_role = excluded.liquidity_role,
  currency = excluded.currency,
  provider_metadata = bond_profiles.provider_metadata || excluded.provider_metadata;

create index if not exists idx_bond_profiles_credit_quality on bond_profiles (credit_quality);
create index if not exists idx_bond_profiles_type on bond_profiles (treasury_classification);
