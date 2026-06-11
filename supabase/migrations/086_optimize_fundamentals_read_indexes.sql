-- Optimize read paths used by fundamentals overview and instrument detail pages.
-- These composite indexes match the common pattern: one instrument plus newest rows.

create index if not exists idx_instruments_asset_symbol
  on instruments (asset_class, symbol);

create index if not exists idx_financial_statements_instrument_report_date
  on financial_statements (instrument_id, report_date desc);

create index if not exists idx_financial_statements_instrument_type_report_date
  on financial_statements (instrument_id, statement_type, report_date desc);

create index if not exists idx_financial_ratios_instrument_report_date
  on financial_ratios (instrument_id, report_date desc);

create index if not exists idx_fundamental_scores_instrument_as_of_date
  on fundamental_scores (instrument_id, as_of_date desc);

create index if not exists idx_fundamental_trends_instrument_category_metric
  on fundamental_trends (instrument_id, metric_category, metric_name);

create index if not exists idx_fundamental_trend_summaries_instrument_as_of_date
  on fundamental_trend_summaries (instrument_id, as_of_date desc);
