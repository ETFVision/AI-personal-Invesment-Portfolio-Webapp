import type {
  AiPortfolioAssistantProvider,
  PortfolioAssistantProviderInput,
  PortfolioAssistantProviderOutput
} from "@/application/ports/providers/AiPortfolioAssistantProvider";
import { estimateTokenCost } from "@/application/services/ai/costEstimate";
import { env } from "@/infrastructure/config/env";
import { PORTFOLIO_ASSISTANT_PROMPT } from "@/server/ai/prompts/portfolio-assistant";

type OpenAiUsage = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

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

function tokenUsage(usage: Record<string, unknown>) {
  const typed = usage as OpenAiUsage;
  return {
    inputTokens: Number(typed.input_tokens ?? typed.prompt_tokens ?? 0),
    outputTokens: Number(typed.output_tokens ?? typed.completion_tokens ?? 0)
  };
}

function estimateCost(usage: Record<string, unknown>) {
  const tokens = tokenUsage(usage);
  const inputCost = env.PORTFOLIO_ASSISTANT_INPUT_COST_PER_1M;
  const outputCost = env.PORTFOLIO_ASSISTANT_OUTPUT_COST_PER_1M;
  return estimateTokenCost({ input_tokens: tokens.inputTokens, output_tokens: tokens.outputTokens }, inputCost, outputCost);
}

async function readOpenAiError(response: Response) {
  try {
    const payload = await response.json() as { error?: { message?: string; type?: string; code?: string } };
    const message = payload.error?.message;
    const details = [payload.error?.type, payload.error?.code].filter(Boolean).join(", ");
    if (message) return details ? `${message} (${details})` : message;
  } catch {
    // Fall through.
  }
  return `status ${response.status}`;
}

export class OpenAiPortfolioAssistantProvider implements AiPortfolioAssistantProvider {
  async answer(input: PortfolioAssistantProviderInput): Promise<PortfolioAssistantProviderOutput> {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    if (!env.ENABLE_PORTFOLIO_ASSISTANT) throw new Error("Portfolio Assistant is disabled.");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.PORTFOLIO_ASSISTANT_MODEL,
        instructions: PORTFOLIO_ASSISTANT_PROMPT,
        input: JSON.stringify(input)
      }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!response.ok) throw new Error(`OpenAI Portfolio Assistant request failed: ${await readOpenAiError(response)}.`);
    const payload = await response.json() as Record<string, unknown> & { usage?: Record<string, unknown> };
    const text = extractOutputText(payload);
    if (!text.trim()) throw new Error("OpenAI Portfolio Assistant response did not include text.");
    return {
      answer: text.trim(),
      tokenUsage: payload.usage ?? {},
      costEstimate: estimateCost(payload.usage ?? {}),
      modelUsed: env.PORTFOLIO_ASSISTANT_MODEL
    };
  }
}
