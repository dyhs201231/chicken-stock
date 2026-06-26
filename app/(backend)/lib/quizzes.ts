import type {
  QuizContentData,
  QuizSubmissionData,
} from "@/app/(frontend)/components/edu/quizzes/quiz-content";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

const QUIZ_CONTENT_REVALIDATE_SECONDS = 60 * 10;

export function selectQuizFields() {
  return {
    id: true,
    educationLevelId: true,
    articleId: true,
    quizType: true,
    question: true,
    description: true,
    optionText: true,
  } as const;
}

export function serializeQuizSubmission(submission: {
  answeredAt: Date | null;
  isCorrect: boolean;
  isSkip: boolean;
  selectedAnswer: string;
}): QuizSubmissionData {
  return {
    answeredAt: submission.answeredAt?.toISOString() ?? null,
    isCorrect: submission.isCorrect,
    isSkip: submission.isSkip,
    selectedAnswer: submission.selectedAnswer,
  };
}

export const getCachedArticleQuizzes = unstable_cache(
  async (articleId: number): Promise<QuizContentData[]> => {
    if (articleId <= 0) {
      return [];
    }

    return prisma.quiz.findMany({
      where: { articleId },
      orderBy: { id: "asc" },
      select: selectQuizFields(),
    });
  },
  ["article-quizzes"],
  {
    revalidate: QUIZ_CONTENT_REVALIDATE_SECONDS,
  },
);

export async function getArticleQuizzes(
  articleId: number,
  userId?: bigint,
): Promise<QuizContentData[]> {
  if (articleId <= 0) {
    return [];
  }

  if (!userId) {
    return getCachedArticleQuizzes(articleId);
  }

  const [quizzes, submissions] = await Promise.all([
    getCachedArticleQuizzes(articleId),
    prisma.userQuizSubmission.findMany({
      where: {
        userId,
        quiz: {
          articleId,
        },
      },
      select: {
        answeredAt: true,
        isCorrect: true,
        isSkip: true,
        quizId: true,
        selectedAnswer: true,
      },
    }),
  ]);
  const submissionByQuizId = new Map(
    submissions.map((submission) => [submission.quizId, submission]),
  );

  return quizzes.map((quiz) => {
    const submission = submissionByQuizId.get(quiz.id);

    return {
      ...quiz,
      submission: submission ? serializeQuizSubmission(submission) : null,
    };
  }) satisfies QuizContentData[];
}

export async function getArticleQuizProgress(articleId: number, userId: bigint) {
  const quizzes = await getArticleQuizzes(articleId, userId);
  const isCorrect = quizzes.some((quiz) => quiz.submission?.isCorrect === true);

  return {
    isCorrect,
    quizzes,
  };
}
