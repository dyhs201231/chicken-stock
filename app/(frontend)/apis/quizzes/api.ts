import type { QuizContentData } from "../../components/quizzes/quiz-content";

export type QuizResponse =
  | {
      ok: true;
      data: {
        source: "ARTICLE" | "SKIPPED" | "CURRENT_STEP";
        currentLevel?: number;
        currentStep?: number;
        quizzes: QuizContentData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

export type SubmitQuizAnswerResponse =
  | {
    ok: true;
    data: {
      answer: string;
      isCorrect: boolean;
      explanation: string;
    };
    }
  | {
      ok: false;
      error: string;
    };

type ArticleQuizProgressResponse =
  | {
      ok: true;
      data: {
        source: "ARTICLE_PROGRESS";
        isCorrect: boolean;
      };
    }
  | {
      ok: false;
      error: string;
    };

type SubmitQuizAnswerParams = {
  quizId: number;
  userAnswer: string;
  userId: string;
};

export async function fetchQuizzesByArticleId(articleId: number) {
  const response = await fetch(`/api/quizzes?articleId=${articleId}`);
  const result = (await response.json()) as QuizResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "QUIZ_FETCH_FAILED" : result.error);
  }

  return result.data.quizzes;
}

export async function fetchArticleQuizProgress(
  articleId: string,
  userId: string,
  origin: string,
) {
  const url = new URL("/api/quizzes", origin);
  url.searchParams.set("articleId", articleId);
  url.searchParams.set("userId", userId);

  const response = await fetch(url, { cache: "no-store" });
  const result = (await response.json()) as ArticleQuizProgressResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "QUIZ_PROGRESS_FETCH_FAILED" : result.error);
  }

  return result.data;
}

export async function submitQuizAnswer({
  quizId,
  userAnswer,
  userId,
}: SubmitQuizAnswerParams) {
  const response = await fetch("/api/quizzes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quizId,
      userAnswer,
      userId,
    }),
  });
  const result = (await response.json()) as SubmitQuizAnswerResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "QUIZ_SUBMISSION_FAILED" : result.error);
  }

  return result.data;
}
