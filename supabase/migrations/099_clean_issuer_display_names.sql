-- Security Master Phase 4B hardening: clean issuer display names.
--
-- Issuers represent the company/fund identity above securities. Share-class
-- detail belongs on security_issuer_links.share_class, not in issuers.issuer_name.

create or replace function public.clean_issuer_display_name(input_name text)
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

create or replace function public.clean_issuer_display_name_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.issuer_name := coalesce(public.clean_issuer_display_name(new.issuer_name), new.issuer_name);
  return new;
end;
$$;

drop trigger if exists trg_clean_issuer_display_name on issuers;
create trigger trg_clean_issuer_display_name
  before insert or update of issuer_name on issuers
  for each row execute function public.clean_issuer_display_name_before_write();

update issuers
set
  issuer_name = public.clean_issuer_display_name(issuer_name),
  notes = coalesce(notes, '') || case
    when notes is null or notes = '' then 'Cleaned issuer display name to remove security/share-class suffix.'
    else ' Cleaned issuer display name to remove security/share-class suffix.'
  end,
  updated_at = now()
where public.clean_issuer_display_name(issuer_name) is not null
  and issuer_name is distinct from public.clean_issuer_display_name(issuer_name);

select * from public.sync_security_issuer_links();
