import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  setAuthCookies,
} from "@/app/(backend)/lib/auth";
import { rotateAuthSession } from "@/app/(backend)/lib/auth-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: "Refresh token이 없습니다." },
      { status: 401 },
    );
  }

  try {
    const { tokens } = await rotateAuthSession(refreshToken, request);
    const response = NextResponse.json({ ok: true });

    setAuthCookies(response, tokens);

    return response;
  } catch {
    const response = NextResponse.json(
      { message: "Refresh token이 유효하지 않습니다." },
      { status: 401 },
    );

    clearAuthCookies(response);

    return response;
  }
}
