import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { rotateAuthSession } from "@/app/(backend)/lib/auth-session";
import { prisma } from "@/app/(backend)/lib/prisma";

export const runtime = "nodejs";

const userSelect = {
  createdAt: true,
  currentLevel: true,
  currentStep: true,
  email: true,
  id: true,
  investmentType: true,
  name: true,
  profileImageUrl: true,
  totalSteps: true,
  type: true,
  updatedAt: true,
} as const;

type UserForMyInfo = {
  createdAt: Date;
  currentLevel: number | null;
  currentStep: number | null;
  email: string | null;
  id: bigint;
  investmentType: string | null;
  name: string;
  profileImageUrl: string | null;
  totalSteps: number | null;
  type: string;
  updatedAt: Date;
};

function serializeUser(user: UserForMyInfo) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    id: user.id.toString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function createLoggedOutResponse(options?: { clearCookies?: boolean }) {
  const response = NextResponse.json({
    isLoggedIn: false,
    user: null,
  });

  if (options?.clearCookies) {
    clearAuthCookies(response);
  }

  return response;
}

function createLoggedInResponse(user: UserForMyInfo) {
  return NextResponse.json({
    isLoggedIn: true,
    user: serializeUser(user),
  });
}

async function findUserByTokenPayload(payload: { sub: string }) {
  return prisma.user.findUnique({
    select: userSelect,
    where: {
      id: BigInt(payload.sub),
    },
  });
}

async function getUserFromAccessToken(accessToken: string | undefined) {
  if (!accessToken) {
    return null;
  }

  const payload = verifyAuthToken(accessToken, "access");

  return findUserByTokenPayload(payload);
}

async function getUserFromRefreshToken(
  request: NextRequest,
  refreshToken: string | undefined,
) {
  if (!refreshToken) {
    return null;
  }

  return rotateAuthSession(refreshToken, request);
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  const shouldClearCookies = Boolean(accessToken || refreshToken);

  try {
    const user = await getUserFromAccessToken(accessToken);

    if (user) {
      return createLoggedInResponse(user);
    }
  } catch {
    // Access token 만료/오염은 refresh token으로 한 번 더 판단한다.
  }

  try {
    const session = await getUserFromRefreshToken(request, refreshToken);

    if (!session) {
      return createLoggedOutResponse({ clearCookies: shouldClearCookies });
    }

    const response = createLoggedInResponse(session.user);

    setAuthCookies(response, session.tokens);

    return response;
  } catch {
    return createLoggedOutResponse({ clearCookies: shouldClearCookies });
  }
}
