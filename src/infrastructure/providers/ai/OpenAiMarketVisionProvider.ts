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

const marketVisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "executiveSummary",
    "globalMarketSummary",
    "topEmergingThemes",
    "persistentThemes",
    "structuralThemes",
    "equityOutlook",
    "bondOutlook",
    "goldOutlook",
    "cryptoOutlook",
    "ratesOutlook",
    "inflationOutlook",
    "growthOutlook",
    "employmentOutlook",
    "currencyOutlook",
    "geopoliticalOutlook",
    "keyRisks",
    "keyOpportunities",
    "portfolioImplications",
    "confidenceScore"
  ],
  properties: {
    title: { type: "string" },
    executiveSummary: { type: "string" },
    globalMarketSummary: { type: "string" },
    topEmergingThemes: { type: "array", items: { type: "string" } },
    persistentThemes: { type: "array", items: { type: "string" } },
    structuralThemes: { type: "array", items: { type: "string" } },
    equityOutlook: { type: "string" },
    bondOutlook: { type: "string" },
    goldOutlook: { type: "string" },
    cryptoOutlook: { type: "string" },
    ratesOutlook: { type: "string" },
    inflationOutlook: { type: "string" },
    growthOutlook: { type: "string" },
    employmentOutlook: { type: "string" },
    currencyOutlook: { type: "string" },
    geopoliticalOutlook: { type: "string" },
    keyRisks: { type: "array", items: { type: "string" } },
    keyOpportunities: { type: "array", items: { type: "string" } },
    portfolioImplications: {
      type: "object",
      additionalProperties: false,
      required: [
        "equityAllocationImplication",
        "bondAllocationImplication",
        "goldImplication",
        "cryptoImplication",
        "cashImplication",
        "riskImplication",
        "watchlistImplication"
      ],
      properties: {
        equityAllocationImplication: { type: "string" },
        bondAllocationImplication: { type: "string" },
        goldImplication: { type: "string" },
        cryptoImplication: { type: "string" },
        cashImplication: { type: "string" },
        riskImplication: { type: "string" },
        watchlistImplication: { type: "string" }
      }
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 100 }
  }
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

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = typeof item === "object" && item !== null && Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const contentItem of content) {
      if (typeof contentItem === "object" && contentItem !== null && typeof (contentItem as { text?: unknown }).text === "string") {
        return (contentItem as { text: string }).text;
      }
    }
  }
  return "";
}

async function readOpenAiError(response: Response) {
  try {
    const payload = await response.json() as { error?: { message?: string; type?: string; code?: string } };
    const message = payload.error?.message;
    const details = [payload.error?.type, payload.error?.code].filter(Boolean).join(", ");
    if (message) return details ? `${message} (${details})` : message;
  } catch {
    // Fall through to a generic message if OpenAI returns a non-JSON error body.
  }
  return `status ${response.status}`;
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
        text: {
          format: {
            type: "json_schema",
            name: "market_vision_report",
            strict: true,
            schema: marketVisionJsonSchema
          }
        }
      }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`OpenAI Market Vision request failed: ${await readOpenAiError(response)}.`);
    const payload = await response.json() as Record<string, unknown> & { usage?: Record<string, unknown> };
    const text = extractOutputText(payload);
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
