import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  hashAuthToken,
  verifyAuthToken,
} from "../../lib/auth";
import {
  getCachedEducationArticle,
  getCachedEducationSummaries,
} from "../../lib/education";
import { prisma } from "../../lib/prisma";

const EDUCATION_PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
};

type ArticleCompletionRequestBody = {
  user_id?: unknown;
  userId?: unknown;
  article_id?: unknown;
  articleId?: unknown;
  progress_rate?: unknown;
  progressRate?: unknown;
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

function parseProgressRate(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.floor(parsedValue)));
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
    const articleId = parsePositiveInteger(searchParams.get("id"));
    const level = parsePositiveInteger(searchParams.get("level"));
    const educationSummaryId = parsePositiveInteger(
      searchParams.get("education_summary_id") ??
        searchParams.get("educationSummaryId"),
    );

    if (
      searchParams.has("id") ||
      searchParams.has("level") ||
      searchParams.has("education_summary_id") ||
      searchParams.has("educationSummaryId")
    ) {
      if (!articleId || (!educationSummaryId && !level)) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_ARTICLE_QUERY",
          },
          { status: 400 },
        );
      }

      const article = educationSummaryId
        ? await prisma.article.findFirst({
            where: {
              id: articleId,
              educationSummaryId,
            },
            select: {
              id: true,
              educationSummaryId: true,
              title: true,
              content: true,
              imageUrl: true,
              sortOrder: true,
              educationSummary: {
                select: {
                  stage: true,
                  title: true,
                },
              },
            },
          })
        : await getCachedEducationArticle(articleId, level ?? 0);

      if (!article) {
        return NextResponse.json(
          {
            ok: false,
            error: "ARTICLE_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          data: article,
        },
        {
          headers: EDUCATION_PUBLIC_CACHE_HEADERS,
        },
      );
    }

    const educationSummaries = await getCachedEducationSummaries();

    return NextResponse.json(
      {
        ok: true,
        data: educationSummaries,
      },
      {
        headers: EDUCATION_PUBLIC_CACHE_HEADERS,
      },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EDUCATION_CONTENT_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "EDUCATION_CONTENT_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ArticleCompletionRequestBody;
    const userId = parseRequiredPositiveBigInt(body.user_id ?? body.userId);
    const articleId = parseRequiredPositiveInteger(
      body.article_id ?? body.articleId,
    );
    const progressRate = parseProgressRate(
      body.progress_rate ?? body.progressRate,
    );

    if (!userId || !articleId || progressRate === null) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ARTICLE_COMPLETION_QUERY" },
        { status: 400 },
      );
    }

    const userValidationResponse = await validateRequestedUser(request, userId);

    if (userValidationResponse) {
      return userValidationResponse;
    }

    const existingCompletion = await prisma.userArticleCompletion.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      select: {
        progressRate: true,
        isCompleted: true,
        completedAt: true,
      },
    });

    const nextProgressRate = Math.max(
      existingCompletion?.progressRate ?? 0,
      progressRate,
    );
    const nextIsCompleted =
      existingCompletion?.isCompleted === true || nextProgressRate >= 90;
    const nextCompletedAt =
      existingCompletion?.completedAt ??
      (nextIsCompleted ? new Date() : null);

    const completion = await prisma.userArticleCompletion.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      create: {
        userId,
        articleId,
        progressRate: nextProgressRate,
        isCompleted: nextIsCompleted,
        completedAt: nextCompletedAt,
      },
      update: {
        progressRate: nextProgressRate,
        isCompleted: nextIsCompleted,
        completedAt: nextCompletedAt,
      },
      select: {
        progressRate: true,
        isCompleted: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: completion,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "ARTICLE_COMPLETION_SAVE_FAILED"
        : error instanceof Error
        ? error.message
        : "ARTICLE_COMPLETION_SAVE_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
