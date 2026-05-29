-- Canonical taxonomy foundation for sectors, themes, provider mappings, and instrument mappings.
-- Raw provider metadata remains in provider_metadata JSONB; canonical fields support app intelligence.

alter table instruments add column if not exists canonical_sector text;
alter table instruments add column if not exists canonical_themes jsonb not null default '[]';
alter table instruments add column if not exists taxonomy_is_manual_override boolean not null default false;
alter table instruments add column if not exists taxonomy_review_status text not null default 'mapped';

alter table assets add column if not exists canonical_sector text;
alter table assets add column if not exists canonical_themes jsonb not null default '[]';

create table if not exists canonical_sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists canonical_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_taxonomy_mappings (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  mapping_type text not null,
  raw_value text not null,
  canonical_value text not null,
  confidence numeric(5, 4) not null default 1,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_provider, mapping_type, raw_value)
);

create table if not exists instrument_sector_mappings (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  source_provider text not null default 'application',
  raw_value text,
  canonical_value text not null,
  confidence numeric(5, 4) not null default 1,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, source_provider)
);

create table if not exists instrument_theme_mappings (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references instruments(id) on delete cascade,
  source_provider text not null default 'application',
  raw_value text,
  canonical_value text not null,
  confidence numeric(5, 4) not null default 1,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instrument_id, canonical_value, source_provider)
);

create index if not exists idx_instruments_canonical_sector on instruments (canonical_sector);
create index if not exists idx_instruments_canonical_themes on instruments using gin (canonical_themes);
create index if not exists idx_instrument_sector_mappings_instrument on instrument_sector_mappings (instrument_id);
create index if not exists idx_instrument_theme_mappings_instrument on instrument_theme_mappings (instrument_id);
create index if not exists idx_provider_taxonomy_mappings_raw on provider_taxonomy_mappings (source_provider, mapping_type, raw_value);

drop trigger if exists trg_canonical_sectors_updated_at on canonical_sectors;
create trigger trg_canonical_sectors_updated_at before update on canonical_sectors for each row execute function set_updated_at();

drop trigger if exists trg_canonical_themes_updated_at on canonical_themes;
create trigger trg_canonical_themes_updated_at before update on canonical_themes for each row execute function set_updated_at();

drop trigger if exists trg_provider_taxonomy_mappings_updated_at on provider_taxonomy_mappings;
create trigger trg_provider_taxonomy_mappings_updated_at before update on provider_taxonomy_mappings for each row execute function set_updated_at();

drop trigger if exists trg_instrument_sector_mappings_updated_at on instrument_sector_mappings;
create trigger trg_instrument_sector_mappings_updated_at before update on instrument_sector_mappings for each row execute function set_updated_at();

drop trigger if exists trg_instrument_theme_mappings_updated_at on instrument_theme_mappings;
create trigger trg_instrument_theme_mappings_updated_at before update on instrument_theme_mappings for each row execute function set_updated_at();

alter table canonical_sectors enable row level security;
alter table canonical_themes enable row level security;
alter table provider_taxonomy_mappings enable row level security;
alter table instrument_sector_mappings enable row level security;
alter table instrument_theme_mappings enable row level security;

drop policy if exists "users can read canonical sectors" on canonical_sectors;
drop policy if exists "users can read canonical themes" on canonical_themes;
drop policy if exists "users can read provider taxonomy mappings" on provider_taxonomy_mappings;
drop policy if exists "users can read instrument sector mappings" on instrument_sector_mappings;
drop policy if exists "users can read instrument theme mappings" on instrument_theme_mappings;

create policy "users can read canonical sectors" on canonical_sectors for select using (true);
create policy "users can read canonical themes" on canonical_themes for select using (true);
create policy "users can read provider taxonomy mappings" on provider_taxonomy_mappings for select using (true);
create policy "users can read instrument sector mappings" on instrument_sector_mappings for select using (true);
create policy "users can read instrument theme mappings" on instrument_theme_mappings for select using (true);

insert into canonical_sectors (name, sort_order)
values
  ('Technology', 10),
  ('Communication Services', 20),
  ('Consumer Discretionary', 30),
  ('Consumer Staples', 40),
  ('Healthcare', 50),
  ('Financials', 60),
  ('Industrials', 70),
  ('Energy', 80),
  ('Utilities', 90),
  ('Materials', 100),
  ('Real Estate', 110),
  ('Bonds / Fixed Income', 120),
  ('Commodities / Gold', 130),
  ('Crypto', 140),
  ('Cash / Money Market', 150),
  ('Multi-Asset / Broad Market', 160)
on conflict (name) do update set sort_order = excluded.sort_order, is_active = true;

