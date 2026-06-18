"use client";

import { useSyncExternalStore } from "react";
import { useArticleQuizzesQuery } from "@/app/(frontend)/apis/edu/quizzes/queries";
import QuizInteraction from "../quiz-interaction";
import type { QuizContentData } from "../quiz-content";

type QuizContainerProps = {
  articleId: number;
  initialQuizzes?: QuizContentData[];
  userId?: string;
};

function subscribeToHydration(callback: () => void) {
  const timeoutId = window.setTimeout(callback, 0);

  return () => window.clearTimeout(timeoutId);
}

function getHydratedSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function QuizContainer({
  articleId,
  initialQuizzes,
  userId,
}: QuizContainerProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );
  const {
    data: quizzes = [],
    error,
    isError,
    isLoading,
  } = useArticleQuizzesQuery(articleId, {
    initialData: initialQuizzes,
    userId,
  });

  const displayedQuizzes = isHydrated ? quizzes : initialQuizzes ?? quizzes;
  const currentQuiz = displayedQuizzes[0];
  let errorMessage = "퀴즈를 불러오지 못했어요.";

  if (error instanceof Error) {
    errorMessage = error.message;
  }

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
        {articleId <= 0 && "올바르지 않은 퀴즈 경로예요."}
        {articleId > 0 && errorMessage}
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
