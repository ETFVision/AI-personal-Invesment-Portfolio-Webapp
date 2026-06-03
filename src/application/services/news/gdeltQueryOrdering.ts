import type { GdeltQueryGroup } from "@/domain/news/types";

function dateKey(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareDueQueryGroups(a: GdeltQueryGroup, b: GdeltQueryGroup) {
  const aNeverSucceeded = a.lastSuccessAt ? 1 : 0;
  const bNeverSucceeded = b.lastSuccessAt ? 1 : 0;
  if (aNeverSucceeded !== bNeverSucceeded) return aNeverSucceeded - bNeverSucceeded;
  return (
    dateKey(a.nextRunAt) - dateKey(b.nextRunAt) ||
    dateKey(a.lastAttemptedAt) - dateKey(b.lastAttemptedAt) ||
    a.queryKey.localeCompare(b.queryKey)
  );
}
