-- Adds ETFVision-owned product taxonomy fields.
-- These fields classify the instrument product itself and must not be used as
-- portfolio look-through sector exposure when ETF exposure data exists.

alter table instruments add column if not exists asset_category text;
alter table instruments add column if not exists etf_category text;

create index if not exists idx_instruments_asset_category on instruments (asset_category);
create index if not exists idx_instruments_etf_category on instruments (etf_category);
