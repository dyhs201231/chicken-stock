import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  hashAuthToken,
  verifyAuthToken,
} from "../../lib/auth";
import { Prisma } from "../../generated/prisma/client";
import { TransactionType } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  getArticleQuizProgress,
  getArticleQuizzes,
  selectQuizFields,
} from "../../lib/quizzes";

const QUIZ_CORRECT_REWARD_KRW = 10_000;
const QUIZ_REWARD_COMPANY_NAME = "퀴즈 정답 보상";
const QUIZ_PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
};

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parsePositiveBigInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = BigInt(value);

  if (parsedValue <= BigInt(0)) {
    return null;
  }

  return parsedValue;
}

function createQuizRewardTransactionId(userId: bigint, quizId: number) {
  return `quiz-reward-${userId.toString()}-${quizId}`;
}

function normalizeAnswerText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getMultipleChoiceOptionIndex(value: string, optionText: string[]) {
  const normalizedValue = normalizeAnswerText(value);
  const optionIndex = optionText.findIndex(
    (option) => normalizeAnswerText(option) === normalizedValue,
  );

  if (optionIndex >= 0) {
    return optionIndex;
  }

  const indexedAnswerMatch = normalizedValue.match(/^(\d+)\s*(?:번)?[.)]?\s*/);

  if (!indexedAnswerMatch) {
    return null;
  }

  const parsedIndex = Number(indexedAnswerMatch[1]) - 1;

  if (parsedIndex < 0 || parsedIndex >= optionText.length) {
    return null;
  }

  const remainingAnswer = normalizeAnswerText(
    normalizedValue.slice(indexedAnswerMatch[0].length),
  );

  if (
    remainingAnswer.length > 0 &&
    remainingAnswer !== normalizeAnswerText(optionText[parsedIndex])
  ) {
    return null;
  }

  return parsedIndex;
}

function isQuizAnswerCorrect(quiz: {
  answer: string;
  optionText: string[];
  quizType: string;
}, selectedAnswer: string) {
  if (normalizeAnswerText(selectedAnswer) === normalizeAnswerText(quiz.answer)) {
    return true;
  }

  if (quiz.quizType !== "MULTIPLE_CHOICE") {
    return false;
  }

  const selectedOptionIndex = getMultipleChoiceOptionIndex(
    selectedAnswer,
    quiz.optionText,
  );
  const correctOptionIndex = getMultipleChoiceOptionIndex(
    quiz.answer,
    quiz.optionText,
  );

  return (
    selectedOptionIndex !== null && selectedOptionIndex === correctOptionIndex
  );
}

type QuizSubmissionRequestBody = {
  user_id?: unknown;
  userId?: unknown;
  quiz_id?: unknown;
  quizId?: unknown;
  user_answer?: unknown;
  userAnswer?: unknown;
  is_skip?: unknown;
  isSkip?: unknown;
};

function parseRequiredPositiveInteger(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  return parsePositiveInteger(String(value));
}

function parseRequiredPositiveBigInt(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  return parsePositiveBigInt(String(value));
}

function parseOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

async function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  if (accessToken) {
    try {
      const payload = verifyAuthToken(accessToken, "access");

      return BigInt(payload.sub);
    } catch {
      // Refresh token fallback handles expired access tokens.
    }
  }

  if (!refreshToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(refreshToken, "refresh");
    const userId = BigInt(payload.sub);
    const storedRefreshToken = await prisma.refreshToken.findUnique({
      select: {
        expiresAt: true,
        revokedAt: true,
        userId: true,
      },
      where: {
        tokenHash: hashAuthToken(refreshToken),
      },
    });

    if (
      !storedRefreshToken ||
      storedRefreshToken.userId !== userId ||
      storedRefreshToken.revokedAt ||
      storedRefreshToken.expiresAt <= new Date()
    ) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

function createUnauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "AUTHENTICATION_REQUIRED" },
    { status: 401 },
  );
}

function createForbiddenResponse() {
  return NextResponse.json(
    { ok: false, error: "USER_ID_MISMATCH" },
    { status: 403 },
  );
}

