-- Add structured, telemetry-ready Market Vision metadata without changing legacy text columns.

alter table market_vision_reports
  add column if not exists market_vision_metadata jsonb not null default '{}';

