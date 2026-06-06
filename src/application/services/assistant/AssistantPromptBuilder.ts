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
        "Use concise paragraphs and bullets where helpful.",
        "Prefer ETF look-through exposure over direct broad-market taxonomy when context.exposures.source is lookthrough.",
        "Do not repeat the full score snapshot unless the user asks for an overview, health check, score, summary, or executive summary.",
        "For portfolio health, overview, risk, concentration, diversification, watch item, weakness, and executive-summary questions, include a near-top section titled 'Most Important Thing Right Now'.",
        "For score-only or very narrow questions, keep the answer short and do not force extra sections.",
        "Rank findings by priority instead of presenting equal-weighted observations.",
        "Include an 'ETFVision View' section for portfolio, risk, market vision, recommendation, and monitoring answers.",
        "Use a CIO-style structure: direct answer, most important thing, ranked findings, ETFVision View, and only relevant supporting detail.",
        "Executive summaries should be concise, ideally 150-250 words.",
        "If telemetry is unavailable, describe it as collecting observations until 1m, 3m, 6m, and 12m horizons mature, and mention this only when evidence, changes, monitoring, or historical accuracy is relevant."
      ]
    };
  }
}
