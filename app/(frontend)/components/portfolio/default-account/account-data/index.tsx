import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import Link from "next/link";
import React from "react";
import CurrencyExchangeModal from "./currency-exchange-modal";

export default function AccountData() {
  const { data } = useGetPortfolio();

  if (!data) {
    return null;
  }

  return (
    <div className="col gap-8 pt-10">
      <div className="w-fit border px-3 py-2 text-xl">{data.accountNumber}</div>

      <div className="row items-center justify-between">
        <p className="text-[40px] font-semibold">
          {(
            data.totalAvailableOrderAmount + data.totalInvestmentAmount
          ).toLocaleString()}
          원
        </p>

        <div className="row gap-5">
          <Link href="/edu" className="row center min-h-10 cursor-pointer">
            퀴즈 풀고 충전하기
          </Link>

          <CurrencyExchangeModal />
        </div>
      </div>
    </div>
  );
}
