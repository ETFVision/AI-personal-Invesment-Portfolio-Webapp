-- Fix existing GDELT DOC query groups to use parenthesized OR blocks.
-- GDELT accepts boolean OR lists as "(a OR b OR c)", so this migration
-- updates databases that already ran migration 025 with unwrapped OR queries.

update gdelt_query_groups
set query_text = case query_key
  when 'macro_rates_policy' then '("Federal Reserve" OR "interest rates" OR "Treasury yields" OR "central bank policy" OR "rate cuts" OR "rate hikes")'
  when 'inflation_prices' then '(inflation OR CPI OR "PCE inflation" OR "food prices" OR "energy prices")'
  when 'growth_recession' then '("recession risk" OR "GDP growth" OR "economic slowdown" OR unemployment OR "jobs report")'
  when 'currency_usd' then '("US dollar" OR "dollar index" OR "currency volatility" OR "FX markets")'
  when 'geopolitical_risk' then '(sanctions OR war OR conflict OR "military escalation" OR "election risk" OR "political instability")'
  when 'trade_supply_chain' then '(tariffs OR "export controls" OR "supply chain disruption" OR "trade war" OR "semiconductor restrictions")'
  when 'energy_commodities' then '("oil prices" OR OPEC OR "crude oil supply" OR "natural gas" OR "commodity shock")'
  when 'global_credit_stress' then '("banking stress" OR "sovereign debt" OR "fiscal crisis" OR "debt ceiling" OR "credit stress")'
  else query_text
end
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
