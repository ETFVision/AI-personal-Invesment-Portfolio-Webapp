-- Move NewsData.io macro/world-news ingestion to a daily queue.
-- If a group has already succeeded today, queue it for 06:00 Asia/Singapore tomorrow.
-- If it has not succeeded today, make it due immediately so the next manual/cron run can process it.

update newsdata_query_groups
set
  next_run_at = case
    when last_success_at is not null
      and ((last_success_at at time zone 'Asia/Singapore')::date = (now() at time zone 'Asia/Singapore')::date)
      then (((now() at time zone 'Asia/Singapore')::date + interval '1 day' + time '06:00') at time zone 'Asia/Singapore')
    else now()
  end,
  updated_at = now()
where is_active = true;
