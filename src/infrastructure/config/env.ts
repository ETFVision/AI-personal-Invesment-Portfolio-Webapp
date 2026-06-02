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
  MARKET_VISION_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  MARKET_VISION_INPUT_COST_PER_1M: z.coerce.number().nonnegative().default(0),
  MARKET_VISION_OUTPUT_COST_PER_1M: z.coerce.number().nonnegative().default(0),
  MAX_NEWS_ARTICLES_PER_DAY: z.coerce.number().int().positive().default(80),
  MAX_NEWS_ARTICLES_PER_WEEK: z.coerce.number().int().positive().default(250),
  MAX_NEWS_ARTICLES_PER_INSTRUMENT: z.coerce.number().int().positive().default(3),
  GDELT_MAX_ARTICLES_PER_QUERY: z.coerce.number().int().positive().default(8),
  GDELT_MAX_ARTICLES_PER_DAY: z.coerce.number().int().positive().default(80),
  GDELT_RECENT_WINDOW_HOURS: z.coerce.number().int().positive().default(72),
  GDELT_QUERY_DELAY_MS: z.coerce.number().int().nonnegative().default(1200),
  GDELT_MAX_QUERY_GROUPS_PER_RUN: z.coerce.number().int().positive().default(1),
  GDELT_QUERY_SUCCESS_COOLDOWN_MINUTES: z.coerce.number().int().positive().default(240),
  GDELT_QUERY_FAILURE_BACKOFF_MINUTES: z.coerce.number().int().positive().default(30),
  GDELT_QUERY_RATE_LIMIT_BACKOFF_MINUTES: z.coerce.number().int().positive().default(60),
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
  MARKET_VISION_MODEL: process.env.MARKET_VISION_MODEL,
  MARKET_VISION_INPUT_COST_PER_1M: process.env.MARKET_VISION_INPUT_COST_PER_1M,
  MARKET_VISION_OUTPUT_COST_PER_1M: process.env.MARKET_VISION_OUTPUT_COST_PER_1M,
  MAX_NEWS_ARTICLES_PER_DAY: process.env.MAX_NEWS_ARTICLES_PER_DAY,
  MAX_NEWS_ARTICLES_PER_WEEK: process.env.MAX_NEWS_ARTICLES_PER_WEEK,
  MAX_NEWS_ARTICLES_PER_INSTRUMENT: process.env.MAX_NEWS_ARTICLES_PER_INSTRUMENT,
  GDELT_MAX_ARTICLES_PER_QUERY: process.env.GDELT_MAX_ARTICLES_PER_QUERY,
  GDELT_MAX_ARTICLES_PER_DAY: process.env.GDELT_MAX_ARTICLES_PER_DAY,
  GDELT_RECENT_WINDOW_HOURS: process.env.GDELT_RECENT_WINDOW_HOURS,
  GDELT_QUERY_DELAY_MS: process.env.GDELT_QUERY_DELAY_MS,
  GDELT_MAX_QUERY_GROUPS_PER_RUN: process.env.GDELT_MAX_QUERY_GROUPS_PER_RUN,
  GDELT_QUERY_SUCCESS_COOLDOWN_MINUTES: process.env.GDELT_QUERY_SUCCESS_COOLDOWN_MINUTES,
  GDELT_QUERY_FAILURE_BACKOFF_MINUTES: process.env.GDELT_QUERY_FAILURE_BACKOFF_MINUTES,
  GDELT_QUERY_RATE_LIMIT_BACKOFF_MINUTES: process.env.GDELT_QUERY_RATE_LIMIT_BACKOFF_MINUTES,
  ENABLE_GDELT_INGESTION: process.env.ENABLE_GDELT_INGESTION,
  ENABLE_AI_NEWS_CLASSIFICATION: process.env.ENABLE_AI_NEWS_CLASSIFICATION,
  ENABLE_WEEKLY_NEWS_RECONCILIATION: process.env.ENABLE_WEEKLY_NEWS_RECONCILIATION
});
