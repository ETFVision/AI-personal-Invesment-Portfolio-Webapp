-- A successful GDELT query group is complete for the current UTC day.
-- Keep failed, queued, or not-yet-run groups eligible while moving today's
-- successful groups to the next calendar day.

update gdelt_query_groups
set
  next_run_at = date_trunc('day', now()) + interval '1 day',
  updated_at = now()
where
  is_active = true
  and failure_count = 0
  and last_error is null
  and last_success_at >= date_trunc('day', now())
  and next_run_at < date_trunc('day', now()) + interval '1 day';
