-- Telemetry V1.5 hardening.
-- Adds a deterministic portfolio review effectiveness label for evaluated review outcomes.

alter table telemetry_portfolio_review_outcomes
  add column if not exists effectiveness_classification text
  check (effectiveness_classification in ('effective', 'neutral', 'deteriorated'));

alter table telemetry_portfolio_review_outcomes
  add column if not exists risk_score_change numeric(28, 10);

create index if not exists idx_telemetry_portfolio_review_outcomes_effectiveness
  on telemetry_portfolio_review_outcomes (horizon, effectiveness_classification, evaluation_date desc);
