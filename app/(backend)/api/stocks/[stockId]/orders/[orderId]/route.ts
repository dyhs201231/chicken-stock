import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import {
  matchStockOrder,
  StockOrderMatchingError,
} from "@/app/(backend)/lib/stock-order-matching";
import { prisma } from "@/app/(backend)/lib/prisma";
import {
  publishOrderFilledEventsForOrder,
  scheduleStockUpdated,
} from "@/app/(backend)/lib/realtime-events";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

type StockOrderItemParams = {
  params: Promise<{
    stockId: string;
    orderId: string;
  }>;
};

class StockOrderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function createStockOrderErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
      message,
      ok: false,
    },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function parseStockId(value: string) {
  const stockId = Number(value);

  return Number.isInteger(stockId) && stockId > 0 ? stockId : null;
}

function parseOrderId(value: string) {
  try {
    const orderId = BigInt(value);

    return orderId > 0 ? orderId : null;
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function parsePositiveDecimal(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const decimalValue = new Prisma.Decimal(value).toDecimalPlaces(2);

  return decimalValue.lte(0) ? null : decimalValue;
}

async function getUpdateOrderPayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body)) {
    return null;
  }

  const quantity = parsePositiveInteger(body.quantity);
  const pricePerShare = parsePositiveDecimal(body.pricePerShare);

  if (!quantity || !pricePerShare) {
    return null;
  }

  return {
    pricePerShare,
    quantity,
  };
}

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDecimalNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function getCashBalance(
  portfolio: {
    krwBalance: Prisma.Decimal;
    usdBalance: Prisma.Decimal;
  },
  currencyCode: CurrencyCode,
) {
  return currencyCode === CurrencyCode.KRW
    ? portfolio.krwBalance
    : portfolio.usdBalance;
}

function getOrderAmount(order: {
  pricePerShare: Prisma.Decimal;
  remainingQuantity: number;
}) {
  return order.pricePerShare.mul(order.remainingQuantity).toDecimalPlaces(2);
}

function sumPendingBuyAmount(
  orders: Array<{
    pricePerShare: Prisma.Decimal;
    remainingQuantity: number;
  }>,
) {
  return orders.reduce(
    (sum, order) => sum.add(getOrderAmount(order)),
    new Prisma.Decimal(0),
  );
}

function getNonNegativeDecimal(value: Prisma.Decimal) {
  return value.lt(0) ? new Prisma.Decimal(0) : value.toDecimalPlaces(2);
}

