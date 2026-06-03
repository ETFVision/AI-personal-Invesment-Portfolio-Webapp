import type { NewsDataQueryGroup, NormalizedNewsArticle } from "@/domain/news/types";

export type NewsDataProviderArticle = NormalizedNewsArticle & {
  newsDataMetadata: {
    sourceId: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
    country: string | null;
    language: string | null;
    category: string[];
    creator: unknown[];
    keywords: string[];
    queryGroup: NewsDataQueryGroup;
    providerMetadata: Record<string, unknown>;
  };
};

export type NewsDataProviderRequest = {
  queryGroup: NewsDataQueryGroup;
  maxArticles: number;
};

export interface NewsDataNewsProvider {
  readonly name: "newsdata";
  fetchQueryGroup(input: NewsDataProviderRequest): Promise<NewsDataProviderArticle[]>;
}
