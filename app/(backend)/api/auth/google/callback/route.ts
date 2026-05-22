import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_RETURN_TO_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  setAuthCookies,
} from "@/app/(backend)/lib/auth";
import { createAuthSession } from "@/app/(backend)/lib/auth-session";
import { prisma } from "@/app/(backend)/lib/prisma";

export const runtime = "nodejs";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

function getGoogleRedirectUri(request: NextRequest) {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    new URL("/api/auth/google/callback", request.nextUrl.origin).toString()
  );
}

function getConfiguredRedirectUrl(
  request: NextRequest,
  envName: string,
  fallbackPath: string,
) {
  const configured = process.env[envName] || fallbackPath;

  return new URL(configured, request.nextUrl.origin);
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(AUTH_RETURN_TO_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function redirectToFailure(request: NextRequest, reason: string) {
  const url = getConfiguredRedirectUrl(
    request,
    "AUTH_FAILURE_REDIRECT_URL",
    "/?auth=failed",
  );

  url.searchParams.set("auth_error", reason);

  const response = NextResponse.redirect(url);
  clearOAuthCookies(response);

  return response;
}

function getSuccessRedirectUrl(request: NextRequest) {
  const returnTo = request.cookies.get(AUTH_RETURN_TO_COOKIE_NAME)?.value;

  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return new URL(returnTo, request.nextUrl.origin);
  }

  return getConfiguredRedirectUrl(request, "AUTH_SUCCESS_REDIRECT_URL", "/");
}

async function exchangeCodeForAccessToken(request: NextRequest, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth 환경변수가 필요합니다.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getGoogleRedirectUri(request),
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "TOKEN_EXCHANGE_FAILED",
    );
  }

  return data.access_token;
}

async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("GOOGLE_USERINFO_FAILED");
  }

  return (await response.json()) as GoogleUserInfo;
}

async function findOrCreateUser(profile: GoogleUserInfo) {
  if (!profile.email || profile.email_verified === false) {
    throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: profile.email,
    },
  });

  if (existingUser) {
    return prisma.user.update({
      data: {
        name: profile.name || existingUser.name,
        profileImageUrl: profile.picture || existingUser.profileImageUrl,
      },
      where: {
        id: existingUser.id,
      },
    });
  }

  return prisma.user.create({
    data: {
      currentLevel: 1,
      currentStep: 1,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      profileImageUrl: profile.picture || null,
      totalSteps: 0,
      type: "NORMAL",
    },
  });
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return redirectToFailure(request, error);
  }

  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value;

  if (!state || !savedState || state !== savedState) {
    return redirectToFailure(request, "invalid_state");
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return redirectToFailure(request, "missing_code");
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(request, code);
    const profile = await getGoogleUserInfo(accessToken);
    const user = await findOrCreateUser(profile);
    const response = NextResponse.redirect(getSuccessRedirectUrl(request));
    const tokens = await createAuthSession(user, request);

    setAuthCookies(response, tokens);
    clearOAuthCookies(response);

    return response;
  } catch (authError) {
    console.error(authError);

    return redirectToFailure(request, "google_login_failed");
  }
}
