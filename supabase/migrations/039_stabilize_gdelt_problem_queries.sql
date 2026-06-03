-- Stabilize the two GDELT query groups that repeatedly hit DOC API 429s.
-- These groups were too broad as combined OR queries; narrower phrases plus
-- fallback-term fetching produce better coverage without hammering GDELT.

update gdelt_query_groups
set
  query_text = case query_key
    when 'geopolitical_risk' then '("geopolitical risk" OR "Middle East conflict" OR "Iran sanctions" OR "military escalation")'
    when 'growth_recession' then '("recession risk" OR "economic slowdown" OR "GDP growth" OR "jobs report")'
    else query_text
  end,
  max_articles_per_run = least(coalesce(max_articles_per_run, 8), 6),
  failure_count = 0,
  last_error = null,
  next_run_at = now(),
  updated_at = now()
where query_key in ('geopolitical_risk', 'growth_recession');
