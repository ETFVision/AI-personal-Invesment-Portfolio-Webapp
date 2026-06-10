-- Add daily instrument risk refresh passes after market metrics.
--
-- Times below are UTC. Singapore time is UTC+8.

do $$
declare
  job_name text;
  job_names text[] := array[
    'app-daily-instrument-price-refresh',
    'app-daily-instrument-price-refresh-1',
    'app-daily-instrument-price-refresh-2',
    'app-daily-instrument-price-refresh-3',
    'app-daily-instrument-price-refresh-4',
    'app-daily-instrument-price-refresh-5',
    'app-daily-instrument-daily-returns-refresh',
    'app-daily-instrument-return-anchors-refresh',
    'app-daily-instrument-market-metrics-refresh',
    'app-daily-instrument-market-metrics-refresh-1',
    'app-daily-instrument-market-metrics-refresh-2',
    'app-daily-instrument-market-metrics-refresh-3',
    'app-daily-instrument-market-metrics-refresh-4',
    'app-daily-instrument-market-metrics-refresh-5',
    'app-daily-instrument-risk-refresh',
    'app-daily-instrument-risk-refresh-1',
    'app-daily-instrument-risk-refresh-2',
    'app-daily-benchmark-refresh',
    'app-daily-portfolio-valuation-refresh',
    'app-daily-fred-macro-ingestion',
    'app-daily-fmp-news-ingestion',
    'app-daily-newsdata-ingestion',
    'app-weekly-fundamentals-refresh',
    'app-weekly-fundamentals-refresh-1',
    'app-weekly-fundamentals-refresh-2',
    'app-weekly-fundamentals-refresh-3',
    'app-weekly-news-reconciliation',
    'app-weekly-market-vision',
    'app-weekly-recommendation-run',
    'app-weekly-portfolio-review-run',
    'app-weekly-telemetry-evaluation',
    'app-monthly-etf-lookthrough-refresh',
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
-- 5:20-5:40 AM SGT: five latest-price passes.
select cron.schedule(
  'app-daily-instrument-price-refresh-1',
  '20 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-2',
  '25 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-3',
  '30 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-4',
  '35 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-price-refresh-5',
  '40 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-price-refresh?batchSize=75&maxBatches=1&lookbackDays=30&skipRiskMetrics=true&skipDerivedMetrics=true&lockTtlSeconds=300');$$
);

-- 5:45-5:55 AM SGT: derived metric layers.
select cron.schedule(
  'app-daily-instrument-daily-returns-refresh',
  '45 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-daily-returns-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-return-anchors-refresh',
  '50 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-return-anchors-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300');$$
);

select cron.schedule(
  'app-daily-instrument-market-metrics-refresh',
  '55 21 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-market-metrics-refresh?batchSize=25&maxBatches=14&lockTtlSeconds=300');$$
);

-- 6:00-6:05 AM SGT: risk metrics after market metrics.
select cron.schedule(
  'app-daily-instrument-risk-refresh-1',
  '0 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=200&minObservations=30');$$
);

select cron.schedule(
  'app-daily-instrument-risk-refresh-2',
  '5 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/instrument-risk-refresh?batchSize=150&minObservations=30');$$
);

-- 6:10-6:50 AM SGT: downstream daily jobs.
select cron.schedule(
  'app-daily-benchmark-refresh',
  '10 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/benchmark-refresh?lookbackDays=30');$$
);

select cron.schedule(
  'app-daily-portfolio-valuation-refresh',
  '20 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-valuation-refresh');$$
);

select cron.schedule(
  'app-daily-fred-macro-ingestion',
  '30 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/fred-macro-ingestion');$$
);

select cron.schedule(
  'app-daily-fmp-news-ingestion',
  '40 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/daily-news-ingestion');$$
);

select cron.schedule(
  'app-daily-newsdata-ingestion',
  '50 22 * * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/newsdata-news-ingestion');$$
);

-- Weekly intelligence chain, every Monday SGT, after the daily chain.
select cron.schedule(
  'app-weekly-fundamentals-refresh-1',
  '10 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-2',
  '20 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-fundamentals-refresh-3',
  '30 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/fundamentals-refresh');$$
);

select cron.schedule(
  'app-weekly-news-reconciliation',
  '40 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-news-reconciliation');$$
);

select cron.schedule(
  'app-weekly-market-vision',
  '50 23 * * 0',
  $$select public.invoke_scheduled_app_job('/api/jobs/weekly-market-vision');$$
);

select cron.schedule(
  'app-weekly-recommendation-run',
  '0 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/recommendation-run');$$
);

select cron.schedule(
  'app-weekly-portfolio-review-run',
  '10 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/portfolio-review-run');$$
);

select cron.schedule(
  'app-weekly-telemetry-evaluation',
  '20 0 * * 1',
  $$select public.invoke_scheduled_app_job('/api/jobs/telemetry-evaluation');$$
);

-- Monthly slower refreshes, first day of month SGT.
-- Starts after the weekly chain window in case the 1st is a Monday.
select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-1',
  '40 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-2',
  '50 0 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-3',
  '0 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-4',
  '10 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-etf-lookthrough-refresh-5',
  '20 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/etf-lookthrough-refresh');$$
);

select cron.schedule(
  'app-monthly-universe-validation',
  '30 1 1 * *',
  $$select public.invoke_scheduled_app_job('/api/jobs/universe-validation');$$
);
