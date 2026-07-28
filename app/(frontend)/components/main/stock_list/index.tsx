"use client";

import { useEffect, useRef, useState } from "react";
import StockListControls from "./stock-list-controls";
import StockListTable from "./stock-list-table";
import type { StocksRankingData } from "../../../apis/stocks/api";
import type {
  StockMarketFilter,
  StockRankingKey,
  StockRankingPeriod,
} from "./types";
import { STOCKS_PAGE_SIZE } from "../../../apis/stocks/api";
import { useStocksQuery } from "../../../apis/stocks/queries";
import {
  STOCK_RANKING_MAX_VISIBLE_LIMIT,
  getNextStockRankingVisibleLimit,
  getStockRankingBasisLabel,
} from "./stock-list-state";

type StockListProps = {
  initialStocksPage?: StocksRankingData;
};

export default function StockList({ initialStocksPage }: StockListProps) {
  const [selectedMarket, setSelectedMarket] =
    useState<StockMarketFilter>("all");
  const [selectedRanking, setSelectedRanking] =
    useState<StockRankingKey>("tradingAmount");
  const [selectedPeriod, setSelectedPeriod] =
    useState<StockRankingPeriod>("live");
  const [visibleLimit, setVisibleLimit] = useState(STOCKS_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestVersionRef = useRef(0);
  const queryInitialData =
    selectedMarket === "all" &&
    selectedRanking === "tradingAmount" &&
    selectedPeriod === "live" &&
    visibleLimit === STOCKS_PAGE_SIZE
      ? initialStocksPage
      : undefined;
  const {
    data,
    dataPeriod,
    dataRanking,
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
  } = useStocksQuery(
    selectedMarket,
    selectedRanking,
    selectedPeriod,
    visibleLimit,
    queryInitialData,
  );
  const stocks = data?.stocks ?? [];
  const basisLabel = getStockRankingBasisLabel({
    asOf: data?.asOf,
    isPlaceholderData,
    period: dataPeriod,
    periodEnd: data?.periodEnd ?? null,
    periodStart: data?.periodStart ?? null,
  });

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    const observedLimit = visibleLimit;
    const observedRequestVersion = requestVersionRef.current;

    if (
      !loadMoreElement ||
      !data?.hasMore ||
      isError ||
      isFetching ||
      observedLimit >= STOCK_RANKING_MAX_VISIBLE_LIMIT
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          data.hasMore &&
          !isError &&
          !isFetching &&
          observedLimit < STOCK_RANKING_MAX_VISIBLE_LIMIT
        ) {
          setVisibleLimit((currentLimit) =>
            getNextStockRankingVisibleLimit({
              currentLimit,
              currentRequestVersion: requestVersionRef.current,
              observedLimit,
              observedRequestVersion,
              pageSize: STOCKS_PAGE_SIZE,
            }),
          );
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [data?.hasMore, isError, isFetching, visibleLimit]);

  function handleMarketChange(market: StockMarketFilter) {
    requestVersionRef.current += 1;
    setSelectedMarket(market);
    setVisibleLimit(STOCKS_PAGE_SIZE);
  }

  function handleRankingChange(ranking: StockRankingKey) {
    requestVersionRef.current += 1;
    setSelectedRanking(ranking);
    setVisibleLimit(STOCKS_PAGE_SIZE);
  }

  function handlePeriodChange(period: StockRankingPeriod) {
    requestVersionRef.current += 1;
    setSelectedPeriod(period);
    setVisibleLimit(STOCKS_PAGE_SIZE);
  }

  return (
    <section className="mt-5 w-full rounded-2xl bg-white px-5 text-(--cs-text-strong) md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-5 py-5">
        <div>
          <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong)">
            실시간 차트
          </h2>
        </div>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={handleMarketChange}
          onPeriodChange={handlePeriodChange}
          onRankingChange={handleRankingChange}
        />
      </div>

      <div className="overflow-x-auto pt-2">
        <StockListTable
          basisLabel={basisLabel}
          isError={isError}
          isLoading={isLoading}
          selectedRanking={dataRanking}
          stocks={stocks}
        />
      </div>

      <div ref={loadMoreRef} className="h-10" aria-hidden="true" />

      {isFetching && !isLoading && (
        <div
          aria-live="polite"
          className="py-4 text-center text-sm text-zinc-400"
          role="status"
        >
          종목 순위를 갱신하는 중입니다.
        </div>
      )}

      {isError && stocks.length > 0 && (
        <div
          aria-live="polite"
          className="py-4 text-center text-sm text-red-500"
          role="status"
        >
          종목 순위를 갱신하지 못했습니다. 기존 정보를 표시합니다.
        </div>
      )}
    </section>
  );
}
