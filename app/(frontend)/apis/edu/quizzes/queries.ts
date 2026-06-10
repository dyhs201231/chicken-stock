import { useQuery } from "@tanstack/react-query";
import { fetchArticleQuizProgress, fetchQuizzesByArticleId } from "./api";

export function useArticleQuizzesQuery(articleId: number) {
  return useQuery({
    queryKey: ["quizzes", "article", articleId],
    queryFn: () => fetchQuizzesByArticleId(articleId),
    enabled: articleId > 0,
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
