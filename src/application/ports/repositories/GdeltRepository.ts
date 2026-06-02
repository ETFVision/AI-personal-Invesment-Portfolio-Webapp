import type { GdeltArticleMetadata, GdeltIngestionLog, GdeltQueryGroup } from "@/domain/news/types";

export type UpsertGdeltArticleMetadataInput = Omit<GdeltArticleMetadata, "id" | "createdAt" | "updatedAt">;
export type InsertGdeltIngestionLogInput = Omit<GdeltIngestionLog, "id" | "createdAt">;
export type UpdateGdeltQueryGroupScheduleInput = {
  id: string;
  lastAttemptedAt: string;
  lastSuccessAt?: string | null;
  nextRunAt: string;
  failureCount: number;
  lastError: string | null;
};

export interface GdeltRepository {
  listActiveQueryGroups(): Promise<GdeltQueryGroup[]>;
  listDueQueryGroups(input: { now: string; limit: number }): Promise<GdeltQueryGroup[]>;
  updateQueryGroupSchedule(input: UpdateGdeltQueryGroupScheduleInput): Promise<void>;
  upsertArticleMetadata(input: UpsertGdeltArticleMetadataInput[]): Promise<void>;
  insertIngestionLog(input: InsertGdeltIngestionLogInput): Promise<void>;
  listIngestionLogs(limit?: number): Promise<GdeltIngestionLog[]>;
}
