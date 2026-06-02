import type { GdeltProviderArticle } from "@/application/ports/providers/GdeltNewsProvider";
import type { GdeltQueryGroup } from "@/domain/news/types";

type GdeltRawArticle = Record<string, unknown> & {
  url?: string;
  url_mobile?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  sourceCountry?: string;
  tone?: number | string;
  themes?: string[];
  locations?: unknown[];
  persons?: string[];
  organizations?: string[];
};

function parseDate(value: string | undefined) {
  if (!value) return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (compact) {
    const [, year, month, day, hour, minute, second] = compact;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNumber(value: unknown) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function domainFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export class GdeltNormalizationService {
  normalize(row: GdeltRawArticle, queryGroup: GdeltQueryGroup): GdeltProviderArticle | null {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) return null;
    const rawUrl = typeof row.url === "string" ? row.url.trim() : "";
    const rawMobileUrl = typeof row.url_mobile === "string" ? row.url_mobile.trim() : "";
    const url = rawUrl || rawMobileUrl || null;
    const rawDomain = typeof row.domain === "string" ? row.domain.trim() : "";
    const domain = rawDomain || domainFromUrl(url);
    const sourceCountry = typeof row.sourcecountry === "string"
      ? row.sourcecountry
      : typeof row.sourceCountry === "string"
        ? row.sourceCountry
        : null;
    const publishedAt = parseDate(row.seendate) ?? new Date().toISOString();
    const metadata = row as Record<string, unknown>;
    return {
      sourceProvider: "gdelt",
      sourceId: url ?? `${queryGroup.queryKey}|${title}|${publishedAt}`,
      url,
      title,
      summary: null,
      contentSnippet: null,
      publishedAt,
      fetchedAt: new Date().toISOString(),
      tickers: [],
      rawSymbols: [],
      sourceName: domain,
      author: null,
      imageUrl: typeof row.socialimage === "string" ? row.socialimage : null,
      language: typeof row.language === "string" ? row.language : null,
      country: sourceCountry,
      providerMetadata: {
        ...metadata,
        gdeltQueryGroupKey: queryGroup.queryKey,
        gdeltQueryGroupName: queryGroup.queryName,
        canonicalTheme: queryGroup.canonicalTheme,
        macroCategory: queryGroup.category
      },
      gdeltMetadata: {
        domain,
        sourceCountry,
        sourceLanguage: typeof row.language === "string" ? row.language : null,
        tone: toNumber(row.tone),
        gdeltThemes: toStringArray(row.themes),
        locations: Array.isArray(row.locations) ? row.locations : [],
        persons: toStringArray(row.persons),
        organizations: toStringArray(row.organizations),
        queryGroup,
        providerMetadata: metadata
      }
    };
  }
}

export const gdeltNormalizationInternals = { parseDate };
