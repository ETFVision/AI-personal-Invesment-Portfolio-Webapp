-- Split daily raw price fetching from market metric computation.
-- Raw price jobs stay under the pg_net timeout; market metrics run afterward
-- from precomputed daily returns and return anchors.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-temporary-market-data-catchup',
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4',
    'app-daily-instrument-price-refresh-5',
    'app-daily-instrument-market-metrics-refresh-1',
    'app-daily-instrument-market-metrics-refresh-2',
    'app-daily-instrument-market-metrics-refresh-3',
    'app-daily-instrument-market-metrics-refresh-4',
    'app-daily-instrument-market-metrics-refresh-5',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
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
    'app-weekly-telemetry-evaluation'
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

-- Daily raw price fetches, Singapore time.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '30 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '40 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '50 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '0 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-5',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=360');$$
);

-- Daily metric computation after raw price fetches.
select cron.schedule(
  'app-daily-instrument-market-metrics-refresh-1',
  '20 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=3&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh-2',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=3&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh-3',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=3&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh-4',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=3&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh-5',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=3&lockTtlSeconds=360');$$
);

select cron.schedule(
  'app-daily-benchmark-refresh',
  '10 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '20 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '30 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '40 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '50 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence chain, every Monday SGT, after the daily chain.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '0 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '10 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '20 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '30 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '40 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '50 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '0 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '10 1 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);
