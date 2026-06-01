alter table news_classifications
  add column if not exists primary_theme text,
  add column if not exists secondary_themes jsonb not null default '[]',
  add column if not exists theme_confidence integer not null default 0;

alter table news_classifications
  drop constraint if exists news_classifications_theme_confidence_bounds;

alter table news_classifications
  add constraint news_classifications_theme_confidence_bounds
  check (theme_confidence between 0 and 100);

create index if not exists idx_news_classifications_primary_theme
  on news_classifications (primary_theme);

create index if not exists idx_news_classifications_secondary_themes
  on news_classifications using gin (secondary_themes);
