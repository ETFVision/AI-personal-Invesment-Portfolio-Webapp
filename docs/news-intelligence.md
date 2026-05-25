# News Intelligence

## Purpose

News Intelligence collects daily news, deduplicates related items, scores severity, persistence, and confidence, applies time decay, and produces weekly AI summaries. It prevents headline overreaction.

## Logic Flow

```text
Collect daily news
  -> Normalize metadata
  -> Map to assets, sectors, countries, and macro topics
  -> Deduplicate into clusters
  -> AI classifies relevance, severity, direction, and thesis impact
  -> Score severity, persistence, confidence
  -> Apply time decay
  -> Store items and clusters
  -> Generate weekly summaries
  -> Feed Market Vision and scoring with bounded impacts
```

## Database Tables

Primary tables:

- `news_items`
- `weekly_news_summaries`

Recommended additions:

```sql
create table news_clusters (
  id uuid primary key,
  cluster_key text not null unique,
  title text not null,
  topic text,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  severity_score numeric(12, 6),
  persistence_score numeric(12, 6),
  confidence_score numeric(12, 6),
  direction text,
  thesis_impact text,
  affected_asset_ids jsonb not null default '[]',
  affected_topics jsonb not null default '[]',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table news_cluster_items (
  id uuid primary key,
  news_cluster_id uuid not null references news_clusters(id),
  news_item_id uuid not null references news_items(id),
  similarity_score numeric(12, 6),
  created_at timestamptz not null default now(),
  unique (news_cluster_id, news_item_id)
);
```

## Overreaction Prevention

Rules:

- Unconfirmed news cannot drive Sell.
- Single-day news usually maps to Watch or lower confidence.
- Positive news cannot create Strong Buy unless valuation and portfolio fit support it.
- Repeated persistent news can become a medium-term theme.
- News impact decays unless reinforced.

## Pseudo-Code

```ts
export class NewsIntelligenceService {
  async collectDailyNews(date: Date): Promise<void> {
    const rawItems = await this.newsProvider.fetchRelevantNews(date);
    for (const item of rawItems.map(normalizeNewsItem)) {
      const saved = await this.newsRepo.upsertNewsItem(item);
      const cluster = await this.findOrCreateCluster(saved);
      await this.newsRepo.linkItemToCluster(cluster.id, saved.id);
      await this.rescoreCluster(cluster.id);
    }
  }
}
```

## UI Concepts

- Daily digest.
- Weekly summary.
- News cluster cards.
- Severity/persistence/confidence badges.
- Asset impact tags.
- "Why not acting yet" explanation.

## Example

```text
Oil supply disruption: severity medium, persistence high, confidence medium. Monitor inflation-linked bonds, gold, energy-sensitive equities, and consumer risk. No immediate allocation change is recommended.
```

