import { requests } from "../../request";
import type { QuizContentData } from "../../../components/edu/quizzes/quiz-content";

export type QuizResponse =
  | {
      ok: true;
      data:
        | {
            source: "ARTICLE" | "SKIPPED" | "CURRENT_STEP";
            currentLevel?: number;
            currentStep?: number;
            quizzes: QuizContentData[];
          }
        | {
            source: "ARTICLE_PROGRESS";
            isCorrect: boolean;
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
        explanation: string;
        isCorrect: boolean;
        isRewardPaid: boolean;
        rewardAmountKrw: number;
        selectedAnswer: string;
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
        currentLevel?: number;
        currentStep?: number;
        isCorrect: boolean;
        quizzes: QuizContentData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

type SubmitQuizAnswerParams = {
  articleId?: number;
  quizId: number;
  userAnswer: string;
  userId: string;
};

export async function fetchQuizzesByArticleId(
  articleId: number,
  userId?: string,
) {
  const { data } = await requests.get<QuizResponse>("/api/quizzes", {
    params: {
      articleId,
      ...(userId ? { userId } : {}),
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.quizzes;
}

export async function fetchArticleQuizProgress(
  articleId: string,
  userId: string,
  origin: string,
  cookieHeader?: string | null,
) {
  const url = new URL("/api/quizzes", origin);
  url.searchParams.set("articleId", articleId);
  url.searchParams.set("userId", userId);

  const { data } = await requests.get<ArticleQuizProgressResponse>(
    url.toString(),
    cookieHeader
      ? {
          headers: {
            Cookie: cookieHeader,
          },
        }
      : undefined,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function submitQuizAnswer({
  quizId,
  userAnswer,
  userId,
}: SubmitQuizAnswerParams) {
  const { data } = await requests.post<SubmitQuizAnswerResponse>(
    "/api/quizzes",
    {
      quizId,
      userAnswer,
      userId,
    },
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}
