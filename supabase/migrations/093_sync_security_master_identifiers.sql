-- Synchronize security-master identifiers from normalized instrument metadata.
--
-- Metadata refresh can improve ISIN/CUSIP/FIGI coverage after the additive
-- security master foundation is already in place. This helper promotes the
-- latest normalized instrument identifiers into securities_master and
-- security_identifiers without changing app calculations.

create or replace function public.sync_security_master_identifiers_from_instruments()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update securities_master sm
  set
    isin = coalesce(nullif(sm.isin, ''), nullif(i.isin, '')),
    cusip = coalesce(nullif(sm.cusip, ''), nullif(i.cusip, '')),
    figi = coalesce(nullif(sm.figi, ''), nullif(i.figi, '')),
    identifier_quality_score = greatest(
      coalesce(sm.identifier_quality_score, 0),
      case
        when nullif(i.figi, '') is not null then 98
        when nullif(i.isin, '') is not null then 95
        when nullif(i.cusip, '') is not null then 90
        when i.exchange is not null and i.symbol is not null then 75
        else 55
      end
    ),
    updated_at = now()
  from instruments i
  where sm.id = i.security_id
    and i.is_active = true
    and i.security_id is not null;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'SYMBOL', upper(i.symbol), 'etfvision', true, 80, '{}'::jsonb
  from instruments i
  where i.is_active = true and i.security_id is not null and i.symbol is not null
  on conflict do nothing;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'EXCHANGE_SYMBOL', concat_ws(':', i.exchange, upper(i.symbol)), 'etfvision', true, 82, '{}'::jsonb
  from instruments i
  where i.is_active = true and i.security_id is not null and i.symbol is not null and i.exchange is not null
  on conflict do nothing;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'PROVIDER_SYMBOL', upper(coalesce(i.provider_symbol, i.symbol)), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 82, coalesce(i.provider_metadata, '{}'::jsonb)
  from instruments i
  where i.is_active = true and i.security_id is not null and coalesce(i.provider_symbol, i.symbol) is not null
  on conflict do nothing;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'ISIN', upper(i.isin), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 95, coalesce(i.provider_metadata, '{}'::jsonb)
  from instruments i
  where i.is_active = true and i.security_id is not null and nullif(i.isin, '') is not null
  on conflict do nothing;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'CUSIP', upper(i.cusip), coalesce(i.provider_primary, 'financial_modeling_prep'), false, 90, coalesce(i.provider_metadata, '{}'::jsonb)
  from instruments i
  where i.is_active = true and i.security_id is not null and nullif(i.cusip, '') is not null
  on conflict do nothing;

  insert into security_identifiers (security_id, identifier_type, identifier_value, source, is_primary, confidence_score, provider_raw_json)
  select i.security_id, 'FIGI', upper(i.figi), coalesce(i.provider_primary, 'financial_modeling_prep'), true, 98, coalesce(i.provider_metadata, '{}'::jsonb)
  from instruments i
  where i.is_active = true and i.security_id is not null and nullif(i.figi, '') is not null
  on conflict do nothing;
end;
$$;
