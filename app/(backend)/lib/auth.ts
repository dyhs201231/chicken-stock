import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
export const AUTH_RETURN_TO_COOKIE_NAME = "auth_return_to";

export type AuthTokenType = "access" | "refresh";

export type AuthTokenPayload = {
  email?: string;
  exp: number;
  iat: number;
  jti?: string;
  sub: string;
  tokenType: AuthTokenType;
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

type AuthenticatedUser = {
  email: string | null;
  id: bigint | number | string;
};

export class AuthTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthTokenError";
  }
}

const DEFAULT_ACCESS_TOKEN_EXPIRES_SECONDS = 60 * 15;
const DEFAULT_REFRESH_TOKEN_EXPIRES_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT",
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}

function getJwtSecret() {
  return getRequiredEnv("AUTH_JWT_SECRET");
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getAccessTokenMaxAge() {
  return parsePositiveInt(
    process.env.AUTH_ACCESS_TOKEN_EXPIRES_SECONDS,
    DEFAULT_ACCESS_TOKEN_EXPIRES_SECONDS,
  );
}

export function getRefreshTokenMaxAge() {
  return parsePositiveInt(
    process.env.AUTH_REFRESH_TOKEN_EXPIRES_SECONDS,
    DEFAULT_REFRESH_TOKEN_EXPIRES_SECONDS,
  );
}

function base64UrlEncode(value: Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;

  return buffer.toString("base64url");
}

function createSignature(encodedHeader: string, encodedPayload: string) {
  return createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
}

function signAuthToken(
  payload: Omit<AuthTokenPayload, "exp" | "iat">,
  expiresInSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(TOKEN_HEADER));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createSignature(encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTokenPayload(encodedPayload: string) {
  let payload: unknown;

  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    throw new AuthTokenError("INVALID_TOKEN_PAYLOAD");
  }

  if (!isRecord(payload)) {
    throw new AuthTokenError("INVALID_TOKEN_PAYLOAD");
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    (payload.tokenType !== "access" && payload.tokenType !== "refresh")
  ) {
    throw new AuthTokenError("INVALID_TOKEN_PAYLOAD");
  }

  if (payload.email !== undefined && typeof payload.email !== "string") {
    throw new AuthTokenError("INVALID_TOKEN_PAYLOAD");
  }

  if (payload.jti !== undefined && typeof payload.jti !== "string") {
    throw new AuthTokenError("INVALID_TOKEN_PAYLOAD");
  }

  return payload as AuthTokenPayload;
}

export function verifyAuthToken(
  token: string,
  expectedTokenType?: AuthTokenType,
) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new AuthTokenError("INVALID_TOKEN");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createSignature(encodedHeader, encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new AuthTokenError("INVALID_TOKEN_SIGNATURE");
  }

  const payload = parseTokenPayload(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new AuthTokenError("TOKEN_EXPIRED");
  }

  if (expectedTokenType && payload.tokenType !== expectedTokenType) {
    throw new AuthTokenError("INVALID_TOKEN_TYPE");
  }

  return payload;
}

export function createAccessToken(user: AuthenticatedUser) {
  const sub = user.id.toString();
  const email = user.email ?? undefined;

  return signAuthToken(
    {
      email,
      sub,
      tokenType: "access",
    },
    getAccessTokenMaxAge(),
  );
}

export function createRefreshToken(user: AuthenticatedUser) {
  const sub = user.id.toString();
  const email = user.email ?? undefined;

  return signAuthToken(
    {
      email,
      jti: randomBytes(32).toString("hex"),
      sub,
      tokenType: "refresh",
    },
    getRefreshTokenMaxAge(),
  );
}

export function createAuthTokenPair(user: AuthenticatedUser): AuthTokenPair {
  return {
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
}

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + getRefreshTokenMaxAge() * 1000);
}

function getCookieSecure() {
  const configured = process.env.AUTH_COOKIE_SECURE?.toLowerCase();

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

function getCookieSameSite(): "lax" | "none" | "strict" {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();

  if (
    configured === "lax" ||
    configured === "none" ||
    configured === "strict"
  ) {
    return configured;
  }

  return "lax";
}

function getCookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN || undefined;
}

function getCookieOptions(maxAge: number) {
  return {
    domain: getCookieDomain(),
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: getCookieSameSite(),
    secure: getCookieSecure(),
  };
}

export function setAuthCookies(response: NextResponse, tokens: AuthTokenPair) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE_NAME,
    tokens.accessToken,
    getCookieOptions(getAccessTokenMaxAge()),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE_NAME,
    tokens.refreshToken,
    getCookieOptions(getRefreshTokenMaxAge()),
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "", getCookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, "", getCookieOptions(0));
}
