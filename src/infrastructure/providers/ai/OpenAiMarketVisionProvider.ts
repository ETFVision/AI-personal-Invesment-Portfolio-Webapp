import type { AiMarketVisionInput, AiMarketVisionOutput, AiMarketVisionProvider } from "@/application/ports/providers/AiMarketVisionProvider";
import { env } from "@/infrastructure/config/env";
import { MARKET_VISION_PROMPT } from "@/server/ai/prompts/market-vision";
import { validateMarketVisionGenerationOutput } from "@/application/services/marketVision/MarketVisionGenerationService";

type OpenAiUsage = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

function estimateCost(usage: Record<string, unknown>) {
  const typed = usage as OpenAiUsage;
  const inputTokens = Number(typed.input_tokens ?? typed.prompt_tokens ?? 0);
  const outputTokens = Number(typed.output_tokens ?? typed.completion_tokens ?? 0);
  const inputCost = env.MARKET_VISION_INPUT_COST_PER_1M;
  const outputCost = env.MARKET_VISION_OUTPUT_COST_PER_1M;
  if ((inputCost === 0 && outputCost === 0) || (inputTokens === 0 && outputTokens === 0)) return null;
  return Number(((inputTokens / 1_000_000) * inputCost + (outputTokens / 1_000_000) * outputCost).toFixed(6));
}

export class OpenAiMarketVisionProvider implements AiMarketVisionProvider {
  async generateWeeklyBriefing(input: AiMarketVisionInput): Promise<AiMarketVisionOutput> {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.MARKET_VISION_MODEL,
        instructions: MARKET_VISION_PROMPT,
        input: JSON.stringify(input),
        text: { format: { type: "json_object" } }
      }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`OpenAI Market Vision request failed with status ${response.status}.`);
    const payload = await response.json() as { output_text?: string; usage?: Record<string, unknown> };
    const text = payload.output_text ?? "";
    if (!text.trim()) throw new Error("OpenAI Market Vision response did not include JSON text.");
    const json = JSON.parse(text) as Record<string, unknown>;
    const validated = validateMarketVisionGenerationOutput(json);
    return {
      ...validated,
      tokenUsage: payload.usage ?? {},
      costEstimate: estimateCost(payload.usage ?? {})
    };
  }
}
