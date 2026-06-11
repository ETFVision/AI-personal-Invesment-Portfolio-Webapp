# Documentation Gaps and Follow-Up Audit List

Last updated: 2026-06-11 20:11:07 +08:00

This document records areas where the handover pack intentionally avoids guessing. These should be verified before commercialization or before a new developer changes related logic.

## High Priority

1. RLS policy audit
   - Verify every user-specific table is scoped correctly.
   - Check assistant conversations, recommendation history, telemetry, portfolio review, and summary tables.

2. Exact portfolio TWR formula
   - Follow up in `PerformanceService.ts`, `AnalyticsService.ts`, and related SQL functions.
   - Confirm cash-flow timing, dividends, contributions, withdrawals, and same-day transaction handling.

3. ETF exposure table map
   - Follow up in `SupabaseEtfExposureRepository.ts` and ETF migrations.
   - Produce final table/column map for sector, country, top holdings, and coverage status.

4. Alpha branch feature gate audit
   - Validate on `alpha` branch, not only `development`.
   - Confirm Admin/Data Sources and internal diagnostics are not exposed if not intended for alpha.

## Medium Priority

1. Market Vision publish/draft lifecycle
   - Verify whether scheduled jobs should publish or create drafts.
   - Follow up in `MarketVisionGenerationService.ts`.

2. Assistant table/cost schema
   - Confirm exact assistant tables and cost formulas.
   - Follow up in assistant migrations and `SupabaseAssistantRepository.ts`.

3. News classification formula and thresholds
   - Summarize deterministic rules, confidence scoring, source quality weighting, and review queue conditions.

4. Active universe verification
   - Confirm live Supabase active count equals intended 201 ETFs and 105 stocks, with raw crypto inactive.

5. Score methodology maintenance
   - Formula-level score documentation now exists in `docs/SCORE_METHODOLOGY.md`.
   - Future scoring changes must update that document in the same commit.

## Low Priority

1. Provider endpoint inventory
   - List exact FMP/FRED/NewsData/GDELT endpoints used by each provider adapter.

2. Render timing baseline
   - Maintain a benchmark table for each key route after major performance work.

3. Job schedule drift check
   - Compare `docs/scheduled-jobs.md`, latest schedule migration, and live Supabase `cron.job` table after manual schedule edits.

4. Old docs cleanup
   - Older lowercase docs remain useful, but some overlap with this handover pack.
   - Do not delete until the user approves an archive/cleanup pass.
