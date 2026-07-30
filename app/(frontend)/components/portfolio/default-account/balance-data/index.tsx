import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import React from "react";

type BalanceDataProps = {
  initialPortfolio?: PortfolioResponse;
};

export default function BalanceData({ initialPortfolio }: BalanceDataProps) {
  const { data } = useGetPortfolio(undefined, {
    initialData: initialPortfolio,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">총 주문 가능 금액</p>
        <p className="ml-auto shrink-0 text-right font-bold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.totalAvailableOrderAmount === null
            ? "확인할 수 없음"
            : `${data.totalAvailableOrderAmount.toLocaleString()} 원`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">총 투자 금액</p>
        <p className="ml-auto shrink-0 text-right font-bold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.totalInvestmentAmount.toLocaleString()} 원
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">원화</p>
        <p className="ml-auto shrink-0 text-right font-semibold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.krwBalance.toLocaleString()} 원
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">국내주식</p>
        <p className="ml-auto shrink-0 text-right font-semibold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.domesticStockAmount.toLocaleString()} 원
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">달러</p>
        <p className="ml-auto shrink-0 text-right font-semibold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.usdBalance.toLocaleString()} 달러
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-white px-5 py-5 text-base md:flex-nowrap md:gap-6 md:px-6 md:py-6 md:text-lg">
        <p className="shrink-0 md:shrink">해외주식</p>
        <p className="ml-auto shrink-0 text-right font-semibold whitespace-nowrap tabular-nums md:ml-0 md:shrink md:whitespace-normal">
          {data.foreignStockAmount.toLocaleString()} 달러
        </p>
      </div>
    </div>
  );
}
