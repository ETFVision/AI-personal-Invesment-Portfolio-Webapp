alter table news_items
  add column if not exists source_quality_score integer not null default 45,
  add column if not exists source_quality_tier text not null default 'tier_3';

alter table news_items
  drop constraint if exists news_items_source_quality_score_bounds;

alter table news_items
  add constraint news_items_source_quality_score_bounds
  check (source_quality_score between 0 and 100);

alter table news_items
  drop constraint if exists news_items_source_quality_tier_check;

alter table news_items
  add constraint news_items_source_quality_tier_check
  check (source_quality_tier in ('tier_1', 'tier_2', 'tier_3'));

create index if not exists idx_news_items_source_quality_tier
  on news_items (source_quality_tier);

create index if not exists idx_news_items_source_quality_score
  on news_items (source_quality_score desc);
