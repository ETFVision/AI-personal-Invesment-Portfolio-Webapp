import type { AssistantContextPackage } from "@/domain/assistant/types";

type ResponseMode = "broad" | "focused" | "follow_up";

const veryShortFollowUpPatterns = [
  /^\s*why\??\s*$/i,
  /^\s*why does that matter\??\s*$/i,
  /^\s*how does that affect\b/i,
  /^\s*which holdings?\b/i,
  /^\s*which one\b/i,
  /^\s*what is the biggest (issue|factor|negative factor|positive factor|driver)\??\s*$/i,
  /^\s*what contributed most\??\s*$/i,
  /^\s*what reduced (it|my score|the score)\??\s*$/i,
  /^\s*what if\b/i
];

function hasPriorUserMessages(context: AssistantContextPackage, question: string) {
  const normalizedQuestion = question.trim();
  return context.recentMessages.some((message) => message.role === "user" && message.content.trim() !== normalizedQuestion);
}

function responseMode(input: { question: string; context: AssistantContextPackage }): ResponseMode {
  const isFollowUp = hasPriorUserMessages(input.context, input.question);
  if (isFollowUp && veryShortFollowUpPatterns.some((pattern) => pattern.test(input.question))) return "follow_up";
  if (isFollowUp) return "focused";
  if (/overview|healthy|health|score|summary|review|portfolio/i.test(input.question)) return "broad";
  return "focused";
}

function evidenceStrengthRequirement(context: AssistantContextPackage) {
  if (context.telemetry.available) {
    const coverage = context.telemetry.recommendationCoverage;
    if (typeof coverage === "number" && coverage >= 0.65) return "Evidence Strength: Strong when citing mature telemetry or reliable look-through; explain the mature observation base briefly.";
    return "Evidence Strength: Early when citing telemetry with sparse or immature observations; explain that sample depth is still developing.";
  }
  return "Evidence Strength: Insufficient when telemetry, prior comparison, placeholder Market Vision, or missing data limits the answer. Use this label instead of phrases like telemetry unavailable or evidence unavailable.";
}

function isPlaceholderText(value: unknown) {
  return typeof value === "string" && ["test", "placeholder", "todo", "n/a"].includes(value.trim().toLowerCase());
}

function hasUnusableMarketVision(context: AssistantContextPackage) {
  const implicationValues = Object.values(context.marketVision.portfolioImplications ?? {});
  return [
    context.marketVision.executiveSummary,
    ...context.marketVision.risks,
    ...context.marketVision.opportunities,
    ...implicationValues
  ].some(isPlaceholderText);
}

function modeRequirements(mode: ResponseMode) {
  if (mode === "follow_up") {
    return [
      "Response mode: follow_up.",
      "Use 100-250 words unless the user explicitly asks for more detail.",
      "Do not repeat the full Executive Brief, full score snapshot, or full Top Findings block.",
      "Use direct answer + why it matters + ETFVision View only when useful; for deep follow-ups, use direct answer + main implication + supporting evidence.",
      "Inherit the latest topic from context.recentMessages and answer that topic first."
    ];
  }
  if (mode === "focused") {
    return [
      "Response mode: focused.",
      "Use 180-350 words unless the user explicitly asks for more detail.",
      "Use a compact structure and avoid repeating broad portfolio setup from earlier turns.",
      "Include Executive Brief only if it materially improves clarity."
    ];
  }
  return [
    "Response mode: broad.",
    "Use the full CIO structure for broad first-turn questions: Direct Answer, Executive Brief, Most Important Thing Right Now, Top Findings, ETFVision View, Bottom Line.",
    "Use 300-500 words unless the user asks for more detail."
  ];
}

