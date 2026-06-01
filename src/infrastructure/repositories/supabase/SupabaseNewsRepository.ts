import type {
  InsertNewsIngestionLogInput,
  NewsFilters,
  NewsRepository,
  UpsertNewsClassificationInput,
  UpsertNewsGroupInput,
  UpsertNewsItemInput,
  UpsertWeeklyNewsReconciliationInput
} from "@/application/ports/repositories/NewsRepository";
import type { NewsClassification, NewsGroup, NewsIngestionLog, NewsItem, WeeklyNewsReconciliation } from "@/domain/news/types";
import { createSupabaseAdminClient } from "@/infrastructure/db/supabaseAdmin";

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

function isMissingNewsTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return Boolean(error && (error.code === "42P01" || message.includes("news_")));
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapNewsItem(row: any): NewsItem {
  return {
    id: row.id,
    sourceProvider: row.source_provider,
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    contentSnippet: row.content_snippet,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    tickers: toStringArray(row.tickers),
    relatedInstrumentIds: toStringArray(row.related_instrument_ids),
    rawSymbols: toStringArray(row.raw_symbols),
    sourceName: row.source_name,
    author: row.author,
    imageUrl: row.image_url,
    language: row.language,
    country: row.country,
    providerMetadata: row.provider_metadata ?? {},
    contentHash: row.content_hash,
    canonicalHash: row.canonical_hash,
    isDuplicate: Boolean(row.is_duplicate),
    duplicateOfId: row.duplicate_of_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapClassification(row: any): NewsClassification {
  return {
    id: row.id,
    newsItemId: row.news_item_id,
    classificationModel: row.classification_model,
    sentiment: row.sentiment,
    eventType: row.event_type,
    classification: row.classification,
    severityScore: Number(row.severity_score ?? 0),
    persistenceScore: Number(row.persistence_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    affectedAssetClasses: toStringArray(row.affected_asset_classes),
    affectedSectors: toStringArray(row.affected_sectors),
    affectedThemes: toStringArray(row.affected_themes),
    affectedInstruments: toStringArray(row.affected_instruments),
    affectedMacroCategories: toStringArray(row.affected_macro_categories),
    reasoningSummary: row.reasoning_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapWeekly(row: any): WeeklyNewsReconciliation {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    equitiesSummary: row.equities_summary,
    bondsSummary: row.bonds_summary,
    goldSummary: row.gold_summary,
    cryptoSummary: row.crypto_summary,
    macroSummary: row.macro_summary,
    ratesSummary: row.rates_summary,
    inflationSummary: row.inflation_summary,
    currencySummary: row.currency_summary,
    geopoliticalSummary: row.geopolitical_summary,
    keyRisks: toStringArray(row.key_risks),
    keyOpportunities: toStringArray(row.key_opportunities),
    portfolioImplications: row.portfolio_implications ?? {},
    modelUsed: row.model_used,
    tokenUsage: row.token_usage ?? {},
    costEstimate: row.cost_estimate == null ? null : Number(row.cost_estimate),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLog(row: any): NewsIngestionLog {
  return {
    id: row.id,
    jobName: row.job_name,
    sourceProvider: row.source_provider,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    instrumentsRequested: Number(row.instruments_requested ?? 0),
    articlesFetched: Number(row.articles_fetched ?? 0),
    articlesInserted: Number(row.articles_inserted ?? 0),
    duplicatesDetected: Number(row.duplicates_detected ?? 0),
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

function mapGroup(row: any): NewsGroup {
  return {
    id: row.id,
    groupKey: row.group_key,
    groupTitle: row.group_title,
    groupType: row.group_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    relatedNewsItemIds: toStringArray(row.related_news_item_ids),
    affectedInstruments: toStringArray(row.affected_instruments),
    affectedThemes: toStringArray(row.affected_themes),
    affectedAssetClasses: toStringArray(row.affected_asset_classes),
    groupSummary: row.group_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SupabaseNewsRepository implements NewsRepository {
  constructor(private readonly db: SupabaseClient = createSupabaseAdminClient()) {}

  async listNewsItems(filters?: NewsFilters) {
    let query = this.db.from("news_items").select("*").order("published_at", { ascending: false }).limit(filters?.limit ?? 50);
    if (!filters?.includeDuplicates) query = query.eq("is_duplicate", false);
    if (filters?.sourceProvider) query = query.eq("source_provider", filters.sourceProvider);
    if (filters?.query) query = query.ilike("title", `%${filters.query}%`);
    if (filters?.instrumentId) query = query.contains("related_instrument_ids", [filters.instrumentId]);
    const { data, error } = await query;
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNewsItem);
  }

  async listNewsWithClassifications(filters?: NewsFilters) {
    const items = await this.listNewsItems(filters);
    const rows = await Promise.all(items.map(async (item) => ({ ...item, classification: await this.getClassification(item.id) })));
    return filters?.classification ? rows.filter((row) => row.classification?.classification === filters.classification) : rows;
  }

  async findCanonicalArticle(input: { sourceProvider: string; sourceId: string | null; url: string | null; canonicalHash: string; contentHash: string }) {
    let query = this.db.from("news_items").select("*").eq("source_provider", input.sourceProvider).eq("is_duplicate", false).limit(1);
    if (input.sourceId) query = query.eq("source_id", input.sourceId);
    else if (input.url) query = query.eq("url", input.url);
    else query = query.or(`canonical_hash.eq.${input.canonicalHash},content_hash.eq.${input.contentHash}`);
    const { data, error } = await query.maybeSingle();
    if (isMissingNewsTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapNewsItem(data) : null;
  }

  async upsertNewsItems(input: UpsertNewsItemInput[]) {
    if (input.length === 0) return [];
    const { data, error } = await this.db.from("news_items").upsert(
      input.map((item) => ({
        id: item.id,
        source_provider: item.sourceProvider,
        source_id: item.sourceId,
        url: item.url,
        title: item.title,
        summary: item.summary,
        content_snippet: item.contentSnippet,
        published_at: item.publishedAt,
        fetched_at: item.fetchedAt,
        tickers: item.tickers,
        related_instrument_ids: item.relatedInstrumentIds,
        raw_symbols: item.rawSymbols,
        source_name: item.sourceName,
        author: item.author,
        image_url: item.imageUrl,
        language: item.language,
        country: item.country,
        provider_metadata: item.providerMetadata,
        content_hash: item.contentHash,
        canonical_hash: item.canonicalHash,
        is_duplicate: item.isDuplicate,
        duplicate_of_id: item.duplicateOfId
      })),
      { onConflict: "source_provider,source_id", ignoreDuplicates: false }
    ).select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNewsItem);
  }

  async markDuplicate(newsItemId: string, duplicateOfId: string | null) {
    const { error } = await this.db.from("news_items").update({ is_duplicate: Boolean(duplicateOfId), duplicate_of_id: duplicateOfId }).eq("id", newsItemId);
    if (error) throw new Error(error.message);
  }

  async listUnclassifiedNews(limit: number) {
    const { data, error } = await this.db
      .from("news_items")
      .select("*, news_classifications(id)")
      .eq("is_duplicate", false)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).filter((row: any) => !row.news_classifications?.length).map(mapNewsItem);
  }

  async getClassification(newsItemId: string) {
    const { data, error } = await this.db.from("news_classifications").select("*").eq("news_item_id", newsItemId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (isMissingNewsTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapClassification(data) : null;
  }

  async upsertClassifications(input: UpsertNewsClassificationInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("news_classifications").upsert(
      input.map((item) => ({
        id: item.id,
        news_item_id: item.newsItemId,
        classification_model: item.classificationModel,
        sentiment: item.sentiment,
        event_type: item.eventType,
        classification: item.classification,
        severity_score: item.severityScore,
        persistence_score: item.persistenceScore,
        confidence_score: item.confidenceScore,
        affected_asset_classes: item.affectedAssetClasses,
        affected_sectors: item.affectedSectors,
        affected_themes: item.affectedThemes,
        affected_instruments: item.affectedInstruments,
        affected_macro_categories: item.affectedMacroCategories,
        reasoning_summary: item.reasoningSummary
      })),
      { onConflict: "news_item_id,classification_model" }
    );
    if (error) throw new Error(error.message);
  }

  async listClassifiedNewsForPeriod(periodStart: string, periodEnd: string) {
    const { data, error } = await this.db
      .from("news_items")
      .select("*, news_classifications(*)")
      .eq("is_duplicate", false)
      .gte("published_at", `${periodStart}T00:00:00.000Z`)
      .lte("published_at", `${periodEnd}T23:59:59.999Z`)
      .order("published_at", { ascending: false });
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row: any) => {
        const classification = row.news_classifications?.[0];
        return classification ? { ...mapNewsItem(row), classification: mapClassification(classification) } : null;
      })
      .filter((row): row is NewsItem & { classification: NewsClassification } => Boolean(row));
  }

  async upsertGroups(input: UpsertNewsGroupInput[]) {
    if (input.length === 0) return;
    const { error } = await this.db.from("news_groups").upsert(
      input.map((item) => ({
        id: item.id,
        group_key: item.groupKey,
        group_title: item.groupTitle,
        group_type: item.groupType,
        period_start: item.periodStart,
        period_end: item.periodEnd,
        related_news_item_ids: item.relatedNewsItemIds,
        affected_instruments: item.affectedInstruments,
        affected_themes: item.affectedThemes,
        affected_asset_classes: item.affectedAssetClasses,
        group_summary: item.groupSummary
      })),
      { onConflict: "period_start,period_end,group_key" }
    );
    if (error) throw new Error(error.message);
  }

  async listGroups(periodStart?: string, periodEnd?: string) {
    let query = this.db.from("news_groups").select("*").order("period_start", { ascending: false });
    if (periodStart) query = query.gte("period_start", periodStart);
    if (periodEnd) query = query.lte("period_end", periodEnd);
    const { data, error } = await query;
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapGroup);
  }

  async upsertWeeklyReconciliation(input: UpsertWeeklyNewsReconciliationInput) {
    const { data, error } = await this.db.from("weekly_news_reconciliations").upsert({
      id: input.id,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      status: input.status,
      equities_summary: input.equitiesSummary,
      bonds_summary: input.bondsSummary,
      gold_summary: input.goldSummary,
      crypto_summary: input.cryptoSummary,
      macro_summary: input.macroSummary,
      rates_summary: input.ratesSummary,
      inflation_summary: input.inflationSummary,
      currency_summary: input.currencySummary,
      geopolitical_summary: input.geopoliticalSummary,
      key_risks: input.keyRisks,
      key_opportunities: input.keyOpportunities,
      portfolio_implications: input.portfolioImplications,
      model_used: input.modelUsed,
      token_usage: input.tokenUsage,
      cost_estimate: input.costEstimate
    }, { onConflict: "period_start,period_end,status" }).select("*").single();
    if (error) throw new Error(error.message);
    return mapWeekly(data);
  }

  async listWeeklyReconciliations(limit = 8) {
    const { data, error } = await this.db.from("weekly_news_reconciliations").select("*").order("period_end", { ascending: false }).limit(limit);
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapWeekly);
  }

  async getLatestWeeklyReconciliation() {
    const { data, error } = await this.db.from("weekly_news_reconciliations").select("*").order("period_end", { ascending: false }).limit(1).maybeSingle();
    if (isMissingNewsTable(error)) return null;
    if (error) throw new Error(error.message);
    return data ? mapWeekly(data) : null;
  }

  async insertIngestionLog(input: InsertNewsIngestionLogInput) {
    const { error } = await this.db.from("news_ingestion_logs").insert({
      job_name: input.jobName,
      source_provider: input.sourceProvider,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      status: input.status,
      instruments_requested: input.instrumentsRequested,
      articles_fetched: input.articlesFetched,
      articles_inserted: input.articlesInserted,
      duplicates_detected: input.duplicatesDetected,
      error_message: input.errorMessage,
      metadata: input.metadata
    });
    if (error) throw new Error(error.message);
  }

  async listIngestionLogs(limit = 10) {
    const { data, error } = await this.db.from("news_ingestion_logs").select("*").order("started_at", { ascending: false }).limit(limit);
    if (isMissingNewsTable(error)) return [];
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapLog);
  }
}
