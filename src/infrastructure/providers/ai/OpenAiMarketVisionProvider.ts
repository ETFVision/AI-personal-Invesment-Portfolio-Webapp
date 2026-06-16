import type { AiMarketVisionInput, AiMarketVisionOutput, AiMarketVisionProvider } from "@/application/ports/providers/AiMarketVisionProvider";
import { estimateTokenCost } from "@/application/services/ai/costEstimate";
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
    "marketVisionMetadata",
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
    marketVisionMetadata: {
      type: "object",
      additionalProperties: false,
      required: [
        "regimeScorecard",
        "evidencePanels",
        "structuralThemes",
        "tacticalThemes",
        "keyWatchItems",
        "evidenceGaps",
        "portfolioRelevance",
        "telemetryMetadata"
      ],
      properties: {
        regimeScorecard: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "regime", "supportingIndicators", "confidence", "explanation"],
            properties: {
              label: { type: "string" },
              regime: { type: "string" },
              supportingIndicators: { type: "array", items: { type: "string" } },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              explanation: { type: "string" }
            }
          }
        },
        evidencePanels: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["section", "view", "confidence", "supportingIndicators", "conflictingIndicators", "evidenceGaps"],
            properties: {
              section: { type: "string" },
              view: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              supportingIndicators: { type: "array", items: { type: "string" } },
              conflictingIndicators: { type: "array", items: { type: "string" } },
              evidenceGaps: { type: "array", items: { type: "string" } }
            }
          }
        },
        structuralThemes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "displayName", "type", "name", "evidence", "persistence", "confidence"],
            properties: {
              id: { type: "string" },
              displayName: { type: "string" },
              type: { type: "string" },
              name: { type: "string" },
              evidence: { type: "array", items: { type: "string" } },
              persistence: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] }
            }
          }
        },
        tacticalThemes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "displayName", "type", "name", "evidence", "persistence", "confidence"],
            properties: {
              id: { type: "string" },
              displayName: { type: "string" },
              type: { type: "string" },
              name: { type: "string" },
              evidence: { type: "array", items: { type: "string" } },
              persistence: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] }
            }
          }
        },
        keyWatchItems: { type: "array", items: { type: "string" } },
        evidenceGaps: { type: "array", items: { type: "string" } },
        portfolioRelevance: {
          type: "object",
          additionalProperties: false,
          required: ["equity", "bond", "gold", "crypto", "cash", "risk"],
          properties: {
            equity: { type: "string", enum: ["High", "Medium", "Low"] },
            bond: { type: "string", enum: ["High", "Medium", "Low"] },
            gold: { type: "string", enum: ["High", "Medium", "Low"] },
            crypto: { type: "string", enum: ["High", "Medium", "Low"] },
            cash: { type: "string", enum: ["High", "Medium", "Low"] },
            risk: { type: "string", enum: ["High", "Medium", "Low"] }
          }
        },
        telemetryMetadata: {
          type: "object",
          additionalProperties: false,
          required: [
            "overallRegime",
            "overallConfidence",
            "growthRegime",
            "growthConfidence",
            "inflationRegime",
            "inflationConfidence",
            "ratesRegime",
            "ratesConfidence",
            "yieldCurveRegime",
            "yieldCurveConfidence",
            "liquidityRegime",
            "liquidityConfidence",
            "usdRegime",
            "usdConfidence",
            "commoditiesRegime",
            "commoditiesConfidence",
            "equityView",
            "equityConfidence",
            "bondView",
            "bondConfidence",
            "goldView",
            "goldConfidence",
            "cryptoView",
            "cryptoConfidence",
            "keyWatchItems",
            "structuralThemeIds",
            "tacticalThemeIds",
            "structuralThemes",
            "tacticalThemes",
            "evidenceGaps",
            "portfolioRelevance"
          ],
          properties: {
            overallRegime: { type: "string" },
            overallConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            growthRegime: { type: "string" },
            growthConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            inflationRegime: { type: "string" },
            inflationConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            ratesRegime: { type: "string" },
            ratesConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            yieldCurveRegime: { type: "string" },
            yieldCurveConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            liquidityRegime: { type: "string" },
            liquidityConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            usdRegime: { type: "string" },
            usdConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            commoditiesRegime: { type: "string" },
            commoditiesConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            equityView: { type: "string" },
            equityConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            bondView: { type: "string" },
            bondConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            goldView: { type: "string" },
            goldConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            cryptoView: { type: "string" },
            cryptoConfidence: { type: "string", enum: ["High", "Medium", "Low"] },
            keyWatchItems: { type: "array", items: { type: "string" } },
            structuralThemeIds: { type: "array", items: { type: "string" } },
            tacticalThemeIds: { type: "array", items: { type: "string" } },
            structuralThemes: { type: "array", items: { type: "string" } },
            tacticalThemes: { type: "array", items: { type: "string" } },
            evidenceGaps: { type: "array", items: { type: "string" } },
            portfolioRelevance: {
              type: "object",
              additionalProperties: false,
              required: ["equity", "bond", "gold", "crypto", "cash", "risk"],
              properties: {
                equity: { type: "string", enum: ["High", "Medium", "Low"] },
                bond: { type: "string", enum: ["High", "Medium", "Low"] },
                gold: { type: "string", enum: ["High", "Medium", "Low"] },
                crypto: { type: "string", enum: ["High", "Medium", "Low"] },
                cash: { type: "string", enum: ["High", "Medium", "Low"] },
                risk: { type: "string", enum: ["High", "Medium", "Low"] }
              }
            }
          }
        }
      }
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 100 }
  }
};

function estimateCost(usage: Record<string, unknown>) {
  const typed = usage as OpenAiUsage;
  const inputCost = env.MARKET_VISION_INPUT_COST_PER_1M;
  const outputCost = env.MARKET_VISION_OUTPUT_COST_PER_1M;
  return estimateTokenCost(typed, inputCost, outputCost);
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
