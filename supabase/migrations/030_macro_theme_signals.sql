-- Structured FRED macro theme signals.
-- FRED observations are not news articles; this table feeds Theme Intelligence and
-- Market Vision inputs separately from news_items.

create table if not exists macro_theme_signals (
  id uuid primary key default gen_random_uuid(),
  signal_date date not null,
  source_provider text not null,
  source_indicator_code text not null,
  theme text not null,
  theme_category text not null default 'Macro',
  direction text not null,
  regime_label text not null default 'insufficient_data',
  severity_score integer not null default 0,
  persistence_score integer not null default 0,
  confidence_score integer not null default 0,
  explanation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint macro_theme_signals_unique_signal unique (signal_date, source_provider, source_indicator_code, theme),
  constraint macro_theme_signals_source_provider_check check (source_provider in ('fred')),
  constraint macro_theme_signals_theme_category_check check (theme_category in ('Macro')),
  constraint macro_theme_signals_direction_check check (direction in ('rising', 'falling', 'stable', 'mixed', 'insufficient_data')),
  constraint macro_theme_signals_score_bounds check (
    severity_score between 0 and 100 and
    persistence_score between 0 and 100 and
    confidence_score between 0 and 100
  )
);

create index if not exists idx_macro_theme_signals_date on macro_theme_signals (signal_date desc);
create index if not exists idx_macro_theme_signals_theme_date on macro_theme_signals (theme, signal_date desc);
create index if not exists idx_macro_theme_signals_provider_indicator on macro_theme_signals (source_provider, source_indicator_code, signal_date desc);

drop trigger if exists trg_macro_theme_signals_updated_at on macro_theme_signals;
create trigger trg_macro_theme_signals_updated_at before update on macro_theme_signals for each row execute function set_updated_at();

alter table macro_theme_signals enable row level security;

drop policy if exists "users can read macro theme signals" on macro_theme_signals;
create policy "users can read macro theme signals" on macro_theme_signals for select using (true);
