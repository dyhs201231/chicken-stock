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
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="cs-surface-card row justify-between gap-6 bg-(--cs-surface-tint) px-5 py-7 text-lg md:px-7 md:text-xl">
        <div>
          <p>총 주문 가능 금액</p>
          <MarketDataStatus
            fallbackTitle="최근 업데이트된 환율 기준"
            result={data.exchangeRate}
          />
        </div>
        <p className="text-right font-bold tabular-nums">
          {data.totalAvailableOrderAmount === null
            ? "확인할 수 없음"
            : `${data.totalAvailableOrderAmount.toLocaleString()} 원`}
        </p>
      </div>

      <div className="cs-surface-card row justify-between gap-6 bg-(--cs-surface-tint) px-5 py-7 text-lg md:px-7 md:text-xl">
        <p>총 투자 금액</p>
        <p className="text-right font-bold tabular-nums">{data.totalInvestmentAmount.toLocaleString()} 원</p>
      </div>

      <div className="cs-surface-card row justify-between gap-6 px-5 py-6 text-lg md:px-7">
        <p>원화</p>
        <p className="font-semibold tabular-nums">{data.krwBalance.toLocaleString()} 원</p>
      </div>

      <div className="cs-surface-card row justify-between gap-6 px-5 py-6 text-lg md:px-7">
        <p>국내주식</p>
        <p className="font-semibold tabular-nums">{data.domesticStockAmount.toLocaleString()} 원</p>
      </div>

      <div className="cs-surface-card row justify-between gap-6 px-5 py-6 text-lg md:px-7">
        <p>달러</p>
        <p className="font-semibold tabular-nums">{data.usdBalance.toLocaleString()} 달러</p>
      </div>

      <div className="cs-surface-card row justify-between gap-6 px-5 py-6 text-lg md:px-7">
        <p>해외주식</p>
        <p className="font-semibold tabular-nums">{data.foreignStockAmount.toLocaleString()} 달러</p>
      </div>
    </div>
  );
}
