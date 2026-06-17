import { useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioQueryKeys } from "../../portfolio/queries";
import type { QuizContentData } from "../../../components/edu/quizzes/quiz-content";
import { submitQuizAnswer } from "./api";
import { quizQueryKeys } from "./queries";

export function useSubmitQuizAnswerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitQuizAnswer,
    onSuccess: (result, variables) => {
      if (variables.articleId) {
        queryClient.setQueryData<QuizContentData[]>(
          quizQueryKeys.article(variables.articleId, variables.userId),
          (quizzes) =>
            quizzes?.map((quiz) =>
              quiz.id === variables.quizId
                ? {
                    ...quiz,
                    submission: {
                      answeredAt: result.isCorrect
                        ? new Date().toISOString()
                        : null,
                      isCorrect: result.isCorrect,
                      isSkip: false,
                      selectedAnswer: result.selectedAnswer,
                    },
                  }
                : quiz,
            ),
        );
        void queryClient.invalidateQueries({
          queryKey: quizQueryKeys.article(variables.articleId, variables.userId),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: quizQueryKeys.root,
        });
      }

      if (result.isRewardPaid) {
        void queryClient.invalidateQueries({
          queryKey: portfolioQueryKeys.myPortfolio,
        });
      }
    },
  });
}
