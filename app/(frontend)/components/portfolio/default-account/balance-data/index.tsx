import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import MarketDataStatus from "@/app/(frontend)/components/market-data-status";
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
    <div className="grid grid-cols-2 gap-15">
      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <div>
          <p>총 주문 가능 금액</p>
          <MarketDataStatus
            fallbackTitle="최근 업데이트된 환율 기준"
            result={data.exchangeRate}
          />
        </div>
        <p>
          {data.totalAvailableOrderAmount === null
            ? "확인할 수 없음"
            : `${data.totalAvailableOrderAmount.toLocaleString()} 원`}
        </p>
      </div>

      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <p>총 투자 금액</p>
        <p>{data.totalInvestmentAmount.toLocaleString()} 원</p>
      </div>

      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <p>원화</p>
        <p>{data.krwBalance.toLocaleString()} 원</p>
      </div>

      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <p>국내주식</p>
        <p>{data.domesticStockAmount.toLocaleString()} 원</p>
      </div>

      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <p>달러</p>
        <p>{data.usdBalance.toLocaleString()} 달러</p>
      </div>

      <div className="row justify-between rounded-3xl px-4 py-10 text-xl shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
        <p>해외주식</p>
        <p>{data.foreignStockAmount.toLocaleString()} 달러</p>
      </div>
    </div>
  );
}
