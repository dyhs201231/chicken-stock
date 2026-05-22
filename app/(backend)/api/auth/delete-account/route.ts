import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { prisma } from "@/app/(backend)/lib/prisma";

export const runtime = "nodejs";

function getAuthenticatedUserId(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(accessToken, "access");

    return BigInt(payload.sub);
  } catch {
    return null;
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    }),
    prisma.user.deleteMany({
      where: {
        id: userId,
      },
    }),
  ]);

  const response = NextResponse.json({ ok: true });

  clearAuthCookies(response);

  return response;
}
