# Wireframe Plan

## 1. App Shell

The app should feel like a personal portfolio cockpit: calm, dense, and easy to scan.

Primary navigation:

- Portfolio
- Allocation
- Bonds
- Watchlist
- Recommendations
- Market Vision
- Benchmarks
- Risk
- Scenarios
- Telemetry
- Settings

Desktop layout:

- Left sidebar navigation.
- Top bar with portfolio selector, base currency, last data update, and account menu.
- Main content area with responsive dashboard sections.

Mobile layout:

- Bottom tab bar for top-level sections.
- Secondary screens use compact headers and stacked cards.
- Large tables become searchable list views.
- Chart-heavy pages show one chart per viewport section.

## 2. Login

Purpose:

- Authenticate the user and route them to portfolio setup or dashboard.

Layout:

- Centered login panel.
- App name and concise subtitle.
- Email/password fields.
- Continue button.
- Optional magic link or OAuth provider area if supported later.

Charts/tables:

- None.

Actions:

- Sign in.
- Create account.
- Reset password.

Mobile considerations:

- Full-screen form.
- Large input targets.
- Keyboard-friendly spacing.

Empty states:

- New account routes to Manual Portfolio Setup.
- Existing account with no portfolio also routes to setup.

## 3. Manual Portfolio Setup

Purpose:

- Guide first-time users through base currency, accounts, cash, holdings, and review.

Layout:

- Stepper across top on desktop.
- Single-column wizard on mobile.
- Right-side setup summary on desktop.

Steps:

- Base currency.
- Broker/accounts.
- Cash balances.
- Holdings.
- Review.

Charts/tables:

- Setup summary table.
- Preliminary allocation preview after holdings are entered.

Actions:

- Add account.
- Add cash.
- Add holding.
- Import later.
- Review and confirm.

Mobile considerations:

- One step per screen.
- Sticky bottom action bar.
- Summary collapses into accordion.

Empty states:

- No accounts: show Add Account prompt.
- No holdings: allow user to continue with cash-only portfolio.
- No cash: warn but allow holdings-only setup.

## 4. Add Cash Balance

Purpose:

- Add or edit cash by currency and account.

Layout:

- Form panel with live preview.
- Desktop: form left, preview right.
- Mobile: stacked form then preview.

Fields:

- Cash available.
- Currency.
- Broker/account name.
- As-of date.
- Notes.

Charts/tables:

- Existing cash balances table.
- Base-currency conversion preview when FX data exists.

Actions:

- Save cash balance.
- Save and add another.
- Delete balance.
- Cancel.

Mobile considerations:

- Currency picker optimized for search.
- Numeric keypad for amount.

Empty states:

- No cash balances: show simple explanation and Add Cash button.

## 5. Add/Edit Holding

Purpose:

- Add or update current holdings manually.

Layout:

- Asset lookup at top.
- Holding details form below.
- Duplicate warning panel when applicable.
- Reconciliation preview on desktop side panel.

Fields:

- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Average cost.
- Purchase date.
- Currency.
- Broker/account name.
- Notes.

Charts/tables:

- Cost basis preview.
- Existing similar holdings table if duplicates detected.

Actions:

- Save holding.
- Merge with existing.
- Replace existing.
- Save as unresolved manual asset.
- Delete holding.

Mobile considerations:

- Asset lookup opens full-screen search.
- Duplicate warning appears before final save.

Empty states:

- Ticker not found: show Save as Manual Asset option.
- No account: prompt to create account inline.

## 6. Add/Edit Transaction

Purpose:

- Record buys, sells, deposits, withdrawals, fees, and manual adjustments.

Layout:

- Transaction type segmented control.
- Dynamic form fields.
- Impact preview panel.

Fields:

- Transaction type.
- Asset type.
- Ticker.
- Asset name.
- Quantity.
- Price.
- Fees.
- Transaction date.
- Currency.
- Broker/account name.
- Notes.

Charts/tables:

