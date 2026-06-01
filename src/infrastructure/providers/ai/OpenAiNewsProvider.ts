import type {
  NewsAiClassificationInput,
  NewsAiClassificationOutput,
  NewsAiProvider,
  NewsAiReconciliationInput,
  NewsAiReconciliationOutput
} from "@/application/ports/providers/NewsAiProvider";
import { NEWS_CLASSIFICATION_PROMPT } from "@/server/ai/prompts/news-classification";
import { NEWS_RECONCILIATION_PROMPT } from "@/server/ai/prompts/news-reconciliation";
import { env } from "@/infrastructure/config/env";

async function callOpenAiJson(model: string, instructions: string, input: unknown) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(input),
      text: { format: { type: "json_object" } }
    }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`OpenAI news request failed with status ${response.status}.`);
  const payload = await response.json() as { output_text?: string; usage?: Record<string, unknown> };
  const text = payload.output_text ?? "";
  if (!text.trim()) throw new Error("OpenAI news response did not include JSON text.");
  return { json: JSON.parse(text) as Record<string, unknown>, usage: payload.usage ?? {} };
}

export class OpenAiNewsProvider implements NewsAiProvider {
  async classifyArticle(input: NewsAiClassificationInput): Promise<NewsAiClassificationOutput> {
    const result = await callOpenAiJson(env.NEWS_CLASSIFICATION_MODEL, NEWS_CLASSIFICATION_PROMPT, input);
    return { ...(result.json as unknown as NewsAiClassificationOutput), tokenUsage: result.usage, costEstimate: null };
  }

  async reconcileWeekly(input: NewsAiReconciliationInput): Promise<NewsAiReconciliationOutput> {
    const result = await callOpenAiJson(env.NEWS_RECONCILIATION_MODEL, NEWS_RECONCILIATION_PROMPT, input);
    return { ...(result.json as unknown as NewsAiReconciliationOutput), tokenUsage: result.usage, costEstimate: null };
  }
}
