import { z } from "zod";

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") return value.toLowerCase() === "true";
  return value;
}, z.boolean());

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  FMP_API_KEY: z.string().min(1).optional(),
  FRED_API_KEY: z.string().min(1).optional(),
  FRED_BACKFILL_YEARS: z.coerce.number().int().positive().default(5),
  OPENAI_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  NEWS_CLASSIFICATION_MODEL: z.string().min(1).default("gpt-5.4-nano"),
  NEWS_RECONCILIATION_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  MAX_NEWS_ARTICLES_PER_DAY: z.coerce.number().int().positive().default(80),
  MAX_NEWS_ARTICLES_PER_WEEK: z.coerce.number().int().positive().default(250),
  MAX_NEWS_ARTICLES_PER_INSTRUMENT: z.coerce.number().int().positive().default(3),
  GDELT_MAX_ARTICLES_PER_QUERY: z.coerce.number().int().positive().default(8),
  GDELT_MAX_ARTICLES_PER_DAY: z.coerce.number().int().positive().default(80),
  GDELT_RECENT_WINDOW_HOURS: z.coerce.number().int().positive().default(72),
  GDELT_QUERY_DELAY_MS: z.coerce.number().int().nonnegative().default(1200),
  ENABLE_GDELT_INGESTION: envBoolean.default(false),
  ENABLE_AI_NEWS_CLASSIFICATION: envBoolean.default(false),
  ENABLE_WEEKLY_NEWS_RECONCILIATION: envBoolean.default(false)
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  FMP_API_KEY: process.env.FMP_API_KEY,
  FRED_API_KEY: process.env.FRED_API_KEY,
  FRED_BACKFILL_YEARS: process.env.FRED_BACKFILL_YEARS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  NEWS_CLASSIFICATION_MODEL: process.env.NEWS_CLASSIFICATION_MODEL,
  NEWS_RECONCILIATION_MODEL: process.env.NEWS_RECONCILIATION_MODEL,
  MAX_NEWS_ARTICLES_PER_DAY: process.env.MAX_NEWS_ARTICLES_PER_DAY,
  MAX_NEWS_ARTICLES_PER_WEEK: process.env.MAX_NEWS_ARTICLES_PER_WEEK,
  MAX_NEWS_ARTICLES_PER_INSTRUMENT: process.env.MAX_NEWS_ARTICLES_PER_INSTRUMENT,
  GDELT_MAX_ARTICLES_PER_QUERY: process.env.GDELT_MAX_ARTICLES_PER_QUERY,
  GDELT_MAX_ARTICLES_PER_DAY: process.env.GDELT_MAX_ARTICLES_PER_DAY,
  GDELT_RECENT_WINDOW_HOURS: process.env.GDELT_RECENT_WINDOW_HOURS,
  GDELT_QUERY_DELAY_MS: process.env.GDELT_QUERY_DELAY_MS,
  ENABLE_GDELT_INGESTION: process.env.ENABLE_GDELT_INGESTION,
  ENABLE_AI_NEWS_CLASSIFICATION: process.env.ENABLE_AI_NEWS_CLASSIFICATION,
  ENABLE_WEEKLY_NEWS_RECONCILIATION: process.env.ENABLE_WEEKLY_NEWS_RECONCILIATION
});
