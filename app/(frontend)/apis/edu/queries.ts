import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEducationArticle,
  fetchEducationProgress,
  fetchEducationSummaries,
} from "./api";
import type { EducationProgressArticle, EducationSummary } from "./api";

export const educationQueryKeys = {
  summaries: () => ["educationSummaries"] as const,
  progress: (userId?: string | null) =>
    ["educationProgress", userId ?? null] as const,
};

const EDUCATION_SUMMARIES_STALE_TIME_MS = 5 * 60 * 1000;

type UseEducationSummariesQueryOptions = {
  enabled?: boolean;
};

function mergeEducationProgress(
  summaries: EducationSummary[] | undefined,
  progress: EducationProgressArticle[] | undefined,
) {
  if (!summaries) {
    return summaries;
  }

  const progressByArticleId = new Map(
    (progress ?? []).map((articleProgress) => [
      articleProgress.articleId,
      articleProgress,
    ]),
  );

  return summaries.map((summary) => ({
    ...summary,
    articles: summary.articles.map((article) => {
      const articleProgress = progressByArticleId.get(article.id);

      return {
        ...article,
        progressRate: articleProgress?.progressRate ?? 0,
        isCompleted: articleProgress?.isCompleted ?? false,
      };
    }),
  }));
}

export function useEducationSummariesQuery(
  userId?: string | null,
  options?: UseEducationSummariesQueryOptions,
) {
  const enabled = options?.enabled ?? true;
  const summariesQuery = useQuery({
    queryKey: educationQueryKeys.summaries(),
    queryFn: fetchEducationSummaries,
    enabled,
    staleTime: EDUCATION_SUMMARIES_STALE_TIME_MS,
  });
  const progressQuery = useQuery({
    queryKey: educationQueryKeys.progress(userId),
    queryFn: () => fetchEducationProgress(userId ?? ""),
    enabled: enabled && Boolean(userId),
    staleTime: 0,
  });
  const data = useMemo(
    () => mergeEducationProgress(summariesQuery.data, progressQuery.data),
    [progressQuery.data, summariesQuery.data],
  );

  return {
    ...summariesQuery,
    data,
    error: summariesQuery.error ?? progressQuery.error,
    isError: summariesQuery.isError || progressQuery.isError,
    isLoading: summariesQuery.isLoading || progressQuery.isLoading,
    isPending: summariesQuery.isPending || progressQuery.isPending,
  };
}

export async function getEducationArticle(
  articleId: string,
  level: string,
  origin: string,
) {
  try {
    return await fetchEducationArticle(articleId, level, origin);
  } catch {
    return null;
  }
}
