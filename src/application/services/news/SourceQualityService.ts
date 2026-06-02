import type { SourceQualityTier } from "@/domain/news/types";

export type SourceQualityAssessment = {
  sourceQualityScore: number;
  sourceQualityTier: SourceQualityTier;
};

const tier1Sources = [
  "reuters",
  "bloomberg",
  "financial times",
  "ft.com",
  "wall street journal",
  "wsj",
  "wsj.com"
];

const tier2Sources = [
  "cnbc",
  "marketwatch",
  "barrons",
  "barron's",
  "barrons.com",
  "seeking alpha",
  "yahoo finance"
];

const knownGeneralSources = [
  "investing.com",
  "zacks",
  "benzinga",
  "motley fool",
  "the street",
  "thestreet",
  "fxstreet",
  "kitco"
];

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().replace(/^www\./, "").trim() ?? "";
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function domainFromUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export class SourceQualityService {
  assess(input: { sourceName?: string | null; url?: string | null }): SourceQualityAssessment {
    const source = normalize(input.sourceName);
    const domain = domainFromUrl(input.url);
    const combined = `${source} ${domain}`.trim();

    if (includesAny(combined, tier1Sources)) {
      return { sourceQualityScore: 95, sourceQualityTier: "tier_1" };
    }
    if (includesAny(combined, tier2Sources)) {
      return { sourceQualityScore: 80, sourceQualityTier: "tier_2" };
    }
    if (includesAny(combined, knownGeneralSources)) {
      return { sourceQualityScore: 60, sourceQualityTier: "tier_3" };
    }
    return { sourceQualityScore: combined ? 45 : 35, sourceQualityTier: "tier_3" };
  }
}

export const sourceQualityInternals = { domainFromUrl };
