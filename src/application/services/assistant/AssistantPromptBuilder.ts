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
        "Use a CIO-style structure: direct answer, top findings, main watch item, and only relevant supporting detail.",
        "If telemetry is unavailable, describe it as collecting observations until 1m, 3m, 6m, and 12m horizons mature."
      ]
    };
  }
}
