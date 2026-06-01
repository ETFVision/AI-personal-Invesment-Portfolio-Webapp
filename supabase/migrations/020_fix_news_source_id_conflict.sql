update news_items
set source_id = coalesce(
  nullif(source_id, ''),
  nullif(url, ''),
  content_hash,
  id::text
)
where source_id is null or source_id = '';

drop index if exists idx_news_items_provider_source_id;

alter table news_items
  alter column source_id set not null;

create unique index if not exists idx_news_items_provider_source_id
  on news_items (source_provider, source_id);
