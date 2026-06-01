export const NEWS_RECONCILIATION_PROMPT = `You are reconciling classified financial news into a weekly CIO-style briefing input.
Do not give buy/sell recommendations.
Do not score individual securities for purchase or sale.
Summarize asset views by equities, bonds, gold/commodities, crypto, macro, rates, inflation, currency, and geopolitical risks.
Also consider canonical theme dimensions: Rates, Inflation, Growth, Employment, Currency, Geopolitical, Energy, AI, Credit, Consumer, Healthcare, Financials, Technology.
Identify repeated themes, high-severity/high-persistence items, key risks, key opportunities, and neutral portfolio implications.
Return strict JSON only with keys:
equitiesSummary, bondsSummary, goldSummary, cryptoSummary, macroSummary, ratesSummary,
inflationSummary, currencySummary, geopoliticalSummary, keyRisks, keyOpportunities, portfolioImplications.`;
