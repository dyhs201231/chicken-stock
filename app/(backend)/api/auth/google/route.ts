import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_RETURN_TO_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/app/(backend)/lib/auth";

export const runtime = "nodejs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

function getGoogleRedirectUri(request: NextRequest) {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    new URL("/api/auth/google/callback", request.nextUrl.origin).toString()
  );
}

function normalizeReturnTo(value: string | null, origin: string) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value, origin);

    if (url.origin !== origin) {
      return undefined;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

function getOAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { message: "GOOGLE_CLIENT_ID 환경변수가 필요합니다." },
      { status: 500 },
    );
  }

  const state = randomBytes(32).toString("hex");
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
    request.nextUrl.origin,
  );
  const googleAuthUrl = new URL(GOOGLE_AUTH_URL);

  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleAuthUrl);

  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
    state,
    getOAuthCookieOptions(OAUTH_STATE_MAX_AGE_SECONDS),
  );

  if (returnTo) {
    response.cookies.set(
      AUTH_RETURN_TO_COOKIE_NAME,
      returnTo,
      getOAuthCookieOptions(OAUTH_STATE_MAX_AGE_SECONDS),
    );
  } else {
    response.cookies.set(
      AUTH_RETURN_TO_COOKIE_NAME,
      "",
      getOAuthCookieOptions(0),
    );
  }

  return response;
}
