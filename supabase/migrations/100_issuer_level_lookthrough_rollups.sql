-- Security Master Phase 4C/4D: issuer-level look-through rollups.
--
-- Portfolio look-through holdings/exposures can now store issuer identity
-- alongside security identity. Issuer identity is used for concentration and
-- hidden-overlap rollups; security identity remains available for drill-down
-- and audit.

alter table portfolio_lookthrough_holdings
  add column if not exists holding_issuer_id uuid references issuers(id) on delete set null,
  add column if not exists holding_issuer_name text;

alter table portfolio_lookthrough_exposures
  add column if not exists exposure_issuer_id uuid references issuers(id) on delete set null,
  add column if not exists exposure_issuer_name text;

create index if not exists idx_portfolio_lookthrough_holdings_issuer
  on portfolio_lookthrough_holdings (portfolio_id, holding_issuer_id, as_of_date desc);

create index if not exists idx_portfolio_lookthrough_exposures_issuer
  on portfolio_lookthrough_exposures (portfolio_id, exposure_issuer_id, as_of_date desc);

update portfolio_lookthrough_holdings holding
set
  holding_issuer_id = link.issuer_id,
  holding_issuer_name = issuer.issuer_name,
  inputs_snapshot = coalesce(holding.inputs_snapshot, '{}'::jsonb) || jsonb_build_object(
    'issuerId', link.issuer_id,
    'issuerName', issuer.issuer_name,
    'issuerLinkSource', link.link_source,
    'issuerShareClass', link.share_class
  ),
  updated_at = now()
from security_issuer_links link
join issuers issuer on issuer.id = link.issuer_id
where holding.holding_security_id = link.security_id
  and link.valid_to is null
  and holding.holding_issuer_id is null;

update portfolio_lookthrough_exposures exposure
set
  exposure_issuer_id = link.issuer_id,
  exposure_issuer_name = issuer.issuer_name,
  updated_at = now()
from security_issuer_links link
join issuers issuer on issuer.id = link.issuer_id
where exposure.exposure_security_id = link.security_id
  and link.valid_to is null
  and exposure.exposure_type = 'top_holding'
  and exposure.exposure_issuer_id is null;
