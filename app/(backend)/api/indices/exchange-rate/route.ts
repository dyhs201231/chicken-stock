import { NextRequest, NextResponse } from "next/server";
import { createExchangeRateQuote } from "../../../lib/exchange-rate-quote";
import {
  getCachedUsdKrwExchangeRateResult,
  getFreshUsdKrwExchangeRateResult,
} from "../../../lib/market-indices";
import { reportServerError } from "../../../lib/report-server-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("purpose") === "display") {
      const exchangeRate = await getCachedUsdKrwExchangeRateResult();

      return NextResponse.json(
        { ok: true, data: { exchangeRate } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await getFreshUsdKrwExchangeRateResult();

    if (result.status !== "success") {
      return NextResponse.json(
        {
          ok: false,
          error: result.errorCode,
          message: "최신 환율을 확인할 수 없어 환전을 진행할 수 없습니다.",
        },
        { status: 503 },
      );
    }

    const exchangeRate = createExchangeRateQuote({
      observedAt: new Date(result.updatedAt),
      rate: result.data.currentValue,
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          exchangeRate,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    reportServerError(error, {
      component: "exchange-rate-api",
      kind: "handled-5xx",
      operation: "fetch-exchange-rate",
    });
    const message =
      process.env.NODE_ENV === "production"
        ? "EXCHANGE_RATE_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "EXCHANGE_RATE_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