insert into canonical_themes (name, sort_order)
values
  ('AI / Automation', 10),
  ('Semiconductors', 20),
  ('Cloud / Software', 30),
  ('Cybersecurity', 40),
  ('Digital Platforms', 50),
  ('Healthcare Innovation', 60),
  ('Pharma / Biotech', 70),
  ('Financial Services', 80),
  ('Payments / Fintech', 90),
  ('Consumer Brands', 100),
  ('Defensive Consumer', 110),
  ('Energy / Oil & Gas', 120),
  ('Clean Energy', 130),
  ('Infrastructure / Industrials', 140),
  ('Real Estate / REITs', 150),
  ('Dividend / Income', 160),
  ('Growth', 170),
  ('Value', 180),
  ('Quality', 190),
  ('Defensive', 200),
  ('High Beta', 210),
  ('Inflation Hedge', 220),
  ('Recession Hedge', 230),
  ('Interest Rate Sensitive', 240),
  ('Long Duration', 250),
  ('Short Duration / Cash-like', 260),
  ('Treasury Bonds', 270),
  ('Corporate Credit', 280),
  ('High Yield Credit', 290),
  ('Emerging Markets', 300),
  ('Global Diversification', 310),
  ('Crypto / Digital Assets', 320)
on conflict (name) do update set sort_order = excluded.sort_order, is_active = true;

insert into provider_taxonomy_mappings (source_provider, mapping_type, raw_value, canonical_value, confidence)
values
  ('financial_modeling_prep', 'sector', 'Technology', 'Technology', 1),
  ('financial_modeling_prep', 'sector', 'Communication Services', 'Communication Services', 1),
  ('financial_modeling_prep', 'sector', 'Consumer Cyclical', 'Consumer Discretionary', 0.95),
  ('financial_modeling_prep', 'sector', 'Consumer Defensive', 'Consumer Staples', 0.95),
  ('financial_modeling_prep', 'sector', 'Healthcare', 'Healthcare', 1),
  ('financial_modeling_prep', 'sector', 'Financial Services', 'Financials', 0.95),
  ('financial_modeling_prep', 'sector', 'Industrials', 'Industrials', 1),
  ('financial_modeling_prep', 'sector', 'Energy', 'Energy', 1),
  ('financial_modeling_prep', 'sector', 'Utilities', 'Utilities', 1),
  ('financial_modeling_prep', 'sector', 'Basic Materials', 'Materials', 0.95),
  ('financial_modeling_prep', 'sector', 'Real Estate', 'Real Estate', 1),
  ('seeded', 'sector', 'Fixed Income', 'Bonds / Fixed Income', 1),
  ('seeded', 'sector', 'Commodities', 'Commodities / Gold', 1),
  ('seeded', 'sector', 'Digital Assets', 'Crypto', 1),
  ('seeded', 'sector', 'Broad Market', 'Multi-Asset / Broad Market', 1)
on conflict (source_provider, mapping_type, raw_value) do update
set canonical_value = excluded.canonical_value,
    confidence = excluded.confidence;

update instruments
set canonical_sector = case
  when asset_class = 'bond_etf' and symbol in ('SGOV', 'BIL') then 'Cash / Money Market'
  when asset_class = 'bond_etf' then 'Bonds / Fixed Income'
  when asset_class = 'gold_etf' then 'Commodities / Gold'
  when asset_class = 'crypto' or instrument_type = 'crypto_etf' then 'Crypto'
  when symbol in ('SPY', 'VOO', 'IVV', 'VTI', 'VT', 'VXUS', 'VEA', 'ACWI', 'VWO', 'IEMG', 'QQQ', 'SCHD', 'VIG') then 'Multi-Asset / Broad Market'
  when symbol in ('XLK', 'VGT', 'SMH', 'SOXX') then 'Technology'
  when symbol in ('XLP') then 'Consumer Staples'
  when symbol in ('XLU') then 'Utilities'
  when symbol in ('XLV', 'VHT') then 'Healthcare'
  when symbol in ('XLF') then 'Financials'
  when symbol in ('XLE') then 'Energy'
  when symbol in ('VNQ') then 'Real Estate'
  when sector = 'Financial Services' then 'Financials'
  when sector = 'Consumer Cyclical' then 'Consumer Discretionary'
  when sector = 'Consumer Defensive' then 'Consumer Staples'
  when sector = 'Basic Materials' then 'Materials'
  when sector in (select name from canonical_sectors) then sector
  else 'Multi-Asset / Broad Market'
end
where taxonomy_is_manual_override = false;

update instruments
set canonical_themes = case
  when asset_class = 'bond_etf' and symbol in ('SGOV', 'BIL') then '["Short Duration / Cash-like", "Treasury Bonds", "Interest Rate Sensitive"]'::jsonb
  when asset_class = 'bond_etf' then '["Recession Hedge", "Interest Rate Sensitive"]'::jsonb
  when asset_class = 'gold_etf' then '["Inflation Hedge"]'::jsonb
  when asset_class = 'crypto' or instrument_type = 'crypto_etf' then '["Crypto / Digital Assets"]'::jsonb
  when symbol in ('SMH', 'SOXX') then '["Semiconductors", "AI / Automation", "Growth"]'::jsonb
  when symbol in ('SPY', 'VOO', 'IVV', 'VTI', 'VT', 'VXUS', 'VEA', 'ACWI') then '["Global Diversification"]'::jsonb
  when symbol in ('VWO', 'IEMG') then '["Emerging Markets", "Global Diversification"]'::jsonb
  when symbol in ('SCHD', 'VIG') then '["Dividend / Income", "Quality", "Defensive"]'::jsonb
  when canonical_sector = 'Technology' then '["Cloud / Software", "Quality"]'::jsonb
  when canonical_sector = 'Healthcare' then '["Healthcare Innovation", "Quality"]'::jsonb
  when canonical_sector = 'Financials' then '["Financial Services"]'::jsonb
  when canonical_sector = 'Consumer Staples' then '["Defensive Consumer"]'::jsonb
  when canonical_sector = 'Energy' then '["Energy / Oil & Gas"]'::jsonb
  when canonical_sector = 'Industrials' then '["Infrastructure / Industrials"]'::jsonb
  when canonical_sector = 'Real Estate' then '["Real Estate / REITs"]'::jsonb
  else '["Quality"]'::jsonb
