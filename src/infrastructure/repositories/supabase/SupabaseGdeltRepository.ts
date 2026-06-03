import type {
  GdeltRepository,
  InsertGdeltIngestionLogInput,
  UpdateGdeltQueryGroupScheduleInput,
  UpsertGdeltArticleMetadataInput
} from "@/application/ports/repositories/GdeltRepository";
import { compareDueQueryGroups } from "@/application/services/news/gdeltQueryOrdering";
import type { GdeltIngestionLog, GdeltQueryGroup, NewsCanonicalTheme } from "@/domain/news/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";
import { isJwtIssuedAtFutureError } from "./supabaseErrors";

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
    lastAttemptedAt: row.last_attempted_at,
    lastSuccessAt: row.last_success_at,
    nextRunAt: row.next_run_at,
    failureCount: Number(row.failure_count ?? 0),
    lastError: row.last_error,
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

  async listDueQueryGroups(input: { now: string; limit: number }) {
    const { data, error } = await this.db
      .from("gdelt_query_groups")
      .select("*")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${input.now}`)
      .order("next_run_at", { ascending: true, nullsFirst: true })
      .order("last_attempted_at", { ascending: true, nullsFirst: true })
      .order("query_key");
    if (missing(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapQueryGroup).sort(compareDueQueryGroups).slice(0, input.limit);
  }

  async updateQueryGroupSchedule(input: UpdateGdeltQueryGroupScheduleInput) {
    const { error } = await this.db
      .from("gdelt_query_groups")
      .update({
        last_attempted_at: input.lastAttemptedAt,
        last_success_at: input.lastSuccessAt,
        next_run_at: input.nextRunAt,
        failure_count: input.failureCount,
        last_error: input.lastError
      })
      .eq("id", input.id);
    if (missing(error)) return;
    if (error) throw new Error(error.message);
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
    if (isJwtIssuedAtFutureError(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLog);
  }
}

export const gdeltRepositoryInternals = { toStringArray };
