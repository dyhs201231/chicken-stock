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

export async function fetchQuizzesByArticleId(articleId: number) {
  const response = await fetch(`/api/quizzes?articleId=${articleId}`);
  const result = (await response.json()) as QuizResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "QUIZ_FETCH_FAILED" : result.error);
  }

  return result.data.quizzes;
}
