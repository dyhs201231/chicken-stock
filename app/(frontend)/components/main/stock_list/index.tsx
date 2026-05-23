"use client";

import { useMemo, useState } from "react";
import StockListControls from "./stock-list-controls";
import StockListTable from "./stock-list-table";
import type { StockData } from "./types";

// TODO: 추후 실제 데이터로 변경 예정
const dummyStocks: StockData[] = [
  {
    rank: 1,
    name: "삼성전자",
    price: "211,750원",
    changeRate: "+2.54%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "S",
    logoClassName: "bg-blue-700 text-white",
  },
  {
    rank: 2,
    name: "SK하이닉스",
    price: "1,140,000원",
    changeRate: "+3.17%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "SK",
    logoClassName: "bg-red-600 text-white",
  },
  {
    rank: 3,
    name: "현대차",
    price: "508,000원",
    changeRate: "+3.15%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "H",
    logoClassName: "bg-slate-800 text-white",
  },
  {
    rank: 4,
    name: "우리로",
    price: "14,320원",
    changeRate: "+20.74%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "W",
    logoClassName: "bg-zinc-800 text-emerald-300",
  },
  {
    rank: 5,
    name: "GS건설",
    price: "40,900원",
    changeRate: "+9.47%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "GS",
    logoClassName: "bg-cyan-700 text-white",
  },
  {
    rank: 6,
    name: "한미반도체",
    price: "294,000원",
    changeRate: "+3.69%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "HM",
    logoClassName: "bg-blue-800 text-white",
  },
  {
    rank: 7,
    name: "KODEX 레버리지",
    price: "99,025원",
    changeRate: "+5.13%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "up",
    logoLabel: "2x",
    logoClassName: "bg-blue-600 text-white",
  },
  {
    rank: 8,
    name: "미래에셋증권",
    price: "70,300원",
    changeRate: "-3.03%",
    tradingAmount: "173억원",
    market: "domestic",
    trend: "down",
    logoLabel: "M",
    logoClassName: "bg-orange-400 text-white",
  },
];

export default function StockList() {
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedRanking, setSelectedRanking] = useState("tradingAmount");
  const [selectedPeriod, setSelectedPeriod] = useState("live");
  const filteredStocks = useMemo(() => {
    if (selectedMarket === "all") {
      return dummyStocks;
    }

    return dummyStocks.filter((stock) => stock.market === selectedMarket);
  }, [selectedMarket]);

  return (
    <section className="w-full bg-white py-8 text-zinc-950">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-normal">실시간 차트</h2>

        <StockListControls
          selectedMarket={selectedMarket}
          selectedPeriod={selectedPeriod}
          selectedRanking={selectedRanking}
          onMarketChange={setSelectedMarket}
          onPeriodChange={setSelectedPeriod}
          onRankingChange={setSelectedRanking}
        />
      </div>

      <StockListTable stocks={filteredStocks} />
    </section>
  );
}
