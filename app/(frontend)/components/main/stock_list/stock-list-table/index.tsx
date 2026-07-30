"use client";

import { useEffect, useState } from "react";
import StockListRow from "../stock-list-row";
import type { StockData, StockRankingKey } from "../types";

type StockListTableProps = {
  stocks: StockData[];
  selectedRanking: StockRankingKey;
  isError?: boolean;
  isLoading?: boolean;
};

const seoulTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

function getRankingLabel(selectedRanking: StockRankingKey) {
  if (selectedRanking === "tradingVolume") {
    return "거래량 순";
  }

  return "거래대금 순";
}

export default function StockListTable({
  isError = false,
  isLoading = false,
  stocks,
  selectedRanking,
}: StockListTableProps) {
  const [seoulTime, setSeoulTime] = useState("--:--");
  const rankingLabel = getRankingLabel(selectedRanking);

  useEffect(() => {
    function updateSeoulTime() {
      setSeoulTime(seoulTimeFormatter.format(new Date()));
    }

    updateSeoulTime();
    const intervalId = window.setInterval(updateSeoulTime, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-(--cs-border-subtle) pb-3 text-sm text-(--cs-text-muted) md:grid-cols-[2rem_2.25rem_minmax(0,1fr)_7rem_5rem_8rem] md:gap-[3px] lg:grid-cols-[2.5rem_3.25rem_minmax(10rem,16rem)_minmax(8rem,1fr)_minmax(6rem,0.8fr)_minmax(10rem,1fr)] lg:gap-3">
        <span className="flex h-4 items-center text-left leading-none md:col-span-3">
          <span className="text-xs whitespace-nowrap sm:text-sm md:hidden">
            순위 / 오늘 {seoulTime}
          </span>
          <span className="hidden md:inline">순위 / 오늘 {seoulTime}</span>
        </span>

        <span className="flex h-4 items-center justify-end text-xs leading-none sm:text-sm md:hidden">
          현재가 / 등락률
        </span>

        <span className="hidden h-4 items-center justify-end leading-none md:col-start-4 md:flex lg:justify-start">
          현재가
        </span>

        <span className="hidden h-4 items-center justify-center leading-none md:col-start-5 md:flex">
          등락률
        </span>

        <span className="hidden h-4 items-center justify-end leading-none md:col-start-6 md:flex lg:justify-start">
          {rankingLabel}
        </span>
      </div>

      {isError && stocks.length === 0 && (
        <div className="py-16 text-center text-base text-red-500" role="alert">
          종목 순위를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {!isError && isLoading && (
        <div className="py-16 text-center text-base text-zinc-500">
          종목을 불러오는 중입니다.
        </div>
      )}

      {!isError && !isLoading && stocks.length === 0 && (
        <div className="py-16 text-center text-base text-zinc-500">
          표시할 종목이 없습니다.
        </div>
      )}

      {stocks.length > 0 && (
        <ol>
          {stocks.map((stock) => (
            <StockListRow key={stock.id} stock={stock} />
          ))}
        </ol>
      )}
    </>
  );
}
