import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  hashAuthToken,
  verifyAuthToken,
} from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

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

export async function GET(request: NextRequest) {
  try {
    const requestedUserId = parsePositiveBigInt(
      request.nextUrl.searchParams.get("userId") ??
        request.nextUrl.searchParams.get("user_id"),
    );

    if (!requestedUserId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_USER_QUERY" },
        { status: 400 },
      );
    }

    const authenticatedUserId = await getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return createUnauthorizedResponse();
    }

    if (authenticatedUserId !== requestedUserId) {
      return createForbiddenResponse();
    }

    const completions = await prisma.userArticleCompletion.findMany({
      where: {
        userId: requestedUserId,
      },
      select: {
        articleId: true,
        progressRate: true,
        isCompleted: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: completions,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EDUCATION_PROGRESS_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "EDUCATION_PROGRESS_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
