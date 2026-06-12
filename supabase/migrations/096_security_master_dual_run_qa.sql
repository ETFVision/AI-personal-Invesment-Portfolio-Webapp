-- Security Master Phase 3: portfolio look-through dual-run QA.
--
-- Additive only. This does not switch any application calculation to
-- security_id. It stores an auditable comparison between the current raw-symbol
-- portfolio look-through holding aggregation and the future canonical
-- security_id aggregation.

create table if not exists security_master_dual_run_reports (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  as_of_date date not null,
  report_type text not null default 'portfolio_lookthrough_holding_dual_run',
  source_row_count integer not null default 0,
  symbol_group_count integer not null default 0,
  security_group_count integer not null default 0,
  mapped_row_count integer not null default 0,
  unmapped_row_count integer not null default 0,
  ambiguous_row_count integer not null default 0,
  symbol_total_weight numeric(14, 8) not null default 0,
  security_total_weight numeric(14, 8) not null default 0,
  total_weight_delta numeric(14, 8) not null default 0,
  merged_group_count integer not null default 0,
  qa_status text not null check (qa_status in ('pass', 'warning', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_master_dual_run_reports_portfolio_created
  on security_master_dual_run_reports (portfolio_id, created_at desc);

create index if not exists idx_security_master_dual_run_reports_status_created
  on security_master_dual_run_reports (qa_status, created_at desc);

alter table security_master_dual_run_reports enable row level security;

drop policy if exists "users can read own security master dual run reports" on security_master_dual_run_reports;
create policy "users can read own security master dual run reports" on security_master_dual_run_reports
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from portfolios p
      join users u on u.id = p.user_id
      where p.id = security_master_dual_run_reports.portfolio_id
        and u.auth_provider = 'supabase'
        and u.auth_provider_user_id = auth.uid()::text
    )
  );

create or replace function public.run_security_master_dual_run_qa(p_portfolio_id uuid default null)
returns table (
  report_id uuid,
  portfolio_id uuid,
  as_of_date date,
  qa_status text,
  source_row_count integer,
  symbol_group_count integer,
  security_group_count integer,
  mapped_row_count integer,
  unmapped_row_count integer,
  ambiguous_row_count integer,
  total_weight_delta numeric,
  merged_group_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  portfolio_row record;
  v_report_id uuid;
  v_source_row_count integer := 0;
  v_symbol_group_count integer := 0;
  v_security_group_count integer := 0;
  v_mapped_row_count integer := 0;
  v_unmapped_row_count integer := 0;
  v_ambiguous_row_count integer := 0;
  v_symbol_total_weight numeric(14, 8) := 0;
  v_security_total_weight numeric(14, 8) := 0;
  v_total_weight_delta numeric(14, 8) := 0;
  v_merged_group_count integer := 0;
  v_qa_status text := 'pass';
  v_summary jsonb := '{}'::jsonb;
begin
  perform public.sync_etf_holding_security_ids();

  for portfolio_row in
    select holdings.portfolio_id, max(holdings.as_of_date) as latest_as_of_date
    from portfolio_lookthrough_holdings holdings
    where p_portfolio_id is null or holdings.portfolio_id = p_portfolio_id
    group by holdings.portfolio_id
  loop
    with latest_rows as (
      select *
      from portfolio_lookthrough_holdings holdings
      where holdings.portfolio_id = portfolio_row.portfolio_id
        and holdings.as_of_date = portfolio_row.latest_as_of_date
    )
    select
      count(*)::integer,
      count(*) filter (where holding_security_id is not null and mapping_status = 'mapped')::integer,
      count(*) filter (where holding_security_id is null or mapping_status = 'unmapped')::integer,
      count(*) filter (where mapping_status = 'ambiguous')::integer,
      coalesce(sum(total_weight), 0)::numeric(14, 8)
    into
      v_source_row_count,
      v_mapped_row_count,
      v_unmapped_row_count,
      v_ambiguous_row_count,
      v_symbol_total_weight
    from latest_rows;

    with symbol_groups as (
      select upper(trim(holding_symbol)) as symbol_key, sum(total_weight) as total_weight
      from portfolio_lookthrough_holdings holdings
      where holdings.portfolio_id = portfolio_row.portfolio_id
        and holdings.as_of_date = portfolio_row.latest_as_of_date
      group by upper(trim(holding_symbol))
    )
    select count(*)::integer
    into v_symbol_group_count
    from symbol_groups;

    with security_groups as (
      select
        coalesce(holding_security_id::text, 'symbol:' || upper(trim(holding_symbol))) as security_key,
        sum(total_weight) as total_weight
      from portfolio_lookthrough_holdings holdings
      where holdings.portfolio_id = portfolio_row.portfolio_id
        and holdings.as_of_date = portfolio_row.latest_as_of_date
      group by coalesce(holding_security_id::text, 'symbol:' || upper(trim(holding_symbol)))
    )
    select
      count(*)::integer,
      coalesce(sum(total_weight), 0)::numeric(14, 8)
    into v_security_group_count, v_security_total_weight
    from security_groups;

    v_total_weight_delta := abs(coalesce(v_symbol_total_weight, 0) - coalesce(v_security_total_weight, 0))::numeric(14, 8);
    v_merged_group_count := greatest(coalesce(v_symbol_group_count, 0) - coalesce(v_security_group_count, 0), 0);

    if v_unmapped_row_count > 0 or v_ambiguous_row_count > 0 or v_total_weight_delta > 0.000001 then
      v_qa_status := 'failed';
    elsif v_merged_group_count > 0 then
      v_qa_status := 'warning';
    else
      v_qa_status := 'pass';
    end if;

    with holding_rows as (
      select
        holdings.*,
        coalesce(holdings.holding_security_id::text, 'symbol:' || upper(trim(holdings.holding_symbol))) as security_key
      from portfolio_lookthrough_holdings holdings
      where holdings.portfolio_id = portfolio_row.portfolio_id
        and holdings.as_of_date = portfolio_row.latest_as_of_date
    ),
    security_groups as (
      select
        rows.security_key,
        rows.holding_security_id,
        coalesce(max(master.canonical_symbol), min(upper(trim(rows.holding_symbol)))) as canonical_symbol,
        coalesce(max(master.canonical_name), max(rows.holding_name), min(upper(trim(rows.holding_symbol)))) as canonical_name,
        sum(rows.direct_weight) as direct_weight,
        sum(rows.indirect_weight) as indirect_weight,
        sum(rows.total_weight) as total_weight,
        array_agg(distinct upper(trim(rows.holding_symbol)) order by upper(trim(rows.holding_symbol))) as raw_symbols,
        count(*) as row_count
      from holding_rows rows
      left join securities_master master on master.id = rows.holding_security_id
      group by rows.security_key, rows.holding_security_id
    ),
    largest_security_groups as (
      select
        canonical_symbol,
        canonical_name,
        direct_weight,
        indirect_weight,
        total_weight,
        raw_symbols,
        row_count
      from security_groups
      order by total_weight desc
      limit 10
    )
    select jsonb_build_object(
      'notes', jsonb_build_array(
        'Current production look-through calculations remain raw-symbol based.',
        'This report compares the current grouping with canonical security_id grouping for QA only.'
      ),
      'symbolTotalWeight', v_symbol_total_weight,
      'securityTotalWeight', v_security_total_weight,
      'largestSecurityGroups', coalesce(jsonb_agg(to_jsonb(largest_security_groups)), '[]'::jsonb)
    )
    into v_summary
    from largest_security_groups;

    insert into security_master_dual_run_reports (
      portfolio_id,
      as_of_date,
      source_row_count,
      symbol_group_count,
      security_group_count,
      mapped_row_count,
      unmapped_row_count,
      ambiguous_row_count,
      symbol_total_weight,
      security_total_weight,
      total_weight_delta,
      merged_group_count,
      qa_status,
      summary
    )
    values (
      portfolio_row.portfolio_id,
      portfolio_row.latest_as_of_date,
      v_source_row_count,
      v_symbol_group_count,
      v_security_group_count,
      v_mapped_row_count,
      v_unmapped_row_count,
      v_ambiguous_row_count,
      v_symbol_total_weight,
      v_security_total_weight,
      v_total_weight_delta,
      v_merged_group_count,
      v_qa_status,
      coalesce(v_summary, '{}'::jsonb)
    )
    returning id into v_report_id;

    report_id := v_report_id;
    portfolio_id := portfolio_row.portfolio_id;
    as_of_date := portfolio_row.latest_as_of_date;
    qa_status := v_qa_status;
    source_row_count := v_source_row_count;
    symbol_group_count := v_symbol_group_count;
    security_group_count := v_security_group_count;
    mapped_row_count := v_mapped_row_count;
    unmapped_row_count := v_unmapped_row_count;
    ambiguous_row_count := v_ambiguous_row_count;
    total_weight_delta := v_total_weight_delta;
    merged_group_count := v_merged_group_count;
    return next;
  end loop;
end;
$$;
