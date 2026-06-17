import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMarketIndexCandles,
  fetchMarketIndices,
  fetchUsdKrwExchangeRate,
} from "./api";
import type {
  MarketIndexCandleData,
  MarketIndexCandleInterval,
  MarketIndexSummaryData,
} from "../../types/market-index";

export const marketIndexQueryKeys = {
  lists: () => ["market-indices"] as const,
  candles: (indexId: string, interval: MarketIndexCandleInterval) =>
    ["market-index-candles", indexId, interval] as const,
  exchangeRate: () => ["market-index-exchange-rate", "usd-krw"] as const,
};

const MARKET_INDEX_REFETCH_INTERVAL_MS = 1000 * 60 * 60;

type UseMarketIndexCandlesQueryOptions = {
  hydrateInitialData?: boolean;
};

function getMarketIndexUpdatedAt(marketIndex: MarketIndexSummaryData) {
  const updatedAt = new Date(marketIndex.updatedAt).getTime();

  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function getMarketIndexProviderPriority(marketIndex: MarketIndexSummaryData) {
  return marketIndex.provider === "local-fallback" ? 0 : 1;
}

function shouldUseNextMarketIndex(
  currentMarketIndex: MarketIndexSummaryData | undefined,
  nextMarketIndex: MarketIndexSummaryData,
) {
  if (!currentMarketIndex) {
    return true;
  }

  const currentProviderPriority =
    getMarketIndexProviderPriority(currentMarketIndex);
  const nextProviderPriority = getMarketIndexProviderPriority(nextMarketIndex);

  if (currentProviderPriority !== nextProviderPriority) {
    return nextProviderPriority > currentProviderPriority;
  }

  return (
    getMarketIndexUpdatedAt(nextMarketIndex) >=
    getMarketIndexUpdatedAt(currentMarketIndex)
  );
}

function mergeMarketIndexQueryData(
  currentData: MarketIndexSummaryData[] | undefined,
  nextData: MarketIndexSummaryData[],
) {
  if (!currentData || currentData.length === 0) {
    return nextData;
  }

  if (nextData.length === 0) {
    return currentData;
  }

  const currentDataById = new Map(
    currentData.map((marketIndex) => [marketIndex.id, marketIndex]),
  );
  const nextDataById = new Map(
    nextData.map((marketIndex) => [marketIndex.id, marketIndex]),
  );
  const marketIndexIds = [
    ...nextData.map((marketIndex) => marketIndex.id),
    ...currentData
      .map((marketIndex) => marketIndex.id)
      .filter((id) => !nextDataById.has(id)),
  ];

  return marketIndexIds
    .map((marketIndexId) => {
      const currentMarketIndex = currentDataById.get(marketIndexId);
      const nextMarketIndex = nextDataById.get(marketIndexId);

      if (!nextMarketIndex) {
        return currentMarketIndex;
      }

      return shouldUseNextMarketIndex(currentMarketIndex, nextMarketIndex)
        ? nextMarketIndex
        : currentMarketIndex;
    })
    .filter(
      (marketIndex): marketIndex is MarketIndexSummaryData =>
        marketIndex !== undefined,
    );
}

function shouldHydrateCandleQueryData(
  currentData: MarketIndexCandleData[] | undefined,
  shouldHydrateInitialData: boolean,
) {
  if (!currentData || currentData.length === 0) {
    return true;
  }

  if (!shouldHydrateInitialData) {
    return false;
  }

  return true;
}

export function useMarketIndicesQuery(
  initialData?: MarketIndexSummaryData[],
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: marketIndexQueryKeys.lists(),
    queryFn: () => fetchMarketIndices(),
    initialData,
    refetchInterval: MARKET_INDEX_REFETCH_INTERVAL_MS,
    staleTime: MARKET_INDEX_REFETCH_INTERVAL_MS,
  });

  useEffect(() => {
    if (!initialData || initialData.length === 0) {
      return;
    }

    queryClient.setQueryData<MarketIndexSummaryData[]>(
      marketIndexQueryKeys.lists(),
      (currentData) => mergeMarketIndexQueryData(currentData, initialData),
    );
  }, [initialData, queryClient]);

  return query;
}

export function useMarketIndexCandlesQuery(
  indexId: string,
  interval: MarketIndexCandleInterval,
  initialData?: MarketIndexCandleData[],
  options?: UseMarketIndexCandlesQueryOptions,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: marketIndexQueryKeys.candles(indexId, interval),
    queryFn: () => fetchMarketIndexCandles(indexId, interval),
    enabled: indexId.trim().length > 0,
    initialData,
    refetchInterval: MARKET_INDEX_REFETCH_INTERVAL_MS,
    staleTime: MARKET_INDEX_REFETCH_INTERVAL_MS,
  });

  useEffect(() => {
    if (
      !initialData ||
      initialData.length === 0 ||
      indexId.trim().length === 0
    ) {
      return;
    }

    queryClient.setQueryData(
      marketIndexQueryKeys.candles(indexId, interval),
      (currentData: MarketIndexCandleData[] | undefined) =>
        shouldHydrateCandleQueryData(
          currentData,
          options?.hydrateInitialData ?? true,
        )
          ? initialData
          : currentData,
    );
  }, [
    indexId,
    initialData,
    interval,
    options?.hydrateInitialData,
    queryClient,
  ]);

  return query;
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
