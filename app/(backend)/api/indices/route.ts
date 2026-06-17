import { NextRequest, NextResponse } from "next/server";
import {
  getCachedMarketIndexSummaries,
  getFreshMarketIndexSummaries,
} from "../../lib/market-indices";

export async function GET(request: NextRequest) {
  try {
    const shouldRefresh = request.nextUrl.searchParams.get("refresh") === "true";
    const indices = shouldRefresh
      ? await getFreshMarketIndexSummaries()
      : await getCachedMarketIndexSummaries();

    return NextResponse.json({
      ok: true,
      data: {
        indices,
      },
    });
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
