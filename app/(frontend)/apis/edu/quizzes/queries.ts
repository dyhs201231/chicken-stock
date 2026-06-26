import { useQuery } from "@tanstack/react-query";
import type { QuizContentData } from "../../../components/edu/quizzes/quiz-content";
import { fetchArticleQuizProgress, fetchQuizzesByArticleId } from "./api";

type UseArticleQuizzesQueryOptions = {
  initialData?: QuizContentData[];
  userId?: string;
};

export const quizQueryKeys = {
  article: (articleId: number, userId?: string) =>
    ["quizzes", "article", articleId, userId ?? null] as const,
  root: ["quizzes"] as const,
};

const ARTICLE_QUIZZES_STALE_TIME_MS = 5 * 60 * 1000;

export function useArticleQuizzesQuery(
  articleId: number,
  options?: UseArticleQuizzesQueryOptions,
) {
  return useQuery({
    queryKey: quizQueryKeys.article(articleId, options?.userId),
    queryFn: () => fetchQuizzesByArticleId(articleId, options?.userId),
    enabled: articleId > 0,
    initialData: options?.initialData,
    staleTime: options?.initialData ? ARTICLE_QUIZZES_STALE_TIME_MS : 0,
  });
}

export async function getArticleQuizProgress(
  articleId: string,
  userId: string,
  origin: string,
  cookieHeader?: string | null,
) {
  try {
    return await fetchArticleQuizProgress(
      articleId,
      userId,
      origin,
      cookieHeader,
    );
  } catch {
    return null;
  }
}
