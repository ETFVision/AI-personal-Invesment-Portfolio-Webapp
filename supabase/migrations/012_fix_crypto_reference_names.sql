-- Keep inactive raw crypto references clear and separate from investable crypto ETF proxies.

update instruments
set
  name = case symbol
    when 'BTC' then 'Bitcoin'
    when 'ETH' then 'Ethereum'
    when 'SOL' then 'Solana'
    else name
  end,
  asset_class = 'crypto',
  instrument_type = 'crypto',
  sector = 'Digital Assets',
  industry = case symbol
    when 'BTC' then 'Bitcoin'
    when 'ETH' then 'Ethereum'
    when 'SOL' then 'Solana'
    else industry
  end,
  exchange = 'Crypto',
  geography = 'Global',
  currency = 'USD',
  risk_category = 'crypto',
  volatility_bucket = 'high',
  crypto_classification = case symbol
    when 'BTC' then 'store-of-value'
    else 'smart-contract'
  end,
  geo_exposure = 'Global',
  is_active = false,
  provider_metadata = case symbol
    when 'BTC' then '{"chain":"Bitcoin"}'::jsonb
    when 'ETH' then '{"chain":"Ethereum"}'::jsonb
    when 'SOL' then '{"chain":"Solana"}'::jsonb
    else provider_metadata
  end
where symbol in ('BTC', 'ETH', 'SOL');
