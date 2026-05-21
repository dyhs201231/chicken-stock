"use client";

import { useArticleQuizzesQuery } from "@/app/(frontend)/apis/quizzes/queries";
import QuizInteraction from "../quiz-interaction";

type QuizContainerProps = {
  articleId: number;
  userId?: string;
};

export default function QuizContainer({
  articleId,
  userId,
}: QuizContainerProps) {
  const {
    data: quizzes = [],
    error,
    isError,
    isLoading,
  } = useArticleQuizzesQuery(articleId);

  const currentQuiz = quizzes[0];
  const errorMessage =
    error instanceof Error ? error.message : "퀴즈를 불러오지 못했어요.";

  if (isLoading) {
    return (
      <section className="mx-auto flex min-h-96 w-full max-w-6xl flex-col items-center justify-center rounded-3xl bg-white px-16 py-6 text-2xl font-medium text-zinc-500 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
        퀴즈를 불러오는 중이에요.
      </section>
    );
  }

  if (isError || articleId <= 0) {
    return (
      <section className="mx-auto flex min-h-96 w-full max-w-6xl flex-col items-center justify-center rounded-3xl bg-white px-16 py-6 text-center text-2xl font-medium text-rose-600 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
        {articleId <= 0 ? "올바르지 않은 퀴즈 경로예요." : errorMessage}
      </section>
    );
  }

  if (!currentQuiz) {
    return (
      <section className="mx-auto flex min-h-96 w-full max-w-6xl flex-col items-center justify-center rounded-3xl bg-white px-16 py-6 text-center text-2xl font-medium text-zinc-500 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
        아직 이 아티클에 연결된 퀴즈가 없어요.
      </section>
    );
  }

  return (
    <QuizInteraction key={currentQuiz.id} quiz={currentQuiz} userId={userId} />
  );
}
