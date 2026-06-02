import type { GdeltArticleMetadata, GdeltIngestionLog, GdeltQueryGroup } from "@/domain/news/types";

export type UpsertGdeltArticleMetadataInput = Omit<GdeltArticleMetadata, "id" | "createdAt" | "updatedAt">;
export type InsertGdeltIngestionLogInput = Omit<GdeltIngestionLog, "id" | "createdAt">;

export interface GdeltRepository {
  listActiveQueryGroups(): Promise<GdeltQueryGroup[]>;
  upsertArticleMetadata(input: UpsertGdeltArticleMetadataInput[]): Promise<void>;
  insertIngestionLog(input: InsertGdeltIngestionLogInput): Promise<void>;
  listIngestionLogs(limit?: number): Promise<GdeltIngestionLog[]>;
}
