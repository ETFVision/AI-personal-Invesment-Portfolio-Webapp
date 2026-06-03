import type { NewsDataArticleMetadata, NewsDataIngestionLog, NewsDataQueryGroup } from "@/domain/news/types";

export type UpsertNewsDataArticleMetadataInput = Omit<NewsDataArticleMetadata, "id" | "createdAt" | "updatedAt">;
export type InsertNewsDataIngestionLogInput = Omit<NewsDataIngestionLog, "id" | "createdAt">;
export type UpdateNewsDataQueryGroupScheduleInput = {
  id: string;
  lastAttemptedAt: string;
  lastSuccessAt?: string | null;
  nextRunAt: string;
  failureCount: number;
  lastError: string | null;
};

export interface NewsDataRepository {
  listActiveQueryGroups(): Promise<NewsDataQueryGroup[]>;
  listDueQueryGroups(input: { now: string; limit: number }): Promise<NewsDataQueryGroup[]>;
  updateQueryGroupSchedule(input: UpdateNewsDataQueryGroupScheduleInput): Promise<void>;
  upsertArticleMetadata(input: UpsertNewsDataArticleMetadataInput[]): Promise<void>;
  insertIngestionLog(input: InsertNewsDataIngestionLogInput): Promise<void>;
  listIngestionLogs(limit?: number): Promise<NewsDataIngestionLog[]>;
}
