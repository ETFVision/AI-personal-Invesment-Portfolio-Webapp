import type {
  GdeltRepository,
  InsertGdeltIngestionLogInput,
  UpsertGdeltArticleMetadataInput
} from "@/application/ports/repositories/GdeltRepository";
import type { GdeltIngestionLog, GdeltQueryGroup, NewsCanonicalTheme } from "@/domain/news/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function missing(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(error && (error.code === "42P01" || message.includes("gdelt_")));
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapQueryGroup(row: any): GdeltQueryGroup {
  return {
    id: row.id,
    queryKey: row.query_key,
    queryName: row.query_name,
    queryText: row.query_text,
    canonicalTheme: row.canonical_theme as NewsCanonicalTheme,
    category: row.category,
    isActive: Boolean(row.is_active),
    maxArticlesPerRun: Number(row.max_articles_per_run ?? 8),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLog(row: any): GdeltIngestionLog {
  return {
    id: row.id,
    jobName: row.job_name,
    queryGroupId: row.query_group_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    articlesFetched: Number(row.articles_fetched ?? 0),
    articlesInserted: Number(row.articles_inserted ?? 0),
    duplicatesDetected: Number(row.duplicates_detected ?? 0),
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

export class SupabaseGdeltRepository implements GdeltRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listActiveQueryGroups() {
    const { data, error } = await this.db
      .from("gdelt_query_groups")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("query_key");
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapQueryGroup);
  }

  async upsertArticleMetadata(input: UpsertGdeltArticleMetadataInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("gdelt_article_metadata").upsert(
      input.map((item) => ({
        news_item_id: item.newsItemId,
        domain: item.domain,
        source_country: item.sourceCountry,
        source_language: item.sourceLanguage,
        tone: item.tone,
        gdelt_themes: item.gdeltThemes,
        locations: item.locations,
        persons: item.persons,
        organizations: item.organizations,
        provider_metadata: item.providerMetadata
      })),
      { onConflict: "news_item_id" }
    );
    if (error) throw new Error(error.message);
  }

  async insertIngestionLog(input: InsertGdeltIngestionLogInput) {
    const { error } = await this.db.from("gdelt_ingestion_logs").insert({
      job_name: input.jobName,
      query_group_id: input.queryGroupId,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: input.status,
      articles_fetched: input.articlesFetched,
      articles_inserted: input.articlesInserted,
      duplicates_detected: input.duplicatesDetected,
      error_message: input.errorMessage,
      metadata: input.metadata
    });
    if (error) throw new Error(error.message);
  }

  async listIngestionLogs(limit = 10) {
    const { data, error } = await this.db
      .from("gdelt_ingestion_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLog);
  }
}

export const gdeltRepositoryInternals = { toStringArray };
