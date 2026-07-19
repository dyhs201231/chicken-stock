import { NextResponse } from "next/server";
import {
  getCachedMarketIndexSummaries,
  getCachedMarketIndexViews,
} from "../../lib/market-indices";
import { toMarketIndexListRouteResponse } from "./market-index-route-state";

export async function GET() {
  try {
    const [indices, results] = await Promise.all([
      getCachedMarketIndexSummaries(),
      getCachedMarketIndexViews(),
    ]);

    const response = toMarketIndexListRouteResponse(indices, results);

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "MARKET_INDICES_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "MARKET_INDICES_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
