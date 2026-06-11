-- Single-read fundamentals detail snapshot for instrument detail pages.
-- Keeps page rendering from issuing several separate Supabase reads for one stock tab.

create or replace function get_fundamentals_detail_snapshot(input_symbol text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with selected_instrument as (
  select *
  from instruments
  where asset_class = 'stock'
    and symbol = upper(input_symbol)
  limit 1
),
latest_profile as (
  select to_jsonb(cp) as payload
  from company_profiles cp
  join selected_instrument i on i.id = cp.instrument_id
  limit 1
),
latest_ratio as (
  select to_jsonb(fr) as payload
  from financial_ratios fr
  join selected_instrument i on i.id = fr.instrument_id
  order by fr.report_date desc
  limit 1
),
latest_score as (
  select to_jsonb(fs) as payload
  from fundamental_scores fs
  join selected_instrument i on i.id = fs.instrument_id
  order by fs.as_of_date desc
  limit 1
),
latest_statement_snapshot as (
  select coalesce(jsonb_agg(to_jsonb(snapshot) order by snapshot.statement_type), '[]'::jsonb) as payload
  from (
    select distinct on (fs.statement_type) fs.*
    from financial_statements fs
    join selected_instrument i on i.id = fs.instrument_id
    order by fs.statement_type, fs.report_date desc nulls last
  ) snapshot
),
trend_rows as (
  select coalesce(jsonb_agg(to_jsonb(ft) order by ft.metric_category, ft.metric_name), '[]'::jsonb) as payload
  from fundamental_trends ft
  join selected_instrument i on i.id = ft.instrument_id
),
latest_trend_summary as (
  select to_jsonb(fts) as payload
  from fundamental_trend_summaries fts
  join selected_instrument i on i.id = fts.instrument_id
  order by fts.as_of_date desc
  limit 1
)
select case
  when not exists (select 1 from selected_instrument) then null
  else jsonb_build_object(
    'instrument', (select to_jsonb(i) from selected_instrument i),
    'profile', (select payload from latest_profile),
    'latest_ratio', (select payload from latest_ratio),
    'latest_score', (select payload from latest_score),
    'statements', (select payload from latest_statement_snapshot),
    'trends', (select payload from trend_rows),
    'trend_summary', (select payload from latest_trend_summary)
  )
end;
$$;
