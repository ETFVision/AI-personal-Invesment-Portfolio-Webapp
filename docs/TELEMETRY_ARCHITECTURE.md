# Telemetry Architecture

Last updated: 2026-06-11 20:11:07 +08:00

## Purpose

Telemetry tracks whether ETFVision analytical outputs were directionally useful over time. It is an evaluation layer, not a scoring source of truth.

## Main Code Paths

- `TelemetrySnapshotService.ts`
- `TelemetryEvaluationService.ts`
- `TelemetryAggregationService.ts`
- `TelemetryDashboardService.ts`
- `MarketVisionTelemetryEvaluationService.ts`
- `PortfolioReviewTelemetryEvaluationService.ts`
- `telemetryMath.ts`
- Job: `/api/jobs/telemetry-evaluation`

## Snapshot Types

Telemetry stores snapshots for:

- Recommendations.
- Market Vision.
- Portfolio Review.

Tables are introduced in `054_telemetry_learning_layer.sql` and hardened in `055_telemetry_v1_5_hardening.sql`.

## Evaluation Horizons

The evaluation job runs weekly, but the horizons are:

- 1 month.
- 3 months.
- 6 months.
- 12 months.

The job checks stored snapshots and evaluates only matured observations.

## Output

Telemetry pages summarize:

- Observation counts.
- Outcome distributions.
- Factor performance.
- Evidence strength.
- Market Vision and portfolio review outcome summaries.

## Current Limitations

- Early telemetry is expected to be sparse.
- It should not be used to automatically change recommendation weights without a calibration process.
- Telemetry snapshot and evaluation completeness should be monitored after scheduled weekly runs.
