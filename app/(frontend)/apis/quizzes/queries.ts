import { useQuery } from "@tanstack/react-query";
import { fetchQuizzesByArticleId } from "./api";

export function useArticleQuizzesQuery(articleId: number) {
  return useQuery({
    queryKey: ["quizzes", "article", articleId],
    queryFn: () => fetchQuizzesByArticleId(articleId),
    enabled: articleId > 0,
  });
}
