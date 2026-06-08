import type { AssistantBlockedIntent } from "@/domain/assistant/types";

type IntentGuardrailResult = {
  blocked: boolean;
  intent?: AssistantBlockedIntent;
  reason?: string;
};

const explanationPatterns = [
  /\bwhy\s+is\s+[A-Z]{2,6}\s+(hold|watch|reduce|sell|buy|strong buy)\b/,
  /\bwhy\s+is\s+[A-Z]{2,6}\s+(balanced|favorable|very favorable|review area|elevated concerns|significant concerns)\b/i,
  /\bexplain\s+(why\s+)?[A-Z]{2,6}('s)?\s+(recommendation|rating|score|watch|hold|reduce|buy|assessment|insight|classification|characteristics)\b/i,
  /\bwhy\s+did\s+.+\s+(recommendation|rating|score)\s+(change|move)\b/i,
  /\bwhy\s+is\s+[A-Z]{2,6}\s+not\s+(a\s+)?buy\b/i,
  /\bwhy\s+is\s+[A-Z]{2,6}\s+(watch|hold|reduce)\s+instead\s+of\s+buy\b/i
];

const portfolioContextPatterns = [
  /\bmy portfolio\b/i,
  /\bportfolio\b/i,
  /\bmy holdings?\b/i,
  /\bmy exposure\b/i,
  /\bmy risk\b/i,
  /\bconcentration\b/i,
  /\blook.?through\b/i,
  /\bMarket Vision\b/i,
  /\bETFVision\b/i,
  /\brecommendation\b/i,
  /\binsights?\b/i,
  /\bassessments?\b/i,
  /\bclassification\b/i,
  /\bcharacteristics\b/i,
  /\bhow does .+ affect my\b/i,
  /\bhow does .+ contribute\b/i
];

const advicePatterns = [
  /\bshould\s+i\s+(buy|sell|own|add|remove|invest)\b/i,
  /\bwhat\s+(stock|etf|fund|crypto|bond)\s+should\s+i\s+(buy|own|add|invest in)\b/i,
  /\bwhat\s+should\s+i\s+(buy|sell|own|add|remove|invest in)\b/i,
  /\bwhich\s+(stock|etf|fund|crypto|bond)\s+should\s+i\s+(buy|own|add)\b/i,
  /\b(best|top)\s+(stock|etf|fund|crypto|bond)\b/i,
  /\b(highest|top|best)\s+(ranked|scored|confidence|recommendation)\b/i,
  /\bbuy\s+today\b/i,
  /\bsell\s+today\b/i,
  /\bwhat\s+will\s+outperform\b/i,
  /\bwhat\s+(stock|etf|fund|sector|theme).*\boutperform\b/i,
  /\bwill\s+.+\s+outperform\b/i,
  /\bpredict\b/i,
  /\bmarket prediction\b/i,
  /\bbeat the market\b/i,
  /\btrading strategy\b/i,
  /\btarget allocation\b/i,
  /\btarget weight\b/i,
  /\bposition size\b/i,
  /\bhow much\s+(should\s+i\s+)?(invest|own|allocate|put)\b/i,
  /\bwhat percentage\s+(should\s+i\s+)?(own|allocate|hold)\b/i,
  /\bgive me\s+(a\s+)?(target allocation|trading strategy|position size)\b/i
];

const generalKnowledgePatterns = [
  /\bwhat\s+is\s+(inflation|bitcoin|nvidia|chatgpt|quantum computing|physics)\b/i,
  /\bexplain\s+(inflation|bitcoin|nvidia|chatgpt|quantum computing|physics)\b/i,
  /\bwho\s+is\s+warren buffett\b/i,
  /\bwhat\s+happened\s+in\s+world war\b/i,
  /\btell me\s+a\s+joke\b/i,
  /\bwrite\s+me\s+a\s+poem\b/i,
  /\bweather\b/i
];

export class AssistantIntentGuardrailService {
  classify(question: string): IntentGuardrailResult {
    const trimmed = question.trim();
    if (!trimmed) return { blocked: true, intent: "unsupported_scope", reason: "Empty question." };

    if (explanationPatterns.some((pattern) => pattern.test(trimmed))) {
      return { blocked: false };
    }

    if (advicePatterns.some((pattern) => pattern.test(trimmed))) {
      return { blocked: true, intent: "advice_seeking", reason: "Advice-seeking request blocked before context assembly." };
    }

    const hasPortfolioContext = portfolioContextPatterns.some((pattern) => pattern.test(trimmed));
    if (!hasPortfolioContext && generalKnowledgePatterns.some((pattern) => pattern.test(trimmed))) {
      return { blocked: true, intent: "general_knowledge", reason: "General-knowledge request outside portfolio scope." };
    }

    return { blocked: false };
  }
}