- Holding impact preview.
- Cash impact preview.
- Recent similar transactions table.

Actions:

- Save transaction.
- Save and add another.
- Preview impact.
- Delete transaction.

Mobile considerations:

- Transaction type selector at top.
- Sticky Save button.
- Preview collapses below form.

Empty states:

- No matching holding for sell: show warning and block unless correction mode is enabled.
- No cash balance: allow transaction but warn cash may become negative.

## 7. Portfolio Dashboard

Purpose:

- Provide the main portfolio overview.

Layout:

- Top KPI row.
- Allocation and performance charts.
- Recommendations preview.
- Risk and Market Vision summaries.

Charts/tables:

- Total portfolio value line chart.
- Asset allocation donut or bar chart.
- Asset-class allocation table.
- Performance versus primary benchmark.
- Top holdings table.

Actions:

- Add cash.
- Add holding.
- Add transaction.
- Run allocation recommendation.
- View recommendations.

Mobile considerations:

- KPI cards in two-column grid.
- Charts stacked vertically.
- Top holdings becomes compact list.

Empty states:

- No portfolio: start setup.
- No prices: show holdings with "price pending" status.
- No recommendations yet: show Generate Weekly Review prompt.

## 8. Holdings Table

Purpose:

- Manage current holdings and inspect position-level performance.

Layout:

- Filter/search toolbar.
- Holdings table.
- Side drawer for selected holding details.

Charts/tables:

- Holdings table columns:
  - Asset
  - Type
  - Account
  - Quantity
  - Average cost
  - Latest price
  - Market value
  - Allocation
  - Unrealized gain/loss
  - Recommendation

Actions:

- Add holding.
- Add transaction.
- Edit holding.
- Export CSV.
- Filter by account, asset class, currency, recommendation.

Mobile considerations:

- Table becomes card list.
- Sort and filters open in bottom sheet.

Empty states:

- No holdings: show Add Holding and Add Cash actions.
- Filter returns no rows: show Clear Filters.

## 9. ETF Allocation Dashboard

Purpose:

- Show ETF-first portfolio construction and allocation gaps.

Layout:

- ETF/core/satellite summary.
- Target versus actual allocation.
- ETF overlap and role sections.

Charts/tables:

- Target vs actual allocation bar chart.
- Core vs satellite exposure chart.
- ETF allocation table.
- Asset-class gap table.
- ETF alternatives table for individual stocks.

Actions:

- Run initial allocation engine.
- Rebalance toward target.
- Review ETF alternatives.
- Update target allocation model.

Mobile considerations:

- Allocation gap cards replace wide table.
- Target model selector pinned near top.

Empty states:

- No allocation model: prompt to choose model.
- No ETF holdings: suggest ETF-first starter allocation.

## 10. Bond Intelligence Dashboard

Purpose:

- Explain fixed-income exposure by duration, credit, type, currency, geography, and portfolio role.

Layout:

- Bond sleeve KPI row.
- Duration and credit exposure panels.
- Bond Market Vision card.
- Bond ETF table.

Charts/tables:

- Duration bucket chart.
- Credit quality chart.
- Treasury vs corporate exposure chart.
- Rate shock impact table.
- Bond ETF holdings/watchlist table.

Actions:

- View rate shock scenario.
- Add bond ETF to watchlist.
- Run bond allocation suggestion.
- Review duration preference.

Mobile considerations:

- Bond KPI cards stacked.
- Rate shock table becomes accordion rows.

Empty states:

- No bond exposure: show starter bond ETF categories.
- Missing duration data: show classification pending message.

## 11. Watchlist Dashboard

Purpose:

- Manage core quality, tactical/thematic, and opportunistic watchlists.

Layout:

- Tier tabs.
- Watchlist summary cards.
- Watchlist table.
- Suggestion panel.

Charts/tables:

