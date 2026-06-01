import type {
  NewsClassification,
  NewsGroup,
  NewsIngestionLog,
  NewsItem,
  NormalizedNewsArticle,
  WeeklyNewsReconciliation
} from "@/domain/news/types";

export type UpsertNewsItemInput = Omit<NewsItem, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type UpsertNewsClassificationInput = Omit<NewsClassification, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type UpsertNewsGroupInput = Omit<NewsGroup, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type UpsertWeeklyNewsReconciliationInput = Omit<WeeklyNewsReconciliation, "id" | "createdAt" | "updatedAt"> & { id?: string };
export type InsertNewsIngestionLogInput = Omit<NewsIngestionLog, "id" | "createdAt">;

export type NewsFilters = {
  query?: string;
  instrumentId?: string;
  classification?: string;
  sentiment?: string;
  sourceProvider?: string;
  includeDuplicates?: boolean;
  limit?: number;
};

export interface NewsRepository {
  listNewsItems(filters?: NewsFilters): Promise<NewsItem[]>;
  listNewsWithClassifications(filters?: NewsFilters): Promise<Array<NewsItem & { classification?: NewsClassification | null }>>;
  findCanonicalArticle(input: Pick<NormalizedNewsArticle, "sourceProvider" | "sourceId" | "url"> & { canonicalHash: string; contentHash: string }): Promise<NewsItem | null>;
  upsertNewsItems(input: UpsertNewsItemInput[]): Promise<NewsItem[]>;
  markDuplicate(newsItemId: string, duplicateOfId: string | null): Promise<void>;
  listUnclassifiedNews(limit: number): Promise<NewsItem[]>;
  getClassification(newsItemId: string): Promise<NewsClassification | null>;
  upsertClassifications(input: UpsertNewsClassificationInput[]): Promise<void>;
  listClassifiedNewsForPeriod(periodStart: string, periodEnd: string): Promise<Array<NewsItem & { classification: NewsClassification }>>;
  upsertGroups(input: UpsertNewsGroupInput[]): Promise<void>;
  listGroups(periodStart?: string, periodEnd?: string): Promise<NewsGroup[]>;
  upsertWeeklyReconciliation(input: UpsertWeeklyNewsReconciliationInput): Promise<WeeklyNewsReconciliation>;
  listWeeklyReconciliations(limit?: number): Promise<WeeklyNewsReconciliation[]>;
  getLatestWeeklyReconciliation(): Promise<WeeklyNewsReconciliation | null>;
  insertIngestionLog(input: InsertNewsIngestionLogInput): Promise<void>;
  listIngestionLogs(limit?: number): Promise<NewsIngestionLog[]>;
}