end
where taxonomy_is_manual_override = false;

update assets
set canonical_sector = case
  when asset_type = 'bond_etf' then 'Bonds / Fixed Income'
  when asset_type = 'gold_etf' then 'Commodities / Gold'
  when asset_type = 'crypto' then 'Crypto'
  when asset_type = 'cash' then 'Cash / Money Market'
  when ticker in ('SPY', 'VOO', 'IVV', 'VTI', 'VT', 'VXUS', 'VEA', 'ACWI', 'VWO', 'IEMG', 'QQQ', 'SCHD', 'VIG') then 'Multi-Asset / Broad Market'
  when ticker in ('XLK', 'VGT', 'SMH', 'SOXX') then 'Technology'
  when ticker in ('XLP') then 'Consumer Staples'
  when ticker in ('XLU') then 'Utilities'
  when ticker in ('XLV', 'VHT') then 'Healthcare'
  when ticker in ('XLF') then 'Financials'
  when ticker in ('XLE') then 'Energy'
  when ticker in ('VNQ') then 'Real Estate'
  when sector = 'Financial Services' then 'Financials'
  when sector = 'Consumer Cyclical' then 'Consumer Discretionary'
  when sector = 'Consumer Defensive' then 'Consumer Staples'
  when sector = 'Basic Materials' then 'Materials'
  when sector in (select name from canonical_sectors) then sector
  else 'Multi-Asset / Broad Market'
end
where canonical_sector is null;

update assets
set canonical_themes = case
  when asset_type = 'bond_etf' then '["Recession Hedge", "Interest Rate Sensitive"]'::jsonb
  when asset_type = 'gold_etf' then '["Inflation Hedge"]'::jsonb
  when asset_type = 'crypto' then '["Crypto / Digital Assets"]'::jsonb
  when asset_type = 'cash' then '["Short Duration / Cash-like"]'::jsonb
  when ticker in ('SMH', 'SOXX') then '["Semiconductors", "AI / Automation", "Growth"]'::jsonb
  when ticker in ('SPY', 'VOO', 'IVV', 'VTI', 'VT', 'VXUS', 'VEA', 'ACWI') then '["Global Diversification"]'::jsonb
  when ticker in ('VWO', 'IEMG') then '["Emerging Markets", "Global Diversification"]'::jsonb
  when ticker in ('SCHD', 'VIG') then '["Dividend / Income", "Quality", "Defensive"]'::jsonb
  when canonical_sector = 'Technology' then '["Cloud / Software", "Quality"]'::jsonb
  when canonical_sector = 'Healthcare' then '["Healthcare Innovation", "Quality"]'::jsonb
  when canonical_sector = 'Financials' then '["Financial Services"]'::jsonb
  when canonical_sector = 'Consumer Staples' then '["Defensive Consumer"]'::jsonb
  when canonical_sector = 'Energy' then '["Energy / Oil & Gas"]'::jsonb
  when canonical_sector = 'Industrials' then '["Infrastructure / Industrials"]'::jsonb
  when canonical_sector = 'Real Estate' then '["Real Estate / REITs"]'::jsonb
  else '["Quality"]'::jsonb
end
where canonical_themes = '[]'::jsonb;

insert into instrument_sector_mappings (instrument_id, source_provider, raw_value, canonical_value, confidence, is_manual_override)
select id, coalesce(provider_primary, 'seeded'), sector, canonical_sector, 1, taxonomy_is_manual_override
from instruments
where canonical_sector is not null
on conflict (instrument_id, source_provider) do update
set raw_value = excluded.raw_value,
    canonical_value = excluded.canonical_value,
    confidence = excluded.confidence,
    is_manual_override = excluded.is_manual_override;

insert into instrument_theme_mappings (instrument_id, source_provider, raw_value, canonical_value, confidence, is_manual_override)
select i.id, coalesce(i.provider_primary, 'seeded'), tag.value, tag.value, 1, i.taxonomy_is_manual_override
from instruments i
cross join lateral jsonb_array_elements_text(i.canonical_themes) as tag(value)
on conflict (instrument_id, canonical_value, source_provider) do update
set raw_value = excluded.raw_value,
    confidence = excluded.confidence,
    is_manual_override = excluded.is_manual_override;
