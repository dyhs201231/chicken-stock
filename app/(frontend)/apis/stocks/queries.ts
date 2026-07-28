import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  fetchStockAnalytics,
  fetchStockCandles,
  fetchStockOrderBook,
  fetchStockOrders,
  fetchStockSearchResults,
  fetchStocks,
} from "./api";
import type { StockCandleInterval, StocksRankingData } from "./api";
import type { ChartCandleData } from "../../components/stock-detail/order/chart-panel/types";
import { getStockRankingRefetchInterval } from "../../components/main/stock_list/stock-list-state";
import type {
  StockMarketFilter,
  StockRankingKey,
  StockRankingPeriod,
} from "../../components/main/stock_list/types";
import type {
  StockAnalyticsData,
  StockOrderBookSnapshotData,
} from "../../types/stock/stock-detail";

export const stockQueryKeys = {
  lists: () => ["stocks"] as const,
  list: (
    market: StockMarketFilter,
    ranking: StockRankingKey,
    period: StockRankingPeriod,
    limit: number,
  ) => [...stockQueryKeys.lists(), market, ranking, period, limit] as const,
  analytics: (stockId: number) => ["stock-analytics", stockId] as const,
  search: (query: string) =>
    [...stockQueryKeys.lists(), "search", query] as const,
  candles: (stockId: number, interval: StockCandleInterval) =>
    ["stock-candles", stockId, interval] as const,
  orderBook: (stockId: number) => ["stock-order-book", stockId] as const,
  orders: (stockId: number) => ["stock-orders", stockId] as const,
};

const STOCK_CANDLES_REFETCH_INTERVAL_MS = 10_000;
const STOCK_ORDER_BOOK_REFETCH_INTERVAL_MS = 5_000;
const STOCK_ORDERS_REFETCH_INTERVAL_MS = 10_000;

type StockCandlesQueryOptions = {
  initialData?: ChartCandleData[];
  placeholderData?: ChartCandleData[];
};

type StockOrderBookQueryOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

type StockOrdersQueryOptions = {
  enabled?: boolean;
};

type StockRankingDisplaySnapshot = {
  data: StocksRankingData;
  period: StockRankingPeriod;
  ranking: StockRankingKey;
};

type StockRankingDisplaySnapshotParams = {
  currentData: StocksRankingData | undefined;
  currentPeriod: StockRankingPeriod;
  currentRanking: StockRankingKey;
  isPlaceholderData: boolean;
  queryClient: QueryClient;
};

function isStockRankingQueryKey(
  queryKey: readonly unknown[],
): queryKey is readonly [
  "stocks",
  StockMarketFilter,
  StockRankingKey,
  StockRankingPeriod,
  number,
] {
  return (
    queryKey.length === 5 &&
    queryKey[0] === "stocks" &&
    (queryKey[1] === "all" ||
      queryKey[1] === "domestic" ||
      queryKey[1] === "global") &&
    (queryKey[2] === "tradingAmount" || queryKey[2] === "tradingVolume") &&
    (queryKey[3] === "live" ||
      queryKey[3] === "1d" ||
      queryKey[3] === "1w" ||
      queryKey[3] === "1m" ||
      queryKey[3] === "3m" ||
      queryKey[3] === "6m" ||
      queryKey[3] === "1y") &&
    typeof queryKey[4] === "number"
  );
}

function getLatestSuccessfulStockRankingSnapshot(
  queryClient: QueryClient,
): StockRankingDisplaySnapshot | undefined {
  let latest:
    | (StockRankingDisplaySnapshot & {
        dataUpdatedAt: number;
      })
    | undefined;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: stockQueryKeys.lists() })
    .forEach((query) => {
      if (
        !isStockRankingQueryKey(query.queryKey) ||
        query.state.data === undefined ||
        query.state.dataUpdatedAt <= 0 ||
        (latest && latest.dataUpdatedAt >= query.state.dataUpdatedAt)
      ) {
        return;
      }

      latest = {
        data: query.state.data as StocksRankingData,
        dataUpdatedAt: query.state.dataUpdatedAt,
        period: query.queryKey[3],
        ranking: query.queryKey[2],
      };
    });

  if (!latest) {
    return undefined;
  }

  return {
    data: latest.data,
    period: latest.period,
    ranking: latest.ranking,
  };
}

