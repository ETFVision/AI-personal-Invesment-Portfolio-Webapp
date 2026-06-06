const blockedPatterns = [
  /\byou should buy\b/i,
  /\byou should sell\b/i,
  /\bi recommend buying\b/i,
  /\bi recommend selling\b/i,
  /\bgood buy\b/i,
  /\b(is|looks like|appears to be)\s+(a\s+)?buy\b/i,
  /\bshould be purchased\b/i,
  /\bworth buying\b/i,
  /\ballocate\s+\d+(\.\d+)?%/i,
  /\btarget allocation\b/i,
  /\btarget weight\b/i,
  /\bguaranteed\b/i,
  /\bwill definitely\b/i,
  /\bwill outperform\b/i,
  /\bwill rise\b/i,
  /\bwill fall\b/i
];

export class AssistantResponseGuardrailService {
  validate(answer: string) {
    const matched = blockedPatterns.find((pattern) => pattern.test(answer));
    if (!matched) return { ok: true, answer };
    return {
      ok: false,
      answer:
        "I can explain ETFVision's existing portfolio intelligence, but I cannot provide buy/sell instructions, target allocations, position sizes, or return predictions. Please review the relevant recommendation, risk, Market Vision, and portfolio review evidence before making any decision."
    };
  }
}
