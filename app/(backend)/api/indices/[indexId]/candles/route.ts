import { NextRequest, NextResponse } from "next/server";
import {
  getMarketIndexCandles,
  parseCandleInterval,
} from "../../../../lib/market-indices";

type MarketIndexCandlesRouteProps = {
  params: Promise<{
    indexId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: MarketIndexCandlesRouteProps,
) {
  try {
    const { indexId } = await params;
    const interval = parseCandleInterval(
      request.nextUrl.searchParams.get("interval"),
    );
    const candles = await getMarketIndexCandles(indexId, interval);

    if (!candles) {
      return NextResponse.json(
        { ok: false, error: "MARKET_INDEX_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        interval,
        candles,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "MARKET_INDEX_CANDLES_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "MARKET_INDEX_CANDLES_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
