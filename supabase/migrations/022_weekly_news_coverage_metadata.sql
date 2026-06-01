alter table weekly_news_reconciliations
  add column if not exists coverage_metadata jsonb not null default '{}';
