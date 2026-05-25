# User Flows

## Purpose

This document defines the Phase 1 user journeys for the personal AI portfolio intelligence web app. These flows connect the product requirements, manual ingestion layer, allocation engine, recommendation engine, Market Vision, and analytics dashboards.

## Flow 1: New User Onboarding

Goal: create a usable portfolio baseline.

1. User creates account or signs in.
2. App creates portable application user profile mapped to auth provider.
3. User selects base currency and timezone.
4. User selects risk profile, time horizon, cash reserve preference, and duration preference.
5. User creates one or more broker/account labels.
6. User adds cash balances.
7. User adds holdings manually.
8. App validates entries, resolves assets, and warns about duplicates.
9. User reviews portfolio setup.
10. App creates holdings, cash balances, transactions or opening snapshots, and ingestion events.
11. App routes user to Portfolio Dashboard.

Empty states:

- If user skips holdings, app creates cash-only portfolio.
- If market data is unavailable, app shows portfolio with pending price status.

## Flow 2: Add Cash

Goal: update deployable cash.

1. User opens Add Cash Balance.
2. User enters amount, currency, account, as-of date, and notes.
3. App validates currency and duplicate same-account balance.
4. App previews base-currency value if FX is available.
5. User saves.
6. App updates cash balance and records ingestion event.
7. Allocation Engine may show new deployable cash.

## Flow 3: Add Holding Snapshot

Goal: add a current position without full trade history.

1. User opens Add Holding.
2. User enters asset type, ticker, asset name, quantity, average cost, purchase date, currency, account, notes.
3. App resolves asset against provider mappings.
4. App checks for duplicates in same account and across portfolio.
5. User chooses add, merge, replace, or cancel.
6. App creates or updates holding and creates synthetic opening transaction/cost basis record.
7. App recalculates allocation, risk, and dashboard state.

## Flow 4: Add Transaction

Goal: record buy, sell, deposit, withdrawal, fee, or manual adjustment.

1. User selects transaction type.
2. Form adapts required fields.
3. User enters asset, quantity, price, fees, currency, date, account, notes.
4. App validates transaction.
5. App previews holding, cash, and cost-basis impact.
6. User confirms.
7. App records transaction and reconciles holdings/cash.
8. App updates portfolio snapshots on next calculation run.

## Flow 5: Initial Capital Allocation

Goal: recommend how available cash should be allocated.

1. User opens ETF Allocation Dashboard or Portfolio Dashboard.
2. User clicks Run Allocation Recommendation.
3. App loads available cash, target reserve, risk profile, time horizon, current holdings, watchlist, bond intelligence, market regime, and telemetry preferences.
4. Engine selects baseline model.
5. Engine adjusts for macro regime, bond regime, duration preference, and constraints.
6. Engine generates ETF-first candidates.
7. Engine adds eligible selective stock, bond ETF, gold ETF, crypto, and cash-like candidates.
8. Engine scores candidates deterministically.
9. Engine creates allocation plan and staged deployment schedule.
10. User reviews rationale and warnings.

## Flow 6: Weekly Review

Goal: give the user a calm weekly portfolio decision brief.

1. Scheduled job updates prices and metrics.
2. Market Vision job creates weekly CIO-style briefing.
3. Watchlist Intelligence evaluates triggers and candidates.
4. Bond Intelligence updates duration, credit, and macro views.
5. Recommendation Engine scores assets and holdings.
6. AI summarizes evidence, but deterministic rules assign final labels.
7. User opens Recommendations page.
8. User accepts, rejects, ignores, or marks recommendations complete.
9. Feedback is stored for telemetry.

## Flow 7: Market Vision Review

Goal: understand the market context without overreacting.

1. User opens Market Vision.
2. App shows weekly regime, executive briefing, asset-class panels, bond view, risks, opportunities, and portfolio implications.
3. Developments are tagged as short-term noise, medium-term theme, or structural shift.
4. User can expand evidence or run suggested scenarios.
5. Market Vision impacts flow into scoring as bounded adjustments.

## Flow 8: Scenario Test

Goal: estimate portfolio impact under a stress event.

1. User opens Scenario Analysis.
2. User selects recession, high inflation, prolonged high rates, oil spike, USD weakness, crypto crash, AI bubble correction, or geopolitical conflict.
3. App loads scenario assumptions and current portfolio exposure.
4. Engine applies asset-class, sector, currency, bond duration, and credit-spread shocks.
5. App displays estimated portfolio, asset-class, holding, and bond impacts.
6. User can save result or create mitigation recommendation.

## Flow 9: Monthly Telemetry Review

Goal: learn from outcomes without silently changing strategy.

1. Monthly job gathers recommendation history, user responses, benchmark comparison, signal accuracy, bond signal accuracy, and overreaction signals.
2. App proposes scoring weight changes where evidence supports it.
3. User reviews Monthly Telemetry dashboard.
4. User approves or rejects scoring weight changes.
5. Approved changes become active scoring weights.