- Watchlist count by asset class.
- Trigger-near list.
- Watchlist item table:
  - Symbol
  - Tier
  - Status
  - Conviction score
  - Portfolio fit
  - Trigger distance
  - Suggested action

Actions:

- Add watchlist item.
- Edit thesis.
- Set trigger.
- Move tier.
- Remove or pause item.
- Run quarterly review.

Mobile considerations:

- Tier tabs horizontally scroll.
- Watchlist table becomes list cards.

Empty states:

- No watchlist: offer recommended starter universe.
- No trigger-near items: show quiet all-clear state.

## 12. Stock Analysis Page

Purpose:

- Analyze an individual stock candidate or holding.

Layout:

- Header with ticker, price, recommendation.
- Score breakdown.
- Fundamentals/valuation/momentum sections.
- Portfolio fit and ETF alternative section.
- News and thesis section.

Charts/tables:

- Price chart.
- Score radar or stacked score bars.
- Fundamentals table.
- Valuation comparison table.
- Benchmark-relative performance chart.
- ETF overlap/alternative table.

Actions:

- Add to watchlist.
- Add/edit thesis.
- Add transaction.
- Compare to ETF.
- Mark as ignored/rejected candidate.

Mobile considerations:

- Sticky ticker header.
- Score cards stacked.
- Tables become compact key-value lists.

Empty states:

- No fundamentals: show price and portfolio-fit analysis only.
- No news: show "no material news collected."

## 13. Recommendations Page

Purpose:

- Review deterministic recommendations and AI-generated explanations.

Layout:

- Recommendation status tabs.
- Priority filter.
- Recommendation list.
- Detail drawer.

Charts/tables:

- Recommendation table:
  - Asset/action
  - Label
  - Priority
  - Confidence
  - Portfolio impact
  - Created date
  - Status
- Score breakdown chart in detail view.

Actions:

- Accept.
- Reject.
- Ignore.
- Mark complete.
- Add note.
- View evidence.

Mobile considerations:

- Recommendation cards.
- Detail opens full-screen.

Empty states:

- No recommendations: show next scheduled review.
- No open recommendations: show completed/ignored summary.

## 14. Market Vision Dashboard

Purpose:

- Weekly CIO-style market briefing and portfolio implication view.

Layout:

- Market regime header.
- Executive briefing.
- Asset-class panels.
- Bond Vision panel.
- Risks/opportunities.
- Portfolio implications.

Charts/tables:

- Global markets performance table.
- Rates/yield curve chart.
- Inflation trend chart.
- Currency trend chart.
- Gold and crypto mini charts.
- Development classification table.

Actions:

- View supporting evidence.
- Run suggested scenario.
- Send impact to recommendations.
- View previous reports.

Mobile considerations:

- Executive briefing first.
- Panels stacked in priority order.
- Charts simplified.

Empty states:

- No weekly report: show Generate Market Vision.
- Data stale: show last report with stale badge.

## 15. Benchmarking Dashboard

Purpose:

- Compare portfolio against S&P 500, Nasdaq, global equities, 60/40, gold, Bitcoin, and bond benchmarks.

Layout:

- Benchmark selector.
- Portfolio vs benchmark chart.
- Return/risk comparison grid.
- Benchmark tiles.

Charts/tables:

- Portfolio vs benchmark line chart.
- Relative return chart.
- Drawdown comparison.
- Benchmark performance table.
- Rolling return table.

Actions:

- Set primary benchmark.
- Create custom blended benchmark.
- Compare multiple benchmarks.
- Export performance summary.

Mobile considerations:

- One benchmark comparison at a time.
- Selector as dropdown.

Empty states:

- No benchmark selected: default to 60/40 or ask user to choose.
- Insufficient history: show available periods only.

## 16. Risk Analytics Dashboard

Purpose:

- Show portfolio risk, concentration, diversification, correlations, and bond-specific exposures.

Layout:

- Risk summary cards.
- Exposure charts.
- Correlation matrix.
- Bond risk panel.
- Risk notes.

Charts/tables:

