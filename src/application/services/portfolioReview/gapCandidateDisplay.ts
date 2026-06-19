export type GapCandidateDisplaySortInput = {
  issueFitScore?: number | null;
  recommendationScore?: number | null;
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
