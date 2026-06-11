import { NextResponse } from "next/server";
import { getStockAnalyticsData } from "@/app/(frontend)/(route)/stock/[stockId]/page-data";

type StockAnalyticsRouteProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: StockAnalyticsRouteProps,
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

    const analytics = await getStockAnalyticsData(parsedStockId);

    if (!analytics) {
      return NextResponse.json(
        { ok: false, error: "STOCK_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: analytics,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCK_ANALYTICS_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCK_ANALYTICS_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
