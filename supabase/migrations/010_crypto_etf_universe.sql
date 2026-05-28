-- Add investable crypto ETF proxies and keep raw crypto assets as inactive reference instruments.

insert into instruments (
  symbol,
  name,
  asset_class,
  instrument_type,
  sector,
  industry,
  geography,
  currency,
  exchange,
  watchlist_tier,
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
  crypto_classification,
  provider_primary,
  provider_metadata,
  is_active,
  source_type
)
values
  ('IBIT', 'iShares Bitcoin Trust ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NYSE Arca', null, '["bitcoin"]'::jsonb, '["crypto", "spot-bitcoin"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-bitcoin', null, '{"underlying":"Bitcoin"}'::jsonb, true, 'seeded'),
  ('FBTC', 'Fidelity Wise Origin Bitcoin Fund', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'Cboe BZX', null, '["bitcoin"]'::jsonb, '["crypto", "spot-bitcoin"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-bitcoin', null, '{"underlying":"Bitcoin"}'::jsonb, true, 'seeded'),
  ('ETHA', 'iShares Ethereum Trust ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NASDAQ', null, '[]'::jsonb, '["crypto", "spot-ethereum"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-ethereum', null, '{"underlying":"Ethereum"}'::jsonb, true, 'seeded'),
  ('FETH', 'Fidelity Ethereum Fund', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'Cboe BZX', null, '[]'::jsonb, '["crypto", "spot-ethereum"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-ethereum', null, '{"underlying":"Ethereum"}'::jsonb, true, 'seeded'),
  ('BSOL', 'Bitwise Solana Staking ETF', 'etf', 'crypto_etf', 'Digital Assets', 'Crypto ETF', 'United States', 'USD', 'NYSE Arca', null, '[]'::jsonb, '["crypto", "spot-solana"]'::jsonb, 'crypto', 'high', null, null, null, null, 'United States', null, null, null, 'crypto-exposure', 'spot-solana', null, '{"underlying":"Solana"}'::jsonb, true, 'seeded')
on conflict (symbol) do update set
  name = excluded.name,
  asset_class = excluded.asset_class,
  instrument_type = excluded.instrument_type,
  sector = excluded.sector,
  industry = excluded.industry,
  geography = excluded.geography,
  currency = excluded.currency,
  exchange = excluded.exchange,
  benchmark_tags = excluded.benchmark_tags,
  thematic_tags = excluded.thematic_tags,
  risk_category = excluded.risk_category,
  volatility_bucket = excluded.volatility_bucket,
  geo_exposure = excluded.geo_exposure,
  liquidity_role = excluded.liquidity_role,
  crypto_classification = excluded.crypto_classification,
  provider_metadata = excluded.provider_metadata,
  is_active = true;

update instruments
set is_active = false
where symbol in ('BTC', 'ETH', 'SOL')
  and asset_class = 'crypto';