function serializeTradeOrder(order: {
  orderId: bigint;
  type: TradeOrderType;
  quantity: number;
  pricePerShare: Prisma.Decimal;
  status: TradeOrderStatus;
  orderedAt: Date;
  filledQuantity: number;
  remainingQuantity: number;
  executedPrice: Prisma.Decimal | null;
  executedAt: Date | null;
  canceledAt: Date | null;
  currencyCode: CurrencyCode;
  ticker: string;
}) {
  return {
    canceledAt: order.canceledAt ? serializeDate(order.canceledAt) : null,
    currencyCode: order.currencyCode,
    executedAt: order.executedAt ? serializeDate(order.executedAt) : null,
    executedPrice: order.executedPrice
      ? serializeDecimalNumber(order.executedPrice)
      : null,
    filledQuantity: order.filledQuantity,
    orderId: order.orderId.toString(),
    orderedAt: serializeDate(order.orderedAt),
    pricePerShare: serializeDecimalNumber(order.pricePerShare),
    quantity: order.quantity,
    remainingQuantity: order.remainingQuantity,
    status: order.status,
    ticker: order.ticker,
    type: order.type,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: StockOrderItemParams,
) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId, orderId } = await params;
  const parsedStockId = parseStockId(stockId);
  const parsedOrderId = parseOrderId(orderId);

  if (!parsedStockId || !parsedOrderId) {
    return createStockOrderErrorResponse("유효한 주문 정보가 필요합니다.", 400);
  }

  const payload = await getUpdateOrderPayload(request);

  if (!payload) {
    return createStockOrderErrorResponse(
      "유효한 주문 수정 정보가 필요합니다.",
      400,
    );
  }

  try {
    const operationStartedAt = new Date();
    const order = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        select: {
          countryCode: true,
          currencyCode: true,
          currentPrice: true,
          id: true,
          imageUrl: true,
          name: true,
          ticker: true,
        },
        where: {
          id: parsedStockId,
        },
      });

      if (!stock) {
        throw new StockOrderError("종목을 찾을 수 없습니다.", 404);
      }

      const portfolio = await tx.portfolio.findUnique({
        include: {
          items: {
            take: 1,
            where: {
              stockId: parsedStockId,
            },
          },
        },
        where: {
          userId,
        },
      });

      if (!portfolio) {
        throw new StockOrderError("계좌가 없습니다.", 404);
      }

      const currentOrder = await tx.tradeOrder.findFirst({
        where: {
          orderId: parsedOrderId,
          portfolioId: portfolio.id,
          status: TradeOrderStatus.PENDING,
          stockId: parsedStockId,
        },
      });

      if (!currentOrder) {
        throw new StockOrderError("대기 중인 주문을 찾을 수 없습니다.", 404);
      }

      if (currentOrder.type === TradeOrderType.BUY) {
        const pendingBuyOrders = await tx.tradeOrder.findMany({
          where: {
            currencyCode: currentOrder.currencyCode,
            orderId: {
              not: parsedOrderId,
            },
            portfolioId: portfolio.id,
            status: TradeOrderStatus.PENDING,
            type: TradeOrderType.BUY,
          },
        });
        const availableBuyAmount = getNonNegativeDecimal(
          getCashBalance(portfolio, currentOrder.currencyCode).sub(
            sumPendingBuyAmount(pendingBuyOrders),
          ),
        );
        const nextOrderAmount = payload.pricePerShare
          .mul(payload.quantity)
          .toDecimalPlaces(2);

        if (nextOrderAmount.gt(availableBuyAmount)) {
          throw new StockOrderError("구매 가능 금액이 부족합니다.", 400);
        }
      } else {
        const holding = portfolio.items[0];

        if (!holding || holding.quantity <= 0) {
          throw new StockOrderError("판매할 주식이 없습니다.", 400);
        }

        const pendingSellOrders = await tx.tradeOrder.findMany({
          where: {
            orderId: {
              not: parsedOrderId,
            },
            portfolioId: portfolio.id,
            status: TradeOrderStatus.PENDING,
            stockId: parsedStockId,
            type: TradeOrderType.SELL,
          },
        });
        const pendingSellQuantity = pendingSellOrders.reduce(
          (sum, order) => sum + order.remainingQuantity,
          0,
        );
        const availableSellQuantity = holding.quantity - pendingSellQuantity;

        if (payload.quantity > availableSellQuantity) {
          throw new StockOrderError("판매 가능 수량이 부족합니다.", 400);
        }
      }

      const updatedOrder = await tx.tradeOrder.update({
        data: {
          pricePerShare: payload.pricePerShare,
          quantity: currentOrder.filledQuantity + payload.quantity,
          remainingQuantity: payload.quantity,
        },
        where: {
          orderId: parsedOrderId,
        },
      });

      return (
        (await matchStockOrder(tx, {
          orderId: updatedOrder.orderId,
          orderPriceType: "LIMIT",
          stock,
        })) ?? updatedOrder
      );
    });

    await publishOrderFilledEventsForOrder(parsedOrderId, {
      since: operationStartedAt,
    });
    scheduleStockUpdated(parsedStockId, {
      reason:
        order.executedAt && order.executedAt >= operationStartedAt
          ? "TRADE_EXECUTED"
          : "ORDER_CHANGED",
      ticker: order.ticker,
    });

    return NextResponse.json({
      ok: true,
      data: {
        order: serializeTradeOrder(order),
      },
    });
  } catch (error) {
    if (
      error instanceof StockOrderError ||
      error instanceof StockOrderMatchingError
    ) {
      return createStockOrderErrorResponse(error.message, error.status);
    }

    return createStockOrderErrorResponse("주문 수정에 실패했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: StockOrderItemParams,
) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId, orderId } = await params;
  const parsedStockId = parseStockId(stockId);
  const parsedOrderId = parseOrderId(orderId);

  if (!parsedStockId || !parsedOrderId) {
    return createStockOrderErrorResponse("유효한 주문 정보가 필요합니다.", 400);
  }

  const portfolio = await prisma.portfolio.findUnique({
    select: {
      id: true,
    },
    where: {
      userId,
    },
  });

  if (!portfolio) {
    return createStockOrderErrorResponse("계좌가 없습니다.", 404);
  }

  const canceledAt = new Date();
  const result = await prisma.tradeOrder.updateMany({
    data: {
      canceledAt,
      remainingQuantity: 0,
      status: TradeOrderStatus.CANCELED,
    },
    where: {
      orderId: parsedOrderId,
      portfolioId: portfolio.id,
      status: TradeOrderStatus.PENDING,
      stockId: parsedStockId,
    },
  });

  if (result.count === 0) {
    return createStockOrderErrorResponse(
      "대기 중인 주문을 찾을 수 없습니다.",
      404,
    );
  }

  scheduleStockUpdated(parsedStockId, {
    changedAt: canceledAt.toISOString(),
    reason: "ORDER_CHANGED",
  });

  return NextResponse.json({
    ok: true,
    data: {
      canceledCount: result.count,
    },
  });
}
