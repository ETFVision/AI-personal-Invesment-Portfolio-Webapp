export type GapCandidateDisplaySortInput = {
  issueFitScore?: number | null;
  recommendationScore?: number | null;
};

export type DefensiveGapCandidateGroupInput = {
  diversificationType?: string | null;
};

export type DefensiveGapCandidateGroup<T> = {
  key: string;
  label: string;
  candidates: T[];
};

export function compareGapCandidatesByCategoryFit(
  left: GapCandidateDisplaySortInput,
  right: GapCandidateDisplaySortInput
) {
  return (
    (right.issueFitScore ?? 0) - (left.issueFitScore ?? 0) ||
    (right.recommendationScore ?? 0) - (left.recommendationScore ?? 0)
  );
}

function defensiveSleeveKey(candidate: DefensiveGapCandidateGroupInput) {
  const type = candidate.diversificationType?.toLowerCase() ?? "";
  if (type.includes("utilities")) return { key: "utilities", label: "Utilities" };
  if (type.includes("consumer staples")) return { key: "consumer_staples", label: "Consumer Staples" };
  if (type.includes("healthcare")) return { key: "healthcare", label: "Healthcare" };
  if (type.includes("bond") || type.includes("treasury") || type.includes("fixed income") || type.includes("cash")) {
    return { key: "ballast", label: "Defensive Ballast" };
  }
  return { key: "other", label: "Other Defensive" };
}

export function groupDefensiveGapCandidates<T extends DefensiveGapCandidateGroupInput>(candidates: T[]) {
  const groups: DefensiveGapCandidateGroup<T>[] = [];
  const byKey = new Map<string, DefensiveGapCandidateGroup<T>>();
  for (const candidate of candidates) {
    const sleeve = defensiveSleeveKey(candidate);
    let group = byKey.get(sleeve.key);
    if (!group) {
      group = { ...sleeve, candidates: [] };
      byKey.set(sleeve.key, group);
      groups.push(group);
    }
    group.candidates.push(candidate);
  }
  return groups;
}
