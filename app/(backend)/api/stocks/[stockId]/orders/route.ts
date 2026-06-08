import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  verifyAuthToken,
} from "@/app/(backend)/lib/auth";
import { getTotalAvailableOrderAmountKrw } from "@/app/(backend)/lib/portfolio-balance";
import {
  publishOrderFilledEventsForOrder,
  scheduleStockUpdated,
} from "@/app/(backend)/lib/realtime-events";
import {
  getEstimatedMarketOrderAmount,
  matchStockOrder,
  StockOrderMatchingError,
} from "@/app/(backend)/lib/stock-order-matching";
import { prisma } from "@/app/(backend)/lib/prisma";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  CurrencyCode,
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";

export const runtime = "nodejs";

const orderTypes = new Set<string>(Object.values(TradeOrderType));
const orderPriceTypes = new Set(["LIMIT", "MARKET"]);

type OrderPriceType = "LIMIT" | "MARKET";
type StockOrderParams = {
  params: Promise<{
    stockId: string;
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

function isOrderType(value: unknown): value is TradeOrderType {
  return typeof value === "string" && orderTypes.has(value);
}

function isOrderPriceType(value: unknown): value is OrderPriceType {
  return typeof value === "string" && orderPriceTypes.has(value);
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

async function getCreateOrderPayload(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (
    !isRecord(body) ||
    !isOrderType(body.type) ||
    !isOrderPriceType(body.orderPriceType)
  ) {
    return null;
  }

  const quantity = parsePositiveInteger(body.quantity);
  const limitPrice =
    body.orderPriceType === "LIMIT"
      ? parsePositiveDecimal(body.pricePerShare)
      : null;

  if (!quantity || (body.orderPriceType === "LIMIT" && !limitPrice)) {
    return null;
  }

  return {
    type: body.type,
    orderPriceType: body.orderPriceType,
    quantity,
    pricePerShare: limitPrice,
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

function getProfitRate(profit: Prisma.Decimal, invested: Prisma.Decimal) {
  if (invested.lte(0)) {
    return new Prisma.Decimal(0);
  }

  return profit.div(invested).mul(100).toDecimalPlaces(4);
}

function createOrderId() {
  return BigInt(Date.now()) * BigInt(100000) + BigInt(randomInt(100000));
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

export async function GET(request: NextRequest, { params }: StockOrderParams) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
  }

  const stock = await prisma.stock.findUnique({
    select: {
      countryCode: true,
      currencyCode: true,
      currentPrice: true,
      id: true,
      name: true,
      ticker: true,
    },
    where: {
      id: parsedStockId,
    },
  });

  if (!stock) {
    return createStockOrderErrorResponse("종목을 찾을 수 없습니다.", 404);
  }

  const portfolio = await prisma.portfolio.findUnique({
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
    return createStockOrderErrorResponse("계좌가 없습니다.", 404);
  }

  const [pendingOrders, pendingBuyOrders] = await Promise.all([
    prisma.tradeOrder.findMany({
      orderBy: {
        orderedAt: "desc",
      },
      where: {
        portfolioId: portfolio.id,
        status: TradeOrderStatus.PENDING,
        stockId: parsedStockId,
      },
    }),
    prisma.tradeOrder.findMany({
      where: {
        currencyCode: stock.currencyCode,
        portfolioId: portfolio.id,
        status: TradeOrderStatus.PENDING,
        type: TradeOrderType.BUY,
      },
    }),
  ]);
  const holding = portfolio.items[0] ?? null;
  const pendingSellQuantity = pendingOrders
    .filter((order) => order.type === TradeOrderType.SELL)
    .reduce((sum, order) => sum + order.remainingQuantity, 0);
  const buyingPower = getNonNegativeDecimal(
    getCashBalance(portfolio, stock.currencyCode).sub(
      sumPendingBuyAmount(pendingBuyOrders),
    ),
  );
  const holdingQuantity = holding?.quantity ?? 0;
  const sellableQuantity = Math.max(holdingQuantity - pendingSellQuantity, 0);
  const currentAmount = stock.currentPrice
    .mul(holdingQuantity)
    .toDecimalPlaces(2);
  const averagePrice = holding?.averagePrice ?? new Prisma.Decimal(0);
  const totalInvested =
    holding?.totalInvested ??
    averagePrice.mul(holdingQuantity).toDecimalPlaces(2);
  const currentProfit = currentAmount.sub(totalInvested).toDecimalPlaces(2);

  return NextResponse.json({
    ok: true,
    data: {
      buyingPower: serializeDecimalNumber(buyingPower),
      holding: {
        averagePrice: serializeDecimalNumber(averagePrice),
        currentAmount: serializeDecimalNumber(currentAmount),
        currentProfit: serializeDecimalNumber(currentProfit),
        currentProfitRate: serializeDecimalNumber(
          getProfitRate(currentProfit, totalInvested),
        ),
        quantity: holdingQuantity,
        sellableQuantity,
        totalInvested: serializeDecimalNumber(totalInvested),
      },
      pendingOrders: pendingOrders.map((order) => ({
        ...serializeTradeOrder(order),
        stockId: parsedStockId,
        stockName: stock.name,
      })),
      pendingOrderCount: pendingOrders.length,
      stock: {
        currencyCode: stock.currencyCode,
        currentPrice: serializeDecimalNumber(stock.currentPrice),
        id: stock.id,
        name: stock.name,
        ticker: stock.ticker,
      },
      totalAvailableOrderAmount: serializeDecimalNumber(
        getTotalAvailableOrderAmountKrw(
          portfolio.krwBalance,
          portfolio.usdBalance,
        ),
      ),
    },
  });
}

export async function POST(request: NextRequest, { params }: StockOrderParams) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
  }

  const payload = await getCreateOrderPayload(request);

  if (!payload) {
    return createStockOrderErrorResponse("유효한 주문 정보가 필요합니다.", 400);
  }

  try {
    const orderId = createOrderId();
    const orderedAt = new Date();
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

      const pricePerShare =
        (payload.orderPriceType === "LIMIT"
          ? payload.pricePerShare
          : stock.currentPrice.toDecimalPlaces(2)) ??
        stock.currentPrice.toDecimalPlaces(2);
      const orderAmount =
        payload.type === TradeOrderType.BUY &&
        payload.orderPriceType === "MARKET"
          ? await getEstimatedMarketOrderAmount(tx, {
              currentPrice: stock.currentPrice,
              portfolioId: portfolio.id,
              quantity: payload.quantity,
              stockId: parsedStockId,
              type: payload.type,
            })
          : pricePerShare.mul(payload.quantity).toDecimalPlaces(2);

      if (payload.type === TradeOrderType.BUY) {
        const pendingBuyOrders = await tx.tradeOrder.findMany({
          where: {
            currencyCode: stock.currencyCode,
            portfolioId: portfolio.id,
            status: TradeOrderStatus.PENDING,
            type: TradeOrderType.BUY,
          },
        });
        const availableBuyAmount = getNonNegativeDecimal(
          getCashBalance(portfolio, stock.currencyCode).sub(
            sumPendingBuyAmount(pendingBuyOrders),
          ),
        );

        if (orderAmount.gt(availableBuyAmount)) {
          throw new StockOrderError("구매 가능 금액이 부족합니다.", 400);
        }
      } else {
        const holding = portfolio.items[0];

        if (!holding || holding.quantity <= 0) {
          throw new StockOrderError("판매할 주식이 없습니다.", 400);
        }

        const pendingSellOrders = await tx.tradeOrder.findMany({
          where: {
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

      const createdOrder = await tx.tradeOrder.create({
        data: {
          currencyCode: stock.currencyCode,
          executedAt: null,
          executedPrice: null,
          filledQuantity: 0,
          orderId,
          orderedAt,
          portfolioId: portfolio.id,
          pricePerShare,
          quantity: payload.quantity,
          remainingQuantity: payload.quantity,
          status: TradeOrderStatus.PENDING,
          stockId: parsedStockId,
          ticker: stock.ticker,
          type: payload.type,
        },
      });

      return (
        (await matchStockOrder(tx, {
          executedAt: orderedAt,
          orderId: createdOrder.orderId,
          orderPriceType: payload.orderPriceType,
          stock,
        })) ?? createdOrder
      );
    });

    await publishOrderFilledEventsForOrder(orderId, { since: orderedAt });
    scheduleStockUpdated(parsedStockId, {
      reason:
        order.filledQuantity > 0 ? "TRADE_EXECUTED" : "ORDER_CHANGED",
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

    console.error("Stock order creation failed", error);

    return createStockOrderErrorResponse("주문 처리에 실패했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: StockOrderParams,
) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return createStockOrderErrorResponse("인증이 필요합니다.", 401);
  }

  const { stockId } = await params;
  const parsedStockId = parseStockId(stockId);

  if (!parsedStockId) {
    return createStockOrderErrorResponse("유효한 종목 ID가 필요합니다.", 400);
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
      portfolioId: portfolio.id,
      status: TradeOrderStatus.PENDING,
      stockId: parsedStockId,
    },
  });

  if (result.count > 0) {
    scheduleStockUpdated(parsedStockId, {
      changedAt: canceledAt.toISOString(),
      reason: "ORDER_CHANGED",
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      canceledCount: result.count,
    },
  });
}
