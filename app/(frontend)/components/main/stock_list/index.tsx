"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStocksInfiniteQuery } from "../../../apis/stocks/queries";
import StockListControls from "./stock-list-controls";
import StockListTable from "./stock-list-table";
import type { StocksPage } from "../../../apis/stocks/api";

type StockListProps = {
  initialStocksPage?: StocksPage;
};

export default function StockList({ initialStocksPage }: StockListProps) {
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedRanking, setSelectedRanking] = useState("tradingAmount");
  const [selectedPeriod, setSelectedPeriod] = useState("live");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryInitialData =
    selectedMarket === "all" && selectedRanking === "tradingAmount"
      ? initialStocksPage
      : undefined;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useStocksInfiniteQuery(
      selectedMarket,
      selectedRanking,
      queryInitialData,
    );

  const stocks = useMemo(
    () => data?.pages.flatMap((page) => page.stocks) ?? [],
    [data],
  );

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;

    if (!loadMoreElement || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="cs-surface-card mt-6 w-full overflow-hidden text-(--cs-text-strong) md:mt-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-(--cs-border-subtle) px-5 py-6 md:px-7">
        <div>
          <p className="cs-section-label mb-1">03 · Discover</p>
          <h2 className="cs-section-title">실시간 차트</h2>
        </div>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={setSelectedMarket}
          onPeriodChange={setSelectedPeriod}
          onRankingChange={setSelectedRanking}
        />
      </div>

      <div className="overflow-x-auto px-5 pt-5 md:px-7">
        <StockListTable
          isLoading={isLoading}
          selectedRanking={selectedRanking}
          stocks={stocks}
        />
      </div>

      <div ref={loadMoreRef} className="h-10" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="py-4 text-center text-sm text-zinc-400">
          종목을 더 불러오는 중입니다.
        </div>
      )}
    </section>
  );
}
