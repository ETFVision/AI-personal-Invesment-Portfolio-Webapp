import { createHash } from "node:crypto";

export function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildContentHash(input: { title: string; summary?: string | null; url?: string | null }) {
  return hashText([normalizeTitle(input.title), input.summary?.trim().toLowerCase() ?? "", input.url?.trim().toLowerCase() ?? ""].join("|"));
}

export function buildCanonicalHash(input: { title: string; publishedAt?: string | null }) {
  const date = input.publishedAt ? input.publishedAt.slice(0, 10) : "";
  return hashText(`${normalizeTitle(input.title)}|${date}`);
}

export function clampScore(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

export function startOfUtcWeek(date = new Date()) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy.toISOString().slice(0, 10);
}

export function endOfUtcWeek(date = new Date()) {
  const start = new Date(`${startOfUtcWeek(date)}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  return start.toISOString().slice(0, 10);
}
