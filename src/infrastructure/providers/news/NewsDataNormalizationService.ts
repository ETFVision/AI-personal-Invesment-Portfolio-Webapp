import type { NewsDataProviderArticle } from "@/application/ports/providers/NewsDataNewsProvider";
import type { NewsDataQueryGroup } from "@/domain/news/types";

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(stringValue).filter((item): item is string => Boolean(item)) : [];
}

function unknownArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeDate(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function sourceId(row: Record<string, unknown>, url: string | null, title: string) {
  return stringValue(row.article_id)
    ?? stringValue(row.source_id)
    ?? url
    ?? `${title}|${stringValue(row.pubDate) ?? ""}`;
}

export class NewsDataNormalizationService {
  normalize(row: Record<string, unknown>, queryGroup: NewsDataQueryGroup): NewsDataProviderArticle | null {
    const title = stringValue(row.title);
    if (!title) return null;
    const url = stringValue(row.link);
    const description = stringValue(row.description);
    const content = stringValue(row.content);
    const country = stringArray(row.country)[0] ?? null;
    const language = stringValue(row.language);
    const category = stringArray(row.category);
    const keywords = stringArray(row.keywords);
    const creator = unknownArray(row.creator);
    const sourceName = stringValue(row.source_name);
    const sourceUrl = stringValue(row.source_url);
    const source = sourceId(row, url, title);
    return {
      sourceProvider: "newsdata",
      sourceId: source,
      url,
      title,
      summary: description,
      contentSnippet: description ?? null,
      publishedAt: normalizeDate(row.pubDate),
      fetchedAt: new Date().toISOString(),
      tickers: [],
      rawSymbols: [],
      sourceName,
      author: creator.map((item) => typeof item === "string" ? item : null).filter((item): item is string => Boolean(item)).join(", ") || null,
      imageUrl: stringValue(row.image_url),
      language,
      country,
      providerMetadata: {
        provider: "newsdata",
        macroCategory: queryGroup.category,
        queryKey: queryGroup.queryKey,
        queryName: queryGroup.queryName,
        queryText: queryGroup.queryText,
        canonicalTheme: queryGroup.canonicalTheme,
        content,
        sourceUrl,
        category,
        keywords,
        raw: row
      },
      newsDataMetadata: {
        sourceId: stringValue(row.source_id),
        sourceName,
        sourceUrl,
        country,
        language,
        category,
        creator,
        keywords,
        queryGroup,
        providerMetadata: row
      }
    };
  }
}

export const newsDataNormalizationInternals = { normalizeDate, stringArray };
