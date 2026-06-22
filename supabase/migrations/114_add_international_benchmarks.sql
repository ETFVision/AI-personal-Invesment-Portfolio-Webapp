insert into benchmarks (benchmark_key, name, benchmark_type, symbol, currency, base_value, components, provider_primary, metadata, is_active)
values
  ('developed_ex_us', 'Developed ex-US', 'equity', 'EFA', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Developed ex-US ETF proxy"}'::jsonb, true),
  ('emerging_markets', 'Emerging markets', 'equity', 'EEM', 'USD', 100, '[]'::jsonb, 'financial_modeling_prep', '{"benchmark":"Emerging markets ETF proxy"}'::jsonb, true)
on conflict (benchmark_key) do update
set
  name = excluded.name,
  benchmark_type = excluded.benchmark_type,
  symbol = excluded.symbol,
  currency = excluded.currency,
  base_value = excluded.base_value,
  components = excluded.components,
  provider_primary = excluded.provider_primary,
  metadata = excluded.metadata,
  is_active = excluded.is_active;
