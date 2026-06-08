# Recommendation Language Audit

Date: 2026-06-08

## Scope

This pass refines the consumer-facing language around ETFVision's deterministic recommendation engine without changing scoring logic, guardrails, database contracts, telemetry calculations, or scheduled jobs.

## Consumer-Facing Positioning

ETFVision should present the output as analytical classifications and instrument insights, not investment advice or trade recommendations.

Public labels now map from internal labels as follows:

- Strong Buy -> Very Favorable Characteristics
- Buy -> Favorable Characteristics
- Hold -> Balanced Characteristics
- Watch -> Review Area
- Reduce -> Elevated Concerns
- Sell -> Significant Concerns
- Insufficient Data -> Insufficient Data
- Not Applicable -> Not Applicable

## Updated Surfaces

- Research navigation now shows `Insights` instead of `Recommendations`.
- The main `/recommendations` page now presents `Insights`, `Assessment`, and `Characteristics score`.
- Instrument detail tabs now show `Insights`.
- Instrument detail insight cards now use assessment labels, positive characteristics, concern areas, improvement triggers, and deterioration triggers.
- Portfolio Review candidate sections now present improvement observations and assessment labels.
- Telemetry now presents insight snapshots, insight outcomes, and assessment labels.
- Portfolio Assistant prompt and drawer copy now use insights and analytical classifications.
- Assistant response guardrails continue blocking buy/sell, position sizing, target allocation, and return-prediction language.

## Intentionally Preserved Internal Terms

The following remain unchanged because they are internal contracts, database/API names, or legitimate transaction concepts:

- `/recommendations` route and `/api/jobs/recommendation-run` endpoint.
- `RecommendationRepository`, `InstrumentRecommendation`, recommendation database fields and telemetry snapshot fields.
- Test fixtures and service names where they represent existing domain contracts.
- Transaction page `buy` and `sell` labels, because those are actual transaction types.
- Prompt guardrails that say AI must not give buy/sell recommendations.

## Remaining Future Option

A deeper migration could rename route/API/domain terms from `recommendation` to `insight`, but that would require database, job, telemetry, action, and test migration work. It was intentionally avoided in this pass to keep the change presentation-only and low risk.

## QA Notes

- Scoring weights were not changed.
- Guardrail thresholds were not changed.
- Generated outputs remain bounded by no-buy/sell/no-target-allocation instructions.
- Old user questions such as "Why is NVDA Hold?" remain supported so existing language and user habits do not break.
