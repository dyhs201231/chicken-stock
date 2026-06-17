import { NextResponse } from "next/server";
import { getFreshUsdKrwMarketIndexDetail } from "../../../lib/market-indices";

export async function GET() {
  try {
    const exchangeRate = await getFreshUsdKrwMarketIndexDetail();

    return NextResponse.json({
      ok: true,
      data: {
        exchangeRate,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EXCHANGE_RATE_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "EXCHANGE_RATE_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
