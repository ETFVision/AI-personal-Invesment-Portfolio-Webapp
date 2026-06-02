import type {
  MacroDashboard,
  MacroIndicatorDefinition,
  MacroIngestionLog,
  MacroObservation,
  MacroRegimeSnapshot,
  MacroThemeSignal,
  MacroTrend
} from "@/domain/macro/types";

export type UpsertMacroObservationInput = Omit<MacroObservation, "id" | "createdAt" | "updatedAt">;
export type UpsertMacroTrendInput = Omit<MacroTrend, "id" | "createdAt" | "updatedAt">;
export type UpsertMacroRegimeSnapshotInput = Omit<MacroRegimeSnapshot, "id" | "createdAt" | "updatedAt">;
export type UpsertMacroThemeSignalInput = Omit<MacroThemeSignal, "id" | "createdAt" | "updatedAt">;
export type InsertMacroIngestionLogInput = Omit<MacroIngestionLog, "id" | "createdAt">;

export interface MacroIndicatorRepository {
  listIndicators(filters?: { isActive?: boolean; sourceProvider?: string }): Promise<MacroIndicatorDefinition[]>;
  listObservations(indicatorId: string, limit?: number): Promise<MacroObservation[]>;
  listObservationsForIndicators(indicatorIds: string[], limitPerIndicator?: number): Promise<Map<string, MacroObservation[]>>;
  upsertObservations(input: UpsertMacroObservationInput[]): Promise<{ inserted: number; updated: number }>;
  upsertTrend(input: UpsertMacroTrendInput): Promise<MacroTrend>;
  listLatestTrends(indicatorIds?: string[]): Promise<MacroTrend[]>;
  upsertRegimeSnapshot(input: UpsertMacroRegimeSnapshotInput): Promise<MacroRegimeSnapshot>;
  getLatestRegimeSnapshot(): Promise<MacroRegimeSnapshot | null>;
  upsertMacroThemeSignals(input: UpsertMacroThemeSignalInput[]): Promise<void>;
  listMacroThemeSignalsForPeriod(periodStart: string, periodEnd: string): Promise<MacroThemeSignal[]>;
  insertIngestionLog(input: InsertMacroIngestionLogInput): Promise<void>;
  listIngestionLogs(limit?: number): Promise<MacroIngestionLog[]>;
  getDashboard(): Promise<MacroDashboard>;
}
