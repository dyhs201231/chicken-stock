import { NextRequest, NextResponse } from "next/server";
import { getStocksRanking } from "../../lib/stocks";
import {
  getCanonicalStockRankingQuery,
  getStockRankingCacheControl,
  parseStockMarketFilter,
  parseStockRanking,
  parseStockRankingLimit,
  parseStockRankingPeriod,
} from "../../lib/stock-ranking";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const canonicalQuery = getCanonicalStockRankingQuery(searchParams);

    if (request.nextUrl.search !== `?${canonicalQuery}`) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.search = canonicalQuery;
      const redirectResponse = NextResponse.redirect(canonicalUrl, 307);

      redirectResponse.headers.set("Cache-Control", "private, no-store");

      return redirectResponse;
    }

    const market = parseStockMarketFilter(searchParams.get("market"));
    const ranking = parseStockRanking(searchParams.get("ranking"));
    const period = parseStockRankingPeriod(searchParams.get("period"));
    const limit = parseStockRankingLimit(searchParams.get("limit"));
    const stocksRanking = await getStocksRanking({
      limit,
      market,
      period,
      ranking,
    });

    return NextResponse.json(
      {
        ok: true,
        data: stocksRanking,
      },
      {
        headers: {
          "Cache-Control": getStockRankingCacheControl(period),
        },
      },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCKS_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCKS_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
