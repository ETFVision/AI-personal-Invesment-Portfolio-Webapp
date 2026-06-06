import type { AssistantContextPackage, AssistantQuestionCategory } from "@/domain/assistant/types";

export type PortfolioAssistantProviderInput = {
  question: string;
  category: AssistantQuestionCategory;
  context: AssistantContextPackage;
  responseRequirements?: string[];
};

export type PortfolioAssistantProviderOutput = {
  answer: string;
  tokenUsage: Record<string, unknown>;
  costEstimate: number | null;
  modelUsed: string;
};

export interface AiPortfolioAssistantProvider {
  answer(input: PortfolioAssistantProviderInput): Promise<PortfolioAssistantProviderOutput>;
}
