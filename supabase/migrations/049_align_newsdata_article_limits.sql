-- Align existing NewsData query groups with the app default:
-- 8 query groups x 10 articles per group = 80 articles per refresh.

alter table newsdata_query_groups
  alter column max_articles_per_run set default 10;

update newsdata_query_groups
set
  max_articles_per_run = 10,
  updated_at = now()
where query_key in (
  'macro_rates_policy',
  'inflation_prices',
  'growth_recession',
  'currency_usd',
  'geopolitical_risk',
  'trade_supply_chain',
  'energy_commodities',
  'global_credit_stress'
);
