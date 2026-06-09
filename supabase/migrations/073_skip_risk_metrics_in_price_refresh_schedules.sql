-- Keep latest-price refresh jobs lightweight by skipping heavy risk metrics.
--
-- Price refreshes still upsert raw prices and rebuild instrument_market_metrics
-- for updated instruments. Instrument risk metrics are refreshed through the
-- dedicated instrument-risk-refresh job instead.

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
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion'
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

-- Temporary latest market-data catch-up, every 5 minutes.
select cron.schedule(
  'app-temporary-market-data-catchup',
  '*/5 * * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

-- Daily refreshes, Singapore time.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '30 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '40 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '50 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '0 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-5',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=25&maxBatches=3&lookbackDays=30&skipRiskMetrics=true&lockTtlSeconds=480');$$
);

select cron.schedule(
  'app-daily-benchmark-refresh',
  '20 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '0 23 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);
