import type { NormalizedNewsArticle } from "@/domain/news/types";

export type NewsProviderRequest = {
  symbols: string[];
  maxArticlesPerInstrument: number;
  maxArticlesTotal: number;
  includeGeneralMarketNews?: boolean;
};

export interface NewsProvider {
  readonly name: string;
  fetchNews(input: NewsProviderRequest): Promise<NormalizedNewsArticle[]>;
}
