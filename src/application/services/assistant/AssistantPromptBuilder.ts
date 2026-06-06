import type { AssistantContextPackage } from "@/domain/assistant/types";

export class AssistantPromptBuilder {
  build(input: { question: string; context: AssistantContextPackage }) {
    return {
      question: input.question,
      category: input.context.category,
      context: input.context,
      responseRequirements: [
        "Answer only using the provided ETFVision context.",
        "Explain existing ETFVision intelligence; do not create new recommendations.",
        "Do not recommend purchases, sales, position sizes, target allocations, or trades.",
        "Do not predict returns or use certainty language.",
        "If evidence is insufficient, say so explicitly.",
        "Keep the response professional, analytical, calm, and educational.",
        "Default to 250-400 words unless the user asks for a detailed explanation.",
        "Use concise paragraphs and bullets where helpful.",
        "Prefer ETF look-through exposure over direct broad-market taxonomy when context.exposures.source is lookthrough.",
        "Do not repeat the full score snapshot unless the user asks for an overview, health check, score, summary, or executive summary.",
        "For broad portfolio health, overview, risk, concentration, diversification, Market Vision, fixed income, geography, telemetry, recommendation explanation, watch item, weakness, and executive-summary questions, include a compact 'Executive Brief' before detailed analysis.",
        "For broad portfolio health, overview, risk, concentration, diversification, Market Vision, fixed income, geography, telemetry, recommendation explanation, watch item, weakness, and executive-summary questions, include a near-top section titled 'Most Important Thing Right Now'.",
        "Choose 'Most Important Thing Right Now' dynamically from the question category: portfolio health = primary limiter/watch item; risk = largest risk driver; Market Vision = dominant theme or implication; fixed income = bond diversification/duration/credit quality; geography = US or international concentration; telemetry = strongest evidence signal; recommendation = largest positive/negative driver or guardrail.",
        "Do not default to concentration unless concentration is the most relevant takeaway for the question and context.",
        "For score-only, very narrow, or follow-up questions, keep the answer short and do not force extra sections.",
        "Rank findings by priority instead of presenting equal-weighted observations.",
        "For each major observation, include one concise 'Why it matters' sentence.",
        "For technology, concentration, diversification, and risk questions, include top indirect holdings from context.indirectHoldings when available, capped at 5.",
        "Include an 'ETFVision View' section for portfolio, risk, market vision, recommendation, and monitoring answers.",
        "Use a CIO-style structure: direct answer, Executive Brief, most important thing, ranked findings, ETFVision View, and only relevant supporting detail.",
        "Executive summaries should be concise, ideally 150-250 words.",
        "If telemetry exists, phrase evidence as 'Current telemetry evidence suggests...', 'Historical observations indicate...', or 'Based on X observations...', and include Evidence strength: Early / Moderate / Strong when relevant.",
        "If telemetry is unavailable, describe it as collecting observations until 1m, 3m, 6m, and 12m horizons mature, and mention this only when evidence, changes, monitoring, or historical accuracy is relevant.",
        "For recommendation explanation questions, start with: \"This is an explanation of ETFVision's analytical classification and not an investment recommendation.\"",
        "Never phrase a recommendation explanation as a good buy, something to purchase, or something the user should sell/reduce/add."
      ]
    };
  }
}
