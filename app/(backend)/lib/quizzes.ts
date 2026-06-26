import type {
  QuizContentData,
  QuizSubmissionData,
} from "@/app/(frontend)/components/edu/quizzes/quiz-content";
import { prisma } from "./prisma";

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

export async function getArticleQuizzes(
  articleId: number,
  userId?: bigint,
): Promise<QuizContentData[]> {
  if (articleId <= 0) {
    return [];
  }

  if (!userId) {
    return prisma.quiz.findMany({
      where: { articleId },
      orderBy: { id: "asc" },
      select: selectQuizFields(),
    });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { articleId },
    orderBy: { id: "asc" },
    select: {
      ...selectQuizFields(),
      submissions: {
        where: {
          userId,
        },
        select: {
          answeredAt: true,
          isCorrect: true,
          isSkip: true,
          selectedAnswer: true,
        },
        take: 1,
      },
    },
  });

  return quizzes.map(({ submissions, ...quiz }) => ({
    ...quiz,
    submission: submissions[0]
      ? serializeQuizSubmission(submissions[0])
      : null,
  })) satisfies QuizContentData[];
}
