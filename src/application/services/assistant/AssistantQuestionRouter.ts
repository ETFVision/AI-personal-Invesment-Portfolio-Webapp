import type { AssistantQuestionCategory, AssistantRouteResult } from "@/domain/assistant/types";
import { AssistantIntentGuardrailService } from "./AssistantIntentGuardrailService";

const unsupportedPatterns = [
  /\bworld war\b/i,
  /\bquantum\b/i,
  /\bwarren buffett\b/i,
  /\bwho is\b/i,
  /\bwhat is nvidia\b/i,
  /\bexplain inflation generally\b/i
];

const categoryRules: Array<{ category: AssistantQuestionCategory; confidence: number; patterns: RegExp[] }> = [
  {
    category: "telemetry",
    confidence: 0.9,
    patterns: [/\btelemetry\b/i, /\bworked best\b/i, /\baccurate\b/i, /\baccuracy\b/i, /\bfactor\b/i, /\bconfidence calibration\b/i]
  },
  {
    category: "market_vision",
    confidence: 0.88,
    patterns: [/\bmarket vision\b/i, /\bcio\b/i, /\bmacro\b/i, /\brates\b/i, /\binflation\b/i, /\btheme\b/i, /\bthis week\b/i]
  },
  {
    category: "recommendation",
    confidence: 0.9,
    patterns: [/\brecommend/i, /\bbuy\b/i, /\bwatch\b/i, /\bhold\b/i, /\breduce\b/i, /\bsell\b/i, /\bwhy is [A-Z]{2,5}\b/]
  },
  {
    category: "portfolio_review",
    confidence: 0.88,
    patterns: [/\bportfolio review\b/i, /\bscore\b/i, /\bwhy is my score\b/i, /\bimprove diversification\b/i, /\breducing my score\b/i]
  },
  {
    category: "risk",
    confidence: 0.86,
    patterns: [/\brisks?\b/i, /\bvolatility\b/i, /\bdrawdown\b/i, /\bconcentration\b/i, /\bcorrelation\b/i, /\brisk driver\b/i]
  },
  {
    category: "etf",
    confidence: 0.84,
    patterns: [/\betf\b/i, /\bexposure\b/i, /\boverlap\b/i, /\btop holding/i, /\blook.?through\b/i, /\bwhy do i own\b/i]
  },
  {
    category: "monitoring",
    confidence: 0.78,
    patterns: [/\bmonitor\b/i, /\bwatch area\b/i, /\bwhat changed\b/i, /\bchanged this week\b/i]
  },
  {
    category: "portfolio_overview",
    confidence: 0.78,
    patterns: [/\bportfolio\b/i, /\bholdings\b/i, /\bhealthy\b/i, /\bhow am i doing\b/i, /\bhow is my portfolio\b/i]
  }
];

const ambiguousFollowUpPatterns = [
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

function isAmbiguousFollowUp(question: string) {
  return ambiguousFollowUpPatterns.some((pattern) => pattern.test(question.trim()));
}

export class AssistantQuestionRouter {
  constructor(private readonly intentGuardrails = new AssistantIntentGuardrailService()) {}

  route(question: string, previousCategory?: string | null): AssistantRouteResult {
    const trimmed = question.trim();
    if (!trimmed) {
      return { category: "unsupported", supported: false, confidence: 1, reason: "Empty question.", blockedIntent: "unsupported_scope" };
    }
    const intent = this.intentGuardrails.classify(trimmed);
    if (intent.blocked) {
      return {
        category: "unsupported",
        supported: false,
        confidence: 0.98,
        reason: intent.reason ?? "Question blocked by deterministic assistant guardrail.",
        blockedIntent: intent.intent ?? "unsupported_scope"
      };
    }
    if (unsupportedPatterns.some((pattern) => pattern.test(trimmed))) {
      return {
        category: "unsupported",
        supported: false,
        confidence: 0.95,
        reason: "Question is outside ETFVision portfolio-intelligence scope.",
        blockedIntent: "unsupported_scope"
      };
    }

    if (previousCategory && previousCategory !== "unsupported" && isAmbiguousFollowUp(trimmed)) {
      return {
        category: previousCategory as AssistantQuestionCategory,
        supported: true,
        confidence: 0.72,
        reason: "Using prior conversation category for ambiguous follow-up question."
      };
    }

    for (const rule of categoryRules) {
      if (rule.patterns.some((pattern) => pattern.test(trimmed))) {
        return { category: rule.category, supported: true, confidence: rule.confidence, reason: "Matched deterministic category keywords." };
      }
    }

    if (previousCategory && previousCategory !== "unsupported") {
      return {
        category: previousCategory as AssistantQuestionCategory,
        supported: true,
        confidence: 0.62,
        reason: "Using prior conversation category for follow-up question."
      };
    }

    return { category: "unsupported", supported: false, confidence: 0.7, reason: "No ETFVision-specific intent was detected.", blockedIntent: "unsupported_scope" };
  }
}
