import "server-only";

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  hashAuthToken,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { prisma } from "@/app/(backend)/lib/prisma";
import { cookies } from "next/headers";

const authUserSelect = {
  email: true,
  id: true,
  name: true,
  type: true,
} as const;

function toUserId(value: string) {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

async function findUserById(userId: bigint) {
  return prisma.user.findUnique({
    select: authUserSelect,
    where: {
      id: userId,
    },
  });
}

async function getUserFromAccessToken(accessToken: string | undefined) {
  if (!accessToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(accessToken, "access");
    const userId = toUserId(payload.sub);

    if (!userId) {
      return null;
    }

    return findUserById(userId);
  } catch {
    return null;
  }
}

async function getUserFromRefreshToken(refreshToken: string | undefined) {
  if (!refreshToken) {
    return null;
  }

  try {
    const payload = verifyAuthToken(refreshToken, "refresh");
    const userId = toUserId(payload.sub);

    if (!userId) {
      return null;
    }

    const storedRefreshToken = await prisma.refreshToken.findUnique({
      select: {
        expiresAt: true,
        revokedAt: true,
        user: {
          select: authUserSelect,
        },
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

    return storedRefreshToken.user;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  return (
    (await getUserFromAccessToken(accessToken)) ||
    (await getUserFromRefreshToken(refreshToken))
  );
}

export async function authCheck() {
  return getCurrentUser();
}
