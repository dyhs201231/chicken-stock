import type {
  MarketDataResult,
  MarketIndexCandleData,
  MarketIndexCandleInterval,
} from "../../types/market-index";

export type MarketIndexCandlePayload = {
  candles: MarketIndexCandleData[];
  interval: MarketIndexCandleInterval;
  provider: string;
  reason?: string;
  status: "fallback" | "success";
  updatedAt: string;
};

export function toMarketIndexCandleResult({
  candles,
  provider,
  reason,
  status,
  updatedAt,
}: MarketIndexCandlePayload): MarketDataResult<MarketIndexCandleData[]> {
  if (status === "fallback") {
    return {
      data: candles,
      provider,
      reason: reason ?? "MARKET_API_UNAVAILABLE",
      status,
      updatedAt,
    };
  }

  return {
    data: candles,
    provider,
    status,
    updatedAt,
  };
}

export function resolveMarketIndexChartResult(
  data: MarketDataResult<MarketIndexCandleData[]> | undefined,
  isError: boolean,
): MarketDataResult<MarketIndexCandleData[]> {
  if (isError || !data) {
    return {
      errorCode: "MARKET_INDEX_CANDLES_FETCH_FAILED",
      message: "차트 정보를 불러오지 못했습니다.",
      status: "error",
    };
  }

  return data;
}
