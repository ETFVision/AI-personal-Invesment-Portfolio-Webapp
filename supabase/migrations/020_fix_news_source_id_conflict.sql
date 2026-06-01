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

alter table news_items
  drop constraint if exists news_items_source_provider_source_id_key;

alter table news_items
  add constraint news_items_source_provider_source_id_key unique (source_provider, source_id);