async function validateRequestedUser(
  request: NextRequest,
  requestedUserId: bigint,
) {
  const authenticatedUserId = await getAuthenticatedUserId(request);

  if (!authenticatedUserId) {
    return createUnauthorizedResponse();
  }

  if (authenticatedUserId !== requestedUserId) {
    return createForbiddenResponse();
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const articleId = parsePositiveInteger(
      searchParams.get("articleId") ?? searchParams.get("article_id"),
    );
    const userId = parsePositiveBigInt(
      searchParams.get("userId") ?? searchParams.get("user_id"),
    );

    if (
      (searchParams.has("articleId") || searchParams.has("article_id")) &&
      (searchParams.has("userId") || searchParams.has("user_id"))
    ) {
      if (!articleId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_ARTICLE_ID" },
          { status: 400 },
        );
      }

      if (!userId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_USER_ID" },
          { status: 400 },
        );
      }

      const userValidationResponse = await validateRequestedUser(
        request,
        userId,
      );

      if (userValidationResponse) {
        return userValidationResponse;
      }

      const quizProgress = await getArticleQuizProgress(articleId, userId);

      return NextResponse.json({
        ok: true,
        data: {
          source: "ARTICLE_PROGRESS",
          isCorrect: quizProgress.isCorrect,
          quizzes: quizProgress.quizzes,
        },
      });
    }

    if (searchParams.has("articleId") || searchParams.has("article_id")) {
      if (!articleId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_ARTICLE_ID" },
          { status: 400 },
        );
      }

      const quizzes = await getArticleQuizzes(articleId);

      return NextResponse.json(
        {
          ok: true,
          data: {
            source: "ARTICLE",
            quizzes,
          },
        },
        {
          headers: QUIZ_PUBLIC_CACHE_HEADERS,
        },
      );
    }

    if (searchParams.has("userId") || searchParams.has("user_id")) {
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_USER_ID" },
          { status: 400 },
        );
      }

      const userValidationResponse = await validateRequestedUser(
        request,
        userId,
      );

      if (userValidationResponse) {
        return userValidationResponse;
      }

      const skippedSubmissions = await prisma.userQuizSubmission.findMany({
        where: {
          userId,
          isSkip: true,
        },
        orderBy: { answeredAt: "asc" },
        select: {
          quiz: {
            select: selectQuizFields(),
          },
        },
      });

      if (skippedSubmissions.length > 0) {
        return NextResponse.json({
          ok: true,
          data: {
            source: "SKIPPED",
            quizzes: skippedSubmissions.map((submission) => submission.quiz),
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentLevel: true,
          currentStep: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { ok: false, error: "USER_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (!user.currentLevel || !user.currentStep) {
        return NextResponse.json(
          { ok: false, error: "USER_PROGRESS_NOT_FOUND" },
          { status: 404 },
        );
      }

      const quizzes = await prisma.quiz.findMany({
        where: {
          educationLevelId: user.currentLevel,
          articleId: user.currentStep,
        },
        orderBy: { id: "asc" },
        select: selectQuizFields(),
      });

      return NextResponse.json({
        ok: true,
        data: {
          source: "CURRENT_STEP",
          currentLevel: user.currentLevel,
          currentStep: user.currentStep,
          quizzes,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "QUIZ_QUERY_REQUIRED" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "QUIZ_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "QUIZ_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuizSubmissionRequestBody;
    const userId = parseRequiredPositiveBigInt(body.user_id ?? body.userId);
    const quizId = parseRequiredPositiveInteger(body.quiz_id ?? body.quizId);
    const userAnswerValue = body.user_answer ?? body.userAnswer;
    const isSkipValue = body.is_skip ?? body.isSkip;
    const hasUserAnswer =
      typeof userAnswerValue === "string" && userAnswerValue.length > 0;
    const hasIsSkip = isSkipValue !== undefined && isSkipValue !== null;
    const isSkip = hasIsSkip ? parseOptionalBoolean(isSkipValue) : false;

    if (!userId || !quizId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_QUIZ_SUBMISSION_QUERY" },
        { status: 400 },
      );
    }

    const userValidationResponse = await validateRequestedUser(request, userId);

    if (userValidationResponse) {
      return userValidationResponse;
    }

    if (!hasUserAnswer && !hasIsSkip) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_ANSWER_OR_SKIP_REQUIRED" },
        { status: 400 },
      );
    }

    if (hasIsSkip && isSkip === null) {
      return NextResponse.json(
        { ok: false, error: "INVALID_IS_SKIP" },
        { status: 400 },
      );
    }

    if (hasUserAnswer && isSkip === true) {
      return NextResponse.json(
        { ok: false, error: "ANSWER_AND_SKIP_CONFLICT" },
        { status: 400 },
      );
    }

    if (!hasUserAnswer && isSkip !== true) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_ANSWER_OR_SKIP_REQUIRED" },
        { status: 400 },
      );
    }

    const selectedAnswer = hasUserAnswer ? userAnswerValue : "";
    const result = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({
        where: { id: quizId },
        select: {
          answer: true,
          explanation: true,
          optionText: true,
          quizType: true,
        },
      });

      if (!quiz) {
        return null;
      }

      const isCorrect =
        hasUserAnswer && isQuizAnswerCorrect(quiz, selectedAnswer);
      const existingSubmission = await tx.userQuizSubmission.findUnique({
        where: {
          userId_quizId: {
            userId,
            quizId,
          },
        },
        select: {
          answeredAt: true,
          isCorrect: true,
          isSkip: true,
          selectedAnswer: true,
        },
      });
      const alreadyCorrect = existingSubmission?.isCorrect === true;
      const answeredAt = new Date();
      const nextSelectedAnswer = alreadyCorrect
        ? existingSubmission.selectedAnswer
        : selectedAnswer;
      const nextIsSkip = alreadyCorrect
        ? existingSubmission.isSkip
        : (isSkip ?? false);
      const nextIsCorrect = alreadyCorrect || isCorrect;
      const nextAnsweredAt =
        existingSubmission?.answeredAt ?? (isCorrect ? answeredAt : null);

      const submission = await tx.userQuizSubmission.upsert({
        where: {
          userId_quizId: {
            userId,
            quizId,
          },
        },
        create: {
          userId,
          quizId,
          selectedAnswer,
          isSkip: isSkip ?? false,
          isCorrect,
          answeredAt: isCorrect ? answeredAt : null,
        },
        update: {
          selectedAnswer: nextSelectedAnswer,
          isSkip: nextIsSkip,
          isCorrect: nextIsCorrect,
          answeredAt: nextAnsweredAt,
        },
        select: {
          answeredAt: true,
          isCorrect: true,
          isSkip: true,
          selectedAnswer: true,
        },
      });
      let isRewardPaid = false;

      if (hasUserAnswer && isCorrect && !alreadyCorrect) {
        const portfolio = await tx.portfolio.findUnique({
          where: {
            userId,
          },
          select: {
            id: true,
          },
        });

        if (portfolio) {
          const rewardAmount = new Prisma.Decimal(QUIZ_CORRECT_REWARD_KRW);
          const rewardTransaction = await tx.portfolioTransaction.createMany({
            data: [
              {
                companyName: QUIZ_REWARD_COMPANY_NAME,
                executedAt: answeredAt,
                fee: new Prisma.Decimal(0),
                id: createQuizRewardTransactionId(userId, quizId),
                portfolioId: portfolio.id,
                receivedAmount: rewardAmount,
                totalAmount: rewardAmount,
                totalQuantity: 0,
                transactionType: TransactionType.DEPOSIT,
                withdrawalAt: answeredAt,
              },
            ],
            skipDuplicates: true,
          });

          if (rewardTransaction.count > 0) {
            await tx.portfolio.update({
              data: {
                krwBalance: {
                  increment: rewardAmount,
                },
                totalAvailableOrderAmount: {
                  increment: rewardAmount,
                },
                totalBalance: {
                  increment: rewardAmount,
                },
              },
              where: {
                id: portfolio.id,
              },
            });
            isRewardPaid = true;
          }
        }
      }

      return {
        answer: quiz.answer,
        explanation: quiz.explanation,
        isRewardPaid,
        submission,
      };
    });

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (hasUserAnswer) {
      return NextResponse.json({
        ok: true,
        data: {
          answer: result.answer,
          explanation: result.explanation,
          isCorrect: result.submission.isCorrect,
          isRewardPaid: result.isRewardPaid,
          rewardAmountKrw: QUIZ_CORRECT_REWARD_KRW,
          selectedAnswer: result.submission.selectedAnswer,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        isSkip: result.submission.isSkip,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "QUIZ_SUBMISSION_FAILED"
        : error instanceof Error
        ? error.message
        : "QUIZ_SUBMISSION_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
