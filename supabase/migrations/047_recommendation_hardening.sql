-- Recommendation Engine V1 hardening.
-- Adds explicit change triggers while keeping recommendation decisions deterministic.

alter table instrument_recommendations
  add column if not exists recommendation_change_triggers jsonb not null default '{}'::jsonb;

create index if not exists idx_recommendation_history_symbol_date
  on recommendation_history (symbol, run_date desc);