export class AssistantPromptBuilder {
  build(input: { question: string; context: AssistantContextPackage }) {
    const mode = responseMode(input);
    const requirements = [
        ...modeRequirements(mode),
        evidenceStrengthRequirement(input.context),
        hasUnusableMarketVision(input.context)
          ? "Market Vision placeholder rule: The latest Market Vision report does not contain sufficient usable macro content for interpretation. Do not interpret placeholder text. Instead, say this clearly and use portfolio exposures as fallback: sector exposure, geography exposure, theme exposure, fixed income exposure, inflation/rates sensitivity, and crypto exposure."
          : "",
        "Use only these evidence strength labels when needed: Strong, Moderate, Early, Insufficient.",
        "If evidence is Strong, it should come from direct portfolio review, direct holdings, reliable look-through, or mature telemetry.",
        "If evidence is Moderate, it should come from partial look-through, current insight factors, or current exposure interpretation.",
        "If evidence is Insufficient, provide the reason in one sentence and continue with a safe fallback if context allows.",
        "Do not end with generic 'If you want...' language. End with a useful bottom line; offer one follow-up only when highly relevant."
      ].filter(Boolean);
    return {
      question: input.question,
      category: input.context.category,
      context: input.context,
      responseRequirements: [
        ...requirements,
        "Answer only using the provided ETFVision context.",
        "Explain existing ETFVision intelligence; do not create new recommendations, trades, or portfolio actions.",
        "Do not recommend purchases, sales, position sizes, target allocations, or trades.",
        "Do not predict returns or use certainty language.",
        "If evidence is insufficient, say so explicitly.",
        "Keep the response professional, analytical, calm, and educational.",
        "Default to 250-400 words unless the user asks for a detailed explanation.",
        "Use concise paragraphs and bullets where helpful.",
        "Prefer ETF look-through exposure over direct broad-market taxonomy when context.exposures.source is lookthrough.",
        "Do not repeat the full score snapshot unless the user asks for an overview, health check, score, summary, or executive summary.",
        "For broad portfolio health, overview, risk, concentration, diversification, Market Vision, fixed income, geography, telemetry, instrument insight explanation, watch item, weakness, and executive-summary questions, include a compact 'Executive Brief' before detailed analysis.",
        "For broad portfolio health, overview, risk, concentration, diversification, Market Vision, fixed income, geography, telemetry, instrument insight explanation, watch item, weakness, and executive-summary questions, include a near-top section titled 'Most Important Thing Right Now'.",
        "Choose 'Most Important Thing Right Now' dynamically from the question category: portfolio health = primary limiter/watch item; risk = largest risk driver; Market Vision = dominant theme or implication; fixed income = bond diversification/duration/credit quality; geography = US or international concentration; telemetry = strongest evidence signal; instrument insight = largest positive/concern area or guardrail.",
        "Do not default to concentration unless concentration is the most relevant takeaway for the question and context.",
        "For score-only, very narrow, or follow-up questions, keep the answer short and do not force extra sections.",
        "Rank findings by priority instead of presenting equal-weighted observations.",
        "For each major observation, include one concise 'Why it matters' sentence.",
        "For technology, concentration, diversification, and risk questions, include top indirect holdings from context.indirectHoldings when available, capped at 5.",
        "Include an 'ETFVision View' section for portfolio, risk, market vision, instrument insight, and monitoring answers.",
        "Use a CIO-style structure: direct answer, Executive Brief, most important thing, ranked findings, ETFVision View, and only relevant supporting detail.",
        "Executive summaries should be concise, ideally 150-250 words.",
        "If telemetry exists, phrase evidence as 'Current telemetry evidence suggests...', 'Historical observations indicate...', or 'Based on X observations...', and include Evidence strength: Early / Moderate / Strong when relevant.",
        "If telemetry is unavailable, describe it as collecting observations until 1m, 3m, 6m, and 12m horizons mature, and mention this only when evidence, changes, monitoring, or historical accuracy is relevant.",
        "For instrument insight explanation questions, start with: \"This is an explanation of ETFVision's analytical classification and not an investment recommendation.\"",
        "Use consumer-facing assessment labels such as Very Favorable Characteristics, Favorable Characteristics, Balanced Characteristics, Review Area, Elevated Concerns and Significant Concerns.",
        "Never phrase an insight explanation as a good buy, something to purchase, or something the user should sell/reduce/add."
      ]
    };
  }
}
