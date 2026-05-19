import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  clearAuthCookies,
} from "@/app/(backend)/lib/auth";
import { cleanupRefreshTokenSession } from "@/app/(backend)/lib/auth-session";

export const runtime = "nodejs";

function getCookieValuesFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .flatMap((cookie) => {
      const separatorIndex = cookie.indexOf("=");

      if (separatorIndex <= 0) {
        return [];
      }

      if (cookie.slice(0, separatorIndex).trim() !== name) {
        return [];
      }

      return [cookie.slice(separatorIndex + 1).trim()];
    });
}

export async function POST(request: NextRequest) {
  const refreshTokens = getCookieValuesFromHeader(
    request.headers.get("cookie"),
    REFRESH_TOKEN_COOKIE_NAME,
  );
  const response = NextResponse.json({ ok: true });

  await cleanupRefreshTokenSession(refreshTokens);
  clearAuthCookies(response);

  return response;
}