export function getStockRankingDisplaySnapshot({
  currentData,
  currentPeriod,
  currentRanking,
  isPlaceholderData,
  queryClient,
}: StockRankingDisplaySnapshotParams): StockRankingDisplaySnapshot | undefined {
  if (currentData !== undefined && !isPlaceholderData) {
    return {
      data: currentData,
      period: currentPeriod,
      ranking: currentRanking,
    };
  }

  return (
    getLatestSuccessfulStockRankingSnapshot(queryClient) ??
    (currentData === undefined
      ? undefined
      : {
          data: currentData,
          period: currentPeriod,
          ranking: currentRanking,
        })
  );
}

export function useStocksQuery(
  market: StockMarketFilter,
  ranking: StockRankingKey,
  period: StockRankingPeriod,
  limit: number,
  initialData?: StocksRankingData,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: stockQueryKeys.list(market, ranking, period, limit),
    queryFn: () => fetchStocks(market, ranking, period, limit),
    initialData,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      getStockRankingRefetchInterval(
        query.state.data?.marketOpen ?? true,
      ),
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
    staleTime: 5_000,
  });
  const displaySnapshot = getStockRankingDisplaySnapshot({
    currentData: query.data,
    currentPeriod: period,
    currentRanking: ranking,
    isPlaceholderData: query.isPlaceholderData,
    queryClient,
  });

  return {
    ...query,
    data: displaySnapshot?.data,
    dataPeriod: displaySnapshot?.period ?? period,
    dataRanking: displaySnapshot?.ranking ?? ranking,
  };
}

export function useStockSearchQuery(query: string, enabled = true) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: stockQueryKeys.search(trimmedQuery),
    queryFn: () => fetchStockSearchResults(trimmedQuery),
    enabled: enabled && trimmedQuery.length > 0,
    staleTime: 60_000,
  });
}

export function useStockCandlesQuery(
  stockId: number,
  interval: StockCandleInterval,
  options?: StockCandlesQueryOptions,
) {
  return useQuery({
    queryKey: stockQueryKeys.candles(stockId, interval),
    queryFn: () => fetchStockCandles(stockId, interval),
    enabled: Number.isInteger(stockId) && stockId > 0,
    initialData: options?.initialData,
    placeholderData: options?.placeholderData,
    refetchInterval: STOCK_CANDLES_REFETCH_INTERVAL_MS,
    staleTime: STOCK_CANDLES_REFETCH_INTERVAL_MS,
  });
}

export function useStockAnalyticsQuery(
  stockId: number,
  initialData?: StockAnalyticsData,
) {
  return useQuery({
    queryKey: stockQueryKeys.analytics(stockId),
    queryFn: () => fetchStockAnalytics(stockId),
    enabled: Number.isInteger(stockId) && stockId > 0,
    initialData,
    staleTime: 60_000,
  });
}

export function useStockOrderBookQuery(
  stockId: number,
  initialData?: StockOrderBookSnapshotData | null,
  options?: StockOrderBookQueryOptions,
) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: stockQueryKeys.orderBook(stockId),
    queryFn: () => fetchStockOrderBook(stockId),
    enabled: enabled && Number.isInteger(stockId) && stockId > 0,
    initialData: initialData ?? undefined,
    refetchInterval:
      options?.refetchInterval ?? STOCK_ORDER_BOOK_REFETCH_INTERVAL_MS,
    staleTime: 5_000,
  });
}

export function useStockOrdersQuery(
  stockId: number,
  options?: StockOrdersQueryOptions,
) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: stockQueryKeys.orders(stockId),
    queryFn: () => fetchStockOrders(stockId),
    enabled: enabled && Number.isInteger(stockId) && stockId > 0,
    refetchInterval: STOCK_ORDERS_REFETCH_INTERVAL_MS,
  });
}
