type EducationSummariesStateParams = {
  hasSummaries: boolean;
  isProgressLoading: boolean;
  isSummariesLoading: boolean;
};

export function getEducationSummariesState({
  hasSummaries,
  isProgressLoading,
  isSummariesLoading,
}: EducationSummariesStateParams) {
  return {
    isLoading: isSummariesLoading && !hasSummaries,
    isProgressLoading,
  };
}
