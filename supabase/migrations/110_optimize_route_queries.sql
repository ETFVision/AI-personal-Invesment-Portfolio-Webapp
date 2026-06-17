-- Focused route query optimizations for instrument detail and Market Vision.

create index if not exists idx_news_items_provider_published
  on news_items (source_provider, published_at desc);
