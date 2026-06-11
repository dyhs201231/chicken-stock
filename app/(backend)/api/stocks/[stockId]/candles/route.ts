import { NextRequest, NextResponse } from "next/server";
import {
  getCandlesByInterval,
  parseCandleInterval,
  toDailyCandles,
} from "../../../../lib/stock-candles";
import { prisma } from "../../../../lib/prisma";

type StockCandlesRouteProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: StockCandlesRouteProps,
) {
  try {
    const { stockId } = await params;
    const parsedStockId = Number(stockId);

    if (!Number.isInteger(parsedStockId) || parsedStockId <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STOCK_ID" },
        { status: 400 },
      );
    }

    const interval = parseCandleInterval(
      request.nextUrl.searchParams.get("interval"),
    );

    const stock = await prisma.stock.findUnique({
      where: {
        id: parsedStockId,
      },
      select: {
        ticker: true,
      },
    });

    if (!stock) {
      return NextResponse.json(
        { ok: false, error: "STOCK_NOT_FOUND" },
        { status: 404 },
      );
    }

    const candles = await prisma.stockCandle.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: interval === "DAY" ? 260 : 1300,
      where: {
        intervalCode: "1D",
        ticker: stock.ticker,
      },
    });
    const dailyCandles = toDailyCandles(candles.reverse());

    return NextResponse.json({
      ok: true,
      data: {
        interval,
        candles: getCandlesByInterval(dailyCandles, interval),
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCK_CANDLES_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCK_CANDLES_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
