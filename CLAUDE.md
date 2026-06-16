# ETFVision

## Product

ETFVision is an ETF Portfolio Intelligence Platform.

Tagline:

"Your Personal CIO for ETF Investing"

The platform provides:

* Portfolio Analytics
* Risk Analytics
* Bond Intelligence
* Fundamentals
* News Intelligence
* Theme Intelligence
* Market Vision
* Recommendation Insights
* Portfolio Review
* Telemetry
* Assistant

## Product Positioning

ETFVision is:

* Portfolio Intelligence
* Analytics
* Educational Portfolio Review
* Observational Insights
* Evidence-Based Telemetry

ETFVision is NOT:

* Investment Adviser
* Robo Adviser
* Brokerage
* Trading Platform
* Personalized Buy/Sell Recommendation System

Avoid user-facing language implying direct financial advice.

## Core Documentation

Read these first:

1. docs/ARCHITECTURE\_OVERVIEW.md
2. docs/DATABASE\_SCHEMA.md
3. docs/implementation-log.md
4. docs/qa-log.md

Then read specialist and audit documents only when required.

## Specialist Documentation

Data:

* docs/DATA\_INGESTION\_AND\_PROVIDERS.md

Jobs:

* docs/JOBS\_AND\_OPERATIONS.md

Calculation:

* docs/CALCULATION\_METHODOLOGY.md
* docs/SCORE\_METHODOLOGY.md

Portfolio Review:

* docs/PORTFOLIO\_REVIEW\_METHODOLOGY.md

Recommendations:

* docs/RECOMMENDATION\_INSIGHTS\_METHODOLOGY.md

Market Vision:

* docs/MARKET\_VISION\_METHODOLOGY.md

News \& Themes:

* docs/NEWS\_THEME\_METHODOLOGY.md

Telemetry:

* docs/TELEMETRY\_ARCHITECTURE.md

Assistant:

* docs/ASSISTANT\_ARCHITECTURE.md

Security:

* docs/SECURITY\_MASTER\_AUDIT.md

Performance:

* docs/PERFORMANCE\_ARCHITECTURE.md
* docs/PAGE\_RENDERING\_AUDIT.md

## Audit Documentation

* docs/COMMERCIALIZATION\_AUDIT\_PLAN.md
* docs/SECURITY\_MASTER\_AUDIT.md
* docs/PAGE\_RENDERING\_AUDIT.md
* docs/PERFORMANCE\_ARCHITECTURE.md
* docs/DATA\_NORMALIZATION\_AUDIT.md
* docs/INSTRUMENT\_TAXONOMY\_AUDIT.md
* docs/feature-gated-production-architecture-audit.md
* docs/exposure-context-consistency-audit.md
* docs/recommendation-language-audit.md

## Primary Responsibilities

Claude's role:

* Architecture Review
* Feature Planning
* UX Review
* Compliance Review
* Commercialization Review
* Generate Codex Prompts
* Review Codex Output

Claude is NOT the primary implementation agent.

## Workflow

For every feature request:

1. Read relevant docs.
2. Read implementation-log.md.
3. Inspect only relevant files.
4. Produce architecture assessment.
5. Produce implementation plan.
6. Generate Codex prompt.
7. Require Codex to update implementation-log.md.

## Review Workflow

When reviewing Codex output:

1. Read latest implementation-log entry.
2. Review git diff.
3. Review changed files.
4. Compare against methodology docs.
5. Check compliance wording.
6. Check feature flags.
7. Check tests.
8. Approve or request revision.

Do not perform full repository reviews unless explicitly requested.

## Compliance Guardrails

Avoid:

* Strong Buy
* Buy
* Sell
* Reduce
* Purchase Recommendation
* Sell Recommendation

Prefer:

* Strong Positive Characteristics
* Positive Characteristics
* Balanced Characteristics
* Monitoring Area
* Review Area
* Elevated Concern
* Significant Concern

## Cost-Control Rule

Do not re-read the entire repository.

Read:

* implementation-log.md
* relevant docs
* changed files

Only perform deep architecture reviews for:

* major architecture changes
* telemetry redesign
* commercialization readiness reviews
* alpha launch reviews
* commercial launch reviews

