create or replace function get_statement_counts(p_instrument_ids uuid[])
returns table(instrument_id uuid, statement_count bigint)
language sql
security definer
set search_path = public
as $$
  select instrument_id, count(*)::bigint as statement_count
  from financial_statements
  where instrument_id = any(p_instrument_ids)
  group by instrument_id
$$;