- Volatility and drawdown charts.
- Sharpe ratio card.
- Concentration table.
- Sector/geography/currency charts.
- Correlation matrix.
- Diversification quality gauge.
- Bond duration and credit exposure table.

Actions:

- Run scenario from risk.
- View concentrated holdings.
- Generate risk recommendation.
- Adjust risk profile.

Mobile considerations:

- Correlation matrix becomes pairwise top correlations list.
- Exposure charts stacked.

Empty states:

- Insufficient price history: show available static exposure metrics.
- No bond exposure: hide bond metrics behind empty panel.

## 17. Scenario Analysis Dashboard

Purpose:

- Estimate portfolio impact under major market scenarios.

Scenarios:

- Recession.
- High inflation.
- Prolonged high rates.
- Oil spike.
- USD weakness.
- Crypto crash.
- AI bubble correction.
- Geopolitical conflict.

Layout:

- Scenario selector.
- Assumption summary.
- Portfolio impact summary.
- Asset-class and holding impact tables.
- Bond impact section.

Charts/tables:

- Estimated impact waterfall.
- Asset-class impact bar chart.
- Holding impact table.
- Bond impact table:
  - Duration impact
  - Credit-spread impact
  - Inflation-linked impact
  - Flight-to-quality impact

Actions:

- Run scenario.
- Compare scenarios.
- Edit assumptions.
- Save scenario.
- Create recommendation from mitigation.

Mobile considerations:

- Scenario selector as card grid.
- Impact tables become expandable rows.

Empty states:

- No holdings: scenario disabled until portfolio exists.
- Missing bond profile: show partial scenario warning.

## 18. Telemetry Review Dashboard

Purpose:

- Review monthly system learning and approve scoring-weight changes.

Layout:

- Monthly summary header.
- Recommendation outcomes.
- Benchmark comparison.
- Signal accuracy.
- Bond signal accuracy.
- Overreaction detection.
- Weight change approvals.

Charts/tables:

- Recommendation outcome table.
- Benchmark comparison chart.
- Signal accuracy cards.
- Bond signal accuracy table.
- Overreaction event list.
- Proposed scoring weight changes table.

Actions:

- Approve weight change.
- Reject weight change.
- View recommendation evidence.
- Lock scoring model.
- Add human note.

Mobile considerations:

- Approval cards instead of wide table.
- Evidence opens full-screen.

Empty states:

- No monthly review yet: show next scheduled review.
- Not enough data: show minimum data required.

## 19. Settings/API Page

Purpose:

- Configure user profile, portfolio preferences, API/provider settings, and portability-related settings.

Layout:

- Settings sections in tabs or sidebar.
- Profile.
- Portfolio preferences.
- API providers.
- Data refresh.
- Security.
- Export/migration.

Charts/tables:

- API usage table.
- Provider health table.
- Scheduled job status table.

Actions:

- Update base currency.
- Update risk profile.
- Update duration preference.
- Set API keys.
- Test provider connection.
- Configure refresh cadence.
- Export data.
- Delete account.

Mobile considerations:

- Sections stacked as accordions.
- Sensitive fields use reveal controls.

Empty states:

- Missing API key: show provider disabled state.
- Provider test not run: show neutral pending state.
- No job history: show first refresh pending.

## 20. Cross-Screen Empty States

Common empty states:

- No portfolio created.
- No holdings.
- No market data.
- No recommendations.
- No watchlist.
- No benchmark history.
- No scenario results.
- No telemetry review.

Each empty state should include:

- What is missing.
- Why it matters.
- One primary action.
- Optional secondary action.

## 21. Cross-Screen Mobile Rules

- Avoid wide tables on mobile.
- Use card lists with key metrics.
- Use bottom sheets for filters.
- Use sticky primary action buttons for forms.
- Keep charts simple and vertically stacked.
- Preserve evidence drill-down, but hide it behind expand controls.
- Make data-stale and error states visible near the affected module.

