import type { GdeltQueryGroup, NormalizedNewsArticle } from "@/domain/news/types";

export type GdeltProviderArticle = NormalizedNewsArticle & {
  gdeltMetadata: {
    domain: string | null;
    sourceCountry: string | null;
    sourceLanguage: string | null;
    tone: number | null;
    gdeltThemes: string[];
    locations: unknown[];
    persons: string[];
    organizations: string[];
    queryGroup: GdeltQueryGroup;
    providerMetadata: Record<string, unknown>;
  };
};

export type GdeltProviderRequest = {
  queryGroup: GdeltQueryGroup;
  maxArticles: number;
  recentWindowHours: number;
};

export interface GdeltNewsProvider {
  readonly name: "gdelt";
  fetchQueryGroup(input: GdeltProviderRequest): Promise<GdeltProviderArticle[]>;
}
