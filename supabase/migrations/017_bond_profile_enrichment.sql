-- Bond profile enrichment fields for yield, duration, spread sensitivity, and manual overrides.
-- Values are curated placeholders unless manually updated; provider metadata should remain supplemental.

alter table bond_profiles add column if not exists sec_yield numeric(12, 8);
alter table bond_profiles add column if not exists distribution_yield numeric(12, 8);
alter table bond_profiles add column if not exists yield_to_maturity numeric(12, 8);
alter table bond_profiles add column if not exists yield_as_of_date date;
alter table bond_profiles add column if not exists effective_duration numeric(12, 4);
alter table bond_profiles add column if not exists average_maturity numeric(12, 4);
alter table bond_profiles add column if not exists spread_duration numeric(12, 4);
alter table bond_profiles add column if not exists option_adjusted_spread numeric(12, 8);
alter table bond_profiles add column if not exists expense_ratio numeric(12, 8);
alter table bond_profiles add column if not exists is_manual_override boolean not null default false;

create index if not exists idx_bond_profiles_effective_duration on bond_profiles (effective_duration);
create index if not exists idx_bond_profiles_manual_override on bond_profiles (is_manual_override);

with seeded(symbol, effective_duration, average_maturity, spread_duration) as (
  values
    ('SGOV', 0.10, 0.10, 0.00),
    ('BIL', 0.15, 0.15, 0.00),
    ('SHY', 1.90, 2.00, 0.00),
    ('IEF', 7.50, 8.00, 0.00),
    ('TLT', 16.50, 25.00, 0.00),
    ('BND', 6.00, 8.50, 2.50),
    ('AGG', 6.00, 8.50, 2.50),
    ('TIP', 6.50, 7.50, 0.00),
    ('LQD', 8.00, 13.00, 7.50),
    ('HYG', 3.50, 4.50, 3.50),
    ('BNDX', 7.00, 9.00, 2.00)
)
update bond_profiles bp
set
  effective_duration = coalesce(bp.effective_duration, seeded.effective_duration),
  average_maturity = coalesce(bp.average_maturity, seeded.average_maturity),
  spread_duration = coalesce(bp.spread_duration, seeded.spread_duration),
  provider_metadata = bp.provider_metadata || jsonb_build_object('duration_source', 'seeded_placeholder')
from seeded
join instruments i on i.symbol = seeded.symbol
where bp.instrument_id = i.id
  and bp.is_manual_override = false;
