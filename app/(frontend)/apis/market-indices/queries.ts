import { useQuery } from "@tanstack/react-query";
import {
  fetchMarketIndexCandles,
  fetchMarketIndices,
  fetchUsdKrwExchangeRate,
} from "./api";
import type {
  MarketIndexCandleData,
  MarketIndexCandleInterval,
  MarketDataResult,
  MarketIndexViewData,
} from "../../types/market-index";

export const marketIndexQueryKeys = {
  lists: () => ["market-indices"] as const,
  candles: (indexId: string, interval: MarketIndexCandleInterval) =>
    ["market-index-candles", indexId, interval] as const,
  exchangeRate: () => ["market-index-exchange-rate", "usd-krw"] as const,
};

const MARKET_INDEX_REFETCH_INTERVAL_MS = 1000 * 60 * 60;

export function useMarketIndicesQuery(
  initialData?: MarketIndexViewData[],
) {
  return useQuery({
    queryKey: marketIndexQueryKeys.lists(),
    queryFn: () => fetchMarketIndices(),
    initialData,
    refetchInterval: MARKET_INDEX_REFETCH_INTERVAL_MS,
    staleTime: MARKET_INDEX_REFETCH_INTERVAL_MS,
  });

}

export function useMarketIndexCandlesQuery(
  indexId: string,
  interval: MarketIndexCandleInterval,
  initialData?: MarketDataResult<MarketIndexCandleData[]>,
) {
  return useQuery({
    queryKey: marketIndexQueryKeys.candles(indexId, interval),
    queryFn: () => fetchMarketIndexCandles(indexId, interval),
    enabled: indexId.trim().length > 0,
    initialData,
    refetchInterval: MARKET_INDEX_REFETCH_INTERVAL_MS,
    staleTime: MARKET_INDEX_REFETCH_INTERVAL_MS,
  });

}

export function useUsdKrwExchangeRateQuery(enabled: boolean) {
  return useQuery({
    queryKey: marketIndexQueryKeys.exchangeRate(),
    queryFn: fetchUsdKrwExchangeRate,
    enabled,
    refetchOnMount: "always",
    staleTime: 0,
  });
}
