import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import {
  EXCHANGE_RATE,
  getTotalAvailableOrderAmountKrw,
} from "@/app/(backend)/lib/portfolio-balance";
import { prisma } from "@/app/(backend)/lib/prisma";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import { TransactionType } from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const exchangeTypes = new Set(["krwToUsd", "usdToKrw"]);

type ExchangeType = "krwToUsd" | "usdToKrw";

class PortfolioExchangeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExchangeType(value: unknown): value is ExchangeType {
  return typeof value === "string" && exchangeTypes.has(value);
}

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

function parseExchangeValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const exchangeValue = new Prisma.Decimal(value).toDecimalPlaces(2);

  return exchangeValue.lte(0) ? null : exchangeValue;
}

async function getExchangePayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isExchangeType(body.type)) {
    return null;
  }

  const value = parseExchangeValue(body.value);

  if (!value) {
    return null;
  }

  return {
    type: body.type,
    value,
  };
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function createPortfolioTransactionId() {
  return randomUUID();
}

function getExchangedValue(type: ExchangeType, value: Prisma.Decimal) {
  const exchangeRate = new Prisma.Decimal(EXCHANGE_RATE);

  return type === "krwToUsd"
    ? value.div(exchangeRate).toDecimalPlaces(2)
    : value.mul(exchangeRate).toDecimalPlaces(2);
}

function getExchangeCompanyName(type: ExchangeType) {
  return type === "krwToUsd" ? "달러 환전" : "원화 환전";
}

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const payload = await getExchangePayload(request);

  if (!payload) {
    return NextResponse.json(
      { message: "유효한 환전 금액이 필요합니다." },
      { status: 400 },
    );
  }

  const exchangedValue = getExchangedValue(payload.type, payload.value);

  try {
    const portfolio = await prisma.$transaction(async (tx) => {
      const currentPortfolio = await tx.portfolio.findUnique({
        select: {
          id: true,
        },
        where: {
          userId,
        },
      });

      if (!currentPortfolio) {
        throw new PortfolioExchangeError("계좌가 없습니다.", 404);
      }

      const updateResult = await tx.portfolio.updateMany({
        data:
          payload.type === "krwToUsd"
            ? {
                krwBalance: {
                  decrement: payload.value,
                },
                usdBalance: {
                  increment: exchangedValue,
                },
              }
            : {
                krwBalance: {
                  increment: exchangedValue,
                },
                usdBalance: {
                  decrement: payload.value,
                },
              },
        where:
          payload.type === "krwToUsd"
            ? {
                id: currentPortfolio.id,
                krwBalance: {
                  gte: payload.value,
                },
              }
            : {
                id: currentPortfolio.id,
                usdBalance: {
                  gte: payload.value,
                },
              },
      });

      if (updateResult.count === 0) {
        throw new PortfolioExchangeError("환전 가능 금액이 부족합니다.", 400);
      }

      const executedAt = new Date();

      await tx.portfolioTransaction.create({
        data: {
          companyName: getExchangeCompanyName(payload.type),
          exchangeRate: new Prisma.Decimal(EXCHANGE_RATE),
          exchangeType: payload.type,
          executedAt,
          fee: new Prisma.Decimal(0),
          id: createPortfolioTransactionId(),
          paidAmount: payload.value,
          portfolioId: currentPortfolio.id,
          receivedAmount: exchangedValue,
          totalAmount: payload.value,
          totalQuantity: 0,
          transactionType: TransactionType.EXCHANGE,
          withdrawalAt: executedAt,
        },
      });

      const updatedPortfolio = await tx.portfolio.findUnique({
        select: {
          id: true,
          krwBalance: true,
          totalBalance: true,
          usdBalance: true,
        },
        where: {
          id: currentPortfolio.id,
        },
      });

      if (!updatedPortfolio) {
        throw new PortfolioExchangeError("계좌가 없습니다.", 404);
      }

      return updatedPortfolio;
    });

    return NextResponse.json({
      ok: true,
      exchangeRate: EXCHANGE_RATE,
      paidAmount: serializeDecimalNumber(payload.value),
      portfolio: {
        id: portfolio.id.toString(),
        krwBalance: serializeDecimalNumber(portfolio.krwBalance),
        totalAvailableOrderAmount: serializeDecimalNumber(
          getTotalAvailableOrderAmountKrw(
            portfolio.krwBalance,
            portfolio.usdBalance,
          ),
        ),
        totalBalance: serializeDecimalNumber(portfolio.totalBalance),
        usdBalance: serializeDecimalNumber(portfolio.usdBalance),
      },
      receivedAmount: serializeDecimalNumber(exchangedValue),
      type: payload.type,
    });
  } catch (error) {
    if (error instanceof PortfolioExchangeError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "환전에 실패했습니다." },
      { status: 500 },
    );
  }
}
