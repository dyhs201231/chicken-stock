import type { NextRequest } from "next/server";
import {
  type AuthTokenPair,
  createAuthTokenPair,
  getRefreshTokenExpiresAt,
  hashAuthToken,
  verifyAuthToken,
} from "./auth";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

type SessionUser = {
  email: string | null;
  id: bigint | number | string;
};

function toUserId(id: bigint | number | string) {
  return BigInt(id.toString());
}

function getRequestIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

function getRefreshTokenMetadata(request: NextRequest) {
  return {
    ipAddress: getRequestIpAddress(request),
    userAgent: request.headers.get("user-agent"),
  };
}

async function saveRefreshToken(
  user: SessionUser,
  refreshToken: string,
  request: NextRequest,
) {
  const metadata = getRefreshTokenMetadata(request);

  await prisma.refreshToken.create({
    data: {
      expiresAt: getRefreshTokenExpiresAt(),
      ipAddress: metadata.ipAddress,
      tokenHash: hashAuthToken(refreshToken),
      userAgent: metadata.userAgent,
      userId: toUserId(user.id),
    },
  });
}

export async function createAuthSession(
  user: SessionUser,
  request: NextRequest,
): Promise<AuthTokenPair> {
  const tokens = createAuthTokenPair(user);

  await saveRefreshToken(user, tokens.refreshToken, request);

  return tokens;
}

export async function rotateAuthSession(
  refreshToken: string,
  request: NextRequest,
) {
  const payload = verifyAuthToken(refreshToken, "refresh");
  const tokenHash = hashAuthToken(refreshToken);
  const storedRefreshToken = await prisma.refreshToken.findUnique({
    include: {
      user: true,
    },
    where: {
      tokenHash,
    },
  });
  const now = new Date();

  if (
    !storedRefreshToken ||
    storedRefreshToken.userId !== toUserId(payload.sub) ||
    storedRefreshToken.revokedAt ||
    storedRefreshToken.expiresAt <= now
  ) {
    throw new Error("INVALID_REFRESH_TOKEN_SESSION");
  }

  const tokens = createAuthTokenPair(storedRefreshToken.user);
  const metadata = getRefreshTokenMetadata(request);

  await prisma.$transaction([
    prisma.refreshToken.update({
      data: {
        revokedAt: now,
      },
      where: {
        id: storedRefreshToken.id,
      },
    }),
    prisma.refreshToken.create({
      data: {
        expiresAt: getRefreshTokenExpiresAt(),
        ipAddress: metadata.ipAddress,
        tokenHash: hashAuthToken(tokens.refreshToken),
        userAgent: metadata.userAgent,
        userId: storedRefreshToken.userId,
      },
    }),
  ]);

  return {
    tokens,
    user: storedRefreshToken.user,
  };
}

export async function cleanupRefreshTokenSession(
  refreshTokens: string | string[] | undefined,
) {
  const now = new Date();
  const tokenHashes = Array.from(
    new Set(
      (Array.isArray(refreshTokens) ? refreshTokens : [refreshTokens])
        .filter((refreshToken): refreshToken is string => Boolean(refreshToken))
        .map(hashAuthToken),
    ),
  );
  const cleanupTargets: Prisma.RefreshTokenWhereInput[] = [
    { revokedAt: { not: null } },
    { expiresAt: { lte: now } },
  ];

  if (tokenHashes.length > 0) {
    cleanupTargets.push({ tokenHash: { in: tokenHashes } });
  }

  return prisma.refreshToken.deleteMany({
    where: {
      OR: cleanupTargets,
    },
  });
}
