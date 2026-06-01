// TODO: Future Market Vision phase.
// This port will allow OpenAI-powered summarisation/classification without coupling UI or services to a provider.
export interface AiMarketVisionProvider {
  generateWeeklyBriefing(input: {
    reportPeriodStart: string;
    reportPeriodEnd: string;
    sourceNotes: string[];
  }): Promise<{
    title: string;
    executiveSummary: string;
    sectionDrafts: Record<string, string>;
  }>;
}
