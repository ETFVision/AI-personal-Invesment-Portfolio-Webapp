-- SPLG changed ticker to SPYM. Keep the existing instrument identity so
-- historical prices, metrics, watchlist references and recommendations remain linked.
do $$
declare
  splg_id uuid;
  spym_id uuid;
begin
  select id into splg_id from instruments where upper(symbol) = 'SPLG' limit 1;
  select id into spym_id from instruments where upper(symbol) = 'SPYM' limit 1;

  if splg_id is not null and spym_id is null then
    update instruments
    set
      symbol = 'SPYM',
      name = 'State Street SPDR Portfolio S&P 500 ETF',
      provider_primary = coalesce(provider_primary, 'financial_modeling_prep'),
      provider_metadata = coalesce(provider_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'tickerChange',
          jsonb_build_object(
            'previousSymbol', 'SPLG',
            'currentSymbol', 'SPYM',
            'effectiveDate', '2025-10-31',
            'source', 'State Street / OCC ticker change'
          )
        ),
      updated_at = now()
    where id = splg_id;

    update instrument_prices
    set symbol = 'SPYM'
    where instrument_id = splg_id
      and upper(symbol) = 'SPLG';
  end if;
end $$;
