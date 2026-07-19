import { NextRequest, NextResponse } from "next/server";
import {
  getMarketIndexCandleResult,
  parseCandleInterval,
} from "../../../../lib/market-indices";
import { toMarketIndexCandleRouteResponse } from "../../market-index-route-state";

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
    const result = await getMarketIndexCandleResult(indexId, interval);

    const response = toMarketIndexCandleRouteResponse(result, interval);

    return NextResponse.json(response.body, { status: response.status });
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
