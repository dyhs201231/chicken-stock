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

  await prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUnique({
      select: {
        id: true,
      },
      where: {
        userId,
      },
    });
    const orderIds = portfolio
      ? (
          await tx.tradeOrder.findMany({
            select: {
              orderId: true,
            },
            where: {
              portfolioId: portfolio.id,
            },
          })
        ).map((order) => order.orderId)
      : [];

    if (orderIds.length > 0) {
      await tx.tradeExecution.deleteMany({
        where: {
          OR: [
            {
              buyOrderId: {
                in: orderIds,
              },
            },
            {
              sellOrderId: {
                in: orderIds,
              },
            },
          ],
        },
      });
      await tx.agentDecisionLog.deleteMany({
        where: {
          OR: [
            {
              agentUserId: userId,
            },
            {
              executedOrderId: {
                in: orderIds,
              },
            },
          ],
        },
      });
    } else {
      await tx.agentDecisionLog.deleteMany({
        where: {
          agentUserId: userId,
        },
      });
    }

    await tx.agentStockSector.deleteMany({
      where: {
        userId,
      },
    });
    await tx.agent.deleteMany({
      where: {
        userId,
      },
    });

    if (portfolio) {
      await tx.portfolioDividend.deleteMany({
        where: {
          portfolioId: portfolio.id,
        },
      });
      await tx.portfolioTransaction.deleteMany({
        where: {
          portfolioId: portfolio.id,
        },
      });
      await tx.tradeOrder.deleteMany({
        where: {
          portfolioId: portfolio.id,
        },
      });
      await tx.portfolioItem.deleteMany({
        where: {
          portfolioId: portfolio.id,
        },
      });
      await tx.portfolio.deleteMany({
        where: {
          id: portfolio.id,
        },
      });
    }

    await tx.userQuizSubmission.deleteMany({
      where: {
        userId,
      },
    });
    await tx.userEducationLevelProgress.deleteMany({
      where: {
        userId,
      },
    });
    await tx.userArticleCompletion.deleteMany({
      where: {
        userId,
      },
    });
    await tx.refreshToken.deleteMany({
      where: {
        userId,
      },
    });
    await tx.user.deleteMany({
      where: {
        id: userId,
      },
    });
  });

  const response = NextResponse.json({ ok: true });

  clearAuthCookies(response);

  return response;
}
