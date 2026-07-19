import type { StockCandleResponse } from "../../lib/stock-candles";
import type {
  MarketDataResult,
  MarketIndexCandleInterval,
  MarketIndexSummaryData,
  MarketIndexViewData,
} from "../../../(frontend)/types/market-index";

export function toMarketIndexListRouteResponse(
  indices: MarketIndexSummaryData[],
  results: MarketIndexViewData[],
) {
  return {
    body: { ok: true as const, data: { indices, results } },
    status: 200,
  };
}

export function toMarketIndexCandleRouteResponse(
  result: MarketDataResult<StockCandleResponse[]> | null,
  interval: MarketIndexCandleInterval,
) {
  if (!result) {
    return {
      body: { ok: false as const, error: "MARKET_INDEX_NOT_FOUND" },
      status: 404,
    };
  }

  if (result.status === "error") {
    return {
      body: {
        ok: false as const,
        error: result.errorCode,
        message: result.message,
      },
      status: 503,
    };
  }

  return {
    body: {
      ok: true as const,
      data: {
        status: result.status,
        provider: result.provider,
        updatedAt: result.updatedAt,
        ...(result.status === "fallback" ? { reason: result.reason } : {}),
        interval,
        candles: result.data,
      },
    },
    status: 200,
  };
}
