-- Re-cascade the scheduled refresh chain around the US market close and collapse
-- the two daily instrument-risk passes into one set-based pass.
--
-- Times below are UTC. The price refresh starts at 22:30 UTC, which is
-- 18:30 EDT / 17:30 EST, after the US market close and EOD publish window.
-- Monthly jobs run on the 1st of the month in UTC, which is also the 1st in
-- US Eastern. Apply manually to Supabase so pg_cron uses this schedule.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-daily-returns-refresh',
    'app-daily-instrument-return-anchors-refresh',
    'app-daily-instrument-market-metrics-refresh',
    'app-daily-instrument-risk-refresh-1',
    'app-daily-instrument-risk-refresh-2',
    'app-daily-instrument-metadata-refresh',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-portfolio-summary-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion',
    'app-weekly-fundamentals-refresh-1',
    'app-weekly-fundamentals-refresh-2',
    'app-weekly-fundamentals-refresh-3',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation',
    'app-monthly-etf-lookthrough-refresh-1',
    'app-monthly-etf-lookthrough-refresh-2',
    'app-monthly-etf-lookthrough-refresh-3',
    'app-monthly-etf-lookthrough-refresh-4',
    'app-monthly-etf-lookthrough-refresh-5',
    'app-monthly-universe-validation'
  ];
begin
  foreach job_name in array job_names loop
    begin
      perform cron.unschedule(job_name);
    exception
      when others then
        null;
    end;
  end loop;
end;
$$;

-- Daily refreshes, every day.
select cron.schedule(
  'app-daily-instrument-price-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?source=eod&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-daily-returns-refresh',
  '35 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-daily-returns-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-return-anchors-refresh',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-return-anchors-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh',
  '45 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-risk-refresh',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=350&minObservations=30&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-instrument-metadata-refresh',
  '55 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-metadata-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=600');$$
);

select cron.schedule(
  'app-daily-benchmark-refresh',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '5 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-portfolio-summary-refresh',
  '10 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-summary-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '15 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '20 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '25 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly refreshes, Saturday UTC into Sunday UTC.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '30 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '35 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '40 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '45 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '50 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '55 23 * * 6',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '0 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '5 0 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes, first day of month UTC.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-1',
  '30 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-2',
  '35 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-3',
  '40 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-4',
  '45 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-5',
  '50 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-universe-validation',
  '55 23 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
