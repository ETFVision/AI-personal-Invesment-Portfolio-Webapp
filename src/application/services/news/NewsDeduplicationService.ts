import type { NewsItem, NormalizedNewsArticle } from "@/domain/news/types";
import { buildCanonicalHash, buildContentHash } from "./newsText";

export type DeduplicatedNewsArticle = NormalizedNewsArticle & {
  contentHash: string;
  canonicalHash: string;
  isDuplicate: boolean;
  duplicateOfId: string | null;
};

export class NewsDeduplicationService {
  prepare(article: NormalizedNewsArticle) {
    return {
      ...article,
      contentHash: buildContentHash(article),
      canonicalHash: buildCanonicalHash(article)
    };
  }

  markAgainstCanonical(article: NormalizedNewsArticle, canonical: NewsItem | null): DeduplicatedNewsArticle {
    const prepared = this.prepare(article);
    return {
      ...prepared,
      isDuplicate: Boolean(canonical),
      duplicateOfId: canonical?.id ?? null
    };
  }

  isLikelyDuplicate(a: Pick<NormalizedNewsArticle, "title" | "url" | "sourceId" | "publishedAt">, b: NewsItem) {
    if (a.url && b.url && a.url.trim().toLowerCase() === b.url.trim().toLowerCase()) return true;
    if (a.sourceId && b.sourceId && a.sourceId === b.sourceId) return true;
    return buildCanonicalHash(a) === b.canonicalHash;
  }
}
