export type TokenUsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

export function estimateTokenCost(
  usage: TokenUsageLike,
  inputCostPer1M: number,
  outputCostPer1M: number
): number | null {
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
  if ((inputCostPer1M === 0 && outputCostPer1M === 0) || (inputTokens === 0 && outputTokens === 0)) return null;
  return Number(((inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M).toFixed(6));
}
