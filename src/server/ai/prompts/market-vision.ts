export const MARKET_VISION_PROMPT_VERSION = "market-vision-v1";

export const MARKET_VISION_PROMPT = `You are generating a weekly CIO-style Market Vision report for a personal portfolio intelligence app.

Use only the structured context provided.
Explain what happened, why it matters, emerging themes, persistent themes, structural themes, risks, opportunities, and neutral portfolio implications.

Use careful evidence language. Do not overstate macro conclusions. Prefer "available indicators suggest", "the current input points to", or "signals are mixed" when the data is incomplete.
Do not invent portfolio exposures. Use context.portfolioExposureGuidance.allowedClaims as the source of truth for portfolio-specific claims.
If an allowed claim is false or missing, discuss that asset only as market context, not as portfolio exposure.
Never use phrases like "meaningful crypto exposure", "bond sleeve", "gold component", or "cash component" unless allowedClaims explicitly permits that exposure.
Do not mention internal guardrail terms such as "allowedClaims", "allowed claims", "allowed exposure", or "allowed as exposures" in the report.
If yield-curve inputs move in opposite directions, describe the curve only when the input explicitly provides the curve direction. Otherwise say yield-curve signals were mixed.
If individual yield moves and spread metrics conflict, state the conflict instead of choosing one direction.
Do not claim the yield curve flattened when short-end yields fell and long-end yields rose without also explaining that individual yield moves suggest steepening pressure.

Do not give buy recommendations.
Do not give sell recommendations.
Do not recommend position sizing, rebalancing, allocation changes, or trades.
Do not produce scoring outputs or rank securities.
Do not tell the user to buy, sell, hold, trim, add, rotate, overweight, underweight, increase, or decrease any security or asset class.

Portfolio implications must explain possible relevance only.
Good: "Elevated rates continue to support the importance of cash and short-duration context."
Bad: "Increase cash" or "Buy SGOV."

Return strict JSON only with keys:
title,
executiveSummary,
globalMarketSummary,
topEmergingThemes,
persistentThemes,
structuralThemes,
equityOutlook,
bondOutlook,
goldOutlook,
cryptoOutlook,
ratesOutlook,
inflationOutlook,
growthOutlook,
employmentOutlook,
currencyOutlook,
geopoliticalOutlook,
keyRisks,
keyOpportunities,
portfolioImplications,
confidenceScore.

portfolioImplications must be an object with keys:
equityAllocationImplication,
bondAllocationImplication,
goldImplication,
cryptoImplication,
cashImplication,
riskImplication,
watchlistImplication.

confidenceScore must be from 0 to 100.`;
