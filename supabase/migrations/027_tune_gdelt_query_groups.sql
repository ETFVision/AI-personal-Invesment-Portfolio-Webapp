-- Tune GDELT query groups for more reliable broad macro/news coverage.
-- Keep queries intentionally compact; provider fallback can split OR terms when
-- a combined GDELT DOC query is slow or unavailable.

update gdelt_query_groups
set
  query_text = case query_key
    when 'macro_rates_policy' then '("Federal Reserve" OR "interest rates" OR "Treasury yields")'
    when 'inflation_prices' then '(inflation OR CPI OR "PCE inflation")'
    when 'growth_recession' then '("recession risk" OR "economic slowdown" OR "jobs report")'
    when 'currency_usd' then '("US dollar" OR "dollar index" OR "currency markets")'
    when 'geopolitical_risk' then '(sanctions OR war OR conflict OR "military escalation")'
    when 'trade_supply_chain' then '(tariffs OR "export controls" OR "supply chain")'
    when 'energy_commodities' then '("oil prices" OR OPEC OR "natural gas")'
    when 'global_credit_stress' then '("banking stress" OR "sovereign debt" OR "credit stress")'
    else query_text
  end,
  max_articles_per_run = 8,
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
