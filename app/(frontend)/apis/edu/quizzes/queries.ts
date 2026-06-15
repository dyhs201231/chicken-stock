import { useQuery } from "@tanstack/react-query";
import type { QuizContentData } from "../../../components/edu/quizzes/quiz-content";
import { fetchArticleQuizProgress, fetchQuizzesByArticleId } from "./api";

type UseArticleQuizzesQueryOptions = {
  initialData?: QuizContentData[];
};

export function useArticleQuizzesQuery(
  articleId: number,
  options?: UseArticleQuizzesQueryOptions,
) {
  return useQuery({
    queryKey: ["quizzes", "article", articleId],
    queryFn: () => fetchQuizzesByArticleId(articleId),
    enabled: articleId > 0,
    initialData: options?.initialData,
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
