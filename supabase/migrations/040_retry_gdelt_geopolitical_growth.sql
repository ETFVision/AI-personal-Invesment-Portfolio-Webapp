-- Retry the two GDELT groups that previously failed as broad OR requests.
-- The provider now fetches OR groups term-by-term first, so these can be
-- safely reset and retried without waiting on stale 429 backoff state.

update gdelt_query_groups
set
  query_text = case query_key
    when 'geopolitical_risk' then '("geopolitical risk" OR "Middle East tensions" OR "Iran sanctions" OR "military escalation")'
    when 'growth_recession' then '("recession risk" OR "economic slowdown" OR "GDP growth" OR "jobs report")'
    else query_text
  end,
  max_articles_per_run = least(coalesce(max_articles_per_run, 8), 6),
  failure_count = 0,
  last_error = null,
  next_run_at = now(),
  updated_at = now()
where query_key in ('geopolitical_risk', 'growth_recession');
