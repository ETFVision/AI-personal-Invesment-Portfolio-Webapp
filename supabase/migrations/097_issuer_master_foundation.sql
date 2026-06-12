-- Security Master Phase 4B: issuer master foundation.
--
-- Additive only. Securities remain the canonical tradable/listed identity.
-- Issuers sit one layer above securities so exposure views can answer:
-- "Which company/issuer am I exposed to?" without incorrectly merging
-- different securities in the security master.

create or replace function public.normalize_issuer_name(input_name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(coalesce(input_name, ''), '\s+', ' ', 'g'),
                    '\s+class\s+[a-z0-9]+$', '', 'i'
                  ),
                  '\s+ordinary\s+shares?$', '', 'i'
                ),
                '\s+common\s+stock$', '', 'i'
              ),
              '\s+sponsored\s+adr$', '', 'i'
            ),
            '\s+adr$', '', 'i'
          ),
          '[\.,]+$', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

create table if not exists issuers (
  id uuid primary key default gen_random_uuid(),
  issuer_name text not null,
  normalized_issuer_name text not null,
  issuer_type text not null default 'COMPANY',
  country text,
  sector text,
  industry text,
  source text not null default 'security_master_backfill',
  confidence_score numeric(8, 4) not null default 75,
  review_status text not null default 'mapped',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_issuer_links (
  id uuid primary key default gen_random_uuid(),
  security_id uuid not null references securities_master(id) on delete cascade,
  issuer_id uuid not null references issuers(id) on delete cascade,
  raw_issuer_name text,
  normalized_issuer_name text,
  share_class text,
  is_primary_listing boolean,
  link_source text not null default 'normalized_security_name',
  confidence_score numeric(8, 4) not null default 75,
  review_status text not null default 'mapped',
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_issuers_active_normalized
  on issuers (normalized_issuer_name, issuer_type)
  where is_active = true;

create index if not exists idx_issuers_review_status
  on issuers (review_status, updated_at desc);

create index if not exists idx_security_issuer_links_security
  on security_issuer_links (security_id);

create index if not exists idx_security_issuer_links_issuer
  on security_issuer_links (issuer_id);

create unique index if not exists idx_security_issuer_links_active_security
  on security_issuer_links (security_id)
  where valid_to is null;

drop trigger if exists trg_issuers_updated_at on issuers;
create trigger trg_issuers_updated_at before update on issuers for each row execute function set_updated_at();

drop trigger if exists trg_security_issuer_links_updated_at on security_issuer_links;
create trigger trg_security_issuer_links_updated_at before update on security_issuer_links for each row execute function set_updated_at();

alter table issuers enable row level security;
alter table security_issuer_links enable row level security;

drop policy if exists "authenticated users can read issuers" on issuers;
create policy "authenticated users can read issuers" on issuers for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read security issuer links" on security_issuer_links;
create policy "authenticated users can read security issuer links" on security_issuer_links for select using (auth.role() = 'authenticated');

create or replace function public.sync_security_issuer_links()
returns table (
  issuers_inserted integer,
  links_inserted integer,
  links_updated integer,
  securities_without_issuer integer,
  multi_security_issuers integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issuers_inserted integer := 0;
  v_links_inserted integer := 0;
  v_links_updated integer := 0;
  v_without_issuer integer := 0;
  v_multi_security_issuers integer := 0;
begin
  with security_source as (
    select
      sm.id as security_id,
      sm.canonical_symbol,
      sm.canonical_name,
      public.normalize_issuer_name(sm.canonical_name) as normalized_name,
      case
        when sm.security_type = 'ETF' then 'FUND'
        when sm.security_type = 'FUND' then 'FUND'
        when sm.asset_category in ('BOND', 'COMMODITY', 'CASH', 'CRYPTO') then 'FUND'
        else 'COMPANY'
      end as issuer_type,
      sm.country,
      sm.sector,
      sm.industry,
      sm.security_type,
      sm.is_internal_only
    from securities_master sm
    where sm.is_active = true
      and public.normalize_issuer_name(sm.canonical_name) is not null
  ),
  issuer_source as (
    select
      normalized_name,
      issuer_type,
      min(canonical_name) as issuer_name,
      max(country) filter (where country is not null) as country,
      max(sector) filter (where sector is not null) as sector,
      max(industry) filter (where industry is not null) as industry,
      count(*) as security_count,
      bool_or(is_internal_only) as has_internal_security
    from security_source
    group by normalized_name, issuer_type
  ),
  inserted_issuers as (
    insert into issuers (
      issuer_name,
      normalized_issuer_name,
      issuer_type,
      country,
      sector,
      industry,
      source,
      confidence_score,
      review_status,
      notes
    )
    select
      issuer_name,
      normalized_name,
      issuer_type,
      country,
      sector,
      industry,
      'normalized_security_name',
      case when security_count > 1 then 88 else 78 end,
      'mapped',
      case
        when security_count > 1 then format('Backfilled from %s securities sharing normalized issuer name.', security_count)
        when has_internal_security then 'Backfilled from internal ETF underlying security.'
        else 'Backfilled from security master canonical name.'
      end
    from issuer_source source
    where not exists (
      select 1
      from issuers existing
      where existing.is_active = true
        and existing.normalized_issuer_name = source.normalized_name
        and existing.issuer_type = source.issuer_type
    )
    returning id
  )
  select count(*) into v_issuers_inserted from inserted_issuers;

  with security_source as (
    select
      sm.id as security_id,
      sm.canonical_symbol,
      sm.canonical_name,
      public.normalize_issuer_name(sm.canonical_name) as normalized_name,
      case
        when sm.security_type = 'ETF' then 'FUND'
        when sm.security_type = 'FUND' then 'FUND'
        when sm.asset_category in ('BOND', 'COMMODITY', 'CASH', 'CRYPTO') then 'FUND'
        else 'COMPANY'
      end as issuer_type
    from securities_master sm
    where sm.is_active = true
      and public.normalize_issuer_name(sm.canonical_name) is not null
  ),
  matched as (
    select
      source.security_id,
      issuer.id as issuer_id,
      source.canonical_name,
      source.normalized_name,
      source.canonical_symbol,
      case
        when source.canonical_name ~* '\sclass\s+[a-z0-9]+$'
          then upper(substring(source.canonical_name from '\sclass\s+([a-z0-9]+)$'))
        else null
      end as share_class,
      case when source.canonical_symbol in ('GOOGL', 'BRK.A') then true else null end as is_primary_listing,
      case when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 'manual_share_class_seed' else 'normalized_security_name' end as link_source,
      case when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 100 else 82 end as confidence_score
    from security_source source
    join issuers issuer
      on issuer.is_active = true
      and issuer.normalized_issuer_name = source.normalized_name
      and issuer.issuer_type = source.issuer_type
  ),
  inserted_links as (
    insert into security_issuer_links (
      security_id,
      issuer_id,
      raw_issuer_name,
      normalized_issuer_name,
      share_class,
      is_primary_listing,
      link_source,
      confidence_score,
      review_status,
      notes
    )
    select
      matched.security_id,
      matched.issuer_id,
      matched.canonical_name,
      matched.normalized_name,
      matched.share_class,
      matched.is_primary_listing,
      matched.link_source,
      matched.confidence_score,
      'mapped',
      'Backfilled by issuer master sync.'
    from matched
    where not exists (
      select 1
      from security_issuer_links existing
      where existing.security_id = matched.security_id
        and existing.valid_to is null
    )
    returning id
  )
  select count(*) into v_links_inserted from inserted_links;

  with security_source as (
    select
      sm.id as security_id,
      sm.canonical_symbol,
      sm.canonical_name,
      public.normalize_issuer_name(sm.canonical_name) as normalized_name,
      case
        when sm.security_type = 'ETF' then 'FUND'
        when sm.security_type = 'FUND' then 'FUND'
        when sm.asset_category in ('BOND', 'COMMODITY', 'CASH', 'CRYPTO') then 'FUND'
        else 'COMPANY'
      end as issuer_type
    from securities_master sm
    where sm.is_active = true
      and public.normalize_issuer_name(sm.canonical_name) is not null
  ),
  matched as (
    select
      source.security_id,
      issuer.id as issuer_id,
      source.canonical_name,
      source.normalized_name,
      source.canonical_symbol,
      case
        when source.canonical_name ~* '\sclass\s+[a-z0-9]+$'
          then upper(substring(source.canonical_name from '\sclass\s+([a-z0-9]+)$'))
        else null
      end as share_class,
      case when source.canonical_symbol in ('GOOGL', 'BRK.A') then true else null end as is_primary_listing,
      case when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 'manual_share_class_seed' else 'normalized_security_name' end as link_source,
      case when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 100 else 82 end as confidence_score
    from security_source source
    join issuers issuer
      on issuer.is_active = true
      and issuer.normalized_issuer_name = source.normalized_name
      and issuer.issuer_type = source.issuer_type
  ),
  updated_links as (
    update security_issuer_links link
    set
      issuer_id = matched.issuer_id,
      raw_issuer_name = matched.canonical_name,
      normalized_issuer_name = matched.normalized_name,
      share_class = matched.share_class,
      is_primary_listing = matched.is_primary_listing,
      link_source = matched.link_source,
      confidence_score = matched.confidence_score,
      review_status = 'mapped',
      updated_at = now()
    from matched
    where link.security_id = matched.security_id
      and link.valid_to is null
      and (
        link.issuer_id is distinct from matched.issuer_id
        or link.normalized_issuer_name is distinct from matched.normalized_name
        or link.share_class is distinct from matched.share_class
        or link.link_source is distinct from matched.link_source
      )
    returning link.id
  )
  select count(*) into v_links_updated from updated_links;

  select count(*) into v_without_issuer
  from securities_master sm
  where sm.is_active = true
    and not exists (
      select 1
      from security_issuer_links link
      where link.security_id = sm.id
        and link.valid_to is null
    );

  select count(*) into v_multi_security_issuers
  from (
    select link.issuer_id
    from security_issuer_links link
    where link.valid_to is null
    group by link.issuer_id
    having count(*) > 1
  ) grouped;

  return query select
    v_issuers_inserted,
    v_links_inserted,
    v_links_updated,
    v_without_issuer,
    v_multi_security_issuers;
end;
$$;

select * from public.sync_security_issuer_links();
