import { formatPercent } from "../../lib/utils";

export type ExposureBarItem = {
  label: string;
  value: number;
  valueLabel: string;
  detail?: string;
  tone?: "default" | "positive" | "warning" | "danger" | "muted";
};

const isOtherLabel = (label: string) => label.trim().toLowerCase() === "other";

export function collapseExposureItems(items: ExposureBarItem[], maxItems: number, minPercent?: number) {
  const sorted = [...items].sort((a, b) => b.value - a.value);

  if (minPercent != null) {
    const aboveThreshold = sorted.filter((item) => item.value >= minPercent);
    const belowThreshold = sorted.filter((item) => item.value < minPercent);
    const visibleCount = belowThreshold.length > 0 || aboveThreshold.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    const visibleCandidates = aboveThreshold.slice(0, visibleCount);
    const rollupCandidates = [...aboveThreshold.slice(visibleCount), ...belowThreshold];
    const visibleOther = visibleCandidates.filter((item) => isOtherLabel(item.label));
    const visible = visibleCandidates.filter((item) => !isOtherLabel(item.label));
    const rolledUp = [...rollupCandidates, ...visibleOther];
    const otherValue = rolledUp.reduce((sum, item) => sum + item.value, 0);

    return rolledUp.length === 0
      ? visibleCandidates
      : [
          ...visible,
          {
            label: `Other (${rolledUp.length} ${rolledUp.length === 1 ? "country" : "countries"})`,
            value: otherValue,
            valueLabel: formatPercent(otherValue),
            tone: "muted" as const
          }
        ];
  }

  if (items.length <= maxItems) return items;

  const visibleCandidates = sorted.slice(0, maxItems);
  const remaining = sorted.slice(maxItems);
  const visibleOther = visibleCandidates.filter((item) => isOtherLabel(item.label));
  const visible = visibleCandidates.filter((item) => !isOtherLabel(item.label));
  const rolledUp = [...remaining, ...visibleOther];
  const otherValue = rolledUp.reduce((sum, item) => sum + item.value, 0);

  return [
    ...visible,
    {
      label: "Other",
      value: otherValue,
      valueLabel: formatPercent(otherValue),
      tone: "muted" as const
    }
  ];
}
