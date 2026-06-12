-- Security Master Phase 4B hardening: issuer aliases and duplicate candidates.
--
-- This is additive and keeps securities as the canonical tradable identity.
-- Approved aliases let deterministic issuer sync map provider name variants
-- such as "Alphabet" and "Alphabet Inc" to one issuer without needing manual
-- SQL each time. Duplicate candidates remain review-only.

create table if not exists issuer_aliases (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references issuers(id) on delete cascade,
  alias_name text not null,
  normalized_alias_name text not null,
  alias_type text not null default 'NAME_VARIANT',
  source text not null default 'etfvision',
  confidence_score numeric(8, 4) not null default 90,
  review_status text not null default 'approved',
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_issuer_aliases_issuer
  on issuer_aliases (issuer_id);

create index if not exists idx_issuer_aliases_active_normalized
  on issuer_aliases (normalized_alias_name, review_status)
  where valid_to is null;

create unique index if not exists idx_issuer_aliases_unique_active
  on issuer_aliases (issuer_id, normalized_alias_name, alias_type, source)
  where valid_to is null;

drop trigger if exists trg_issuer_aliases_updated_at on issuer_aliases;
create trigger trg_issuer_aliases_updated_at before update on issuer_aliases for each row execute function set_updated_at();

alter table issuer_aliases enable row level security;

drop policy if exists "authenticated users can read issuer aliases" on issuer_aliases;
create policy "authenticated users can read issuer aliases" on issuer_aliases for select using (auth.role() = 'authenticated');

create table if not exists issuer_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null,
  issuer_id_a uuid not null references issuers(id) on delete cascade,
  issuer_id_b uuid not null references issuers(id) on delete cascade,
  issuer_name_a text not null,
  issuer_name_b text not null,
  normalized_name_a text not null,
  normalized_name_b text not null,
  detection_method text not null,
  confidence_score numeric(8, 4) not null default 65,
  review_status text not null default 'needs_review',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_issuer_duplicate_candidates_unique_pair
  on issuer_duplicate_candidates (candidate_key, issuer_id_a, issuer_id_b);

create index if not exists idx_issuer_duplicate_candidates_review
  on issuer_duplicate_candidates (review_status, confidence_score desc, updated_at desc);

drop trigger if exists trg_issuer_duplicate_candidates_updated_at on issuer_duplicate_candidates;
create trigger trg_issuer_duplicate_candidates_updated_at before update on issuer_duplicate_candidates for each row execute function set_updated_at();

alter table issuer_duplicate_candidates enable row level security;

drop policy if exists "authenticated users can read issuer duplicate candidates" on issuer_duplicate_candidates;
create policy "authenticated users can read issuer duplicate candidates" on issuer_duplicate_candidates for select using (auth.role() = 'authenticated');

create or replace function public.issuer_base_name(input_name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          public.normalize_issuer_name(input_name),
          '\s+(&\s+co|and\s+company|incorporated|inc|corp|corporation|co|company|ltd|limited|plc|s\.?a\.?|ag|nv|se|a/s|as|holding|holdings)$',
          '',
          'i'
        ),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

with alias_seed(canonical_issuer_name, alias_name, alias_type, confidence_score, notes) as (
  values
    ('Alphabet Inc', 'Alphabet', 'NAME_VARIANT', 98::numeric, 'Approved alias for Alphabet Class A/Class C issuer rollup.'),
    ('Alphabet Inc', 'Alphabet Inc Class A', 'SHARE_CLASS_NAME', 98::numeric, 'Approved share-class name variant.'),
    ('Alphabet Inc', 'Alphabet Inc Class C', 'SHARE_CLASS_NAME', 98::numeric, 'Approved share-class name variant.'),
    ('Berkshire Hathaway Inc', 'Berkshire Hathaway', 'NAME_VARIANT', 98::numeric, 'Approved alias for Berkshire share-class issuer rollup.'),
    ('Berkshire Hathaway Inc', 'Berkshire Hathaway Inc Class A', 'SHARE_CLASS_NAME', 98::numeric, 'Approved share-class name variant.'),
    ('Berkshire Hathaway Inc', 'Berkshire Hathaway Inc Class B', 'SHARE_CLASS_NAME', 98::numeric, 'Approved share-class name variant.'),
    ('Meta Platforms Inc', 'Meta Platforms', 'NAME_VARIANT', 92::numeric, 'Approved legal-suffix variant.'),
    ('JPMorgan Chase & Co', 'JPMorgan Chase', 'NAME_VARIANT', 92::numeric, 'Approved legal-suffix variant.'),
    ('Taiwan Semiconductor Manufacturing Co Ltd', 'Taiwan Semiconductor Manufacturing', 'NAME_VARIANT', 92::numeric, 'Approved legal-suffix variant.'),
    ('Taiwan Semiconductor Manufacturing Co Ltd', 'TSMC', 'COMMON_NAME', 88::numeric, 'Approved common-name variant.'),
    ('Novo Nordisk A/S', 'Novo Nordisk', 'NAME_VARIANT', 90::numeric, 'Approved legal-suffix variant.'),
    ('Samsung Electronics Co Ltd', 'Samsung Electronics', 'NAME_VARIANT', 90::numeric, 'Approved legal-suffix variant.')
),
canonical as (
  select
    issuer.id as issuer_id,
    seed.alias_name,
    public.normalize_issuer_name(seed.alias_name) as normalized_alias_name,
    seed.alias_type,
    seed.confidence_score,
    seed.notes
  from alias_seed seed
  join issuers issuer
    on issuer.is_active = true
    and issuer.normalized_issuer_name = public.normalize_issuer_name(seed.canonical_issuer_name)
)
insert into issuer_aliases (
  issuer_id,
  alias_name,
  normalized_alias_name,
  alias_type,
  source,
  confidence_score,
  review_status,
  notes
)
select
  canonical.issuer_id,
  canonical.alias_name,
  canonical.normalized_alias_name,
  canonical.alias_type,
  'etfvision_seed',
  canonical.confidence_score,
  'approved',
  canonical.notes
from canonical
where canonical.normalized_alias_name is not null
on conflict (issuer_id, normalized_alias_name, alias_type, source) where valid_to is null do update
set
  alias_name = excluded.alias_name,
  confidence_score = greatest(issuer_aliases.confidence_score, excluded.confidence_score),
  review_status = 'approved',
  notes = excluded.notes,
  updated_at = now();

create or replace function public.refresh_issuer_duplicate_candidates()
returns table (
  candidates_inserted integer,
  open_candidates integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_open integer := 0;
begin
  with active_linked_issuers as (
    select
      issuer.id,
      issuer.issuer_name,
      issuer.normalized_issuer_name,
      issuer.issuer_type,
      public.issuer_base_name(issuer.normalized_issuer_name) as base_name,
      count(link.security_id) as active_security_count
    from issuers issuer
    join security_issuer_links link
      on link.issuer_id = issuer.id
      and link.valid_to is null
    where issuer.is_active = true
    group by issuer.id, issuer.issuer_name, issuer.normalized_issuer_name, issuer.issuer_type
  ),
  pairs as (
    select
      a.id as issuer_id_a,
      b.id as issuer_id_b,
      a.issuer_name as issuer_name_a,
      b.issuer_name as issuer_name_b,
      a.normalized_issuer_name as normalized_name_a,
      b.normalized_issuer_name as normalized_name_b,
      a.base_name,
      greatest(a.active_security_count, b.active_security_count) as max_security_count
    from active_linked_issuers a
    join active_linked_issuers b
      on a.issuer_type = b.issuer_type
      and a.base_name = b.base_name
      and a.id < b.id
    where a.base_name is not null
      and a.normalized_issuer_name <> b.normalized_issuer_name
      and not exists (
        select 1
        from issuer_aliases alias
        where alias.valid_to is null
          and alias.review_status = 'approved'
          and (
            (alias.issuer_id = a.id and alias.normalized_alias_name = b.normalized_issuer_name)
            or (alias.issuer_id = b.id and alias.normalized_alias_name = a.normalized_issuer_name)
          )
      )
  ),
  inserted as (
    insert into issuer_duplicate_candidates (
      candidate_key,
      issuer_id_a,
      issuer_id_b,
      issuer_name_a,
      issuer_name_b,
      normalized_name_a,
      normalized_name_b,
      detection_method,
      confidence_score,
      review_status,
      notes
    )
    select
      pairs.base_name,
      pairs.issuer_id_a,
      pairs.issuer_id_b,
      pairs.issuer_name_a,
      pairs.issuer_name_b,
      pairs.normalized_name_a,
      pairs.normalized_name_b,
      'shared_issuer_base_name',
      case when pairs.max_security_count > 1 then 72 else 65 end,
      'needs_review',
      'Potential issuer name variant detected by suffix-stripped base name. Review before adding an approved alias.'
    from pairs
    on conflict (candidate_key, issuer_id_a, issuer_id_b) do update
    set
      issuer_name_a = excluded.issuer_name_a,
      issuer_name_b = excluded.issuer_name_b,
      normalized_name_a = excluded.normalized_name_a,
      normalized_name_b = excluded.normalized_name_b,
      detection_method = excluded.detection_method,
      confidence_score = greatest(issuer_duplicate_candidates.confidence_score, excluded.confidence_score),
      updated_at = now()
    returning id
  )
  select count(*) into v_inserted from inserted;

  select count(*) into v_open
  from issuer_duplicate_candidates
  where review_status = 'needs_review';

  return query select v_inserted, v_open;
end;
$$;

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
  alias_resolved as (
    select
      source.*,
      alias.issuer_id as alias_issuer_id,
      alias.confidence_score as alias_confidence_score
    from security_source source
    left join issuer_aliases alias
      on alias.valid_to is null
      and alias.review_status = 'approved'
      and alias.normalized_alias_name = source.normalized_name
    left join issuers alias_issuer
      on alias_issuer.id = alias.issuer_id
      and alias_issuer.is_active = true
      and alias_issuer.issuer_type = source.issuer_type
    where alias.issuer_id is null
      or alias_issuer.id is not null
  ),
  issuer_source as (
    select
      source.normalized_name,
      source.issuer_type,
      min(source.canonical_name) as issuer_name,
      max(source.country) filter (where source.country is not null) as country,
      max(source.sector) filter (where source.sector is not null) as sector,
      max(source.industry) filter (where source.industry is not null) as industry,
      count(*) as security_count,
      bool_or(source.is_internal_only) as has_internal_security
    from alias_resolved source
    where source.alias_issuer_id is null
    group by source.normalized_name, source.issuer_type
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
  alias_resolved as (
    select
      source.*,
      alias.issuer_id as alias_issuer_id,
      alias.confidence_score as alias_confidence_score,
      alias_issuer.normalized_issuer_name as alias_normalized_issuer_name
    from security_source source
    left join issuer_aliases alias
      on alias.valid_to is null
      and alias.review_status = 'approved'
      and alias.normalized_alias_name = source.normalized_name
    left join issuers alias_issuer
      on alias_issuer.id = alias.issuer_id
      and alias_issuer.is_active = true
      and alias_issuer.issuer_type = source.issuer_type
    where alias.issuer_id is null
      or alias_issuer.id is not null
  ),
  matched as (
    select
      source.security_id,
      coalesce(alias_issuer.id, issuer.id) as issuer_id,
      source.canonical_name,
      coalesce(alias_issuer.normalized_issuer_name, source.normalized_name) as resolved_normalized_name,
      source.canonical_symbol,
      case
        when source.canonical_name ~* '\sclass\s+[a-z0-9]+$'
          then upper(substring(source.canonical_name from '\sclass\s+([a-z0-9]+)$'))
        else null
      end as share_class,
      case when source.canonical_symbol in ('GOOGL', 'BRK.A') then true else null end as is_primary_listing,
      case
        when source.alias_issuer_id is not null then 'issuer_alias'
        when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 'manual_share_class_seed'
        else 'normalized_security_name'
      end as link_source,
      case
        when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 100
        when source.alias_issuer_id is not null then greatest(source.alias_confidence_score, 90)
        else 82
      end as confidence_score
    from alias_resolved source
    left join issuers alias_issuer
      on alias_issuer.id = source.alias_issuer_id
      and alias_issuer.is_active = true
      and alias_issuer.issuer_type = source.issuer_type
    left join issuers issuer
      on issuer.is_active = true
      and issuer.normalized_issuer_name = source.normalized_name
      and issuer.issuer_type = source.issuer_type
    where coalesce(alias_issuer.id, issuer.id) is not null
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
      matched.resolved_normalized_name,
      matched.share_class,
      matched.is_primary_listing,
      matched.link_source,
      matched.confidence_score,
      'mapped',
      'Backfilled by alias-aware issuer master sync.'
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
  alias_resolved as (
    select
      source.*,
      alias.issuer_id as alias_issuer_id,
      alias.confidence_score as alias_confidence_score
    from security_source source
    left join issuer_aliases alias
      on alias.valid_to is null
      and alias.review_status = 'approved'
      and alias.normalized_alias_name = source.normalized_name
    left join issuers alias_issuer
      on alias_issuer.id = alias.issuer_id
      and alias_issuer.is_active = true
      and alias_issuer.issuer_type = source.issuer_type
    where alias.issuer_id is null
      or alias_issuer.id is not null
  ),
  matched as (
    select
      source.security_id,
      coalesce(alias_issuer.id, issuer.id) as issuer_id,
      source.canonical_name,
      coalesce(alias_issuer.normalized_issuer_name, source.normalized_name) as resolved_normalized_name,
      source.canonical_symbol,
      case
        when source.canonical_name ~* '\sclass\s+[a-z0-9]+$'
          then upper(substring(source.canonical_name from '\sclass\s+([a-z0-9]+)$'))
        else null
      end as share_class,
      case when source.canonical_symbol in ('GOOGL', 'BRK.A') then true else null end as is_primary_listing,
      case
        when source.alias_issuer_id is not null then 'issuer_alias'
        when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 'manual_share_class_seed'
        else 'normalized_security_name'
      end as link_source,
      case
        when source.canonical_symbol in ('GOOG', 'GOOGL', 'BRK.A', 'BRK.B') then 100
        when source.alias_issuer_id is not null then greatest(source.alias_confidence_score, 90)
        else 82
      end as confidence_score
    from alias_resolved source
    left join issuers alias_issuer
      on alias_issuer.id = source.alias_issuer_id
      and alias_issuer.is_active = true
      and alias_issuer.issuer_type = source.issuer_type
    left join issuers issuer
      on issuer.is_active = true
      and issuer.normalized_issuer_name = source.normalized_name
      and issuer.issuer_type = source.issuer_type
    where coalesce(alias_issuer.id, issuer.id) is not null
  ),
  updated_links as (
    update security_issuer_links link
    set
      issuer_id = matched.issuer_id,
      raw_issuer_name = matched.canonical_name,
      normalized_issuer_name = matched.resolved_normalized_name,
      share_class = matched.share_class,
      is_primary_listing = matched.is_primary_listing,
      link_source = matched.link_source,
      confidence_score = matched.confidence_score,
      review_status = 'mapped',
      notes = 'Updated by alias-aware issuer master sync.',
      updated_at = now()
    from matched
    where link.security_id = matched.security_id
      and link.valid_to is null
      and (
        link.issuer_id is distinct from matched.issuer_id
        or link.normalized_issuer_name is distinct from matched.resolved_normalized_name
        or link.share_class is distinct from matched.share_class
        or link.link_source is distinct from matched.link_source
        or link.confidence_score is distinct from matched.confidence_score
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

  perform public.refresh_issuer_duplicate_candidates();

  return query select
    v_issuers_inserted,
    v_links_inserted,
    v_links_updated,
    v_without_issuer,
    v_multi_security_issuers;
end;
$$;

select * from public.sync_security_issuer_links();
select * from public.refresh_issuer_duplicate_candidates();
