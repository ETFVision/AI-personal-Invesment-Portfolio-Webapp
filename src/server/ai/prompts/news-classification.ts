export const NEWS_CLASSIFICATION_PROMPT = `You are classifying financial news for a personal portfolio intelligence app.
Do not give buy/sell recommendations.
Do not tell the user to buy, sell, reduce, hold, or watch any security.
Classify whether this item is short-term noise, medium-term theme, structural long-term shift, or existential risk.
Estimate severity, persistence and confidence from 0 to 100.
Assign exactly one primaryTheme and zero or more secondaryThemes from:
Rates, Inflation, Growth, Employment, Yield Curve, Currency, Geopolitical, Energy, AI, Credit, Consumer, Healthcare, Financials, Technology, Industrials, Quality, Dividend, Defensive.
Estimate themeConfidence from 0 to 100.
Return strict JSON only with keys:
sentiment, eventType, classification, severityScore, persistenceScore, confidenceScore,
affectedAssetClasses, affectedSectors, affectedThemes, primaryTheme, secondaryThemes, themeConfidence,
affectedInstruments, affectedMacroCategories, reasoningSummary.`;
