update news_items
set source_id = coalesce(
  nullif(source_id, ''),
  nullif(url, ''),
  content_hash,
  id::text
)
where source_id is null or source_id = '';

with duplicates as (
  select
    id,
    row_number() over (
      partition by source_provider, source_id
      order by is_duplicate asc, published_at desc nulls last, created_at asc
    ) as duplicate_rank
  from news_items
)
update news_items n
set
  source_id = n.source_id || ':' || n.id::text,
  is_duplicate = true
from duplicates d
where n.id = d.id
  and d.duplicate_rank > 1;

drop index if exists idx_news_items_provider_source_id;

alter table news_items
  alter column source_id set not null;

alter table news_items
  drop constraint if exists news_items_source_provider_source_id_key;

alter table news_items
  add constraint news_items_source_provider_source_id_key unique (source_provider, source_id);
