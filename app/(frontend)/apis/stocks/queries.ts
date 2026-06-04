import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchStockCandles, fetchStocks } from "./api";
import type { StockCandleInterval } from "./api";

export const stockQueryKeys = {
  lists: () => ["stocks"] as const,
  list: (market: string, ranking: string) =>
    [...stockQueryKeys.lists(), market, ranking] as const,
  candles: (stockId: number, interval: StockCandleInterval) =>
    ["stock-candles", stockId, interval] as const,
};

export function useStocksInfiniteQuery(market: string, ranking: string) {
  return useInfiniteQuery({
    queryKey: stockQueryKeys.list(market, ranking),
    queryFn: ({ pageParam }) => fetchStocks(market, ranking, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useStockCandlesQuery(
  stockId: number,
  interval: StockCandleInterval,
) {
  return useQuery({
    queryKey: stockQueryKeys.candles(stockId, interval),
    queryFn: () => fetchStockCandles(stockId, interval),
  });
}
